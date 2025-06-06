'use client';

import { useState } from 'react';
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
  MapPin,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import type { InstantPhotoNotification } from '@/types/instant-photo';

interface NotificationCenterProps {
  userType?: 'photographer' | 'guest';
  enableSound?: boolean;
}

export function NotificationCenter({
  userType = 'photographer',
  enableSound = false,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useRealtimeNotifications({
    enableToast: true,
    enableSound,
    userType,
  });

  // 通知アイコンを取得
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_request':
        return <Camera className="h-4 w-4 text-blue-600" />;
      case 'match_found':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'payment_received':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'booking_completed':
        return <MapPin className="h-4 w-4 text-purple-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  // 通知の時間表示
  const formatNotificationTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return time.toLocaleDateString('ja-JP');
  };

  // 通知をクリック
  const handleNotificationClick = (notification: InstantPhotoNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // 通知に応じたアクションを実行
    if (notification.data?.requestId) {
      // リクエスト詳細ページに遷移など
      console.log('Navigate to request:', notification.data.requestId);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2"
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

      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">通知</CardTitle>
              <div className="flex items-center gap-2">
                {/* 接続状態 */}
                <div className="flex items-center gap-1">
                  {isConnected ? (
                    <Wifi className="h-3 w-3 text-green-600" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-600" />
                  )}
                  <span className="text-xs text-gray-500">
                    {isConnected ? '接続中' : '切断'}
                  </span>
                </div>

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
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">通知はありません</p>
              </div>
            ) : (
              <ScrollArea className="h-80">
                <div className="space-y-1">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div
                        className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                          !notification.read
                            ? 'bg-blue-50 border-l-2 border-l-blue-500'
                            : ''
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
                                className={`text-sm font-medium truncate ${
                                  !notification.read
                                    ? 'text-gray-900'
                                    : 'text-gray-700'
                                }`}
                              >
                                {notification.title}
                              </h4>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {formatNotificationTime(
                                    notification.created_at
                                  )}
                                </span>
                              </div>
                            </div>

                            <p
                              className={`text-xs mt-1 ${
                                !notification.read
                                  ? 'text-gray-700'
                                  : 'text-gray-500'
                              }`}
                            >
                              {notification.message}
                            </p>

                            {!notification.read && (
                              <div className="mt-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              </div>
                            )}
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
