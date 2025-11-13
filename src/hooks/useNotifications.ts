'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  getNotificationStats,
  createTestNotifications,
} from '@/app/actions/notifications';
import {
  getNotificationSettings,
  type NotificationSettings,
} from '@/app/actions/settings';
import type {
  Notification,
  NotificationFilters,
  NotificationStats,
  NotificationType,
} from '@/types/notification';

interface UseNotificationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialFilters?: NotificationFilters;
  enableRealtime?: boolean;
  enableSound?: boolean;
  enableToast?: boolean;
}

interface NotificationsState {
  notifications: Notification[];
  stats: NotificationStats | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  isConnected: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30秒
    initialFilters = { limit: 50 },
    enableRealtime: _enableRealtime, // 設定から取得するため、オプションは無視
    enableSound: _enableSound, // 常に無効のため、オプションは無視
    enableToast: _enableToast, // 設定から取得するため、オプションは無視
  } = options;

  const { user } = useAuth();
  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    stats: null,
    loading: false,
    error: null,
    hasMore: true,
    isConnected: false,
  });
  const [filters, setFilters] = useState<NotificationFilters>(initialFilters);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings | null>(null);
  const supabase = createClient();

  // 通知種別から設定キーへのマッピング
  const getNotificationSettingKey = useCallback(
    (type: NotificationType): string | null => {
      if (type.startsWith('instant_photo_')) {
        return 'instant_requests';
      }
      if (type.startsWith('photo_session_')) {
        return 'booking_reminders';
      }
      if (type.startsWith('message_')) {
        return 'messages';
      }
      if (type.startsWith('system_')) {
        return 'system_updates';
      }
      // その他の通知種別はデフォルトで有効
      return null;
    },
    []
  );

  // 通知が有効かどうかをチェック
  const isNotificationEnabled = useCallback(
    (notification: Notification): boolean => {
      if (!notificationSettings) {
        // 設定が未取得の場合はデフォルトで有効
        return true;
      }

      const settingKey = getNotificationSettingKey(notification.type);
      if (!settingKey) {
        // マッピングがない場合はデフォルトで有効
        return true;
      }

      // push_enabledを優先的にチェック（アプリ内通知として扱う）
      const pushEnabledForType =
        notificationSettings.push_enabled &&
        typeof notificationSettings.push_enabled === 'object' &&
        settingKey in notificationSettings.push_enabled
          ? (notificationSettings.push_enabled as Record<string, boolean>)[
              settingKey
            ]
          : undefined;

      const pushEnabled =
        pushEnabledForType ?? notificationSettings.push_enabled_global ?? true;

      return pushEnabled;
    },
    [notificationSettings, getNotificationSettingKey]
  );

  // 通知一覧を取得
  const fetchNotifications = useCallback(
    async (resetList = false) => {
      if (!user?.id) return;

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const currentFilters = resetList
          ? { ...filters, offset: 0 }
          : {
              ...filters,
              offset: resetList ? 0 : state.notifications.length,
            };

        const result = await getUserNotifications(
          user.id,
          currentFilters
        ).catch(error => {
          logger.error(
            '[useNotifications] getUserNotifications Server Action Error:',
            error
          );
          return { success: false, error: 'Server Action呼び出しエラー' };
        });

        if (
          result &&
          result.success &&
          'data' in result &&
          result.data?.notifications
        ) {
          // 通知種別設定に基づいてフィルタリング
          const filteredNotifications = result.data.notifications.filter(
            notification => isNotificationEnabled(notification)
          );

          setState(prev => ({
            ...prev,
            notifications: resetList
              ? filteredNotifications
              : [...prev.notifications, ...filteredNotifications],
            hasMore: result.data.notifications.length === (filters.limit || 50),
            loading: false,
          }));
        } else {
          setState(prev => ({
            ...prev,
            error:
              result && 'error' in result
                ? result.error
                : '通知の取得に失敗しました',
            loading: false,
          }));
        }
      } catch (error) {
        logger.error('通知取得エラー:', error);
        setState(prev => ({
          ...prev,
          error: '通知の取得中にエラーが発生しました',
          loading: false,
        }));
      }
    },
    [user?.id, filters, state.notifications.length, isNotificationEnabled]
  );

  // 通知統計を取得
  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await getNotificationStats(user.id).catch(error => {
        logger.error(
          '[useNotifications] getNotificationStats Server Action Error:',
          error
        );
        return { success: false, error: 'Server Action呼び出しエラー' };
      });

      // resultがundefinedでないことを確認
      if (result && result.success && 'data' in result && result.data) {
        // Server ActionからのレスポンスをNotificationStats形式に変換
        const stats: NotificationStats = {
          total_count: result.data.totalCount,
          unread_count: result.data.unreadCount,
          high_priority_unread: result.data.highPriorityUnread,
          categories: result.data.categories,
        };
        setState(prev => ({ ...prev, stats }));
        logger.debug('[useNotifications] 通知統計取得成功:', stats);
      } else {
        logger.warn(
          '[useNotifications] 通知統計取得失敗 - レスポンスが無効:',
          result
        );
      }
    } catch (error) {
      logger.error('[useNotifications] 通知統計取得エラー:', error);
    }
  }, [user?.id]);

  // 通知を既読にする
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user?.id) return;

      try {
        const result = await markNotificationAsRead(
          notificationId,
          user.id
        ).catch(error => {
          logger.error(
            '[useNotifications] markNotificationAsRead Server Action Error:',
            error
          );
          return { success: false, error: 'Server Action呼び出しエラー' };
        });

        if (result && result.success) {
          setState(prev => ({
            ...prev,
            notifications: prev.notifications.map(n =>
              n.id === notificationId
                ? { ...n, read: true, read_at: new Date().toISOString() }
                : n
            ),
          }));
          // 統計も更新
          fetchStats();
        }
      } catch (error) {
        logger.error('通知既読エラー:', error);
      }
    },
    [user?.id, fetchStats]
  );

  // 全ての通知を既読にする
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await markAllNotificationsAsRead(user.id).catch(error => {
        logger.error(
          '[useNotifications] markAllNotificationsAsRead Server Action Error:',
          error
        );
        return { success: false, error: 'Server Action呼び出しエラー' };
      });

      if (result && result.success) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => ({
            ...n,
            read: true,
            read_at: new Date().toISOString(),
          })),
        }));
        // 統計も更新
        fetchStats();
      }
    } catch (error) {
      logger.error('全通知既読エラー:', error);
    }
  }, [user?.id, fetchStats]);

  // 全ての通知をクリア
  const clearNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await clearAllNotifications(user.id).catch(error => {
        logger.error(
          '[useNotifications] clearAllNotifications Server Action Error:',
          error
        );
        return { success: false, error: 'Server Action呼び出しエラー' };
      });

      if (result && result.success) {
        setState(prev => ({
          ...prev,
          notifications: [],
        }));
        // 統計も更新
        fetchStats();
      }
    } catch (error) {
      logger.error('通知クリアエラー:', error);
    }
  }, [user?.id, fetchStats]);

  // さらに読み込む
  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      fetchNotifications(false);
    }
  }, [state.loading, state.hasMore, fetchNotifications]);

  // リフレッシュ
  const refresh = useCallback(() => {
    fetchNotifications(true);
    fetchStats();
  }, [fetchNotifications, fetchStats]);

  // フィルターを更新
  const updateFilters = useCallback((newFilters: NotificationFilters) => {
    setFilters(newFilters);
    // フィルター変更時は一覧をリセット
    setState(prev => ({ ...prev, notifications: [], hasMore: true }));
  }, []);

  // テスト通知を作成
  const createTestNotification = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await createTestNotifications(user.id).catch(error => {
        logger.error(
          '[useNotifications] createTestNotifications Server Action Error:',
          error
        );
        return { success: false, error: 'Server Action呼び出しエラー' };
      });

      if (result && result.success && 'data' in result && result.data) {
        logger.info('テスト通知作成完了', {
          createdCount: result.data.notifications?.length || 0,
        });
        // 作成後にリフレッシュ
        refresh();
      }
    } catch (error) {
      logger.error('テスト通知作成エラー:', error);
    }
  }, [user?.id, refresh]);

  // 通知設定を取得
  const fetchNotificationSettings = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await getNotificationSettings().catch(error => {
        logger.error(
          '[useNotifications] getNotificationSettings Server Action Error:',
          error
        );
        return { success: false, error: 'Server Action呼び出しエラー' };
      });

      if (result && result.success && 'data' in result && result.data) {
        setNotificationSettings(result.data);
        logger.debug('[useNotifications] 通知設定取得成功:', result.data);
      } else {
        // 設定取得失敗時はデフォルト設定を使用
        setNotificationSettings({
          email_enabled_global: true,
          push_enabled_global: true,
          toast_enabled: true,
          realtime_enabled: true,
          email_enabled: {},
          push_enabled: {},
        });
      }
    } catch (error) {
      logger.error('[useNotifications] 通知設定取得エラー:', error);
      // エラー時もデフォルト設定を使用
      setNotificationSettings({
        email_enabled_global: true,
        push_enabled_global: true,
        toast_enabled: true,
        realtime_enabled: true,
        email_enabled: {},
        push_enabled: {},
      });
    }
  }, [user?.id]);

  // 通知設定から有効な設定を取得
  const effectiveRealtime = notificationSettings?.realtime_enabled ?? true;
  const effectiveToast = notificationSettings?.toast_enabled ?? true;

  // 通知設定を取得
  useEffect(() => {
    if (user?.id) {
      fetchNotificationSettings();
    }
  }, [user?.id, fetchNotificationSettings]);

  // 通知設定取得後に通知一覧と統計を取得
  useEffect(() => {
    if (user?.id && notificationSettings) {
      fetchNotifications(true);
      fetchStats();
    }
  }, [user?.id, notificationSettings, filters, fetchNotifications, fetchStats]);

  // リアルタイム接続の設定
  useEffect(() => {
    if (!effectiveRealtime || !user?.id) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeConnection = async () => {
      try {
        // 通知テーブルの変更を購読
        channel = supabase
          .channel(`notifications_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            payload => {
              const newNotification = payload.new as Notification;

              logger.debug('新しい通知を受信:', newNotification);

              // 状態を更新
              setState(prev => ({
                ...prev,
                notifications: [newNotification, ...prev.notifications],
              }));

              // 統計を更新
              fetchStats();

              // 通知種別設定をチェック
              if (!isNotificationEnabled(newNotification)) {
                logger.debug(
                  '通知種別が無効のためスキップ:',
                  newNotification.type
                );
                return;
              }

              // トーストを表示
              if (effectiveToast) {
                toast(newNotification.title, {
                  description: newNotification.message,
                  duration: 5000,
                });
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            payload => {
              const updatedNotification = payload.new as Notification;

              setState(prev => ({
                ...prev,
                notifications: prev.notifications.map(n =>
                  n.id === updatedNotification.id ? updatedNotification : n
                ),
              }));

              // 統計を更新
              fetchStats();
            }
          )
          .subscribe(status => {
            logger.debug('Realtime接続状態:', status);
            setState(prev => ({
              ...prev,
              isConnected: status === 'SUBSCRIBED',
            }));
          });
      } catch (error) {
        logger.warn('Realtime接続エラー (非致命的):', error);
        setState(prev => ({ ...prev, isConnected: false }));
      }
    };

    setupRealtimeConnection();

    // クリーンアップ
    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(error => {
          logger.warn('Channel cleanup error:', error);
        });
      }
    };
  }, [
    effectiveRealtime,
    user?.id,
    effectiveToast,
    fetchStats,
    supabase,
    isNotificationEnabled,
    notificationSettings,
  ]);

  // 自動リフレッシュ
  useEffect(() => {
    if (!autoRefresh || !user?.id) return;

    const interval = setInterval(() => {
      fetchStats(); // 統計だけ更新（通知一覧は手動で更新してもらう）
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, user?.id, fetchStats]);

  // 未読数を計算
  const unreadCount = state.stats?.unread_count || 0;
  const highPriorityUnreadCount = state.stats?.high_priority_unread || 0;

  return {
    // データ
    notifications: state.notifications,
    stats: state.stats,
    unreadCount,
    highPriorityUnreadCount,

    // 状態
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    isConnected: state.isConnected,

    // フィルター
    filters,
    updateFilters,

    // アクション
    markAsRead,
    markAllAsRead,
    clearNotifications,
    loadMore,
    refresh,

    // テスト機能
    createTestNotification,
  };
}
