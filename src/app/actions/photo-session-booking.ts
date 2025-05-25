'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface BookingResult {
  success: boolean;
  bookingId?: string;
  error?: string;
  errorCode?:
    | 'FULL'
    | 'ALREADY_BOOKED'
    | 'SESSION_ENDED'
    | 'UNAUTHORIZED'
    | 'UNKNOWN';
}

export async function createPhotoSessionBooking(
  photoSessionId: string,
  userId: string
): Promise<BookingResult> {
  const supabase = await createClient();

  try {
    // トランザクション内で予約処理を実行
    const { data, error } = await supabase.rpc('create_photo_session_booking', {
      p_photo_session_id: photoSessionId,
      p_user_id: userId,
    });

    if (error) {
      console.error('予約作成エラー:', error);

      // エラーメッセージに基づいてエラーコードを判定
      if (error.message.includes('満席')) {
        return {
          success: false,
          error: '申し訳ございません。この撮影会は満席です。',
          errorCode: 'FULL',
        };
      }
      if (error.message.includes('既に予約済み')) {
        return {
          success: false,
          error: 'この撮影会は既に予約済みです。',
          errorCode: 'ALREADY_BOOKED',
        };
      }
      if (error.message.includes('終了')) {
        return {
          success: false,
          error: 'この撮影会は既に終了しています。',
          errorCode: 'SESSION_ENDED',
        };
      }

      return {
        success: false,
        error: '予約の作成に失敗しました。',
        errorCode: 'UNKNOWN',
      };
    }

    // 成功時はページを再検証
    revalidatePath('/photo-sessions');
    revalidatePath(`/photo-sessions/${photoSessionId}`);
    revalidatePath('/dashboard');

    return {
      success: true,
      bookingId: data?.booking_id,
    };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return {
      success: false,
      error: '予期しないエラーが発生しました。',
      errorCode: 'UNKNOWN',
    };
  }
}

export async function cancelPhotoSessionBooking(
  bookingId: string,
  userId: string
): Promise<BookingResult> {
  const supabase = await createClient();

  try {
    // 予約の所有者確認とキャンセル処理
    const { error } = await supabase.rpc('cancel_photo_session_booking', {
      p_booking_id: bookingId,
      p_user_id: userId,
    });

    if (error) {
      console.error('予約キャンセルエラー:', error);
      return {
        success: false,
        error: '予約のキャンセルに失敗しました。',
        errorCode: 'UNKNOWN',
      };
    }

    // 成功時はページを再検証
    revalidatePath('/photo-sessions');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return {
      success: false,
      error: '予期しないエラーが発生しました。',
      errorCode: 'UNKNOWN',
    };
  }
}

export async function getUserBookings(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      photo_session:photo_sessions(
        *,
        organizer:profiles(*)
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('予約一覧取得エラー:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function getPhotoSessionBookings(photoSessionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      user:profiles(*)
    `
    )
    .eq('photo_session_id', photoSessionId)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('撮影会予約一覧取得エラー:', error);
    return { data: null, error };
  }

  return { data, error: null };
}
