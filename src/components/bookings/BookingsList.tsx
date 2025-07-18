'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/lib/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarIcon,
  RefreshCwIcon,
  UsersIcon,
  TrendingUpIcon,
  ClockIcon,
  Clock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  BookingWithDetails,
  WaitlistEntryWithPhotoSession,
} from '@/types/database';
import { getUserBookings } from '@/app/actions/bookings';
import { getUserWaitlistEntries } from '@/app/actions/photo-session-waitlist';
import { useToast } from '@/hooks/use-toast';
import { PhotoSessionCard } from '@/components/photo-sessions/PhotoSessionCard';

type FilterStatus =
  | 'all'
  | 'confirmed'
  | 'cancelled'
  | 'upcoming'
  | 'past'
  | 'waitlist';

// 統合表示用の型
type BookingOrWaitlistItem =
  | { type: 'booking'; data: BookingWithDetails }
  | { type: 'waitlist'; data: WaitlistEntryWithPhotoSession };

export function BookingsList() {
  const t = useTranslations('bookings');
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<
    WaitlistEntryWithPhotoSession[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  // データ読み込み
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 予約とキャンセル待ちを並行取得
      const [bookingsResult, waitlistResult] = await Promise.all([
        getUserBookings(),
        getUserWaitlistEntries(),
      ]);

      if (bookingsResult.success && bookingsResult.bookings) {
        setBookings(bookingsResult.bookings);
      } else if (bookingsResult.error) {
        toast({
          title: t('loadError'),
          description: bookingsResult.error,
          variant: 'destructive',
        });
      }

      if (waitlistResult.success && waitlistResult.data) {
        // 型の不一致を解決するため、データを適切に変換
        const waitlistData = waitlistResult.data.map(entry => ({
          ...entry,
          id: entry.id || '',
          created_at: entry.created_at || '',
        })) as WaitlistEntryWithPhotoSession[];
        setWaitlistEntries(waitlistData);
      } else if (waitlistResult.error) {
        toast({
          title: t('loadError'),
          description: waitlistResult.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('データ読み込みエラー:', error);
      toast({
        title: t('loadError'),
        description: t('loadErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 統計計算
  const stats = useMemo(() => {
    const now = new Date();

    const confirmedBookings = bookings.filter(
      booking => booking.status === 'confirmed'
    );
    const upcomingBookings = confirmedBookings.filter(
      booking => new Date(booking.photo_session.start_time) > now
    );
    const pastBookings = confirmedBookings.filter(
      booking => new Date(booking.photo_session.start_time) <= now
    );
    const cancelledBookings = bookings.filter(
      booking => booking.status === 'cancelled'
    );

    return {
      total: bookings.length,
      confirmed: confirmedBookings.length,
      upcoming: upcomingBookings.length,
      past: pastBookings.length,
      cancelled: cancelledBookings.length,
      waitlist: waitlistEntries.length,
    };
  }, [bookings, waitlistEntries]);

  // フィルタリング
  const filteredItems = useMemo(() => {
    const now = new Date();
    let items: BookingOrWaitlistItem[] = [];

    // 予約をフィルタリング
    const filteredBookings = bookings.filter(booking => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'confirmed') return booking.status === 'confirmed';
      if (statusFilter === 'cancelled') return booking.status === 'cancelled';
      if (statusFilter === 'upcoming') {
        return (
          booking.status === 'confirmed' &&
          new Date(booking.photo_session.start_time) > now
        );
      }
      if (statusFilter === 'past') {
        return (
          booking.status === 'confirmed' &&
          new Date(booking.photo_session.start_time) <= now
        );
      }
      return false;
    });

    items = filteredBookings.map(booking => ({
      type: 'booking' as const,
      data: booking,
    }));

    // キャンセル待ちをフィルタリング
    if (statusFilter === 'all' || statusFilter === 'waitlist') {
      const waitlistItems = waitlistEntries.map(entry => ({
        type: 'waitlist' as const,
        data: entry,
      }));
      items = [...items, ...waitlistItems];
    }

    return items;
  }, [bookings, waitlistEntries, statusFilter]);

  // 予約ステータスバッジを取得
  const getBookingStatusBadge = (item: BookingOrWaitlistItem) => {
    if (item.type === 'waitlist') {
      return (
        <Badge
          variant="outline"
          className="bg-yellow-50 text-yellow-700 border-yellow-200"
        >
          <Clock className="h-3 w-3 mr-1" />
          {t('status.waitlist')}
        </Badge>
      );
    }

    const booking = item.data;
    const now = new Date();
    const sessionTime = new Date(booking.photo_session.start_time);

    if (booking.status === 'cancelled') {
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200"
        >
          {t('status.cancelled')}
        </Badge>
      );
    }

    if (booking.status === 'confirmed') {
      if (sessionTime > now) {
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            {t('status.upcoming')}
          </Badge>
        );
      } else {
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            {t('status.past')}
          </Badge>
        );
      }
    }

    return (
      <Badge
        variant="outline"
        className="bg-gray-50 text-gray-700 border-gray-200"
      >
        {t('status.confirmed')}
      </Badge>
    );
  };

  // PhotoSessionCard用のセッションデータを取得
  const getSessionWithOrganizer = (item: BookingOrWaitlistItem) => {
    if (item.type === 'waitlist') {
      return item.data.photo_session;
    }

    // 予約の場合、ダミーのオーガナイザー情報を追加
    return {
      ...item.data.photo_session,
      organizer: {
        id: item.data.photo_session.organizer_id,
        email: '',
        display_name: '運営者',
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダーと更新ボタン */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button
          onClick={loadData}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          {t('refresh')}
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.total')}
            </CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.upcoming')}
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.confirmed')}
            </CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
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
            <div className="text-2xl font-bold">{stats.past}</div>
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
            <div className="text-2xl font-bold">{stats.cancelled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.waitlist')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waitlist}</div>
          </CardContent>
        </Card>
      </div>

      {/* フィルターボタン */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: t('filters.all') },
          { key: 'upcoming', label: t('filters.upcoming') },
          { key: 'confirmed', label: t('filters.confirmed') },
          { key: 'past', label: t('filters.past') },
          { key: 'cancelled', label: t('filters.cancelled') },
          { key: 'waitlist', label: t('filters.waitlist') },
        ].map(filter => (
          <Button
            key={filter.key}
            variant={statusFilter === filter.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(filter.key as FilterStatus)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* 予約一覧 */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">{t('noBookings')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map(item => (
            <div key={`${item.type}-${item.data.id}`} className="relative">
              {/* ステータスバッジを右上に表示 */}
              <div className="absolute top-4 right-4 z-10">
                {getBookingStatusBadge(item)}
              </div>

              {/* キャンセル待ちの場合は順位を表示 */}
              {item.type === 'waitlist' && (
                <div className="absolute top-4 left-4 z-10">
                  <Badge
                    variant="outline"
                    className="bg-orange-50 text-orange-700 border-orange-200"
                  >
                    {t('waitlistPosition', {
                      position: item.data.queue_position,
                    })}
                  </Badge>
                </div>
              )}

              {/* PhotoSessionCard を使用 - 横長レイアウト */}
              <PhotoSessionCard
                session={getSessionWithOrganizer(item)}
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
