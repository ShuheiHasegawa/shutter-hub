'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  InstantPhotoRequest,
  InstantPhotoNotification,
  RealtimeChannelData,
  PhotographerRequestResponse,
} from '@/types/instant-photo';

interface NotificationState {
  notifications: InstantPhotoNotification[];
  unreadCount: number;
  isConnected: boolean;
}

interface UseRealtimeNotificationsOptions {
  enableToast?: boolean;
  enableSound?: boolean;
  userType?: 'photographer' | 'guest' | 'all';
}

export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions = {}
) {
  const { user } = useAuth();
  const { enableToast = true, enableSound = false, userType = 'all' } = options;

  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isConnected: false,
  });

  // 通知音を再生
  const playNotificationSound = useCallback(() => {
    if (enableSound && typeof window !== 'undefined') {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(console.error);
      } catch (error) {
        console.error('通知音再生エラー:', error);
      }
    }
  }, [enableSound]);

  // 新しい通知を追加
  const addNotification = useCallback(
    (notification: InstantPhotoNotification) => {
      setState(prev => ({
        ...prev,
        notifications: [notification, ...prev.notifications.slice(0, 49)], // 最大50件
        unreadCount: prev.unreadCount + 1,
      }));

      // トースト通知
      if (enableToast) {
        toast.success(notification.title, {
          description: notification.message,
          duration: 5000,
        });
      }

      // 通知音
      playNotificationSound();
    },
    [enableToast, playNotificationSound]
  );

  // 通知を既読にする
  const markAsRead = useCallback((notificationId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  }, []);

  // 全ての通知を既読にする
  const markAllAsRead = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  }, []);

  // 通知をクリア
  const clearNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: [],
      unreadCount: 0,
    }));
  }, []);

  // リアルタイム接続を設定
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    // 即座撮影リクエストの変更を監視
    const requestsChannel = supabase.channel('instant_photo_requests').on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'instant_photo_requests',
      },
      (payload: RealtimeChannelData) => {
        handleRequestChange(payload);
      }
    );

    // カメラマン応答の変更を監視
    const responsesChannel = supabase
      .channel('photographer_request_responses')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'photographer_request_responses',
        },
        (payload: RealtimeChannelData) => {
          handleResponseChange(payload);
        }
      );

    // チャンネルを購読
    requestsChannel.subscribe(status => {
      setState(prev => ({ ...prev, isConnected: status === 'SUBSCRIBED' }));
    });

    responsesChannel.subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(responsesChannel);
    };
  }, [user]);

  // リクエスト変更の処理
  const handleRequestChange = useCallback(
    (payload: RealtimeChannelData) => {
      const request = payload.record as unknown as InstantPhotoRequest;
      const oldRequest = payload.old_record as unknown as InstantPhotoRequest;

      if (!request) return;

      // 新しいリクエスト（カメラマン向け）
      if (payload.event === 'INSERT' && userType !== 'guest') {
        addNotification({
          id: `request_${request.id}`,
          type: 'new_request',
          title: '新しい撮影リクエスト',
          message: `${request.request_type}撮影のリクエストが届きました（¥${request.budget.toLocaleString()}）`,
          data: { requestId: request.id },
          read: false,
          created_at: new Date().toISOString(),
        });
      }

      // マッチング成功（ゲスト向け）
      if (
        payload.event === 'UPDATE' &&
        oldRequest?.status === 'pending' &&
        request.status === 'matched' &&
        userType !== 'photographer'
      ) {
        addNotification({
          id: `match_${request.id}`,
          type: 'match_found',
          title: 'カメラマンが見つかりました！',
          message: 'カメラマンがあなたのリクエストを受諾しました',
          data: { requestId: request.id },
          read: false,
          created_at: new Date().toISOString(),
        });
      }

      // 撮影開始（ゲスト向け）
      if (
        payload.event === 'UPDATE' &&
        oldRequest?.status === 'matched' &&
        request.status === 'in_progress' &&
        userType !== 'photographer'
      ) {
        addNotification({
          id: `start_${request.id}`,
          type: 'booking_completed',
          title: '撮影が開始されました',
          message: 'カメラマンが撮影を開始しました',
          data: { requestId: request.id },
          read: false,
          created_at: new Date().toISOString(),
        });
      }

      // 撮影完了（ゲスト向け）
      if (
        payload.event === 'UPDATE' &&
        oldRequest?.status === 'in_progress' &&
        request.status === 'completed' &&
        userType !== 'photographer'
      ) {
        addNotification({
          id: `complete_${request.id}`,
          type: 'booking_completed',
          title: '撮影が完了しました！',
          message: '写真の配信をお待ちください',
          data: { requestId: request.id },
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    },
    [userType, addNotification]
  );

  // 応答変更の処理
  const handleResponseChange = useCallback(
    (payload: RealtimeChannelData) => {
      const response = payload.record as unknown as PhotographerRequestResponse;

      if (!response || payload.event !== 'INSERT') return;

      // カメラマンの応答（ゲスト向け）
      if (userType !== 'photographer') {
        if (response.response_type === 'decline') {
          addNotification({
            id: `decline_${response.id}`,
            type: 'new_request',
            title: 'カメラマンが辞退しました',
            message: '他のカメラマンを探しています...',
            data: { responseId: response.id },
            read: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    },
    [userType, addNotification]
  );

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    isConnected: state.isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
