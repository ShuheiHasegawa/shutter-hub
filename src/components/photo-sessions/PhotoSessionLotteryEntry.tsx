'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  createLotteryEntry,
  getUserLotteryEntry,
  getLotteryPhotoSession,
} from '@/app/actions/photo-session-lottery';
import type {
  LotteryPhotoSessionWithDetails,
  LotteryEntry,
} from '@/types/database';
import {
  CalendarIcon,
  MapPinIcon,
  CircleDollarSignIcon,
  UserIcon,
  ClockIcon,
  TrophyIcon,
} from 'lucide-react';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import { useTranslations, useLocale } from 'next-intl';

interface PhotoSessionLotteryEntryProps {
  lotterySessionId: string;
  onEntrySuccess?: () => void;
  onEntryError?: (error: string) => void;
}

export function PhotoSessionLotteryEntry({
  lotterySessionId,
  onEntrySuccess,
  onEntryError,
}: PhotoSessionLotteryEntryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useTranslations('lottery');
  const tErrors = useTranslations('errors');
  const tSuccess = useTranslations('success');
  const locale = useLocale();

  const [lotterySession, setLotterySession] =
    useState<LotteryPhotoSessionWithDetails | null>(null);
  const [userEntry, setUserEntry] = useState<LotteryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [applicationMessage, setApplicationMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [lotterySessionId, user]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      // 抽選撮影会の詳細を取得
      const lotteryResult = await getLotteryPhotoSession(lotterySessionId);
      if (lotteryResult.success && lotteryResult.data) {
        setLotterySession(lotteryResult.data);
      }

      // ユーザーのエントリー状況を取得
      if (user) {
        const entryResult = await getUserLotteryEntry(
          lotterySessionId,
          user.id
        );
        if (entryResult.success && entryResult.data) {
          setUserEntry(entryResult.data);
        }
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleEntry = async () => {
    if (!user || !lotterySession) {
      toast({
        title: t('loginRequired'),
        description: t('loginRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createLotteryEntry(
        lotterySessionId,
        user.id,
        applicationMessage.trim() || undefined
      );

      if (result.success) {
        toast({
          title: tSuccess('entryCompleted'),
          description: tSuccess('entryCompletedDescription'),
        });

        // エントリー状況を再取得
        await loadData();

        if (onEntrySuccess) {
          onEntrySuccess();
        }
      } else {
        const errorMessage = result.error || tErrors('entryFailed');
        toast({
          title: tErrors('title'),
          description: errorMessage,
          variant: 'destructive',
        });

        if (onEntryError) {
          onEntryError(errorMessage);
        }
      }
    } catch (error) {
      console.error('エントリーエラー:', error);
      const errorMessage = tErrors('unexpectedError');
      toast({
        title: tErrors('title'),
        description: errorMessage,
        variant: 'destructive',
      });

      if (onEntryError) {
        onEntryError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lotterySession) {
    return (
      <Card className="w-full">
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">{t('sessionNotFound')}</p>
        </CardContent>
      </Card>
    );
  }

  const { photo_session } = lotterySession;
  const entryStartDate = new Date(lotterySession.entry_start);
  const entryEndDate = new Date(lotterySession.entry_end);
  const lotteryDate = new Date(lotterySession.lottery_date);
  const sessionStartDate = new Date(photo_session.start_time);
  const sessionEndDate = new Date(photo_session.end_time);
  const now = new Date();

  const isEntryPeriod = now >= entryStartDate && now <= entryEndDate;
  const isBeforeEntry = now < entryStartDate;
  const isAfterEntry = now > entryEndDate;
  const isLotteryCompleted = lotterySession.status === 'completed';

  const getStatusBadge = () => {
    if (isLotteryCompleted) {
      return <Badge variant="secondary">{t('status.completed')}</Badge>;
    }
    if (isAfterEntry) {
      return <Badge variant="outline">{t('status.closed')}</Badge>;
    }
    if (isEntryPeriod) {
      return <Badge variant="default">{t('status.accepting')}</Badge>;
    }
    if (isBeforeEntry) {
      return <Badge variant="outline">{t('status.upcoming')}</Badge>;
    }
    return null;
  };

  const getEntryStatusBadge = () => {
    if (!userEntry) return null;

    switch (userEntry.status) {
      case 'entered':
        return <Badge variant="outline">{t('entryStatus.entered')}</Badge>;
      case 'won':
        return (
          <Badge variant="default" className="bg-green-500">
            {t('entryStatus.won')}
          </Badge>
        );
      case 'lost':
        return <Badge variant="secondary">{t('entryStatus.lost')}</Badge>;
      default:
        return null;
    }
  };

  const canEntry =
    !userEntry && isEntryPeriod && lotterySession.status === 'accepting';

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{photo_session.title}</CardTitle>
          <div className="flex gap-2">
            {getStatusBadge()}
            {getEntryStatusBadge()}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserIcon className="h-4 w-4" />
          <span>
            {t('organizer')}:{' '}
            {photo_session.organizer.display_name ||
              photo_session.organizer.email}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {photo_session.description && (
          <p className="text-muted-foreground">{photo_session.description}</p>
        )}

        {/* 撮影会詳細情報 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div>{formatDateLocalized(sessionStartDate, locale, 'long')}</div>
              <div className="text-muted-foreground">
                {formatTimeLocalized(sessionStartDate, locale)} -{' '}
                {formatTimeLocalized(sessionEndDate, locale)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div>{photo_session.location}</div>
              {photo_session.address && (
                <div className="text-muted-foreground">
                  {photo_session.address}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TrophyIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {t('winnersCount', { count: lotterySession.winners_count })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CircleDollarSignIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {photo_session.price_per_person === 0
                ? t('free')
                : `¥${photo_session.price_per_person.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* 抽選スケジュール */}
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-medium">{t('schedule.title')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t('schedule.entryPeriod')}:</span>
              <span>
                {formatDateLocalized(entryStartDate, locale)}{' '}
                {formatTimeLocalized(entryStartDate, locale)} -
                {formatDateLocalized(entryEndDate, locale)}{' '}
                {formatTimeLocalized(entryEndDate, locale)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrophyIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t('schedule.lotteryDate')}:</span>
              <span>
                {formatDateLocalized(lotteryDate, locale)}{' '}
                {formatTimeLocalized(lotteryDate, locale)}
              </span>
            </div>
          </div>
        </div>

        {/* エントリーフォーム */}
        {!user ? (
          <div className="text-center border rounded-lg p-6">
            <p className="text-muted-foreground mb-4">
              {t('loginRequiredDescription')}
            </p>
            <Button variant="outline" disabled>
              {t('pleaseLogin')}
            </Button>
          </div>
        ) : userEntry ? (
          <div className="text-center border rounded-lg p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                {getEntryStatusBadge()}
              </div>

              {userEntry.status === 'entered' && (
                <p className="text-muted-foreground">{t('entryCompleted')}</p>
              )}

              {userEntry.status === 'won' && (
                <div className="space-y-2">
                  <p className="text-green-600 font-medium">
                    {t('congratulations')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('winnerInstructions')}
                  </p>
                </div>
              )}

              {userEntry.status === 'lost' && (
                <p className="text-muted-foreground">
                  {t('betterLuckNextTime')}
                </p>
              )}

              {userEntry.application_message && (
                <div className="text-left">
                  <p className="text-sm font-medium mb-1">
                    {t('yourMessage')}:
                  </p>
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {userEntry.application_message}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : canEntry ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('applicationMessage')} ({t('optional')})
              </label>
              <Textarea
                value={applicationMessage}
                onChange={e => setApplicationMessage(e.target.value)}
                placeholder={t('applicationMessagePlaceholder')}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {applicationMessage.length}/500
              </p>
            </div>

            <Button
              onClick={handleEntry}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('entryInProgress')}
                </>
              ) : (
                t('enterLottery')
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center border rounded-lg p-6">
            <p className="text-muted-foreground">
              {isBeforeEntry && t('entryNotStarted')}
              {isAfterEntry && t('entryEnded')}
              {lotterySession.status !== 'accepting' && t('entryNotAccepting')}
            </p>
          </div>
        )}

        {/* 注意事項 */}
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
          <p className="font-medium">{t('notes.title')}:</p>
          <p>• {t('notes.fairLottery')}</p>
          <p>• {t('notes.resultNotification')}</p>
          <p>• {t('notes.winnerBooking')}</p>
          <p>• {t('notes.noRefund')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
