'use server';

import { logger } from '@/lib/utils/logger';
import { BookingWithDetails } from '@/types/database';
import { requireAuthForAction } from '@/lib/auth/server-actions';

export interface BookingsResult {
  success: boolean;
  bookings?: BookingWithDetails[];
  error?: string;
}

export async function getUserBookings(): Promise<BookingsResult> {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error,
      };
    }
    const { user, supabase } = authResult.data;

    // ユーザーの予約一覧を取得（撮影会情報と主催者情報を含む）
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(
        `
        *,
        photo_session:photo_sessions(
          *,
          organizer:organizer_id(
            id,
            email,
            display_name,
            avatar_url
          )
        ),
        slot:photo_session_slots(
          *
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('予約取得エラー:', error);
      return {
        success: false,
        error: '予約の取得に失敗しました',
      };
    }

    return {
      success: true,
      bookings: bookings || [],
    };
  } catch (error) {
    logger.error('予約取得エラー:', error);
    return {
      success: false,
      error: '予約の取得に失敗しました',
    };
  }
}

export async function cancelBooking(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error,
      };
    }
    const { user, supabase } = authResult.data;

    // 予約をキャンセル状態に更新
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('user_id', user.id); // セキュリティ: 自分の予約のみキャンセル可能

    if (error) {
      logger.error('予約キャンセルエラー:', error);
      return {
        success: false,
        error: '予約のキャンセルに失敗しました',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    logger.error('予約キャンセルエラー:', error);
    return {
      success: false,
      error: '予約のキャンセルに失敗しました',
    };
  }
}
