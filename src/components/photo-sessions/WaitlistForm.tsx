'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  joinWaitlist,
  cancelWaitlistEntry,
  getUserWaitlistEntry,
  confirmPromotedBooking,
  type WaitlistEntry,
} from '@/app/actions/photo-session-waitlist';

interface WaitlistFormProps {
  photoSessionId: string;
  onWaitlistUpdate?: () => void;
}

export function WaitlistForm({
  photoSessionId,
  onWaitlistUpdate,
}: WaitlistFormProps) {
  const t = useTranslations('waitlist');
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(
    null
  );
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadWaitlistEntry();
  }, [photoSessionId]);

  const loadWaitlistEntry = async () => {
    setIsLoading(true);
    try {
      const result = await getUserWaitlistEntry(photoSessionId);
      if (result.success && result.data) {
        setWaitlistEntry(result.data);
      }
    } catch (error) {
      console.error('キャンセル待ち状況取得エラー:', error);
      toast.error(t('error.load_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    setIsSubmitting(true);
    try {
      const result = await joinWaitlist(photoSessionId, message);

      if (result.success) {
        toast.success(t('success.joined'));
        setMessage('');
        await loadWaitlistEntry();
        onWaitlistUpdate?.();
      } else {
        toast.error(result.error || t('error.join_failed'));
      }
    } catch (error) {
      console.error('キャンセル待ち登録エラー:', error);
      toast.error(t('error.unexpected'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelWaitlist = async () => {
    if (!waitlistEntry?.id) return;

    setIsSubmitting(true);
    try {
      const result = await cancelWaitlistEntry(waitlistEntry.id);

      if (result.success) {
        toast.success(t('success.cancelled'));
        setWaitlistEntry(null);
        onWaitlistUpdate?.();
      } else {
        toast.error(result.error || t('error.cancel_failed'));
      }
    } catch (error) {
      console.error('キャンセル待ちキャンセルエラー:', error);
      toast.error(t('error.unexpected'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPromotion = async () => {
    if (!waitlistEntry?.id) return;

    setIsSubmitting(true);
    try {
      const result = await confirmPromotedBooking(waitlistEntry.id);

      if (result.success) {
        toast.success(t('success.booking_confirmed'));
        await loadWaitlistEntry();
        onWaitlistUpdate?.();
      } else {
        toast.error(result.error || t('error.confirm_failed'));
      }
    } catch (error) {
      console.error('繰り上げ確定エラー:', error);
      toast.error(t('error.unexpected'));
    } finally {
      setIsSubmitting(false);
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

  // 繰り上げ当選状態
  if (waitlistEntry?.status === 'promoted') {
    const deadline = waitlistEntry.promotion_deadline
      ? new Date(waitlistEntry.promotion_deadline)
      : null;
    const isExpired = deadline ? deadline < new Date() : false;

    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            {t('promotion.title')}
          </CardTitle>
          <CardDescription className="text-green-600">
            {t('promotion.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('promotion.reason')}</p>
            <p className="text-sm text-muted-foreground">
              {waitlistEntry.promotion_reason || t('promotion.default_reason')}
            </p>
          </div>

          {deadline && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('promotion.deadline')}</p>
              <p className="text-sm text-muted-foreground">
                {format(deadline, 'PPP p', { locale: ja })}
              </p>
              {isExpired && (
                <Badge variant="destructive" className="text-xs">
                  {t('promotion.expired')}
                </Badge>
              )}
            </div>
          )}

          <Separator />

          <div className="flex gap-2">
            <Button
              onClick={handleConfirmPromotion}
              disabled={isSubmitting || isExpired}
              className="flex-1"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('button.confirming')}
                </>
              ) : (
                t('button.confirm_booking')
              )}
            </Button>
            <Button
              onClick={handleCancelWaitlist}
              disabled={isSubmitting}
              variant="outline"
              size="lg"
            >
              {t('button.decline')}
            </Button>
          </div>

          {isExpired && (
            <p className="text-xs text-center text-destructive">
              {t('promotion.expired_notice')}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // キャンセル待ち中状態
  if (waitlistEntry?.status === 'waiting') {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Clock className="h-5 w-5" />
            {t('waiting.title')}
          </CardTitle>
          <CardDescription className="text-blue-600">
            {t('waiting.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('waiting.position')}</span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {t('waiting.position_value', {
                position: waitlistEntry.queue_position,
              })}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {t('waiting.joined_at')}
            </span>
            <span className="text-sm text-muted-foreground">
              {waitlistEntry.created_at &&
                format(new Date(waitlistEntry.created_at), 'PPP', {
                  locale: ja,
                })}
            </span>
          </div>

          {waitlistEntry.message && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('waiting.your_message')}</p>
              <p className="text-sm text-muted-foreground bg-white p-3 rounded border">
                {waitlistEntry.message}
              </p>
            </div>
          )}

          <Separator />

          <Button
            onClick={handleCancelWaitlist}
            disabled={isSubmitting}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                {t('button.cancelling')}
              </>
            ) : (
              t('button.cancel_waitlist')
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t('waiting.notice')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // キャンセル待ち登録フォーム
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('form.title')}
        </CardTitle>
        <CardDescription>{t('form.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="waitlist-message">{t('form.message_label')}</Label>
          <Textarea
            id="waitlist-message"
            placeholder={t('form.message_placeholder')}
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {t('form.message_optional')}
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800">
                {t('form.notice.title')}
              </p>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>• {t('form.notice.auto_promote')}</li>
                <li>• {t('form.notice.deadline')}</li>
                <li>• {t('form.notice.notification')}</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          onClick={handleJoinWaitlist}
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {t('button.joining')}
            </>
          ) : (
            t('button.join_waitlist')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
