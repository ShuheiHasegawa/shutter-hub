'use client';

/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-ignore - useTranslations型定義の問題により一時的に無効化

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ArrowDown, Copy, Image } from 'lucide-react';
import { PhotoSessionSlot, DiscountType } from '@/types/photo-session';
import { uploadPhotoSessionImage } from '@/lib/storage/photo-session-images';
import { toast } from 'sonner';
import { addMinutes, format, parse } from 'date-fns';
import { PriceInput } from '@/components/ui/price-input';
import { ImageUploadCommon } from '@/components/ui/image-upload-common';
import { useTranslations } from 'next-intl';

interface SlotFormData {
  slot_number: number;
  start_time: string; // HH:mm format
  shooting_duration_minutes: number; // 撮影時間（分）
  break_duration_minutes: number;
  price_per_person: number;
  max_participants: number;
  costume_image_url?: string;
  costume_image_hash?: string; // 画像のハッシュ値
  costume_description?: string;
  discount_type: DiscountType;
  discount_value: number;
  discount_condition?: string;
  notes?: string;
}

interface PhotoSessionSlotFormProps {
  photoSessionId: string;
  slots?: PhotoSessionSlot[];
  onSlotsChange: (slots: PhotoSessionSlot[]) => void;
  baseDate?: string; // YYYY-MM-DD format
  allowMultipleBookings?: boolean; // 複数予約許可設定
}

export default function PhotoSessionSlotForm({
  photoSessionId,
  onSlotsChange,
  baseDate,
  allowMultipleBookings = false,
}: PhotoSessionSlotFormProps) {
  const t = useTranslations('photoSessionSlotForm') as any;

  const [slotForms, setSlotForms] = useState<SlotFormData[]>([
    {
      slot_number: 1,
      start_time: '10:00',
      shooting_duration_minutes: 50,
      break_duration_minutes: 10,
      price_per_person: 0,
      max_participants: 1,
      discount_type: 'none',
      discount_value: 0,
    },
  ]);

  // 終了時刻を計算
  const calculateEndTime = (
    startTime: string,
    durationMinutes: number
  ): string => {
    try {
      const start = parse(startTime, 'HH:mm', new Date());
      const end = addMinutes(start, durationMinutes);
      return format(end, 'HH:mm');
    } catch {
      return '';
    }
  };

  // 次の撮影枠の開始時刻を計算
  const calculateNextStartTime = (
    startTime: string,
    shootingDuration: number,
    breakDuration: number
  ): string => {
    try {
      const start = parse(startTime, 'HH:mm', new Date());
      const nextStart = addMinutes(start, shootingDuration + breakDuration);
      return format(nextStart, 'HH:mm');
    } catch {
      return '';
    }
  };

  // 親コンポーネントに撮影枠変更を通知
  const updateParentSlots = useCallback(
    (forms: SlotFormData[]) => {
      // PhotoSessionSlot形式に変換
      const convertedSlots: PhotoSessionSlot[] = forms.map(slot => {
        // baseDateが未設定の場合は今日の日付を使用
        const currentDate = baseDate || new Date().toISOString().split('T')[0];

        // datetime-local形式の文字列を作成（タイムゾーンの問題を回避）
        const startDateTime = `${currentDate}T${slot.start_time}`;
        const endDateTime = `${currentDate}T${calculateEndTime(slot.start_time, slot.shooting_duration_minutes)}`;

        return {
          id: `temp-${slot.slot_number}`,
          photo_session_id: photoSessionId,
          slot_number: slot.slot_number,
          start_time: startDateTime,
          end_time: endDateTime,
          break_duration_minutes: slot.break_duration_minutes,
          price_per_person: slot.price_per_person,
          max_participants: slot.max_participants,
          current_participants: 0,
          costume_image_url: slot.costume_image_url || undefined,
          costume_image_hash: slot.costume_image_hash || undefined,
          costume_description: slot.costume_description || undefined,
          discount_type: slot.discount_type || 'none',
          discount_value: slot.discount_value || 0,
          discount_condition: slot.discount_condition || undefined,
          notes: slot.notes || undefined,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      onSlotsChange(convertedSlots);
    },
    [baseDate, onSlotsChange, photoSessionId]
  );

  const addSlot = () => {
    const newSlotNumber = slotForms.length + 1;
    const lastSlot = slotForms[slotForms.length - 1];

    // 前の撮影枠から次の開始時刻を計算
    const nextStartTime = lastSlot
      ? calculateNextStartTime(
          lastSlot.start_time,
          lastSlot.shooting_duration_minutes,
          lastSlot.break_duration_minutes
        )
      : '10:00';

    const newSlot: SlotFormData = {
      slot_number: newSlotNumber,
      start_time: nextStartTime,
      shooting_duration_minutes: lastSlot?.shooting_duration_minutes || 50,
      break_duration_minutes: lastSlot?.break_duration_minutes || 10,
      price_per_person: lastSlot?.price_per_person || 0,
      max_participants: lastSlot?.max_participants || 1,
      discount_type: 'none',
      discount_value: 0,
    };
    const updatedForms = [...slotForms, newSlot];
    setSlotForms(updatedForms);
    updateParentSlots(updatedForms);
  };

  const deleteSlot = (index: number) => {
    if (slotForms.length <= 1) return;

    const updatedForms = slotForms.filter((_, i) => i !== index);
    const renumberedForms = updatedForms.map((slot, i) => ({
      ...slot,
      slot_number: i + 1,
    }));
    setSlotForms(renumberedForms);
    updateParentSlots(renumberedForms);
    toast.success(t.deleteSuccess);
  };

  const updateSlot = (
    index: number,
    field: keyof SlotFormData,
    value: string | number | DiscountType | undefined
  ) => {
    const updatedForms = [...slotForms];
    updatedForms[index] = { ...updatedForms[index], [field]: value };
    setSlotForms(updatedForms);
    updateParentSlots(updatedForms);
  };

  const autoFillNextSlot = (index: number) => {
    if (index >= slotForms.length - 1) return;

    const currentSlot = slotForms[index];
    const nextStartTime = calculateNextStartTime(
      currentSlot.start_time,
      currentSlot.shooting_duration_minutes,
      currentSlot.break_duration_minutes
    );

    updateSlot(index + 1, 'start_time', nextStartTime);
    toast.success(t.autoFillSuccess);
  };

  const copyFromAbove = (index: number) => {
    if (index === 0) return;

    const aboveSlot = slotForms[index - 1];
    const currentSlot = slotForms[index];

    // 時間以外の設定をコピー
    const updatedSlot = {
      ...currentSlot,
      shooting_duration_minutes: aboveSlot.shooting_duration_minutes,
      break_duration_minutes: aboveSlot.break_duration_minutes,
      price_per_person: aboveSlot.price_per_person,
      max_participants: aboveSlot.max_participants,
      costume_image_url: aboveSlot.costume_image_url,
      costume_image_hash: aboveSlot.costume_image_hash,
      costume_description: aboveSlot.costume_description,
      discount_type: aboveSlot.discount_type,
      discount_value: aboveSlot.discount_value,
      discount_condition: aboveSlot.discount_condition,
      notes: aboveSlot.notes,
    };

    const updatedForms = [...slotForms];
    updatedForms[index] = updatedSlot;
    setSlotForms(updatedForms);
    updateParentSlots(updatedForms);
    toast.success(t.copySuccess);
  };

  // 初期化時と撮影枠変更時に親に通知
  useEffect(() => {
    if (slotForms.length > 0) {
      updateParentSlots(slotForms);
    }
  }, [slotForms, updateParentSlots]); // slotFormsとupdateParentSlotsの変更を監視

  // 複数予約許可設定による将来の機能拡張用
  // allowMultipleBookingsがtrueの場合、将来的に撮影枠レベルでの割引設定UIを表示する予定
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const shouldShowDiscountSettings = allowMultipleBookings && false; // 現在は未実装

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t.title}</h3>
        <Button
          type="button"
          size="sm"
          onClick={addSlot}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t.addSlot}
        </Button>
      </div>

      {/* 撮影枠リスト */}
      <div className="space-y-4">
        {slotForms.map((slot, index) => (
          <Card key={index} className="p-4 border-2 border-gray-200">
            <div className="space-y-4">
              {/* 撮影枠ヘッダー */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">#{slot.slot_number}</Badge>
                  <span className="font-medium">
                    {t.slotNumber} {slot.slot_number}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyFromAbove(index)}
                      className="flex items-center gap-1"
                    >
                      <Copy className="h-4 w-4" />
                      {t.copyFromAbove}
                    </Button>
                  )}
                  {index < slotForms.length - 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => autoFillNextSlot(index)}
                      className="flex items-center gap-1"
                    >
                      <ArrowDown className="h-4 w-4" />
                      {t.autoFill}
                    </Button>
                  )}
                  {slotForms.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSlot(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 時間設定 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>{t.startTime}</Label>
                  <Input
                    type="time"
                    value={slot.start_time}
                    onChange={e =>
                      updateSlot(index, 'start_time', e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label>{t.shootingDuration}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="480"
                    value={slot.shooting_duration_minutes}
                    onChange={e =>
                      updateSlot(
                        index,
                        'shooting_duration_minutes',
                        parseInt(e.target.value) || 50
                      )
                    }
                    placeholder={t.durationInputPlaceholder}
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <Label>{t.breakDuration}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={slot.break_duration_minutes}
                    onChange={e =>
                      updateSlot(
                        index,
                        'break_duration_minutes',
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder={t.breakInputPlaceholder}
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <Label>
                    {t.endTime}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({t.calculated})
                    </span>
                  </Label>
                  <Input
                    type="time"
                    value={calculateEndTime(
                      slot.start_time,
                      slot.shooting_duration_minutes
                    )}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* 料金・参加者設定 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t.pricePerPerson}</Label>
                  <PriceInput
                    value={slot.price_per_person}
                    onChange={value =>
                      updateSlot(
                        index,
                        'price_per_person',
                        parseInt(value) || 0
                      )
                    }
                    placeholder={t.priceInputPlaceholder}
                  />
                </div>
                <div>
                  <Label>{t.maxParticipants}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={slot.max_participants}
                    onChange={e =>
                      updateSlot(
                        index,
                        'max_participants',
                        parseInt(e.target.value) || 1
                      )
                    }
                    placeholder={t.participantsInputPlaceholder}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* 衣装設定 */}
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Image className="h-4 w-4" />
                    {t.costumeImage}
                  </Label>
                  <ImageUploadCommon
                    value={slot.costume_image_url || ''}
                    onChange={value =>
                      updateSlot(index, 'costume_image_url', value as string)
                    }
                    multiple={false}
                    showSizeInfo={false}
                    showFormatInfo={false}
                    showMaxImagesInfo={false}
                    showTips={false}
                    showMainImageBadge={false}
                    showReorderButtons={false}
                    uploadFunction={async file => {
                      const result = await uploadPhotoSessionImage(
                        file,
                        photoSessionId
                      );
                      return typeof result === 'string'
                        ? result
                        : result.url || '';
                    }}
                    labels={{
                      selectFiles: t.uploadImage,
                      uploading: t.uploading,
                    }}
                  />
                </div>
                <div>
                  <Label>{t.costumeDescription}</Label>
                  <Textarea
                    value={slot.costume_description || ''}
                    onChange={e =>
                      updateSlot(index, 'costume_description', e.target.value)
                    }
                    placeholder="例: 白いドレス、カジュアル衣装など"
                  />
                </div>
              </div>

              {/* メモ */}
              <div>
                <Label>{t.notes}</Label>
                <Textarea
                  value={slot.notes || ''}
                  onChange={e => updateSlot(index, 'notes', e.target.value)}
                  placeholder="撮影枠固有のメモや注意事項"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
