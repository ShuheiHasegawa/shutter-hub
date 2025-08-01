'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UpcomingEvent } from '@/app/actions/dashboard-stats';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowRight,
  Camera,
  Zap,
} from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';

interface UpcomingEventsProps {
  events: UpcomingEvent[];
  isLoading?: boolean;
}

export function UpcomingEvents({ events, isLoading }: UpcomingEventsProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'photo_session':
        return <Camera className="h-4 w-4 text-blue-600" />;
      case 'instant_request':
        return <Zap className="h-4 w-4 text-orange-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: '確定', variant: 'default' as const },
      pending: { label: '保留中', variant: 'secondary' as const },
      hosting: { label: '主催', variant: 'default' as const },
      cancelled: { label: 'キャンセル', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const formatEventTime = (startTime: string) => {
    const date = new Date(startTime);

    if (isToday(date)) {
      return `今日 ${format(date, 'HH:mm', { locale: ja })}`;
    }

    if (isTomorrow(date)) {
      return `明日 ${format(date, 'HH:mm', { locale: ja })}`;
    }

    if (isThisWeek(date)) {
      return format(date, 'E曜日 HH:mm', { locale: ja });
    }

    return format(date, 'M/d(E) HH:mm', { locale: ja });
  };

  const getEventLink = (event: UpcomingEvent) => {
    switch (event.type) {
      case 'photo_session':
        return `/ja/photo-sessions/${event.id}`;
      case 'instant_request':
        return `/ja/instant/${event.id}`;
      default:
        return null;
    }
  };

  const getTimeUrgency = (startTime: string) => {
    const date = new Date(startTime);
    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 2) {
      return 'urgent'; // 2時間以内
    } else if (diffHours < 24) {
      return 'soon'; // 24時間以内
    }
    return 'normal';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">今後の予定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-4 animate-pulse"
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">今後の予定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">今後の予定はありません</p>
            <p className="text-sm text-gray-500 mt-2">
              新しいフォトセッションを予約してみましょう。
            </p>
            <Button className="mt-4" asChild>
              <Link href="/ja/photo-sessions">フォトセッションを探す</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">今後の予定</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/ja/bookings">
            すべて見る
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map(event => {
            const link = getEventLink(event);
            const urgency = getTimeUrgency(event.startTime);

            const EventContent = (
              <div
                className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                  urgency === 'urgent'
                    ? 'border-red-200 bg-red-50'
                    : urgency === 'soon'
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {event.title}
                        </h4>
                        {getStatusBadge(event.status)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-3 w-3 mr-1" />
                          <span
                            className={
                              urgency === 'urgent'
                                ? 'font-medium text-red-600'
                                : urgency === 'soon'
                                  ? 'font-medium text-orange-600'
                                  : ''
                            }
                          >
                            {formatEventTime(event.startTime)}
                          </span>
                        </div>

                        {event.location && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}

                        {event.organizerName && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="h-3 w-3 mr-1" />
                            <span>主催: {event.organizerName}</span>
                          </div>
                        )}

                        {event.participantsCount !== undefined && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="h-3 w-3 mr-1" />
                            <span>参加者: {event.participantsCount}名</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );

            return (
              <div key={event.id}>
                {link ? (
                  <Link href={link} className="block">
                    {EventContent}
                  </Link>
                ) : (
                  EventContent
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
