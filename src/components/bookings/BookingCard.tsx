'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  CircleDollarSignIcon,
  ClockIcon,
  XIcon,
  EyeIcon,
} from 'lucide-react';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import { useTranslations, useLocale } from 'next-intl';
import { BookingWithDetails } from '@/types/database';
import { cancelBooking } from '@/app/actions/bookings';
import { useToast } from '@/hooks/use-toast';

interface BookingCardProps {
  booking: BookingWithDetails;
  onBookingUpdate?: () => void;
}

export function BookingCard({ booking, onBookingUpdate }: BookingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const t = useTranslations('bookings');
  const locale = useLocale();

  const { photo_session: session } = booking;

  if (!session) {
    return null;
  }

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);
  const now = new Date();
  const isUpcoming = startDate > now;
  const isOngoing = startDate <= now && endDate > now;
  const isPast = endDate <= now;

  const getStatusBadge = () => {
    if (booking.status === 'cancelled') {
      return <Badge variant="destructive">{t('status.cancelled')}</Badge>;
    }
    if (isPast) {
      return <Badge variant="secondary">{t('status.completed')}</Badge>;
    }
    if (isOngoing) {
      return <Badge variant="default">{t('status.ongoing')}</Badge>;
    }
    if (isUpcoming) {
      return <Badge variant="outline">{t('status.upcoming')}</Badge>;
    }
    return <Badge variant="outline">{t('status.confirmed')}</Badge>;
  };

  const canCancel = booking.status === 'confirmed' && isUpcoming;

  const handleCancel = async () => {
    if (!canCancel) return;

    setIsLoading(true);
    try {
      const result = await cancelBooking(booking.id);

      if (result.success) {
        toast({
          title: t('cancelSuccess'),
          description: t('cancelSuccessDescription'),
        });
        onBookingUpdate?.();
      } else {
        toast({
          title: t('cancelError'),
          description: result.error || t('cancelErrorDescription'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('cancelError'),
        description: t('cancelErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">
              {session.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 撮影会詳細情報 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatDateLocalized(startDate, locale, 'long')}{' '}
              {formatTimeLocalized(startDate, locale)}
              {' - '}
              {formatTimeLocalized(endDate, locale)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
            <span className="line-clamp-1">{session.location}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {session.current_participants} / {session.max_participants}{' '}
              {t('participants')}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <CircleDollarSignIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              ¥{session.price_per_person.toLocaleString()} {t('perPerson')}
            </span>
          </div>
        </div>

        <Separator />

        {/* 予約情報 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {t('bookedAt')}:{' '}
              {formatDateLocalized(
                new Date(booking.created_at),
                locale,
                'short'
              )}
            </span>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" className="flex-1">
            <a href={`/photo-sessions/${session.id}`}>
              <EyeIcon className="h-4 w-4 mr-2" />
              {t('viewDetails')}
            </a>
          </Button>

          {canCancel && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('cancelling')}
                </>
              ) : (
                <>
                  <XIcon className="h-4 w-4 mr-2" />
                  {t('cancel')}
                </>
              )}
            </Button>
          )}
        </div>

        {/* キャンセル注意事項 */}
        {canCancel && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <p>{t('cancelNote')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
