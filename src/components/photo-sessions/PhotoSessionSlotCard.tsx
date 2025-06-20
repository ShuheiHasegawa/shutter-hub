'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Clock,
  Users,
  DollarSign,
  Image as ImageIcon,
  Calendar,
  MapPin,
} from 'lucide-react';
import { PhotoSessionSlot } from '@/types/photo-session';
import {
  calculateDiscountedPrice,
  formatSlotTime,
  getSlotAvailabilityStatus,
} from '@/lib/photo-sessions/slots';
import { createSlotBooking } from '@/lib/photo-sessions/slots';
import { toast } from 'sonner';

interface PhotoSessionSlotCardProps {
  slot: PhotoSessionSlot;
  photoSessionLocation?: string;
  photoSessionDate: string;
  onBookingSuccess?: () => void;
  isLoggedIn: boolean;
  locale?: string;
}

export default function PhotoSessionSlotCard({
  slot,
  photoSessionLocation,
  photoSessionDate,
  onBookingSuccess,
  isLoggedIn,
  locale = 'ja',
}: PhotoSessionSlotCardProps) {
  const [isBooking, setIsBooking] = useState(false);
  const [showCostumeDialog, setShowCostumeDialog] = useState(false);

  const availability = getSlotAvailabilityStatus(
    slot.current_participants,
    slot.max_participants
  );
  const discountedPrice = calculateDiscountedPrice(
    slot.price_per_person,
    slot.discount_type,
    slot.discount_value
  );
  const hasDiscount = slot.discount_type !== 'none' && slot.discount_value > 0;

  const handleBooking = async () => {
    if (!isLoggedIn) {
      toast.error(
        locale === 'ja' ? 'ログインが必要です' : 'Please log in to book'
      );
      return;
    }

    if (availability.status === 'full') {
      toast.error(
        locale === 'ja' ? 'この撮影枠は満席です' : 'This slot is full'
      );
      return;
    }

    setIsBooking(true);
    try {
      const result = await createSlotBooking(slot.id);
      if (result.success) {
        toast.success(result.message);
        onBookingSuccess?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error booking slot:', error);
      toast.error(locale === 'ja' ? '予約に失敗しました' : 'Booking failed');
    } finally {
      setIsBooking(false);
    }
  };

  const texts = {
    ja: {
      slotNumber: '撮影枠',
      time: '時間',
      participants: '参加者',
      price: '料金',
      costume: '衣装',
      book: '予約する',
      booking: '予約中...',
      full: '満席',
      available: '空きあり',
      fewLeft: '残りわずか',
      discount: '割引',
      originalPrice: '元の料金',
      discountedPrice: '割引後料金',
      costumePreview: '衣装プレビュー',
      close: '閉じる',
      breakTime: '休憩時間',
      minutes: '分',
      notes: 'メモ',
      location: '場所',
      date: '日付',
    },
    en: {
      slotNumber: 'Slot',
      time: 'Time',
      participants: 'Participants',
      price: 'Price',
      costume: 'Costume',
      book: 'Book Now',
      booking: 'Booking...',
      full: 'Full',
      available: 'Available',
      fewLeft: 'Few Left',
      discount: 'Discount',
      originalPrice: 'Original Price',
      discountedPrice: 'Discounted Price',
      costumePreview: 'Costume Preview',
      close: 'Close',
      breakTime: 'Break Time',
      minutes: 'minutes',
      notes: 'Notes',
      location: 'Location',
      date: 'Date',
    },
  };

  const t = texts[locale as keyof typeof texts];

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Badge variant="outline">#{slot.slot_number}</Badge>
            {t.slotNumber} {slot.slot_number}
          </CardTitle>
          <Badge
            variant={
              availability.status === 'full'
                ? 'destructive'
                : availability.status === 'few_left'
                  ? 'secondary'
                  : 'default'
            }
          >
            {availability.message}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 基本情報 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{photoSessionDate}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatSlotTime(slot.start_time, slot.end_time)}</span>
            {slot.break_duration_minutes > 0 && (
              <span className="text-muted-foreground">
                (+{slot.break_duration_minutes}
                {t.minutes} {t.breakTime})
              </span>
            )}
          </div>

          {photoSessionLocation && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{photoSessionLocation}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {slot.current_participants}/{slot.max_participants}{' '}
              {t.participants}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              {hasDiscount ? (
                <>
                  <span className="line-through text-muted-foreground">
                    ¥{slot.price_per_person.toLocaleString()}
                  </span>
                  <span className="font-medium text-green-600">
                    ¥{discountedPrice.toLocaleString()}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {t.discount}
                  </Badge>
                </>
              ) : (
                <span className="font-medium">
                  ¥{slot.price_per_person.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 衣装情報 */}
        {(slot.costume_image_url || slot.costume_description) && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t.costume}</span>
            </div>

            <div className="flex items-center gap-3">
              {slot.costume_image_url && (
                <Dialog
                  open={showCostumeDialog}
                  onOpenChange={setShowCostumeDialog}
                >
                  <DialogTrigger asChild>
                    <button className="flex-shrink-0">
                      <Avatar className="h-12 w-12 rounded-lg">
                        <AvatarImage
                          src={slot.costume_image_url}
                          alt="Costume"
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-lg">
                          <ImageIcon className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t.costumePreview}</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center">
                      <img
                        src={slot.costume_image_url}
                        alt="Costume preview"
                        className="max-w-full max-h-96 object-contain rounded-lg"
                      />
                    </div>
                    {slot.costume_description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {slot.costume_description}
                      </p>
                    )}
                  </DialogContent>
                </Dialog>
              )}

              {slot.costume_description && (
                <p className="text-sm text-muted-foreground flex-1">
                  {slot.costume_description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 割引条件 */}
        {hasDiscount && slot.discount_condition && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>{t.discount}:</strong> {slot.discount_condition}
            </p>
          </div>
        )}

        {/* メモ */}
        {slot.notes && (
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm">
              <strong>{t.notes}:</strong> {slot.notes}
            </p>
          </div>
        )}

        {/* 予約ボタン */}
        <Button
          onClick={handleBooking}
          disabled={isBooking || availability.status === 'full' || !isLoggedIn}
          className="w-full"
          variant={availability.status === 'full' ? 'secondary' : 'default'}
        >
          {isBooking
            ? t.booking
            : availability.status === 'full'
              ? t.full
              : t.book}
        </Button>

        {!isLoggedIn && (
          <p className="text-xs text-muted-foreground text-center">
            {locale === 'ja' ? 'ログインして予約' : 'Login to book'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
