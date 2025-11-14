'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/app/actions/notifications';
import { getNotificationMessage } from '@/lib/utils/notification-i18n';

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
      logger.error('予約作成エラー:', error);

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

    // 予約確定通知を送信
    if (data?.booking_id) {
      try {
        // 撮影会情報とプロフィール情報を取得
        const { data: photoSession, error: sessionError } = await supabase
          .from('photo_sessions')
          .select(
            `
            *,
            organizer:profiles!organizer_id(
              id,
              display_name,
              avatar_url
            )
          `
          )
          .eq('id', photoSessionId)
          .single();

        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', userId)
          .single();

        if (!sessionError && !userError && photoSession && userProfile) {
          const organizer = Array.isArray(photoSession.organizer)
            ? photoSession.organizer[0]
            : photoSession.organizer;

          // 予約者に通知（多言語対応）
          const userNotification = await getNotificationMessage(
            userId,
            'notificationMessages.photoSession.bookingConfirmed',
            { title: photoSession.title }
          );

          await createNotification({
            userId: userId,
            type: 'photo_session_booking_confirmed',
            category: 'photo_session',
            priority: 'high',
            title: userNotification.title,
            message: userNotification.message,
            data: {
              photo_session_id: photoSessionId,
              photo_session_title: photoSession.title,
              booking_id: data.booking_id,
              organizer_id: organizer?.id,
              organizer_name: organizer?.display_name,
            },
            relatedEntityType: 'photo_session',
            relatedEntityId: photoSessionId,
            actionUrl: `/photo-sessions/${photoSessionId}`,
            actionLabel: '撮影会詳細を見る',
          });

          // 運営者に通知（多言語対応）
          if (organizer?.id) {
            const organizerNotification = await getNotificationMessage(
              organizer.id,
              'notificationMessages.photoSession.bookingConfirmed',
              {
                userName: userProfile.display_name,
                title: photoSession.title,
              },
              'organizer'
            );

            await createNotification({
              userId: organizer.id,
              type: 'photo_session_booking_confirmed',
              category: 'photo_session',
              priority: 'normal',
              title: organizerNotification.title,
              message: organizerNotification.message,
              data: {
                photo_session_id: photoSessionId,
                photo_session_title: photoSession.title,
                booking_id: data.booking_id,
                user_id: userId,
                user_name: userProfile.display_name,
              },
              relatedEntityType: 'photo_session',
              relatedEntityId: photoSessionId,
              actionUrl: `/photo-sessions/${photoSessionId}`,
              actionLabel: '撮影会詳細を見る',
            });
          }
        }
      } catch (notificationError) {
        // 通知作成失敗はログに記録するが、メイン処理は継続
        logger.error('予約確定通知送信エラー:', notificationError);
      }
    }

    return {
      success: true,
      bookingId: data?.booking_id,
    };
  } catch (error) {
    logger.error('予期しないエラー:', error);
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
    // キャンセル前に予約情報を取得（通知送信用）
    const { data: booking, error: bookingFetchError } = await supabase
      .from('bookings')
      .select(
        `
        *,
        photo_session:photo_sessions(
          *,
          organizer:profiles!organizer_id(
            id,
            display_name,
            avatar_url
          )
        ),
        user:profiles!user_id(
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('id', bookingId)
      .single();

    // 予約の所有者確認とキャンセル処理
    const { error } = await supabase.rpc('cancel_photo_session_booking', {
      p_booking_id: bookingId,
      p_user_id: userId,
    });

    if (error) {
      logger.error('予約キャンセルエラー:', error);
      return {
        success: false,
        error: '予約のキャンセルに失敗しました。',
        errorCode: 'UNKNOWN',
      };
    }

    // 成功時はページを再検証
    revalidatePath('/photo-sessions');
    revalidatePath('/dashboard');

    // 予約キャンセル通知を送信
    if (booking && !bookingFetchError) {
      try {
        const photoSession = Array.isArray(booking.photo_session)
          ? booking.photo_session[0]
          : booking.photo_session;
        const organizer = Array.isArray(photoSession?.organizer)
          ? photoSession.organizer[0]
          : photoSession?.organizer;
        const userProfile = Array.isArray(booking.user)
          ? booking.user[0]
          : booking.user;

        if (photoSession && userProfile) {
          // 予約者に通知（多言語対応）
          const userNotification = await getNotificationMessage(
            userId,
            'notificationMessages.photoSession.bookingCancelled',
            { title: photoSession.title }
          );

          await createNotification({
            userId: userId,
            type: 'photo_session_booking_cancelled',
            category: 'photo_session',
            priority: 'normal',
            title: userNotification.title,
            message: userNotification.message,
            data: {
              photo_session_id: booking.photo_session_id,
              photo_session_title: photoSession.title,
              booking_id: bookingId,
              organizer_id: organizer?.id,
              organizer_name: organizer?.display_name,
            },
            relatedEntityType: 'photo_session',
            relatedEntityId: booking.photo_session_id,
            actionUrl: `/photo-sessions/${booking.photo_session_id}`,
            actionLabel: '撮影会詳細を見る',
          });

          // 運営者に通知（多言語対応）
          if (organizer?.id) {
            const organizerNotification = await getNotificationMessage(
              organizer.id,
              'notificationMessages.photoSession.bookingCancelled',
              {
                userName: userProfile.display_name,
                title: photoSession.title,
              },
              'organizer'
            );

            await createNotification({
              userId: organizer.id,
              type: 'photo_session_booking_cancelled',
              category: 'photo_session',
              priority: 'normal',
              title: organizerNotification.title,
              message: organizerNotification.message,
              data: {
                photo_session_id: booking.photo_session_id,
                photo_session_title: photoSession.title,
                booking_id: bookingId,
                user_id: userId,
                user_name: userProfile.display_name,
              },
              relatedEntityType: 'photo_session',
              relatedEntityId: booking.photo_session_id,
              actionUrl: `/photo-sessions/${booking.photo_session_id}`,
              actionLabel: '撮影会詳細を見る',
            });
          }
        }
      } catch (notificationError) {
        // 通知作成失敗はログに記録するが、メイン処理は継続
        logger.error('予約キャンセル通知送信エラー:', notificationError);
      }
    }

    return { success: true };
  } catch (error) {
    logger.error('予期しないエラー:', error);
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
    logger.error('予約一覧取得エラー:', error);
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
    logger.error('撮影会予約一覧取得エラー:', error);
    return { data: null, error };
  }

  return { data, error: null };
}
