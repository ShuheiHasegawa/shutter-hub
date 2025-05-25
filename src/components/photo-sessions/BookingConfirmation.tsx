'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cancelPhotoSessionBooking } from '@/app/actions/photo-session-booking';
import type { PhotoSessionWithOrganizer } from '@/types/database';
import {
  CalendarIcon,
  MapPinIcon,
  CircleDollarSignIcon,
  UserIcon,
} from 'lucide-react';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import { useTranslations, useLocale } from 'next-intl';

interface BookingConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  session: PhotoSessionWithOrganizer;
  bookingId?: string;
  userId?: string;
  mode: 'confirm' | 'cancel';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function BookingConfirmation({
  isOpen,
  onClose,
  session,
  bookingId,
  userId,
  mode,
  onConfirm,
  onCancel,
}: BookingConfirmationProps) {
  const { toast } = useToast();
  const t = useTranslations('booking');
  const tErrors = useTranslations('errors');
  const tSuccess = useTranslations('success');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (mode === 'confirm' && onConfirm) {
      onConfirm();
      return;
    }

    if (mode === 'cancel' && bookingId && userId) {
      setIsLoading(true);
      try {
        const result = await cancelPhotoSessionBooking(bookingId, userId);

        if (result.success) {
          toast({
            title: tSuccess('cancelCompleted'),
            description: tSuccess('cancelCompletedDescription'),
          });

          if (onCancel) {
            onCancel();
          }
          onClose();
        } else {
          toast({
            title: tErrors('title'),
            description: result.error || tErrors('cancelFailed'),
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('キャンセルエラー:', error);
        toast({
          title: tErrors('title'),
          description: tErrors('unexpectedError'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'confirm' ? t('confirm') : t('confirmCancel')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'confirm'
              ? t('confirmBookingQuestion')
              : t('confirmCancelQuestion')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 撮影会情報 */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-medium">{session.title}</h3>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserIcon className="h-4 w-4" />
              <span>
                {t('organizer')}:{' '}
                {session.organizer.display_name || session.organizer.email}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div>{formatDateLocalized(startDate, locale, 'long')}</div>
                  <div className="text-muted-foreground">
                    {formatTimeLocalized(startDate, locale)} -{' '}
                    {formatTimeLocalized(endDate, locale)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div>{session.location}</div>
                  {session.address && (
                    <div className="text-muted-foreground text-xs">
                      {session.address}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CircleDollarSignIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  {session.price_per_person === 0
                    ? t('free')
                    : `¥${session.price_per_person.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* 注意事項 */}
          {mode === 'confirm' && (
            <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded">
              <p className="font-medium">{t('notes.title')}</p>
              <p>• {t('notes.firstCome')}</p>
              <p>• {t('notes.cancelDeadline')}</p>
              <p>• {t('notes.cancelFee')}</p>
            </div>
          )}

          {mode === 'cancel' && (
            <div className="text-xs text-muted-foreground space-y-1 bg-destructive/10 p-3 rounded">
              <p className="font-medium text-destructive">
                {t('cancelNotes.title')}
              </p>
              <p>• {t('cancelNotes.reBooking')}</p>
              <p>• {t('cancelNotes.lateCancelFee')}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {mode === 'confirm' ? t('actions.cancel') : t('actions.back')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant={mode === 'cancel' ? 'destructive' : 'default'}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {mode === 'confirm'
                  ? t('bookingInProgress')
                  : t('cancelInProgress')}
              </>
            ) : mode === 'confirm' ? (
              t('actions.confirmBooking')
            ) : (
              t('actions.confirmCancel')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
