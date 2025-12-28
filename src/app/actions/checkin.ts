'use server';

import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/server';
import { requireAuthForAction } from '@/lib/auth/server-actions';

export interface CheckInResult {
  success: boolean;
  message: string;
  type?: 'checkin' | 'checkout' | 'already_completed';
  checked_in_at?: string | null;
  checked_out_at?: string | null;
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

    // チェックイン状態の判定と更新
    const now = new Date().toISOString();

    if (!booking.checked_in_at) {
      // 初回スキャン：入場記録
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ checked_in_at: now })
        .eq('id', booking.id);

      if (updateError) {
        logger.error('Check-in update error:', updateError);
        return {
          success: false,
          message: 'チェックインに失敗しました',
        };
      }

      logger.info('Check-in successful', {
        bookingId: booking.id,
        slotId,
        userId: user.id,
      });

      return {
        success: true,
        message: '入場完了しました',
        type: 'checkin',
        checked_in_at: now,
        checked_out_at: null,
      };
    } else if (!booking.checked_out_at) {
      // 2回目スキャン：退場記録
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ checked_out_at: now })
        .eq('id', booking.id);

      if (updateError) {
        logger.error('Check-out update error:', updateError);
        return {
          success: false,
          message: 'チェックアウトに失敗しました',
        };
      }

      logger.info('Check-out successful', {
        bookingId: booking.id,
        slotId,
        userId: user.id,
      });

      return {
        success: true,
        message: '退場完了しました',
        type: 'checkout',
        checked_in_at: booking.checked_in_at,
        checked_out_at: now,
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
    const supabase = await createClient();

    // スロット情報を取得
    const { data: slot, error: slotError } = await supabase
      .from('photo_session_slots')
      .select('id, slot_number, start_time, end_time, photo_session_id')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      logger.error('Slot not found:', slotError);
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
