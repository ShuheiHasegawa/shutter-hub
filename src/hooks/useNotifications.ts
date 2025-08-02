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
import type {
  Notification,
  NotificationFilters,
  NotificationStats,
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
    enableRealtime = true,
    enableSound = false,
    enableToast = true,
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
  const supabase = createClient();

  // 通知音を再生
  const playNotificationSound = useCallback(() => {
    if (!enableSound) return;

    try {
      // Web Audio APIを使用した通知音
      const audioContext = new (window.AudioContext ||
        (window as unknown as typeof AudioContext))();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      logger.warn('通知音の再生に失敗しました:', error);
    }
  }, [enableSound]);

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

        const result = await getUserNotifications(user.id, currentFilters);

        if (result.success && result.data?.notifications) {
          setState(prev => ({
            ...prev,
            notifications: resetList
              ? result.data.notifications
              : [...prev.notifications, ...result.data.notifications],
            hasMore: result.data.notifications.length === (filters.limit || 50),
            loading: false,
          }));
        } else {
          setState(prev => ({
            ...prev,
            error: result.success ? '通知の取得に失敗しました' : result.error,
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
    [user?.id, filters, state.notifications.length]
  );

  // 通知統計を取得
  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await getNotificationStats(user.id);
      if (result.success && result.data) {
        // Server ActionからのレスポンスをNotificationStats形式に変換
        const stats: NotificationStats = {
          total_count: result.data.totalCount,
          unread_count: result.data.unreadCount,
          high_priority_unread: result.data.highPriorityUnread,
          categories: result.data.categories,
        };
        setState(prev => ({ ...prev, stats }));
      }
    } catch (error) {
      logger.error('通知統計取得エラー:', error);
    }
  }, [user?.id]);

  // 通知を既読にする
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user?.id) return;

      try {
        const result = await markNotificationAsRead(notificationId, user.id);
        if (result.success) {
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
      const result = await markAllNotificationsAsRead(user.id);
      if (result.success) {
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
      const result = await clearAllNotifications(user.id);
      if (result.success) {
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
      const result = await createTestNotifications(user.id);
      if (result.success && result.data) {
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

  // 初期化
  useEffect(() => {
    if (user?.id) {
      fetchNotifications(true);
      fetchStats();
    }
  }, [user?.id, filters, fetchNotifications, fetchStats]);

  // リアルタイム接続の設定
  useEffect(() => {
    if (!enableRealtime || !user?.id) return;

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

              // 通知音とトーストを表示
              if (enableSound) {
                playNotificationSound();
              }

              if (enableToast) {
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
    enableRealtime,
    user?.id,
    enableSound,
    enableToast,
    playNotificationSound,
    fetchStats,
    supabase,
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
