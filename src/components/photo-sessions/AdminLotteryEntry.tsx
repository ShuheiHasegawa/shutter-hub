'use client';

import { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { applyToAdminLottery } from '@/app/actions/admin-lottery';
import {
  Calendar,
  Clock,
  Users,
  UserCheck,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface AdminLotterySession {
  id: string;
  photo_session_id: string;
  entry_start_time: string;
  entry_end_time: string;
  selection_deadline: string;
  max_winners: number;
  status: 'upcoming' | 'accepting' | 'selecting' | 'completed';
  selection_criteria: Record<string, unknown>;
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

interface AdminLotteryEntry {
  id: string;
  admin_lottery_session_id: string;
  user_id: string;
  application_message: string | null;
  status: 'applied' | 'selected' | 'rejected';
  selected_at: string | null;
  selected_by: string | null;
  selection_reason: string | null;
  created_at: string;
}

interface AdminLotteryEntryProps {
  adminLotterySession: AdminLotterySession;
  userEntry?: AdminLotteryEntry | null;
  onEntrySuccess?: () => void;
}

export function AdminLotteryEntry({
  adminLotterySession,
  userEntry,
  onEntrySuccess,
}: AdminLotteryEntryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useTranslations('adminLottery');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const dateLocale = locale === 'ja' ? ja : enUS;

  const [applicationMessage, setApplicationMessage] = useState('');
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
      const result = await applyToAdminLottery({
        admin_lottery_session_id: adminLotterySession.id,
        application_message: applicationMessage.trim() || undefined,
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
        description: t('applicationCompleted'),
      });

      setApplicationMessage('');
      onEntrySuccess?.();
    } catch (error) {
      logger.error('管理抽選応募エラー:', error);
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
    switch (adminLotterySession.status) {
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
            <UserCheck className="h-3 w-3" />
            {t('status.accepting')}
          </Badge>
        );
      case 'selecting':
        return (
          <Badge variant="outline" className="gap-1">
            <Crown className="h-3 w-3" />
            {t('status.selecting')}
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
      case 'applied':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {t('entryStatus.applied')}
          </Badge>
        );
      case 'selected':
        return (
          <Badge
            variant="default"
            className="gap-1 bg-yellow-500 hover:bg-yellow-600"
          >
            <Crown className="h-3 w-3" />
            {t('entryStatus.selected')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t('entryStatus.rejected')}
          </Badge>
        );
    }
  };

  const canApply = () => {
    if (!user) return false;
    if (userEntry) return false;
    if (adminLotterySession.status !== 'accepting') return false;

    const now = new Date();
    const entryStart = new Date(adminLotterySession.entry_start_time);
    const entryEnd = new Date(adminLotterySession.entry_end_time);

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
      if (userEntry.status === 'selected') {
        return {
          type: 'success' as const,
          message: t('congratulations'),
          description: t('selectedInstructions'),
        };
      }
      if (userEntry.status === 'rejected') {
        return {
          type: 'info' as const,
          message: t('notSelectedThisTime'),
        };
      }
      return {
        type: 'info' as const,
        message: t('applicationCompleted'),
        description: t('awaitingSelection'),
      };
    }

    const now = new Date();
    const entryStart = new Date(adminLotterySession.entry_start_time);
    const entryEnd = new Date(adminLotterySession.entry_end_time);

    if (now < entryStart) {
      return {
        type: 'warning' as const,
        message: t('applicationNotStarted'),
      };
    }

    if (now > entryEnd) {
      return {
        type: 'warning' as const,
        message: t('applicationEnded'),
      };
    }

    if (adminLotterySession.status !== 'accepting') {
      return {
        type: 'warning' as const,
        message: t('applicationNotAccepting'),
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
                {adminLotterySession.photo_session.title}
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
                {adminLotterySession.photo_session.organizer.display_name}
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
                  new Date(adminLotterySession.photo_session.start_time),
                  'PPP',
                  { locale: dateLocale }
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {format(
                  new Date(adminLotterySession.photo_session.start_time),
                  'HH:mm',
                  { locale: dateLocale }
                )}{' '}
                -{' '}
                {format(
                  new Date(adminLotterySession.photo_session.end_time),
                  'HH:mm',
                  { locale: dateLocale }
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {t('winnersCount', { count: adminLotterySession.max_winners })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                ¥
                {adminLotterySession.photo_session.price_per_person.toLocaleString()}
                {adminLotterySession.photo_session.price_per_person === 0 &&
                  ` (${t('free')})`}
              </span>
            </div>
          </div>

          {/* 説明 */}
          {adminLotterySession.photo_session.description && (
            <div>
              <p className="text-sm text-muted-foreground">
                {adminLotterySession.photo_session.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 管理抽選スケジュール */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('schedule.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-sm font-medium">
              {t('schedule.applicationPeriod')}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(
                new Date(adminLotterySession.entry_start_time),
                'PPP HH:mm',
                {
                  locale: dateLocale,
                }
              )}{' '}
              -{' '}
              {format(
                new Date(adminLotterySession.entry_end_time),
                'PPP HH:mm',
                {
                  locale: dateLocale,
                }
              )}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">
              {t('schedule.selectionDeadline')}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(
                new Date(adminLotterySession.selection_deadline),
                'PPP HH:mm',
                {
                  locale: dateLocale,
                }
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 応募フォーム */}
      {canApply() && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('applyToAdminLottery')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('applicationMessage')} ({t('optional')})
                </label>
                <Textarea
                  value={applicationMessage}
                  onChange={e => setApplicationMessage(e.target.value)}
                  placeholder={t('applicationMessagePlaceholder')}
                  rows={6}
                  maxLength={1000}
                  disabled={isSubmitting}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {applicationMessage.length}/1000
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {t('applicationMessageHint')}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('applicationInProgress')}
                  </>
                ) : (
                  t('applyToAdminLottery')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 応募状況メッセージ */}
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

      {/* ユーザーの応募メッセージ表示 */}
      {userEntry?.application_message && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('yourApplicationMessage')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {userEntry.application_message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 選出理由表示（選出された場合） */}
      {userEntry?.status === 'selected' && userEntry.selection_reason && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="h-5 w-5" />
              {t('selectionReason')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {userEntry.selection_reason}
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
            <li>• {t('notes.organizerSelection')}</li>
            <li>• {t('notes.selectionCriteria')}</li>
            <li>• {t('notes.resultNotification')}</li>
            <li>• {t('notes.fairSelection')}</li>
            <li>• {t('notes.noRefund')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
