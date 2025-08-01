'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecentActivity as RecentActivityType } from '@/app/actions/dashboard-stats';
import {
  Calendar,
  Star,
  CreditCard,
  PlusCircle,
  Mail,
  Clock,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';

interface RecentActivityProps {
  activities: RecentActivityType[];
  isLoading?: boolean;
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'review':
        return <Star className="h-4 w-4 text-yellow-600" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'session_created':
        return <PlusCircle className="h-4 w-4 text-purple-600" />;
      case 'invitation':
        return <Mail className="h-4 w-4 text-pink-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusConfig = {
      confirmed: { label: '確定', variant: 'default' as const },
      pending: { label: '保留中', variant: 'secondary' as const },
      cancelled: { label: 'キャンセル', variant: 'destructive' as const },
      completed: { label: '完了', variant: 'default' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const formatActivityTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ja,
      });
    } catch {
      return '不明';
    }
  };

  const getActivityLink = (activity: RecentActivityType) => {
    switch (activity.type) {
      case 'booking':
      case 'session_created':
        return activity.relatedId
          ? `/ja/photo-sessions/${activity.relatedId}`
          : null;
      case 'review':
        return activity.relatedId
          ? `/ja/photo-sessions/${activity.relatedId}#reviews`
          : null;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            最近のアクティビティ
          </CardTitle>
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

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            最近のアクティビティ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">まだアクティビティがありません</p>
            <p className="text-sm text-gray-500 mt-2">
              フォトセッションに参加したり、レビューを投稿すると、ここに表示されます。
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">
          最近のアクティビティ
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/ja/timeline">
            すべて見る
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map(activity => {
            const link = getActivityLink(activity);
            const ActivityContent = (
              <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(activity.status)}
                      {link && (
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatActivityTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            );

            return (
              <div key={activity.id}>
                {link ? (
                  <Link href={link} className="block">
                    {ActivityContent}
                  </Link>
                ) : (
                  ActivityContent
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
