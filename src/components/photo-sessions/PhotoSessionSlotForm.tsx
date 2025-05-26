'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Separator } from '@/components/ui/separator';
import { Clock, DollarSign, Image, Trash2, Plus } from 'lucide-react';
import { PhotoSessionSlot, DiscountType } from '@/types/photo-session';
import {
  calculateDiscountedPrice,
  formatSlotTime,
} from '@/lib/photo-sessions/slots';
import { uploadPhotoSessionImage } from '@/lib/storage/photo-session-images';
import { toast } from 'sonner';

const slotSchema = z
  .object({
    slot_number: z.number().min(1, 'スロット番号は1以上である必要があります'),
    start_time: z.string().min(1, '開始時間を入力してください'),
    end_time: z.string().min(1, '終了時間を入力してください'),
    break_duration_minutes: z
      .number()
      .min(0, '休憩時間は0分以上である必要があります'),
    price_per_person: z.number().min(0, '料金は0円以上である必要があります'),
    max_participants: z
      .number()
      .min(1, '最大参加者数は1人以上である必要があります'),
    costume_image_url: z.string().optional(),
    costume_description: z.string().optional(),
    discount_type: z.enum(['none', 'percentage', 'fixed_amount']),
    discount_value: z.number().min(0, '割引値は0以上である必要があります'),
    discount_condition: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    data => {
      return new Date(data.start_time) < new Date(data.end_time);
    },
    {
      message: '終了時間は開始時間より後である必要があります',
      path: ['end_time'],
    }
  );

type SlotFormData = z.infer<typeof slotSchema>;

interface PhotoSessionSlotFormProps {
  photoSessionId: string;
  slots: PhotoSessionSlot[];
  onSlotsChange: (slots: PhotoSessionSlot[]) => void;
  baseStartTime?: string;
  locale?: string;
}

export default function PhotoSessionSlotForm({
  photoSessionId,
  slots,
  onSlotsChange,
  baseStartTime,
  locale = 'ja',
}: PhotoSessionSlotFormProps) {
  const [editingSlot, setEditingSlot] = useState<PhotoSessionSlot | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SlotFormData>({
    resolver: zodResolver(slotSchema),
    defaultValues: {
      slot_number: slots.length + 1,
      break_duration_minutes: 15,
      price_per_person: 0,
      max_participants: 1,
      discount_type: 'none',
      discount_value: 0,
    },
  });

  const watchedValues = watch();

  // 自動時間計算
  useEffect(() => {
    if (baseStartTime && slots.length > 0) {
      const lastSlot = slots[slots.length - 1];
      const nextStartTime = new Date(lastSlot.end_time);
      nextStartTime.setMinutes(
        nextStartTime.getMinutes() + lastSlot.break_duration_minutes
      );

      setValue('start_time', nextStartTime.toISOString().slice(0, 16));
    }
  }, [slots, baseStartTime, setValue]);

  // 割引後価格の計算
  const discountedPrice = calculateDiscountedPrice(
    watchedValues.price_per_person || 0,
    watchedValues.discount_type || 'none',
    watchedValues.discount_value || 0
  );

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadPhotoSessionImage(file, photoSessionId);
      const imageUrl = typeof result === 'string' ? result : result.url;
      setValue('costume_image_url', imageUrl);
      toast.success(
        locale === 'ja'
          ? '画像をアップロードしました'
          : 'Image uploaded successfully'
      );
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(
        locale === 'ja'
          ? '画像のアップロードに失敗しました'
          : 'Failed to upload image'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: SlotFormData) => {
    try {
      if (editingSlot) {
        // 既存スロットの更新
        const updatedSlots = slots.map(slot =>
          slot.id === editingSlot.id
            ? { ...slot, ...data, updated_at: new Date().toISOString() }
            : slot
        );
        onSlotsChange(updatedSlots);
        setEditingSlot(null);
      } else {
        // 新規スロット追加
        const newSlot: PhotoSessionSlot = {
          id: `temp-${Date.now()}`, // 一時的なID
          photo_session_id: photoSessionId,
          ...data,
          current_participants: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        onSlotsChange([...slots, newSlot]);
      }

      reset({
        slot_number: slots.length + 2,
        break_duration_minutes: 15,
        price_per_person: 0,
        max_participants: 1,
        discount_type: 'none',
        discount_value: 0,
      });

      toast.success(
        editingSlot
          ? locale === 'ja'
            ? 'スロットを更新しました'
            : 'Slot updated successfully'
          : locale === 'ja'
            ? 'スロットを追加しました'
            : 'Slot added successfully'
      );
    } catch (error) {
      console.error('Error saving slot:', error);
      toast.error(
        locale === 'ja' ? 'スロットの保存に失敗しました' : 'Failed to save slot'
      );
    }
  };

  const handleEditSlot = (slot: PhotoSessionSlot) => {
    setEditingSlot(slot);
    reset({
      slot_number: slot.slot_number,
      start_time: slot.start_time.slice(0, 16),
      end_time: slot.end_time.slice(0, 16),
      break_duration_minutes: slot.break_duration_minutes,
      price_per_person: slot.price_per_person,
      max_participants: slot.max_participants,
      costume_image_url: slot.costume_image_url || '',
      costume_description: slot.costume_description || '',
      discount_type: slot.discount_type,
      discount_value: slot.discount_value,
      discount_condition: slot.discount_condition || '',
      notes: slot.notes || '',
    });
  };

  const handleDeleteSlot = (slotId: string) => {
    const updatedSlots = slots.filter(slot => slot.id !== slotId);
    onSlotsChange(updatedSlots);
    toast.success(
      locale === 'ja' ? 'スロットを削除しました' : 'Slot deleted successfully'
    );
  };

  const handleCancelEdit = () => {
    setEditingSlot(null);
    reset({
      slot_number: slots.length + 1,
      break_duration_minutes: 15,
      price_per_person: 0,
      max_participants: 1,
      discount_type: 'none',
      discount_value: 0,
    });
  };

  const texts = {
    ja: {
      title: 'スロット管理',
      addSlot: 'スロット追加',
      editSlot: 'スロット編集',
      slotNumber: 'スロット番号',
      timeSettings: '時間設定',
      startTime: '開始時間',
      endTime: '終了時間',
      breakDuration: '休憩時間（分）',
      priceSettings: '料金・参加者設定',
      pricePerPerson: '1人あたりの料金（円）',
      maxParticipants: '最大参加者数',
      costumeSettings: '衣装設定',
      costumeImage: '衣装画像',
      costumeDescription: '衣装の説明',
      discountSettings: '割引設定',
      discountType: '割引タイプ',
      discountValue: '割引値',
      discountCondition: '割引条件',
      notes: 'メモ',
      save: '保存',
      cancel: 'キャンセル',
      edit: '編集',
      delete: '削除',
      uploadImage: '画像をアップロード',
      uploading: 'アップロード中...',
      originalPrice: '元の料金',
      discountedPrice: '割引後料金',
      none: 'なし',
      percentage: 'パーセンテージ',
      fixedAmount: '固定金額',
      currentSlots: '現在のスロット',
      participants: '参加者',
      available: '空きあり',
      full: '満席',
    },
    en: {
      title: 'Slot Management',
      addSlot: 'Add Slot',
      editSlot: 'Edit Slot',
      slotNumber: 'Slot Number',
      timeSettings: 'Time Settings',
      startTime: 'Start Time',
      endTime: 'End Time',
      breakDuration: 'Break Duration (minutes)',
      priceSettings: 'Price & Participants',
      pricePerPerson: 'Price per Person (¥)',
      maxParticipants: 'Max Participants',
      costumeSettings: 'Costume Settings',
      costumeImage: 'Costume Image',
      costumeDescription: 'Costume Description',
      discountSettings: 'Discount Settings',
      discountType: 'Discount Type',
      discountValue: 'Discount Value',
      discountCondition: 'Discount Condition',
      notes: 'Notes',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      uploadImage: 'Upload Image',
      uploading: 'Uploading...',
      originalPrice: 'Original Price',
      discountedPrice: 'Discounted Price',
      none: 'None',
      percentage: 'Percentage',
      fixedAmount: 'Fixed Amount',
      currentSlots: 'Current Slots',
      participants: 'Participants',
      available: 'Available',
      full: 'Full',
    },
  };

  const t = texts[locale as keyof typeof texts];

  return (
    <div className="space-y-6">
      {/* 現在のスロット一覧 */}
      {slots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t.currentSlots}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {slots.map(slot => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">#{slot.slot_number}</Badge>
                      <span className="font-medium">
                        {formatSlotTime(slot.start_time, slot.end_time)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {t.participants}: {slot.current_participants}/
                        {slot.max_participants}
                      </span>
                      {slot.current_participants >= slot.max_participants ? (
                        <Badge variant="destructive">{t.full}</Badge>
                      ) : (
                        <Badge variant="secondary">{t.available}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>¥{slot.price_per_person.toLocaleString()}</span>
                      {slot.discount_type !== 'none' && (
                        <span className="text-green-600">
                          → ¥
                          {calculateDiscountedPrice(
                            slot.price_per_person,
                            slot.discount_type,
                            slot.discount_value
                          ).toLocaleString()}
                        </span>
                      )}
                      {slot.costume_description && (
                        <span>{slot.costume_description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSlot(slot)}
                    >
                      {t.edit}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* スロット編集フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingSlot ? t.editSlot : t.addSlot}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本設定 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slot_number">{t.slotNumber}</Label>
                <Input
                  id="slot_number"
                  type="number"
                  {...register('slot_number', { valueAsNumber: true })}
                />
                {errors.slot_number && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.slot_number.message}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* 時間設定 */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t.timeSettings}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start_time">{t.startTime}</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    {...register('start_time')}
                  />
                  {errors.start_time && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.start_time.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="end_time">{t.endTime}</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    {...register('end_time')}
                  />
                  {errors.end_time && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.end_time.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="break_duration_minutes">
                    {t.breakDuration}
                  </Label>
                  <Input
                    id="break_duration_minutes"
                    type="number"
                    {...register('break_duration_minutes', {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.break_duration_minutes && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.break_duration_minutes.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* 料金・参加者設定 */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t.priceSettings}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price_per_person">{t.pricePerPerson}</Label>
                  <Input
                    id="price_per_person"
                    type="number"
                    {...register('price_per_person', { valueAsNumber: true })}
                  />
                  {errors.price_per_person && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.price_per_person.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="max_participants">{t.maxParticipants}</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    {...register('max_participants', { valueAsNumber: true })}
                  />
                  {errors.max_participants && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.max_participants.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* 衣装設定 */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Image className="h-5 w-5" />
                {t.costumeSettings}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="costume_image">{t.costumeImage}</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="costume_image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                    {isUploading && (
                      <span className="text-sm text-muted-foreground">
                        {t.uploading}
                      </span>
                    )}
                  </div>
                  {watchedValues.costume_image_url && (
                    <div className="mt-2">
                      <img
                        src={watchedValues.costume_image_url}
                        alt="Costume preview"
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="costume_description">
                    {t.costumeDescription}
                  </Label>
                  <Textarea
                    id="costume_description"
                    {...register('costume_description')}
                    placeholder="例: 白いドレス、カジュアル衣装など"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 割引設定 */}
            <div>
              <h3 className="text-lg font-medium mb-4">{t.discountSettings}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discount_type">{t.discountType}</Label>
                    <Select
                      value={watchedValues.discount_type}
                      onValueChange={(value: DiscountType) =>
                        setValue('discount_type', value)
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
                  {watchedValues.discount_type !== 'none' && (
                    <div>
                      <Label htmlFor="discount_value">{t.discountValue}</Label>
                      <Input
                        id="discount_value"
                        type="number"
                        {...register('discount_value', { valueAsNumber: true })}
                        placeholder={
                          watchedValues.discount_type === 'percentage'
                            ? '10'
                            : '1000'
                        }
                      />
                      {errors.discount_value && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.discount_value.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {watchedValues.discount_type !== 'none' && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span>
                        {t.originalPrice}: ¥
                        {(watchedValues.price_per_person || 0).toLocaleString()}
                      </span>
                      <span className="font-medium text-green-600">
                        {t.discountedPrice}: ¥{discountedPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {watchedValues.discount_type !== 'none' && (
                  <div>
                    <Label htmlFor="discount_condition">
                      {t.discountCondition}
                    </Label>
                    <Textarea
                      id="discount_condition"
                      {...register('discount_condition')}
                      placeholder="例: 学生割引、早期予約割引など"
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* メモ */}
            <div>
              <Label htmlFor="notes">{t.notes}</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="スロット固有のメモや注意事項"
              />
            </div>

            {/* アクションボタン */}
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '保存中...' : t.save}
              </Button>
              {editingSlot && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  {t.cancel}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
