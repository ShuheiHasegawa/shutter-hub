'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { createNotification } from '@/app/actions/notifications';

export interface PhotoSessionParticipant {
  id: string;
  user_id: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'waitlisted';
  created_at: string;
  user: {
    id: string;
    display_name: string;
    avatar_url?: string;
    email: string;
  };
}

export async function getPhotoSessionParticipants(
  sessionId: string
): Promise<PhotoSessionParticipant[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('bookings')
      .select(
        `
        id,
        user_id,
        status,
        created_at,
        user:profiles!bookings_user_id_fkey(
          id,
          display_name,
          avatar_url,
          email
        )
      `
      )
      .eq('photo_session_id', sessionId)
      .in('status', ['confirmed', 'pending'])
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching participants:', error);
      return [];
    }

    return (data || []).map(item => ({
      ...item,
      user: Array.isArray(item.user) ? item.user[0] : item.user,
    })) as PhotoSessionParticipant[];
  } catch (error) {
    logger.error('Error in getPhotoSessionParticipants:', error);
    return [];
  }
}

export async function checkUserParticipation(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('photo_session_id', sessionId)
      .eq('user_id', userId)
      .in('status', ['confirmed', 'pending'])
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error checking participation:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    logger.error('Error in checkUserParticipation:', error);
    return false;
  }
}

/**
 * 参加者にメッセージを送信（通知）
 */
export async function sendParticipantMessage(
  sessionId: string,
  participantUserIds: string[],
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // 撮影会情報と運営者情報を取得
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
      .eq('id', sessionId)
      .single();

    if (sessionError || !photoSession) {
      logger.error('撮影会情報取得エラー:', sessionError);
      return { success: false, error: '撮影会情報の取得に失敗しました' };
    }

    // 運営者権限チェック
    const organizer = Array.isArray(photoSession.organizer)
      ? photoSession.organizer[0]
      : photoSession.organizer;
    if (photoSession.organizer_id !== user.id) {
      return { success: false, error: '権限がありません' };
    }

    // 各参加者に通知を送信（多言語対応）
    const notificationPromises = participantUserIds.map(
      async participantUserId => {
        const { getNotificationMessage } = await import(
          '@/lib/utils/notification-i18n'
        );
        const notification = await getNotificationMessage(
          participantUserId,
          'notificationMessages.photoSession.participantMessage',
          { message: message }
        );

        await createNotification({
          userId: participantUserId,
          type: 'participant_message',
          category: 'photo_session',
          priority: 'normal',
          title: notification.title,
          message: notification.message,
          data: {
            photo_session_id: sessionId,
            photo_session_title: photoSession.title,
            organizer_id: organizer?.id,
            organizer_name: organizer?.display_name,
            from_organizer: true,
          },
          relatedEntityType: 'photo_session',
          relatedEntityId: sessionId,
          actionUrl: `/photo-sessions/${sessionId}`,
          actionLabel: '撮影会詳細を見る',
        });
      }
    );

    await Promise.all(notificationPromises);

    return { success: true };
  } catch (error) {
    logger.error('参加者メッセージ送信エラー:', error);
    return { success: false, error: 'メッセージの送信に失敗しました' };
  }
}
