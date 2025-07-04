'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarIcon,
  RefreshCwIcon,
  UsersIcon,
  TrendingUpIcon,
  ClockIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BookingWithDetails } from '@/types/database';
import { getUserBookings } from '@/app/actions/bookings';
import { useToast } from '@/hooks/use-toast';
import { PhotoSessionCard } from '@/components/photo-sessions/PhotoSessionCard';

type FilterStatus = 'all' | 'confirmed' | 'cancelled' | 'upcoming' | 'past';

export function BookingsList() {
  const t = useTranslations('bookings');
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const loadBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getUserBookings();
      if (result.success && result.bookings) {
        setBookings(result.bookings);
      } else {
        toast({
          variant: 'destructive',
          title: t('error.loadFailed'),
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: t('error.loadFailed'),
        description: t('error.unexpected'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // 統計データの計算
  const stats = useMemo(() => {
    const now = new Date();
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    const upcoming = bookings.filter(b => {
      const sessionDate = new Date(b.photo_session.start_time);
      return b.status === 'confirmed' && sessionDate > now;
    }).length;
    const past = bookings.filter(b => {
      const sessionDate = new Date(b.photo_session.start_time);
      return b.status === 'confirmed' && sessionDate <= now;
    }).length;

    return { total: bookings.length, confirmed, cancelled, upcoming, past };
  }, [bookings]);

  // フィルタリング
  const filteredBookingsMemo = useMemo(() => {
    if (filterStatus === 'all') return bookings;

    const now = new Date();
    return bookings.filter(booking => {
      const sessionDate = new Date(booking.photo_session.start_time);

      switch (filterStatus) {
        case 'confirmed':
          return booking.status === 'confirmed';
        case 'cancelled':
          return booking.status === 'cancelled';
        case 'upcoming':
          return booking.status === 'confirmed' && sessionDate > now;
        case 'past':
          return booking.status === 'confirmed' && sessionDate <= now;
        default:
          return true;
      }
    });
  }, [bookings, filterStatus]);

  // 予約ステータスバッジを取得する関数
  const getBookingStatusBadge = (booking: BookingWithDetails) => {
    const now = new Date();
    const sessionDate = new Date(booking.photo_session.start_time);

    if (booking.status === 'cancelled') {
      return <Badge variant="destructive">{t('status.cancelled')}</Badge>;
    }

    if (booking.status === 'confirmed') {
      if (sessionDate > now) {
        return <Badge variant="default">{t('status.upcoming')}</Badge>;
      } else {
        return <Badge variant="secondary">{t('status.past')}</Badge>;
      }
    }

    return <Badge variant="outline">{booking.status}</Badge>;
  };

  // PhotoSessionCardで使用するためのダミーオーガナイザー情報を追加
  const getSessionWithOrganizer = (booking: BookingWithDetails) => {
    return {
      ...booking.photo_session,
      organizer: {
        id: booking.photo_session.organizer_id,
        email: 'organizer@example.com',
        display_name: '主催者',
        avatar_url: null,
        user_type: 'organizer' as const,
        bio: null,
        location: null,
        website: null,
        instagram_handle: null,
        twitter_handle: null,
        phone: null,
        is_verified: false,
        created_at: '',
        updated_at: '',
      },
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                <div className="h-8 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-48 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadBookings}
          disabled={isLoading}
        >
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          {t('refresh')}
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.total')}
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.confirmed')}
            </CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.upcoming')}
            </CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.past')}
            </CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.past}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.cancelled')}
            </CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-error">
              {stats.cancelled}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルターボタン */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            'all',
            'confirmed',
            'upcoming',
            'past',
            'cancelled',
          ] as FilterStatus[]
        ).map(status => (
          <Button
            key={status}
            variant={filterStatus === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(status)}
          >
            {t(`filter.${status}`)}
          </Button>
        ))}
      </div>

      {/* 予約一覧 */}
      {filteredBookingsMemo.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">{t('noBookings')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredBookingsMemo.map(booking => (
            <div key={booking.id} className="relative">
              {/* 予約ステータスバッジを右上に表示 */}
              <div className="absolute top-2 right-2 z-10">
                {getBookingStatusBadge(booking)}
              </div>

              {/* PhotoSessionCard を使用 - カードレイアウト */}
              <PhotoSessionCard
                session={getSessionWithOrganizer(booking)}
                onViewDetails={sessionId => {
                  // 撮影会詳細ページに遷移
                  window.location.href = `/ja/photo-sessions/${sessionId}`;
                }}
                showActions={false} // 予約一覧では詳細ボタンのみ表示
                layoutMode="card"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
