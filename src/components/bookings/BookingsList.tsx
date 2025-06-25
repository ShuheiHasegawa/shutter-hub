'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookingCard } from './BookingCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, FilterIcon, RefreshCwIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BookingWithDetails } from '@/types/database';
import { getUserBookings } from '@/app/actions/bookings';
import { useToast } from '@/hooks/use-toast';

type FilterStatus = 'all' | 'confirmed' | 'cancelled' | 'upcoming' | 'past';

export function BookingsList() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<
    BookingWithDetails[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const { toast } = useToast();
  const t = useTranslations('bookings');

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getUserBookings();

      if (result.success && result.bookings) {
        setBookings(result.bookings);
      } else {
        toast({
          title: t('loadError'),
          description: result.error || t('loadErrorDescription'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('loadError'),
        description: t('loadErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const now = new Date();
    let filtered = bookings;

    switch (filterStatus) {
      case 'confirmed':
        filtered = bookings.filter(booking => booking.status === 'confirmed');
        break;
      case 'cancelled':
        filtered = bookings.filter(booking => booking.status === 'cancelled');
        break;
      case 'upcoming':
        filtered = bookings.filter(booking => {
          if (!booking.photo_session) return false;
          const startDate = new Date(booking.photo_session.start_time);
          return startDate > now && booking.status === 'confirmed';
        });
        break;
      case 'past':
        filtered = bookings.filter(booking => {
          if (!booking.photo_session) return false;
          const endDate = new Date(booking.photo_session.end_time);
          return endDate <= now;
        });
        break;
      default:
        filtered = bookings;
    }

    setFilteredBookings(filtered);
  }, [bookings, filterStatus]);

  const getStatusCounts = () => {
    const now = new Date();
    return {
      all: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      upcoming: bookings.filter(b => {
        if (!b.photo_session) return false;
        const startDate = new Date(b.photo_session.start_time);
        return startDate > now && b.status === 'confirmed';
      }).length,
      past: bookings.filter(b => {
        if (!b.photo_session) return false;
        const endDate = new Date(b.photo_session.end_time);
        return endDate <= now;
      }).length,
    };
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
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
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button onClick={loadBookings} variant="outline" size="sm">
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          {t('refresh')}
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{statusCounts.all}</div>
            <div className="text-sm text-muted-foreground">
              {t('stats.total')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {statusCounts.upcoming}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('stats.upcoming')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">
              {statusCounts.confirmed}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('stats.confirmed')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {statusCounts.past}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('stats.past')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {statusCounts.cancelled}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('stats.cancelled')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            {t('filter.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              value={filterStatus}
              onValueChange={(value: FilterStatus) => setFilterStatus(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('filter.all')} ({statusCounts.all})
                </SelectItem>
                <SelectItem value="upcoming">
                  {t('filter.upcoming')} ({statusCounts.upcoming})
                </SelectItem>
                <SelectItem value="confirmed">
                  {t('filter.confirmed')} ({statusCounts.confirmed})
                </SelectItem>
                <SelectItem value="past">
                  {t('filter.past')} ({statusCounts.past})
                </SelectItem>
                <SelectItem value="cancelled">
                  {t('filter.cancelled')} ({statusCounts.cancelled})
                </SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">
              {filteredBookings.length} {t('filter.results')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 予約一覧 */}
      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('empty.title')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('empty.description')}
            </p>
            <Button onClick={() => (window.location.href = '/photo-sessions')}>
              {t('empty.browseButton')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookings.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onBookingUpdate={loadBookings}
            />
          ))}
        </div>
      )}
    </div>
  );
}
