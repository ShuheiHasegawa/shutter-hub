'use server';

import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/server';
import { requireAuthForAction } from '@/lib/auth/server-actions';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CheckInResult {
  success: boolean;
  message: string;
  type?: 'checkin' | 'checkout' | 'already_completed';
  checked_in_at?: string | null;
  checked_out_at?: string | null;
}

interface ConditionalUpdateParams {
  supabase: SupabaseClient;
  bookingId: string;
  field: 'checked_in_at' | 'checked_out_at';
  now: string;
  type: 'checkin' | 'checkout';
  successMessage: string;
  errorMessage: string;
  logContext: {
    bookingId: string;
    slotId: string;
    userId: string;
  };
}

/**
 * 条件付きUPDATE処理を実行する共通関数
 * 競合状態を防ぐため、フィールドがnullの場合のみ更新する
 */
async function performConditionalUpdate(
  params: ConditionalUpdateParams
): Promise<CheckInResult | null> {
  const {
    supabase,
    bookingId,
    field,
    now,
    type,
    successMessage,
    errorMessage,
    logContext,
  } = params;

  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({ [field]: now })
    .eq('id', bookingId)
    .is(field, null)
    .select('checked_in_at, checked_out_at')
    .single();

  if (updateError || !updatedBooking) {
    // 更新されなかった = 他のリクエストが先に更新した可能性
    // 最新状態を再取得
    const { data: latestBooking } = await supabase
      .from('bookings')
      .select('checked_in_at, checked_out_at')
      .eq('id', bookingId)
      .single();

    if (latestBooking?.checked_out_at) {
      return {
        success: false,
        message:
          field === 'checked_in_at'
            ? '既にチェックイン・チェックアウトが完了しています'
            : '既にチェックアウトが完了しています',
        type: 'already_completed',
        checked_in_at: latestBooking.checked_in_at,
        checked_out_at: latestBooking.checked_out_at,
      };
    }

    logger.error(`${errorMessage}:`, updateError);
    return {
      success: false,
      message: errorMessage,
    };
  }

  logger.info(`${successMessage}`, logContext);

  return {
    success: true,
    message: successMessage,
    type,
    checked_in_at: updatedBooking.checked_in_at,
    checked_out_at: updatedBooking.checked_out_at,
  };
}

/**
 * スロットにチェックイン/チェックアウトする
 */
export async function checkInToSlot(slotId: string): Promise<CheckInResult> {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return {
        success: false,
        message: 'ログインが必要です',
      };
    }

    const { user, supabase } = authResult.data;

    // スロット情報を取得
    const { data: slot, error: slotError } = await supabase
      .from('photo_session_slots')
      .select('id, photo_session_id, start_time, end_time')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      logger.error('Slot not found:', slotError);
      return {
        success: false,
        message: 'スロットが見つかりません',
      };
    }

    // 予約を取得（slot_id + user_id）
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, checked_in_at, checked_out_at, status')
      .eq('slot_id', slotId)
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .single();

    if (bookingError || !booking) {
      logger.error('Booking not found:', bookingError);
      return {
        success: false,
        message: 'このスロットの予約が見つかりません',
      };
    }

    // チェックイン状態の判定と更新（競合状態を防ぐため条件付きUPDATEを使用）
    const now = new Date().toISOString();
    const logContext = {
      bookingId: booking.id,
      slotId,
      userId: user.id,
    };

    if (!booking.checked_in_at) {
      // 初回スキャン：入場記録（条件付きUPDATE: checked_in_atがnullの場合のみ更新）
      const result = await performConditionalUpdate({
        supabase,
        bookingId: booking.id,
        field: 'checked_in_at',
        now,
        type: 'checkin',
        successMessage: '入場完了しました',
        errorMessage: 'チェックインに失敗しました',
        logContext,
      });

      if (result) {
        // 更新が成功した場合、または既に完了している場合
        if (result.type === 'checkin') {
          return {
            ...result,
            checked_out_at: null,
          };
        }
        return result;
      }

      // 更新されなかった = 他のリクエストが先に更新した可能性
      // 最新状態を再取得して、チェックアウト処理へ移行する可能性を確認
      const { data: latestBooking } = await supabase
        .from('bookings')
        .select('checked_in_at, checked_out_at')
        .eq('id', booking.id)
        .single();

      if (latestBooking?.checked_in_at && !latestBooking?.checked_out_at) {
        // 既にチェックイン済み、チェックアウト処理へ
        const checkoutResult = await performConditionalUpdate({
          supabase,
          bookingId: booking.id,
          field: 'checked_out_at',
          now,
          type: 'checkout',
          successMessage: '退場完了しました',
          errorMessage: 'チェックアウトに失敗しました',
          logContext,
        });

        if (checkoutResult) {
          return checkoutResult;
        }
      }

      return {
        success: false,
        message: 'チェックインに失敗しました',
      };
    } else if (!booking.checked_out_at) {
      // 2回目スキャン：退場記録（条件付きUPDATE: checked_out_atがnullの場合のみ更新）
      const result = await performConditionalUpdate({
        supabase,
        bookingId: booking.id,
        field: 'checked_out_at',
        now,
        type: 'checkout',
        successMessage: '退場完了しました',
        errorMessage: 'チェックアウトに失敗しました',
        logContext,
      });

      if (result) {
        return result;
      }

      return {
        success: false,
        message: 'チェックアウトに失敗しました',
      };
    } else {
      // 既に完了
      return {
        success: false,
        message: '既にチェックイン・チェックアウトが完了しています',
        type: 'already_completed',
        checked_in_at: booking.checked_in_at,
        checked_out_at: booking.checked_out_at,
      };
    }
  } catch (error) {
    logger.error('Check-in error:', error);
    return {
      success: false,
      message: 'エラーが発生しました',
    };
  }
}

export interface CheckInStatus {
  slot_id: string;
  slot_number: number;
  start_time: string;
  end_time: string;
  total_bookings: number;
  checked_in_count: number;
  checked_out_count: number;
}

/**
 * スロットのチェックイン状況を取得（運営者用）
 */
export async function getCheckInStatus(
  slotId: string
): Promise<CheckInStatus | null> {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      logger.error('Unauthorized access to check-in status');
      return null;
    }

    const { user, supabase } = authResult.data;

    // スロット情報を取得（運営者チェックを含む）
    const { data: slot, error: slotError } = await supabase
      .from('photo_session_slots')
      .select(
        'id, slot_number, start_time, end_time, photo_session_id, photo_sessions!inner(organizer_id)'
      )
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      logger.error('Slot not found:', slotError);
      return null;
    }

    // 運営者チェック
    // Supabaseのjoinクエリ結果の型推論が不完全なため、型アサーションを使用
    type SlotWithPhotoSession = {
      photo_sessions: { organizer_id: string } | null;
    };
    const slotWithSession = slot as unknown as SlotWithPhotoSession;
    if (
      !slotWithSession.photo_sessions ||
      slotWithSession.photo_sessions.organizer_id !== user.id
    ) {
      logger.error('User is not the organizer of this session');
      return null;
    }

    // 予約の統計を取得
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('checked_in_at, checked_out_at')
      .eq('slot_id', slotId)
      .eq('status', 'confirmed');

    if (bookingsError) {
      logger.error('Bookings fetch error:', bookingsError);
      return null;
    }

    const totalBookings = bookings?.length || 0;
    const checkedInCount =
      bookings?.filter(b => b.checked_in_at !== null).length || 0;
    const checkedOutCount =
      bookings?.filter(b => b.checked_out_at !== null).length || 0;

    return {
      slot_id: slot.id,
      slot_number: slot.slot_number,
      start_time: slot.start_time,
      end_time: slot.end_time,
      total_bookings: totalBookings,
      checked_in_count: checkedInCount,
      checked_out_count: checkedOutCount,
    };
  } catch (error) {
    logger.error('Get check-in status error:', error);
    return null;
  }
}

/**
 * 撮影会の全スロットのチェックイン状況を取得
 */
export async function getSessionCheckInStatus(
  sessionId: string
): Promise<CheckInStatus[]> {
  try {
    const supabase = await createClient();

    // スロット一覧を取得
    const { data: slots, error: slotsError } = await supabase
      .from('photo_session_slots')
      .select('id, slot_number, start_time, end_time')
      .eq('photo_session_id', sessionId)
      .eq('is_active', true)
      .order('slot_number', { ascending: true });

    if (slotsError || !slots) {
      logger.error('Slots fetch error:', slotsError);
      return [];
    }

    // 各スロットの統計を取得
    const statuses: CheckInStatus[] = [];

    for (const slot of slots) {
      const status = await getCheckInStatus(slot.id);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  } catch (error) {
    logger.error('Get session check-in status error:', error);
    return [];
  }
}
