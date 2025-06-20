'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Trash2, Plus, ArrowDown, Copy, Image } from 'lucide-react';
import { PhotoSessionSlot, DiscountType } from '@/types/photo-session';
import { uploadPhotoSessionImage } from '@/lib/storage/photo-session-images';
import { toast } from 'sonner';
import { addMinutes, format, parse } from 'date-fns';

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
  locale?: string;
}

export default function PhotoSessionSlotForm({
  photoSessionId,
  onSlotsChange,
  baseDate,
  locale = 'ja',
}: PhotoSessionSlotFormProps) {
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
  const [uploadingSlots, setUploadingSlots] = useState<Set<number>>(new Set());
  const [imageCache, setImageCache] = useState<Map<string, string>>(new Map()); // hash -> url

  const texts = {
    ja: {
      title: 'スロット設定',
      addSlot: '枠を追加',
      slotNumber: 'スロット',
      startTime: '開始時刻',
      shootingDuration: '撮影時間（分）',
      breakDuration: '休憩時間（分）',
      endTime: '終了時刻',
      pricePerPerson: '1人あたりの料金（円）',
      maxParticipants: '最大参加者数',
      costumeImage: '衣装画像',
      costumeDescription: '衣装の説明',
      discountType: '割引タイプ',
      discountValue: '割引値',
      discountCondition: '割引条件',
      notes: 'メモ',
      delete: '削除',
      autoFill: '自動入力',
      copyFromAbove: '上の設定をコピー',
      uploadImage: '画像をアップロード',
      uploading: 'アップロード中...',
      originalPrice: '元の料金',
      discountedPrice: '割引後料金',
      none: 'なし',
      percentage: 'パーセンテージ',
      fixedAmount: '固定金額',
      participants: '参加者',
      available: '空きあり',
      full: '満席',
      save: '保存',
      autoFillSuccess: '次のスロットに時間を自動入力しました',
      copySuccess: '上のスロットの設定をコピーしました',
      deleteSuccess: 'スロットを削除しました',
      imageUploadSuccess: '画像をアップロードしました',
      imageUploadError: '画像のアップロードに失敗しました',
      sameImageDetected: '同じ画像が検出されました（容量節約）',
      calculated: '自動計算',
      priceInputPlaceholder: '例: 5000',
      participantsInputPlaceholder: '例: 2',
      durationInputPlaceholder: '例: 50',
      breakInputPlaceholder: '例: 10',
    },
    en: {
      title: 'Slot Settings',
      addSlot: 'Add Slot',
      slotNumber: 'Slot',
      startTime: 'Start Time',
      shootingDuration: 'Shooting Duration (minutes)',
      breakDuration: 'Break Duration (minutes)',
      endTime: 'End Time',
      pricePerPerson: 'Price per Person (¥)',
      maxParticipants: 'Max Participants',
      costumeImage: 'Costume Image',
      costumeDescription: 'Costume Description',
      discountType: 'Discount Type',
      discountValue: 'Discount Value',
      discountCondition: 'Discount Condition',
      notes: 'Notes',
      delete: 'Delete',
      autoFill: 'Auto Fill',
      copyFromAbove: 'Copy from Above',
      uploadImage: 'Upload Image',
      uploading: 'Uploading...',
      originalPrice: 'Original Price',
      discountedPrice: 'Discounted Price',
      none: 'None',
      percentage: 'Percentage',
      fixedAmount: 'Fixed Amount',
      participants: 'Participants',
      available: 'Available',
      full: 'Full',
      save: 'Save',
      autoFillSuccess: 'Auto-filled time for next slot',
      copySuccess: 'Copied settings from above slot',
      deleteSuccess: 'Slot deleted successfully',
      imageUploadSuccess: 'Image uploaded successfully',
      imageUploadError: 'Failed to upload image',
      sameImageDetected: 'Same image detected (storage optimized)',
      calculated: 'Auto-calculated',
      priceInputPlaceholder: 'e.g. 5000',
      participantsInputPlaceholder: 'e.g. 2',
      durationInputPlaceholder: 'e.g. 50',
      breakInputPlaceholder: 'e.g. 10',
    },
  };

  const t = texts[locale as keyof typeof texts];

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

  // 次のスロットの開始時刻を計算
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

  // 画像のハッシュ値を計算（簡易版）
  const calculateImageHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // 親コンポーネントにスロット変更を通知
  const updateParentSlots = (forms: SlotFormData[]) => {
    // PhotoSessionSlot形式に変換
    const convertedSlots: PhotoSessionSlot[] = forms.map(slot => {
      const startDateTime = baseDate
        ? `${baseDate}T${slot.start_time}:00`
        : `2024-01-01T${slot.start_time}:00`;
      const endDateTime = baseDate
        ? `${baseDate}T${calculateEndTime(slot.start_time, slot.shooting_duration_minutes)}:00`
        : `2024-01-01T${calculateEndTime(slot.start_time, slot.shooting_duration_minutes)}:00`;

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
  };

  const addSlot = () => {
    const newSlotNumber = slotForms.length + 1;
    const lastSlot = slotForms[slotForms.length - 1];

    // 前のスロットから次の開始時刻を計算
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

  const handleImageUpload = async (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingSlots(prev => new Set(prev).add(index));

    try {
      // 画像のハッシュ値を計算
      const imageHash = await calculateImageHash(file);

      // 既存の画像キャッシュをチェック
      if (imageCache.has(imageHash)) {
        const existingUrl = imageCache.get(imageHash);
        if (existingUrl) {
          updateSlot(index, 'costume_image_url', existingUrl);
          updateSlot(index, 'costume_image_hash', imageHash);
          toast.success(t.sameImageDetected);
          return;
        }
      }

      // 新しい画像をアップロード
      const result = await uploadPhotoSessionImage(file, photoSessionId);
      const imageUrl = typeof result === 'string' ? result : result.url;

      if (imageUrl) {
        // キャッシュに保存
        setImageCache(prev => new Map(prev).set(imageHash, imageUrl));

        updateSlot(index, 'costume_image_url', imageUrl);
        updateSlot(index, 'costume_image_hash', imageHash);
      }
      toast.success(t.imageUploadSuccess);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(t.imageUploadError);
    } finally {
      setUploadingSlots(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  // 初期化時に親に通知
  useEffect(() => {
    updateParentSlots(slotForms);
  }, []); // 初回のみ実行

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {slotForms.map((slot, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              {/* スロットヘッダー */}
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
                  <Input
                    type="number"
                    min="0"
                    max="100000"
                    step="100"
                    value={slot.price_per_person}
                    onChange={e =>
                      updateSlot(
                        index,
                        'price_per_person',
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder={t.priceInputPlaceholder}
                    inputMode="numeric"
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
                  <Label className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    {t.costumeImage}
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={e => handleImageUpload(index, e)}
                      disabled={uploadingSlots.has(index)}
                    />
                    {uploadingSlots.has(index) && (
                      <span className="text-sm text-muted-foreground">
                        {t.uploading}
                      </span>
                    )}
                  </div>
                  {slot.costume_image_url && (
                    <div className="mt-2 flex items-center gap-4">
                      <img
                        src={slot.costume_image_url}
                        alt="Costume preview"
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      {slot.costume_image_hash && (
                        <div className="text-xs text-muted-foreground">
                          Hash: {slot.costume_image_hash.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                  )}
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
                  placeholder="スロット固有のメモや注意事項"
                />
              </div>
            </div>
          ))}

          {/* 枠追加ボタン */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={addSlot}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t.addSlot}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
