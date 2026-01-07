'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

/**
 * 特定の撮影会に対するユーザーの既存予約を取得する
 */
export async function getUserSessionBooking(sessionId: string): Promise<{
  success: boolean;
  data?: {
    booking: {
      id: string;
      status: string;
      created_at: string;
    };
    slot?: {
      id: string;
      slot_number: number;
      start_time: string;
      end_time: string;
      price_per_person: number;
    };
    photoSession?: {
      start_time: string;
      end_time: string;
      price_per_person: number;
    };
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'ログインが必要です',
      };
    }

    // 既存予約を取得（スロット情報と撮影会情報も含む）
    // 複数予約がある場合は最初の1件のみ取得（.limit(1).maybeSingle()）
    const { data: existingBooking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        status,
        created_at,
        slot:photo_session_slots(
          id,
          slot_number,
          start_time,
          end_time,
          price_per_person
        ),
        photo_session:photo_sessions(
          start_time,
          end_time,
          price_per_person
        )
      `
      )
      .eq('photo_session_id', sessionId)
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bookingError) {
      logger.error('既存予約取得エラー:', bookingError);
      return {
        success: false,
        error: '既存予約の確認に失敗しました',
      };
    }

    if (!existingBooking) {
      return {
        success: true,
        data: undefined,
      };
    }

    // 撮影会情報を取得（スロットがない場合用）
    const photoSession = Array.isArray(existingBooking.photo_session)
      ? existingBooking.photo_session[0]
      : existingBooking.photo_session;

    // スロット情報を取得（配列の場合は最初の要素を取得）
    const slot = Array.isArray(existingBooking.slot)
      ? existingBooking.slot[0]
      : existingBooking.slot;

    return {
      success: true,
      data: {
        booking: {
          id: existingBooking.id,
          status: existingBooking.status,
          created_at: existingBooking.created_at,
        },
        slot: slot
          ? {
              id: slot.id,
              slot_number: slot.slot_number,
              start_time: slot.start_time,
              end_time: slot.end_time,
              price_per_person: slot.price_per_person,
            }
          : undefined,
        photoSession: photoSession
          ? {
              start_time: photoSession.start_time,
              end_time: photoSession.end_time,
              price_per_person: photoSession.price_per_person,
            }
          : undefined,
      },
    };
  } catch (error) {
    logger.error('既存予約取得エラー:', error);
    return {
      success: false,
      error: '予期しないエラーが発生しました',
    };
  }
}

/**
 * 特定の撮影会に対するユーザーの全既存予約を取得する（複数予約対応）
 */
export async function getUserSessionBookings(sessionId: string): Promise<{
  success: boolean;
  data?: Array<{
    booking: {
      id: string;
      status: string;
      created_at: string;
    };
    slot?: {
      id: string;
      slot_number: number;
      start_time: string;
      end_time: string;
      price_per_person: number;
    };
    photoSession?: {
      start_time: string;
      end_time: string;
      price_per_person: number;
    };
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'ログインが必要です',
      };
    }

    // 既存予約を取得（スロット情報と撮影会情報も含む、複数予約対応）
    const { data: existingBookings, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        status,
        created_at,
        slot:photo_session_slots(
          id,
          slot_number,
          start_time,
          end_time,
          price_per_person
        ),
        photo_session:photo_sessions(
          start_time,
          end_time,
          price_per_person
        )
      `
      )
      .eq('photo_session_id', sessionId)
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'pending'])
      .order('created_at', { ascending: false });

    if (bookingError) {
      logger.error('既存予約取得エラー:', bookingError);
      return {
        success: false,
        error: '既存予約の確認に失敗しました',
      };
    }

    if (!existingBookings || existingBookings.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // 各予約を整形して返却
    return {
      success: true,
      data: existingBookings.map(existingBooking => {
        // 撮影会情報を取得（スロットがない場合用）
        const photoSession = Array.isArray(existingBooking.photo_session)
          ? existingBooking.photo_session[0]
          : existingBooking.photo_session;

        // スロット情報を取得（配列の場合は最初の要素を取得）
        const slot = Array.isArray(existingBooking.slot)
          ? existingBooking.slot[0]
          : existingBooking.slot;

        return {
          booking: {
            id: existingBooking.id,
            status: existingBooking.status,
            created_at: existingBooking.created_at,
          },
          slot: slot
            ? {
                id: slot.id,
                slot_number: slot.slot_number,
                start_time: slot.start_time,
                end_time: slot.end_time,
                price_per_person: slot.price_per_person,
              }
            : undefined,
          photoSession: photoSession
            ? {
                start_time: photoSession.start_time,
                end_time: photoSession.end_time,
                price_per_person: photoSession.price_per_person,
              }
            : undefined,
        };
      }),
    };
  } catch (error) {
    logger.error('既存予約取得エラー:', error);
    return {
      success: false,
      error: '予期しないエラーが発生しました',
    };
  }
}
