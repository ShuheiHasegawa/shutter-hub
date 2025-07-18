'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Crown, Ticket, Users, Star } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  checkPriorityBookingEligibility,
  createPriorityBooking,
  getUserRank,
  type PriorityBookingEligibility,
  type UserRank,
} from '@/app/actions/photo-session-priority';

interface PriorityBookingFormProps {
  photoSessionId: string;
  onBookingSuccess?: () => void;
}

const rankColors = {
  bronze: 'bg-amber-600',
  silver: 'bg-gray-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-purple-500',
  vip: 'bg-red-500',
};

const rankIcons = {
  bronze: Star,
  silver: Star,
  gold: Crown,
  platinum: Crown,
  vip: Crown,
};

export function PriorityBookingForm({
  photoSessionId,
  onBookingSuccess,
}: PriorityBookingFormProps) {
  const t = useTranslations('priority_booking');
  const [eligibility, setEligibility] =
    useState<PriorityBookingEligibility | null>(null);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    loadEligibilityAndRank();
  }, [photoSessionId]);

  const loadEligibilityAndRank = async () => {
    setIsLoading(true);
    try {
      const [eligibilityResult, rankResult] = await Promise.all([
        checkPriorityBookingEligibility(photoSessionId),
        getUserRank(),
      ]);

      if (eligibilityResult.success && eligibilityResult.data) {
        setEligibility(eligibilityResult.data);
      }

      if (rankResult.success && rankResult.data) {
        setUserRank(rankResult.data);
      }
    } catch (error) {
      logger.error('データ取得エラー:', error);
      toast.error(t('error.load_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!eligibility) return;

    setIsBooking(true);
    try {
      const result = await createPriorityBooking(
        photoSessionId,
        eligibility.booking_type
      );

      if (result.success) {
        toast.success(t('success.booking_created'));
        onBookingSuccess?.();
      } else {
        toast.error(result.error || t('error.booking_failed'));
      }
    } catch (error) {
      logger.error('予約エラー:', error);
      toast.error(t('error.unexpected'));
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!eligibility) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            {t('error.no_eligibility')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const RankIcon = userRank ? rankIcons[userRank.rank] : Star;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ユーザーランク表示 */}
        {userRank && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Crown className="h-4 w-4" />
              {t('user_rank.title')}
            </h4>
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className={`${rankColors[userRank.rank]} text-white`}
              >
                <RankIcon className="h-3 w-3 mr-1" />
                {t(`user_rank.${userRank.rank}`)}
              </Badge>
              <div className="text-sm text-muted-foreground">
                {t('user_rank.points', { points: userRank.points })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {t('user_rank.participation_count')}:{' '}
                </span>
                <span className="font-medium">
                  {userRank.participation_count}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t('user_rank.total_bookings')}:{' '}
                </span>
                <span className="font-medium">{userRank.total_bookings}</span>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* 予約可能性表示 */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('booking_status.title')}
          </h4>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={eligibility.can_book ? 'default' : 'secondary'}>
                {eligibility.can_book
                  ? t('booking_status.available')
                  : t('booking_status.unavailable')}
              </Badge>
              {eligibility.booking_type === 'ticket_priority' && (
                <Badge
                  variant="outline"
                  className="text-purple-600 border-purple-600"
                >
                  <Ticket className="h-3 w-3 mr-1" />
                  {t('booking_type.ticket_priority')}
                </Badge>
              )}
              {eligibility.booking_type === 'rank_priority' && (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-600"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  {t('booking_type.rank_priority')}
                </Badge>
              )}
              {eligibility.booking_type === 'general' && (
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {t('booking_type.general')}
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {eligibility.reason}
            </p>

            {!eligibility.can_book && eligibility.available_from && (
              <p className="text-sm text-muted-foreground">
                {t('booking_status.available_from')}:{' '}
                <span className="font-medium">
                  {format(new Date(eligibility.available_from), 'PPP p', {
                    locale: ja,
                  })}
                </span>
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* 予約ボタン */}
        <div className="space-y-3">
          <Button
            onClick={handleBooking}
            disabled={!eligibility.can_book || isBooking}
            className="w-full"
            size="lg"
          >
            {isBooking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('button.booking')}
              </>
            ) : eligibility.can_book ? (
              t('button.book_now')
            ) : (
              t('button.unavailable')
            )}
          </Button>

          {eligibility.booking_type === 'ticket_priority' && (
            <p className="text-xs text-center text-muted-foreground">
              {t('notice.ticket_will_be_used')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
