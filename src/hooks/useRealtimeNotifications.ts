'use client';

import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  InstantPhotoRequest,
  InstantPhotoNotification,
  PhotographerRequestResponse,
  InstantBooking,
} from '@/types/instant-photo';

interface NotificationState {
  notifications: InstantPhotoNotification[];
  unreadCount: number;
  isConnected: boolean;
}

interface UseRealtimeNotificationsOptions {
  userType: 'guest' | 'photographer';
  guestPhone?: string; // ゲストの場合の電話番号
  enableSound?: boolean;
  enableToast?: boolean;
}

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
  table: string;
}

// 削除: SystemPayloadは使用されていない

export function useRealtimeNotifications({
  userType,
  guestPhone,
  enableSound = true,
  enableToast = true,
}: UseRealtimeNotificationsOptions) {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isConnected: false,
  });

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

  // 通知を追加
  const addNotification = useCallback(
    (notification: InstantPhotoNotification) => {
      setState(prev => ({
        ...prev,
        notifications: [notification, ...prev.notifications.slice(0, 49)], // 最大50件
        unreadCount: prev.unreadCount + 1,
      }));

      // 通知音を再生
      playNotificationSound();

      // トースト通知を表示
      if (enableToast) {
        toast(notification.title, {
          description: notification.message,
          duration: 5000,
        });
      }
    },
    [playNotificationSound, enableToast]
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

  // ゲスト用の通知処理
  const handleGuestNotifications = useCallback(
    (payload: RealtimePayload) => {
      if (!guestPhone) return;

      const { eventType, new: newRecord, old: oldRecord } = payload;

      // 即座撮影リクエストの状態変更を監視
      if (payload.table === 'instant_photo_requests' && newRecord) {
        const request = newRecord as unknown as InstantPhotoRequest;

        // 自分のリクエストのみ処理
        if (request.guest_phone !== guestPhone) return;

        let notification: InstantPhotoNotification | null = null;

        if (eventType === 'UPDATE' && oldRecord) {
          const oldRequest = oldRecord as unknown as InstantPhotoRequest;

          if (oldRequest.status === 'pending' && request.status === 'matched') {
            notification = {
              id: `match_${request.id}`,
              type: 'match_found',
              title: 'カメラマンが見つかりました！',
              message:
                '撮影リクエストにカメラマンがマッチしました。詳細を確認してください。',
              data: { requestId: request.id },
              read: false,
              created_at: new Date().toISOString(),
            };
          } else if (
            oldRequest.status === 'matched' &&
            request.status === 'in_progress'
          ) {
            notification = {
              id: `start_${request.id}`,
              type: 'booking_completed',
              title: '撮影が開始されました',
              message: 'カメラマンが撮影を開始しました。',
              data: { requestId: request.id },
              read: false,
              created_at: new Date().toISOString(),
            };
          } else if (
            oldRequest.status === 'in_progress' &&
            request.status === 'completed'
          ) {
            notification = {
              id: `complete_${request.id}`,
              type: 'booking_completed',
              title: '撮影が完了しました',
              message: '写真の配信をお待ちください。',
              data: { requestId: request.id },
              read: false,
              created_at: new Date().toISOString(),
            };
          }
        }

        if (notification) {
          addNotification(notification);
        }
      }
    },
    [guestPhone, addNotification]
  );

  // カメラマン用の通知処理
  const handlePhotographerNotifications = useCallback(
    (payload: RealtimePayload) => {
      if (!user) return;

      const { eventType, new: newRecord } = payload;

      // 新しいリクエストの通知
      if (
        payload.table === 'photographer_request_responses' &&
        eventType === 'INSERT' &&
        newRecord
      ) {
        const response = newRecord as unknown as PhotographerRequestResponse;

        // 自分宛のリクエストのみ処理
        if (response.photographer_id !== user.id) return;

        const notification: InstantPhotoNotification = {
          id: `request_${response.request_id}`,
          type: 'new_request',
          title: '新しい撮影リクエスト',
          message: '近くで撮影リクエストが発生しました。応答してください。',
          data: {
            requestId: response.request_id,
            responseId: response.id,
            distanceMeters: response.distance_meters,
          },
          read: false,
          created_at: new Date().toISOString(),
        };

        addNotification(notification);
      }

      // 予約確定の通知
      if (
        payload.table === 'instant_bookings' &&
        eventType === 'INSERT' &&
        newRecord
      ) {
        const booking = newRecord as unknown as InstantBooking;

        if (booking.photographer_id !== user.id) return;

        const notification: InstantPhotoNotification = {
          id: `booking_${booking.id}`,
          type: 'payment_received',
          title: '予約が確定しました',
          message: '撮影予約が確定しました。撮影場所に向かってください。',
          data: { bookingId: booking.id },
          read: false,
          created_at: new Date().toISOString(),
        };

        addNotification(notification);
      }
    },
    [user, addNotification]
  );

  // リアルタイム接続の設定
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isUnmounted = false;

    const setupRealtimeConnection = async () => {
      try {
        // Supabase設定の確認
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          logger.warn(
            'Supabase configuration missing, skipping realtime notifications'
          );
          setState(prev => ({ ...prev, isConnected: false }));
          return;
        }

        // 既存のチャンネルがあればクリーンアップ
        if (channel) {
          await supabase.removeChannel(channel);
          channel = null;
        }

        // 接続に必要な条件をチェック
        if (userType === 'guest' && !guestPhone) {
          return;
        }
        if (userType === 'photographer' && !user) {
          return;
        }

        // チャンネルを作成（一意な名前を生成）
        const channelName = `instant_photo_notifications_${userType}_${
          userType === 'guest'
            ? guestPhone?.replace(/\D/g, '') || 'anonymous'
            : user?.id || 'anonymous'
        }_${Date.now()}`;

        channel = supabase.channel(channelName);

        // ゲスト用の監視設定
        if (userType === 'guest' && guestPhone) {
          channel
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'instant_photo_requests',
              },
              handleGuestNotifications
            )
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'instant_bookings',
              },
              handleGuestNotifications
            );
        }

        // カメラマン用の監視設定
        if (userType === 'photographer' && user) {
          channel
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'photographer_request_responses',
              },
              handlePhotographerNotifications
            )
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'instant_bookings',
              },
              handlePhotographerNotifications
            );
        }

        // チャンネルを購読
        await channel.subscribe((status: string) => {
          if (isUnmounted) return;

          if (status === 'SUBSCRIBED') {
            setState(prev => ({ ...prev, isConnected: true }));
            // 再接続タイマーをクリア
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
              reconnectTimeout = null;
            }
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setState(prev => ({ ...prev, isConnected: false }));

            // 自動再接続を試行（開発環境では無効化可能）
            if (process.env.NODE_ENV !== 'development' && !isUnmounted) {
              reconnectTimeout = setTimeout(() => {
                if (!isUnmounted) {
                  setupRealtimeConnection();
                }
              }, 3000); // 3秒後に再接続
            }
          } else if (status === 'TIMED_OUT') {
            setState(prev => ({ ...prev, isConnected: false }));
          }
        });
      } catch (error) {
        logger.warn('Realtime connection error (non-critical):', error);
        setState(prev => ({ ...prev, isConnected: false }));

        // エラー時の再接続（開発環境では無効化）
        if (process.env.NODE_ENV !== 'development' && !isUnmounted) {
          reconnectTimeout = setTimeout(() => {
            if (!isUnmounted) {
              setupRealtimeConnection();
            }
          }, 5000);
        }
      }
    };

    setupRealtimeConnection();

    // クリーンアップ
    return () => {
      isUnmounted = true;

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      if (channel) {
        supabase.removeChannel(channel).catch(error => {
          logger.warn('Channel cleanup error:', error);
        });
      }
    };
  }, [
    userType,
    user?.id, // user全体ではなくIDのみを監視
    guestPhone,
    handleGuestNotifications,
    handlePhotographerNotifications,
  ]);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    isConnected: state.isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
