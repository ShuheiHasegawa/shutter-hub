'use client';

import { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bell,
  BellRing,
  Camera,
  CheckCircle,
  Clock,
  Trash2,
  MessageSquare,
  Users,
  Calendar,
  AlertTriangle,
  Settings,
  Star,
  CreditCard,
  User,
  Loader2,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationType, Notification } from '@/types/notification';

interface NotificationCenterProps {
  userType?: 'photographer' | 'guest' | 'organizer' | 'admin';
  enableSound?: boolean;
  enableRealtime?: boolean;
  maxNotifications?: number;
}

export function NotificationCenter({
  userType: _userType = 'photographer',
  enableSound: _enableSound = false,
  enableRealtime = true,
  maxNotifications = 50,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 統一された通知システム
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    createTestNotification,
    refresh,
  } = useNotifications({
    autoRefresh: true,
    enableRealtime,
    initialFilters: { limit: maxNotifications },
  });

  // 通知アイコンを取得
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      // 即座撮影関連
      case 'instant_photo_new_request':
        return <Camera className="h-4 w-4 text-blue-600" />;
      case 'instant_photo_match_found':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'instant_photo_payment_received':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'instant_photo_booking_completed':
        return <CheckCircle className="h-4 w-4 text-purple-600" />;
      case 'instant_photo_booking_started':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'instant_photo_photos_delivered':
        return <Camera className="h-4 w-4 text-green-600" />;

      // 撮影会関連
      case 'photo_session_booking_confirmed':
        return <Calendar className="h-4 w-4 text-green-600" />;
      case 'photo_session_booking_cancelled':
        return <Calendar className="h-4 w-4 text-red-600" />;
      case 'photo_session_reminder':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'photo_session_slot_available':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'photo_session_review_request':
        return <Star className="h-4 w-4 text-yellow-600" />;
      case 'photo_session_document_signed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'photo_session_photos_available':
        return <Camera className="h-4 w-4 text-green-600" />;

      // ソーシャル関連
      case 'follow_new_follower':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'follow_request_received':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'follow_request_accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'follow_mutual_follow':
        return <Users className="h-4 w-4 text-green-600" />;
      case 'message_new_message':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'message_group_invite':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'message_group_message':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;

      // レビュー関連
      case 'review_received':
        return <Star className="h-4 w-4 text-yellow-600" />;
      case 'review_reminder':
        return <Star className="h-4 w-4 text-gray-600" />;

      // 決済関連
      case 'payment_success':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'payment_failed':
        return <CreditCard className="h-4 w-4 text-red-600" />;

      // システム・管理者関連
      case 'admin_user_report':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'admin_system_alert':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'admin_content_flagged':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'system_maintenance':
        return <Settings className="h-4 w-4 text-gray-600" />;
      case 'system_update':
        return <Settings className="h-4 w-4 text-blue-600" />;
      case 'system_security_alert':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'general_announcement':
        return <Bell className="h-4 w-4 text-blue-600" />;

      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  // 通知の優先度に応じた色を取得
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'normal':
        return 'bg-blue-100 border-blue-200 text-blue-800';
      case 'low':
        return 'bg-gray-100 border-gray-200 text-gray-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  // 通知をクリック
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // アクションURLがある場合は遷移
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }

    logger.debug('通知クリック', {
      notificationId: notification.id,
      type: notification.type,
    });
  };

  // 相対時間の表示
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'たった今';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}分前`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}時間前`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}日前`;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 p-0"
          aria-label={`通知 ${unreadCount > 0 ? `(${unreadCount}件の未読)` : ''}`}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}

          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center min-w-[16px] border-2 border-background shadow-lg"
            >
              <span className="text-[10px] font-bold leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">通知</CardTitle>

              <div className="flex items-center gap-2">
                {/* アクションボタン */}
                {notifications.length > 0 && (
                  <div className="flex gap-1">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="h-6 px-2 text-xs"
                      >
                        全て既読
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearNotifications}
                      className="h-6 px-2 text-xs"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* リフレッシュボタン */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refresh}
                  disabled={loading}
                  className="h-6 px-2 text-xs"
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    '更新'
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {loading ? '読み込み中...' : '通知はありません'}
                </p>
                {!loading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      createTestNotification && createTestNotification()
                    }
                    className="mt-2 text-xs text-blue-600"
                  >
                    テスト通知を作成
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-80">
                <div className="space-y-1">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div
                        className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className={`text-sm font-medium leading-tight ${
                                  !notification.read
                                    ? 'text-gray-900'
                                    : 'text-gray-700'
                                }`}
                              >
                                {notification.title}
                              </h4>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`text-xs px-1.5 py-0.5 ${getPriorityColor(
                                    notification.priority
                                  )}`}
                                >
                                  {notification.priority}
                                </Badge>

                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                              {notification.message}
                            </p>

                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">
                                {formatRelativeTime(notification.created_at)}
                              </span>

                              {notification.action_label && (
                                <span className="text-xs text-blue-600 font-medium">
                                  {notification.action_label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
