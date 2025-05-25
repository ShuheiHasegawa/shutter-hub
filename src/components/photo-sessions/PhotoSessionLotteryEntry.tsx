'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { enterLottery } from '@/app/actions/photo-session-lottery';
import {
  Calendar,
  Clock,
  Users,
  Shuffle,
  MessageSquare,
  CheckCircle,
  XCircle,
  Trophy,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface LotterySession {
  id: string;
  photo_session_id: string;
  entry_start_time: string;
  entry_end_time: string;
  lottery_date: string;
  max_winners: number;
  status: 'upcoming' | 'accepting' | 'closed' | 'completed';
  photo_session: {
    id: string;
    title: string;
    description: string | null;
    location: string;
    start_time: string;
    end_time: string;
    max_participants: number;
    price_per_person: number;
    organizer: {
      id: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
}

interface LotteryEntry {
  id: string;
  lottery_session_id: string;
  user_id: string;
  message: string | null;
  status: 'entered' | 'won' | 'lost';
  won_at: string | null;
  created_at: string;
}

interface PhotoSessionLotteryEntryProps {
  lotterySession: LotterySession;
  userEntry?: LotteryEntry | null;
  onEntrySuccess?: () => void;
}

export function PhotoSessionLotteryEntry({
  lotterySession,
  userEntry,
  onEntrySuccess,
}: PhotoSessionLotteryEntryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useTranslations('lottery');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const dateLocale = locale === 'ja' ? ja : enUS;

  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: t('loginRequired'),
        description: t('loginRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await enterLottery({
        lottery_session_id: lotterySession.id,
        message: message.trim() || undefined,
      });

      if (result.error) {
        toast({
          title: tErrors('title'),
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: tCommon('success'),
        description: t('entryCompleted'),
      });

      setMessage('');
      onEntrySuccess?.();
    } catch (error) {
      console.error('抽選エントリーエラー:', error);
      toast({
        title: tErrors('title'),
        description: tErrors('unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    switch (lotterySession.status) {
      case 'upcoming':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {t('status.upcoming')}
          </Badge>
        );
      case 'accepting':
        return (
          <Badge variant="default" className="gap-1">
            <Shuffle className="h-3 w-3" />
            {t('status.accepting')}
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t('status.closed')}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {t('status.completed')}
          </Badge>
        );
    }
  };

  const getEntryStatusBadge = () => {
    if (!userEntry) return null;

    switch (userEntry.status) {
      case 'entered':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {t('entryStatus.entered')}
          </Badge>
        );
      case 'won':
        return (
          <Badge
            variant="default"
            className="gap-1 bg-yellow-500 hover:bg-yellow-600"
          >
            <Trophy className="h-3 w-3" />
            {t('entryStatus.won')}
          </Badge>
        );
      case 'lost':
        return (
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t('entryStatus.lost')}
          </Badge>
        );
    }
  };

  const canEnter = () => {
    if (!user) return false;
    if (userEntry) return false;
    if (lotterySession.status !== 'accepting') return false;

    const now = new Date();
    const entryStart = new Date(lotterySession.entry_start_time);
    const entryEnd = new Date(lotterySession.entry_end_time);

    return now >= entryStart && now <= entryEnd;
  };

  const getEntryMessage = () => {
    if (!user) {
      return {
        type: 'error' as const,
        message: t('pleaseLogin'),
      };
    }

    if (userEntry) {
      if (userEntry.status === 'won') {
        return {
          type: 'success' as const,
          message: t('congratulations'),
          description: t('winnerInstructions'),
        };
      }
      if (userEntry.status === 'lost') {
        return {
          type: 'info' as const,
          message: t('betterLuckNextTime'),
        };
      }
      return {
        type: 'info' as const,
        message: t('entryCompleted'),
      };
    }

    const now = new Date();
    const entryStart = new Date(lotterySession.entry_start_time);
    const entryEnd = new Date(lotterySession.entry_end_time);

    if (now < entryStart) {
      return {
        type: 'warning' as const,
        message: t('entryNotStarted'),
      };
    }

    if (now > entryEnd) {
      return {
        type: 'warning' as const,
        message: t('entryEnded'),
      };
    }

    if (lotterySession.status !== 'accepting') {
      return {
        type: 'warning' as const,
        message: t('entryNotAccepting'),
      };
    }

    return null;
  };

  const entryMessage = getEntryMessage();

  return (
    <div className="space-y-6">
      {/* 撮影会情報 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">
                {lotterySession.photo_session.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge()}
                {getEntryStatusBadge()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                {t('organizer')}
              </div>
              <div className="font-medium">
                {lotterySession.photo_session.organizer.display_name}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 撮影会詳細 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {format(
                  new Date(lotterySession.photo_session.start_time),
                  'PPP',
                  { locale: dateLocale }
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {format(
                  new Date(lotterySession.photo_session.start_time),
                  'HH:mm',
                  { locale: dateLocale }
                )}{' '}
                -{' '}
                {format(
                  new Date(lotterySession.photo_session.end_time),
                  'HH:mm',
                  { locale: dateLocale }
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {t('winnersCount', { count: lotterySession.max_winners })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                ¥
                {lotterySession.photo_session.price_per_person.toLocaleString()}
                {lotterySession.photo_session.price_per_person === 0 &&
                  ` (${t('free')})`}
              </span>
            </div>
          </div>

          {/* 説明 */}
          {lotterySession.photo_session.description && (
            <div>
              <p className="text-sm text-muted-foreground">
                {lotterySession.photo_session.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 抽選スケジュール */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('schedule.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-sm font-medium">
              {t('schedule.entryPeriod')}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(lotterySession.entry_start_time), 'PPP HH:mm', {
                locale: dateLocale,
              })}{' '}
              -{' '}
              {format(new Date(lotterySession.entry_end_time), 'PPP HH:mm', {
                locale: dateLocale,
              })}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">
              {t('schedule.lotteryDate')}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(lotterySession.lottery_date), 'PPP HH:mm', {
                locale: dateLocale,
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* エントリーフォーム */}
      {canEnter() && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('enterLottery')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('applicationMessage')} ({t('optional')})
                </label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={t('applicationMessagePlaceholder')}
                  rows={4}
                  maxLength={500}
                  disabled={isSubmitting}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {message.length}/500
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('entryInProgress')}
                  </>
                ) : (
                  t('enterLottery')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* エントリー状況メッセージ */}
      {entryMessage && (
        <Card>
          <CardContent className="pt-6">
            <div
              className={`flex items-start gap-3 ${
                entryMessage.type === 'success'
                  ? 'text-green-700'
                  : entryMessage.type === 'error'
                    ? 'text-red-700'
                    : entryMessage.type === 'warning'
                      ? 'text-yellow-700'
                      : 'text-blue-700'
              }`}
            >
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">{entryMessage.message}</div>
                {entryMessage.description && (
                  <div className="text-sm mt-1">{entryMessage.description}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ユーザーのメッセージ表示 */}
      {userEntry?.message && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('yourMessage')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {userEntry.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 注意事項 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('notes.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• {t('notes.fairLottery')}</li>
            <li>• {t('notes.resultNotification')}</li>
            <li>• {t('notes.winnerBooking')}</li>
            <li>• {t('notes.noRefund')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
