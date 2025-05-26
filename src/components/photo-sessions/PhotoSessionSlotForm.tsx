'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Trash2, Plus, ArrowDown } from 'lucide-react';
import { PhotoSessionSlot, DiscountType } from '@/types/photo-session';
import { calculateDiscountedPrice } from '@/lib/photo-sessions/slots';
import { uploadPhotoSessionImage } from '@/lib/storage/photo-session-images';
import { toast } from 'sonner';
import { addMinutes, format } from 'date-fns';

interface SlotFormData {
  slot_number: number;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  price_per_person: number;
  max_participants: number;
  costume_image_url?: string;
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
  baseStartTime?: string;
  locale?: string;
}

export default function PhotoSessionSlotForm({
  photoSessionId,
  onSlotsChange,
  baseStartTime,
  locale = 'ja',
}: PhotoSessionSlotFormProps) {
  const [slotForms, setSlotForms] = useState<SlotFormData[]>([
    {
      slot_number: 1,
      start_time: baseStartTime || '',
      end_time: '',
      break_duration_minutes: 15,
      price_per_person: 0,
      max_participants: 1,
      discount_type: 'none',
      discount_value: 0,
    },
  ]);
  const [uploadingSlots, setUploadingSlots] = useState<Set<number>>(new Set());

  const texts = {
    ja: {
      title: 'スロット設定',
      addSlot: '枠を追加',
      slotNumber: 'スロット',
      startTime: '開始時間',
      endTime: '終了時間',
      breakDuration: '休憩時間（分）',
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
      deleteSuccess: 'スロットを削除しました',
      imageUploadSuccess: '画像をアップロードしました',
      imageUploadError: '画像のアップロードに失敗しました',
    },
    en: {
      title: 'Slot Settings',
      addSlot: 'Add Slot',
      slotNumber: 'Slot',
      startTime: 'Start Time',
      endTime: 'End Time',
      breakDuration: 'Break Duration (minutes)',
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
      deleteSuccess: 'Slot deleted successfully',
      imageUploadSuccess: 'Image uploaded successfully',
      imageUploadError: 'Failed to upload image',
    },
  };

  const t = texts[locale as keyof typeof texts];

  const addSlot = () => {
    const newSlotNumber = slotForms.length + 1;
    const newSlot: SlotFormData = {
      slot_number: newSlotNumber,
      start_time: '',
      end_time: '',
      break_duration_minutes: 15,
      price_per_person: 0,
      max_participants: 1,
      discount_type: 'none',
      discount_value: 0,
    };
    setSlotForms([...slotForms, newSlot]);
  };

  const deleteSlot = (index: number) => {
    if (slotForms.length <= 1) return; // 最低1つは残す

    const updatedForms = slotForms.filter((_, i) => i !== index);
    // スロット番号を再採番
    const renumberedForms = updatedForms.map((slot, i) => ({
      ...slot,
      slot_number: i + 1,
    }));
    setSlotForms(renumberedForms);
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
  };

  const autoFillNextSlot = (index: number) => {
    if (index >= slotForms.length - 1) return; // 最後のスロットの場合は何もしない

    const currentSlot = slotForms[index];
    if (!currentSlot.end_time) return; // 終了時間が設定されていない場合は何もしない

    const endTime = new Date(currentSlot.end_time);
    const nextStartTime = addMinutes(
      endTime,
      currentSlot.break_duration_minutes
    );

    updateSlot(
      index + 1,
      'start_time',
      format(nextStartTime, "yyyy-MM-dd'T'HH:mm")
    );
    toast.success(t.autoFillSuccess);
  };

  const handleImageUpload = async (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingSlots(prev => new Set(prev).add(index));
    try {
      const result = await uploadPhotoSessionImage(file, photoSessionId);
      const imageUrl = typeof result === 'string' ? result : result.url;
      updateSlot(index, 'costume_image_url', imageUrl);
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

  const handleSave = () => {
    // バリデーション
    for (let i = 0; i < slotForms.length; i++) {
      const slot = slotForms[i];
      if (!slot.start_time || !slot.end_time) {
        toast.error(`スロット${i + 1}の開始時間と終了時間を入力してください`);
        return;
      }
      if (new Date(slot.start_time) >= new Date(slot.end_time)) {
        toast.error(
          `スロット${i + 1}の終了時間は開始時間より後である必要があります`
        );
        return;
      }
    }

    // PhotoSessionSlot形式に変換
    const convertedSlots: PhotoSessionSlot[] = slotForms.map(slot => ({
      id: `temp-${slot.slot_number}`,
      photo_session_id: photoSessionId,
      ...slot,
      current_participants: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    onSlotsChange(convertedSlots);
    toast.success('スロット設定を保存しました');
  };

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>{t.startTime}</Label>
                  <Input
                    type="datetime-local"
                    value={slot.start_time}
                    onChange={e =>
                      updateSlot(index, 'start_time', e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label>{t.endTime}</Label>
                  <Input
                    type="datetime-local"
                    value={slot.end_time}
                    onChange={e =>
                      updateSlot(index, 'end_time', e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label>{t.breakDuration}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={slot.break_duration_minutes}
                    onChange={e =>
                      updateSlot(
                        index,
                        'break_duration_minutes',
                        parseInt(e.target.value) || 0
                      )
                    }
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
                    value={slot.price_per_person}
                    onChange={e =>
                      updateSlot(
                        index,
                        'price_per_person',
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div>
                  <Label>{t.maxParticipants}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={slot.max_participants}
                    onChange={e =>
                      updateSlot(
                        index,
                        'max_participants',
                        parseInt(e.target.value) || 1
                      )
                    }
                  />
                </div>
              </div>

              {/* 衣装設定 */}
              <div className="space-y-4">
                <div>
                  <Label>{t.costumeImage}</Label>
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
                    <div className="mt-2">
                      <img
                        src={slot.costume_image_url}
                        alt="Costume preview"
                        className="w-32 h-32 object-cover rounded-lg"
                      />
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

              {/* 割引設定 */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t.discountType}</Label>
                    <Select
                      value={slot.discount_type}
                      onValueChange={(value: DiscountType) =>
                        updateSlot(index, 'discount_type', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t.none}</SelectItem>
                        <SelectItem value="percentage">
                          {t.percentage}
                        </SelectItem>
                        <SelectItem value="fixed_amount">
                          {t.fixedAmount}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {slot.discount_type !== 'none' && (
                    <div>
                      <Label>{t.discountValue}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={slot.discount_value}
                        onChange={e =>
                          updateSlot(
                            index,
                            'discount_value',
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder={
                          slot.discount_type === 'percentage' ? '10' : '1000'
                        }
                      />
                    </div>
                  )}
                </div>

                {slot.discount_type !== 'none' && (
                  <>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <span>
                          {t.originalPrice}: ¥
                          {slot.price_per_person.toLocaleString()}
                        </span>
                        <span className="font-medium text-green-600">
                          {t.discountedPrice}: ¥
                          {calculateDiscountedPrice(
                            slot.price_per_person,
                            slot.discount_type,
                            slot.discount_value
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label>{t.discountCondition}</Label>
                      <Textarea
                        value={slot.discount_condition || ''}
                        onChange={e =>
                          updateSlot(
                            index,
                            'discount_condition',
                            e.target.value
                          )
                        }
                        placeholder="例: 学生割引、早期予約割引など"
                      />
                    </div>
                  </>
                )}
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

          {/* 保存ボタン */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="flex items-center gap-2">
              {t.save}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
