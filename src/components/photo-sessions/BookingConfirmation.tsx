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
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

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
            title: 'キャンセル完了',
            description: '予約をキャンセルしました。',
          });

          if (onCancel) {
            onCancel();
          }
          onClose();
        } else {
          toast({
            title: 'キャンセル失敗',
            description: result.error || 'キャンセルに失敗しました。',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('キャンセルエラー:', error);
        toast({
          title: 'エラー',
          description: '予期しないエラーが発生しました。',
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
            {mode === 'confirm' ? '予約確認' : '予約キャンセル'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'confirm'
              ? '以下の撮影会を予約しますか？'
              : '本当に予約をキャンセルしますか？'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 撮影会情報 */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-medium">{session.title}</h3>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserIcon className="h-4 w-4" />
              <span>
                主催者:{' '}
                {session.organizer.display_name || session.organizer.email}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div>{format(startDate, 'PPP', { locale: ja })}</div>
                  <div className="text-muted-foreground">
                    {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
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
                    ? '無料'
                    : `¥${session.price_per_person.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* 注意事項 */}
          {mode === 'confirm' && (
            <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded">
              <p className="font-medium">注意事項:</p>
              <p>• 予約は先着順で確定されます</p>
              <p>• キャンセルは開始時刻の24時間前まで可能です</p>
              <p>• 当日のキャンセルはキャンセル料が発生する場合があります</p>
            </div>
          )}

          {mode === 'cancel' && (
            <div className="text-xs text-muted-foreground space-y-1 bg-destructive/10 p-3 rounded">
              <p className="font-medium text-destructive">
                キャンセルについて:
              </p>
              <p>• キャンセル後の再予約は先着順となります</p>
              <p>
                •
                開始時刻まで24時間を切っている場合、キャンセル料が発生する可能性があります
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {mode === 'confirm' ? 'やめる' : '戻る'}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant={mode === 'cancel' ? 'destructive' : 'default'}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {mode === 'confirm' ? '予約中...' : 'キャンセル中...'}
              </>
            ) : mode === 'confirm' ? (
              '予約する'
            ) : (
              'キャンセルする'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
