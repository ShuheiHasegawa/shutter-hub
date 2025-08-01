'use server';

import { withServerActionErrorHandler } from '@/lib/server-action-error-handler';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';

// 通知の型定義
export type NotificationType =
  | 'instant_photo_new_request'
  | 'instant_photo_match_found'
  | 'instant_photo_payment_received'
  | 'instant_photo_booking_completed'
  | 'instant_photo_booking_started'
  | 'instant_photo_photos_delivered'
  | 'photo_session_booking_confirmed'
  | 'photo_session_booking_cancelled'
  | 'photo_session_reminder'
  | 'photo_session_slot_available'
  | 'photo_session_review_request'
  | 'photo_session_document_signed'
  | 'photo_session_photos_available'
  | 'follow_new_follower'
  | 'follow_request_received'
  | 'follow_request_accepted'
  | 'follow_mutual_follow'
  | 'message_new_message'
  | 'message_group_invite'
  | 'message_group_message'
  | 'review_received'
  | 'review_reminder'
  | 'admin_user_report'
  | 'admin_system_alert'
  | 'admin_content_flagged'
  | 'system_maintenance'
  | 'system_update'
  | 'system_security_alert'
  | 'general_announcement'
  | 'payment_success'
  | 'payment_failed';

export type NotificationCategory =
  | 'instant_photo'
  | 'photo_session'
  | 'social'
  | 'payment'
  | 'system'
  | 'admin';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: string;
}

export interface NotificationFilters {
  category?: NotificationCategory;
  read?: boolean;
  archived?: boolean;
  priority?: NotificationPriority;
  limit?: number;
  offset?: number;
}

/**
 * 通知を作成
 */
export const createNotification = withServerActionErrorHandler(
  async (data: CreateNotificationData) => {
    logger.debug('通知作成開始', {
      userId: data.userId,
      type: data.type,
      title: data.title,
    });

    const supabase = await createClient();

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.userId,
        type: data.type,
        category: data.category,
        priority: data.priority || 'normal',
        title: data.title,
        message: data.message,
        data: data.data || {},
        related_entity_type: data.relatedEntityType,
        related_entity_id: data.relatedEntityId,
        action_url: data.actionUrl,
        action_label: data.actionLabel,
        expires_at: data.expiresAt,
      })
      .select()
      .single();

    if (error) {
      logger.error('通知作成エラー:', error);
      throw new Error(`通知の作成に失敗しました: ${error.message}`);
    }

    logger.info('通知作成完了', { notificationId: notification.id });

    // 関連ページの再検証
    revalidatePath('/notifications');

    return { notification };
  },
  {
    actionName: 'createNotification',
    component: 'notifications',
  }
);

/**
 * ユーザーの通知一覧を取得
 */
export const getUserNotifications = withServerActionErrorHandler(
  async (userId: string, filters?: NotificationFilters) => {
    const supabase = await createClient();

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('created_at', { ascending: false });

    // フィルター適用
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.read !== undefined) {
      query = query.eq('read', filters.read);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    // ページング
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 50) - 1
      );
    }

    // 期限切れ通知を除外
    query = query.or(
      'expires_at.is.null,expires_at.gt.' + new Date().toISOString()
    );

    const { data: notifications, error } = await query;

    if (error) {
      logger.error('通知取得エラー:', error);
      throw new Error(`通知の取得に失敗しました: ${error.message}`);
    }

    return { notifications };
  },
  {
    actionName: 'getUserNotifications',
    component: 'notifications',
  }
);

/**
 * 通知を既読にする
 */
export const markNotificationAsRead = withServerActionErrorHandler(
  async (notificationId: string, userId: string) => {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      logger.error('通知既読エラー:', error);
      throw new Error(`通知の既読処理に失敗しました: ${error.message}`);
    }

    logger.debug('通知既読完了', { notificationId });

    revalidatePath('/notifications');

    return { success: true };
  },
  {
    actionName: 'markNotificationAsRead',
    component: 'notifications',
  }
);

/**
 * 全ての通知を既読にする
 */
export const markAllNotificationsAsRead = withServerActionErrorHandler(
  async (userId: string) => {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      logger.error('全通知既読エラー:', error);
      throw new Error(`全通知の既読処理に失敗しました: ${error.message}`);
    }

    logger.debug('全通知既読完了', { userId });

    revalidatePath('/notifications');

    return { success: true };
  },
  {
    actionName: 'markAllNotificationsAsRead',
    component: 'notifications',
  }
);

/**
 * 通知をアーカイブする
 */
export const archiveNotification = withServerActionErrorHandler(
  async (notificationId: string, userId: string) => {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({
        archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      logger.error('通知アーカイブエラー:', error);
      throw new Error(`通知のアーカイブに失敗しました: ${error.message}`);
    }

    logger.debug('通知アーカイブ完了', { notificationId });

    revalidatePath('/notifications');

    return { success: true };
  },
  {
    actionName: 'archiveNotification',
    component: 'notifications',
  }
);

/**
 * 通知を削除する
 */
export const deleteNotification = withServerActionErrorHandler(
  async (notificationId: string, userId: string) => {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      logger.error('通知削除エラー:', error);
      throw new Error(`通知の削除に失敗しました: ${error.message}`);
    }

    logger.debug('通知削除完了', { notificationId });

    revalidatePath('/notifications');

    return { success: true };
  },
  {
    actionName: 'deleteNotification',
    component: 'notifications',
  }
);

/**
 * 全ての通知をクリアする
 */
export const clearAllNotifications = withServerActionErrorHandler(
  async (userId: string) => {
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      logger.error('全通知クリアエラー:', error);
      throw new Error(`全通知のクリアに失敗しました: ${error.message}`);
    }

    logger.debug('全通知クリア完了', { userId });

    revalidatePath('/notifications');

    return { success: true };
  },
  {
    actionName: 'clearAllNotifications',
    component: 'notifications',
  }
);

/**
 * 通知統計を取得
 */
export const getNotificationStats = withServerActionErrorHandler(
  async (userId: string) => {
    const supabase = await createClient();

    const { data: stats, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('archived', false);

    if (error) {
      logger.error('通知統計取得エラー:', error);
      throw new Error(`通知統計の取得に失敗しました: ${error.message}`);
    }

    const totalCount = stats.length;
    const unreadCount = stats.filter(n => !n.read).length;
    const highPriorityUnread = stats.filter(
      n => !n.read && (n.priority === 'high' || n.priority === 'urgent')
    ).length;

    // カテゴリ別統計
    const categories = stats.reduce(
      (acc, notification) => {
        const category = notification.category;
        if (!acc[category]) {
          acc[category] = { total: 0, unread: 0 };
        }
        acc[category].total++;
        if (!notification.read) {
          acc[category].unread++;
        }
        return acc;
      },
      {} as Record<string, { total: number; unread: number }>
    );

    return {
      totalCount,
      unreadCount,
      highPriorityUnread,
      categories,
    };
  },
  {
    actionName: 'getNotificationStats',
    component: 'notifications',
  }
);

/**
 * テスト用通知を作成
 */
export const createTestNotifications = withServerActionErrorHandler(
  async (userId: string, count: number = 5) => {
    const supabase = await createClient();

    const testNotifications = Array.from({ length: count }, (_, i) => ({
      user_id: userId,
      type: 'system_maintenance' as NotificationType,
      category: 'system' as NotificationCategory,
      priority: i % 2 === 0 ? 'normal' : 'high',
      title: `テスト通知 ${i + 1}`,
      message: `これはテスト用の通知です（${i + 1}/${count}）`,
      data: { testIndex: i + 1, timestamp: new Date().toISOString() },
    }));

    const { data: notifications, error } = await supabase
      .from('notifications')
      .insert(testNotifications)
      .select();

    if (error) {
      logger.error('テスト通知作成エラー:', error);
      throw new Error(`テスト通知の作成に失敗しました: ${error.message}`);
    }

    logger.info('テスト通知作成完了', {
      userId,
      count: notifications.length,
    });

    revalidatePath('/notifications');

    return { notifications };
  },
  {
    actionName: 'createTestNotifications',
    component: 'notifications',
  }
);
