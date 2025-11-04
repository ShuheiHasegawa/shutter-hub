'use client';

import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/utils/logger';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useSimpleProfile';
// 通常の撮影会作成アクションは不要（スロット必須のため）
import {
  createPhotoSessionWithSlotsAction,
  updatePhotoSessionWithSlotsAction,
  PhotoSessionWithSlotsData,
} from '@/app/actions/photo-session-slots';
import { createBulkPhotoSessionsAction } from '@/app/actions/bulk-photo-sessions';
import type {
  PhotoSessionWithOrganizer,
  BookingType,
  BookingSettings,
} from '@/types/database';
import type { PhotoSessionSlot, SelectedModel } from '@/types/photo-session';
import { useTranslations } from 'next-intl';
import { ImageUpload } from '@/components/photo-sessions/ImageUpload';
import { BookingTypeSelector } from '@/components/photo-sessions/BookingTypeSelector';
import { BookingSettingsForm } from '@/components/photo-sessions/BookingSettingsForm';
import PhotoSessionSlotForm from '@/components/photo-sessions/PhotoSessionSlotForm';
import { ModelSelectionForm } from '@/components/photo-sessions/ModelSelectionForm';
import { Label } from '@/components/ui/label';
import { FormattedDateTime } from '@/components/ui/formatted-display';
import { PageTitleHeader } from '@/components/ui/page-title-header';
// PriceInput は不要（スロットで料金設定するため）
import { Check, CameraIcon } from 'lucide-react';
import {
  ActionBar,
  ActionBarButton,
  ActionBarSentinel,
} from '@/components/ui/action-bar';
import { StudioSelectWithClear } from '@/components/studio/StudioSelectCombobox';
import { getStudioForAutoFillAction } from '@/app/actions/studio';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSubscription } from '@/hooks/useSubscription';
import { checkCanEnableCashOnSite } from '@/app/actions/photo-session-slots';
import { CreditCard, Wallet } from 'lucide-react';
interface PhotoSessionFormProps {
  initialData?: PhotoSessionWithOrganizer;
  isEditing?: boolean;
  isDuplicating?: boolean;
  onSuccess?: () => void;
}

export function PhotoSessionForm({
  initialData,
  isEditing = false,
  isDuplicating = false,
  onSuccess,
}: PhotoSessionFormProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('photoSessions');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState({
    title: isDuplicating
      ? `${initialData?.title || ''} (複製)`
      : initialData?.title || '',
    description: initialData?.description || '',
    location: initialData?.location || '',
    address: initialData?.address || '',
    start_time: initialData?.start_time
      ? new Date(initialData.start_time).toISOString().slice(0, 16)
      : '',
    end_time: initialData?.end_time
      ? new Date(initialData.end_time).toISOString().slice(0, 16)
      : '',
    booking_type: (initialData?.booking_type as BookingType) || 'first_come',
    allow_multiple_bookings: initialData?.allow_multiple_bookings || false,
    block_users_with_bad_ratings:
      initialData?.block_users_with_bad_ratings || false,
    payment_timing:
      (initialData?.payment_timing as 'prepaid' | 'cash_on_site') || 'prepaid',
    is_published: isDuplicating ? false : initialData?.is_published || false,
    image_urls: isDuplicating ? [] : initialData?.image_urls || [],
  });

  // スタジオ選択状態（編集時は初期値から取得する必要があるが、現時点ではphoto_sessionsテーブルにstudio_idがないため空）
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);

  const [bookingSettings, setBookingSettings] = useState<BookingSettings>({});
  const [photoSessionSlots, setPhotoSessionSlots] = useState<
    PhotoSessionSlot[]
  >([]);
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>([]);

  // サブスクリプション状態を取得（将来の拡張用）
  const {
    currentSubscription: _currentSubscription,
    isLoading: _isSubscriptionLoading,
  } = useSubscription();

  // 現地払いが有効化可能かチェック
  const [canEnableCashOnSite, setCanEnableCashOnSite] = useState(false);
  const [currentPlanName, setCurrentPlanName] = useState<string | undefined>();

  useEffect(() => {
    if (user?.id) {
      checkCanEnableCashOnSite(user.id).then(result => {
        setCanEnableCashOnSite(result.canEnable);
        setCurrentPlanName(result.currentPlan);
      });
    }
  }, [user?.id]);

  // 運営アカウントかどうかの判定
  const isOrganizer = profile?.user_type === 'organizer';
  const MAX_MODELS = 99;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
    // 手動入力時はスタジオ選択を解除
    if ((name === 'location' || name === 'address') && selectedStudioId) {
      setSelectedStudioId(null);
    }
  };

  // スタジオ選択時の処理
  const handleStudioSelect = async (studioId: string | null) => {
    setSelectedStudioId(studioId);

    if (!studioId) {
      // スタジオ選択解除時はフォームデータをクリア
      setFormData(prev => ({
        ...prev,
        location: '',
        address: '',
      }));
      return;
    }

    // スタジオ情報を取得して自動入力
    try {
      const result = await getStudioForAutoFillAction(studioId);
      if (result.success && result.studio) {
        setFormData(prev => ({
          ...prev,
          location: result.studio!.name,
          address: result.studio!.address,
        }));
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'スタジオ情報の取得に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('スタジオ情報取得エラー:', error);
      toast({
        title: 'エラー',
        description: 'スタジオ情報の取得中にエラーが発生しました',
        variant: 'destructive',
      });
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleImageUrlsChange = (urls: string[]) => {
    setFormData(prev => ({ ...prev, image_urls: urls }));
  };

  const handleBookingTypeChange = (bookingType: BookingType) => {
    setFormData(prev => ({ ...prev, booking_type: bookingType }));
  };

  // 撮影枠から日時を自動計算
  const calculateDateTimeFromSlots = (slots: PhotoSessionSlot[]) => {
    if (slots.length === 0) return { start_time: '', end_time: '' };

    // 撮影枠を開始時間でソート
    const sortedSlots = [...slots].sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const firstSlot = sortedSlots[0];
    const lastSlot = sortedSlots[sortedSlots.length - 1];

    // datetime-local形式の文字列として返す（タイムゾーンの問題を回避）
    const startTime = firstSlot.start_time.includes('T')
      ? firstSlot.start_time.split('.')[0] // ISO形式の場合はミリ秒部分を削除
      : firstSlot.start_time;

    const endTime = lastSlot.end_time.includes('T')
      ? lastSlot.end_time.split('.')[0] // ISO形式の場合はミリ秒部分を削除
      : lastSlot.end_time;

    return {
      start_time: startTime,
      end_time: endTime,
    };
  };

  // 撮影枠変更時に自動で日時を更新
  useEffect(() => {
    if (photoSessionSlots && photoSessionSlots.length > 0) {
      const { start_time, end_time } =
        calculateDateTimeFromSlots(photoSessionSlots);
      setFormData(prev => ({
        ...prev,
        start_time,
        end_time,
      }));
    }
  }, [photoSessionSlots]);

  // 撮影枠があるかどうかの判定
  const hasSlots = photoSessionSlots && photoSessionSlots.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: tErrors('title'),
        description: tErrors('unauthorized'),
        variant: 'destructive',
      });
      return;
    }

    // バリデーション
    if (!formData.title.trim()) {
      toast({
        title: tErrors('title'),
        description: t('form.validation.titleRequired'),
        variant: 'destructive',
      });
      return;
    }

    // スタジオ選択または場所情報入力のどちらか必須
    if (!selectedStudioId && !formData.location.trim()) {
      toast({
        title: tErrors('title'),
        description: 'スタジオを選択するか、場所情報を入力してください',
        variant: 'destructive',
      });
      return;
    }

    // 運営アカウントの場合：モデル選択バリデーション
    if (isOrganizer) {
      if (selectedModels.length === 0) {
        toast({
          title: tErrors('title'),
          description: '出演モデルを最低1名選択してください',
          variant: 'destructive',
        });
        return;
      }

      if (selectedModels.length > MAX_MODELS) {
        toast({
          title: tErrors('title'),
          description: `モデルは最大${MAX_MODELS}人まで選択可能です`,
          variant: 'destructive',
        });
        return;
      }

      // 重複チェック
      const modelIds = selectedModels.map(m => m.model_id);
      const uniqueIds = new Set(modelIds);
      if (modelIds.length !== uniqueIds.size) {
        toast({
          title: tErrors('title'),
          description: '同じモデルを重複して選択することはできません',
          variant: 'destructive',
        });
        return;
      }
    }

    // スロット必須前提のため、スロットバリデーションのみ実行
    if (!hasSlots) {
      toast({
        title: tErrors('title'),
        description: '撮影枠を最低1つ設定してください',
        variant: 'destructive',
      });
      return;
    }

    // 撮影枠から自動計算された日時の確認
    if (!formData.start_time || !formData.end_time) {
      toast({
        title: tErrors('title'),
        description: '撮影枠を設定してください。日時が自動計算されます。',
        variant: 'destructive',
      });
      return;
    }

    const startTime = new Date(formData.start_time);
    const endTime = new Date(formData.end_time);

    setIsLoading(true);
    try {
      // 運営アカウントの場合：一括作成
      if (isOrganizer && !isEditing) {
        const bulkData = {
          title: formData.title,
          description: formData.description || undefined,
          location: formData.location,
          address: formData.address || undefined,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          booking_type: formData.booking_type,
          allow_multiple_bookings: formData.allow_multiple_bookings,
          block_users_with_bad_ratings: formData.block_users_with_bad_ratings,
          payment_timing: formData.payment_timing,
          booking_settings: bookingSettings as Record<string, unknown>,
          is_published: formData.is_published,
          image_urls: formData.image_urls,
          selected_models: selectedModels,
          slots: photoSessionSlots.map(slot => ({
            slot_number: slot.slot_number,
            start_time: slot.start_time,
            end_time: slot.end_time,
            break_duration_minutes: slot.break_duration_minutes,
            price_per_person: slot.price_per_person,
            max_participants: slot.max_participants,
            costume_image_url: slot.costume_image_url || undefined,
            costume_image_hash: slot.costume_image_hash || undefined,
            costume_description: slot.costume_description || undefined,
            discount_type: slot.discount_type || 'none',
            discount_value: slot.discount_value || 0,
            discount_condition: slot.discount_condition || undefined,
            notes: slot.notes || undefined,
          })),
        };

        const result = await createBulkPhotoSessionsAction(bulkData);

        if (!result.success) {
          logger.error('一括撮影会作成エラー:', result.error);
          toast({
            title: tErrors('title'),
            description: result.error || t('form.error.saveFailed'),
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: tCommon('success'),
          description: `${result.created_sessions.length}個の撮影会を作成しました`,
        });

        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/dashboard');
        }
        return;
      }

      // スロット必須のため、常にスロット付き撮影会として処理
      const sessionWithSlotsData: PhotoSessionWithSlotsData = {
        title: formData.title,
        description: formData.description || undefined,
        location: formData.location,
        address: formData.address || undefined,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        booking_type: formData.booking_type,
        allow_multiple_bookings: formData.allow_multiple_bookings,
        payment_timing: formData.payment_timing,
        booking_settings: bookingSettings as Record<string, unknown>,
        is_published: formData.is_published,
        image_urls: formData.image_urls,
        slots: photoSessionSlots.map(slot => ({
          slot_number: slot.slot_number,
          start_time: slot.start_time,
          end_time: slot.end_time,
          break_duration_minutes: slot.break_duration_minutes,
          price_per_person: slot.price_per_person,
          max_participants: slot.max_participants,
          costume_image_url: slot.costume_image_url || undefined,
          costume_image_hash: slot.costume_image_hash || undefined,
          costume_description: slot.costume_description || undefined,
          discount_type: slot.discount_type || 'none',
          discount_value: slot.discount_value || 0,
          discount_condition: slot.discount_condition || undefined,
          notes: slot.notes || undefined,
        })),
      };

      let result;

      if (isEditing && initialData) {
        result = await updatePhotoSessionWithSlotsAction(
          initialData.id,
          sessionWithSlotsData
        );
      } else {
        result = await createPhotoSessionWithSlotsAction(sessionWithSlotsData);
      }

      if (result.error) {
        logger.error('撮影会保存エラー:', result.error);
        toast({
          title: tErrors('title'),
          description: t('form.error.saveFailed'),
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: tCommon('success'),
        description: isEditing
          ? t('form.success.updated')
          : t('form.success.created'),
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      logger.error('予期しないエラー:', error);
      toast({
        title: tErrors('title'),
        description: tErrors('unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 下部固定アクションバー用ボタン
  const actionBarButtons: ActionBarButton[] = [
    {
      id: 'submit',
      label: isEditing ? t('form.updateButton') : t('form.createButton'),
      variant: 'cta',
      onClick: () => formRef.current?.requestSubmit(),
      loading: isLoading,
      disabled: isLoading,
    },
  ];

  return (
    <div>
      <PageTitleHeader
        title={
          isDuplicating
            ? t('form.duplicateTitle')
            : isEditing
              ? t('form.editTitle')
              : t('form.createTitle')
        }
        icon={<CameraIcon className="h-6 w-6" />}
      />
      <Card className="w-full mx-auto">
        <CardContent className="py-4">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {/* 画像アップロード */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">イメージ画像</h3>
              <ImageUpload
                photoSessionId={initialData?.id || 'temp'}
                initialImages={formData.image_urls}
                onImagesChange={handleImageUrlsChange}
                maxImages={5}
                disabled={isLoading}
              />
            </div>

            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('form.basicInfo')}</h3>

              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium mb-2"
                >
                  {t('form.titleLabel')} {t('form.required')}
                </label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder={t('form.titlePlaceholder')}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium mb-2"
                >
                  {t('form.descriptionLabel')}
                </label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder={t('form.descriptionPlaceholder')}
                  rows={4}
                />
              </div>
            </div>

            {/* 場所情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('form.locationInfo')}</h3>

              {/* スタジオ選択 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  スタジオを選択
                  <span className="text-xs text-muted-foreground ml-2">
                    （任意）
                  </span>
                </label>
                <StudioSelectWithClear
                  value={selectedStudioId || undefined}
                  onSelect={handleStudioSelect}
                  onClear={() => handleStudioSelect(null)}
                  placeholder="スタジオを検索..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  スタジオを選択すると、場所情報が自動入力されます
                </p>
              </div>

              {/* 手動入力（スタジオ未選択時のみ表示） */}
              {!selectedStudioId && (
                <>
                  <div>
                    <label
                      htmlFor="location"
                      className="block text-sm font-medium mb-2"
                    >
                      {t('form.locationLabel')} {t('form.required')}
                    </label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder={t('form.locationPlaceholder')}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="address"
                      className="block text-sm font-medium mb-2"
                    >
                      {t('form.addressLabel')}
                    </label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder={t('form.addressPlaceholder')}
                    />
                  </div>
                </>
              )}

              {/* スタジオ選択時の読み取り専用表示 */}
              {selectedStudioId && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                  <div>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      場所: {formData.location}
                    </span>
                  </div>
                  {formData.address && (
                    <div>
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        住所: {formData.address}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 日時情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('form.dateTimeInfo')}</h3>

              {hasSlots ? (
                // 撮影枠がある場合は自動計算された日時を表示
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                      <Check className="h-5 w-5 text-success" />
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-2">
                        撮影枠から自動計算されます
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium mb-1">開始日時</p>
                          <p className="text-sm font-mono bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                            {formData.start_time ? (
                              <FormattedDateTime
                                value={formData.start_time}
                                format="datetime-long"
                              />
                            ) : (
                              '撮影枠を設定してください'
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1">終了日時</p>
                          <p className="text-sm font-mono bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                            {formData.end_time ? (
                              <FormattedDateTime
                                value={formData.end_time}
                                format="datetime-long"
                              />
                            ) : (
                              '撮影枠を設定してください'
                            )}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs mt-2 opacity-75">
                        開始日時は最初の撮影枠の開始時刻、終了日時は最後の撮影枠の終了時刻が自動設定されます
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // 撮影枠がない場合は手動入力
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="start_time"
                      className="block text-sm font-medium mb-2"
                    >
                      {t('form.startTimeLabel')} {t('form.required')}
                    </label>
                    <Input
                      id="start_time"
                      name="start_time"
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="end_time"
                      className="block text-sm font-medium mb-2"
                    >
                      {t('form.endTimeLabel')} {t('form.required')}
                    </label>
                    <Input
                      id="end_time"
                      name="end_time"
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 参加者・料金情報は撮影枠で設定するため削除 */}

            {/* 運営アカウントのみ：モデル選択セクション */}
            {isOrganizer && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">出演モデル設定</h3>
                <p className="text-sm text-muted-foreground">
                  各モデルを検索して追加し、個別に料金を設定してください（最大
                  {MAX_MODELS}人）
                </p>

                <ModelSelectionForm
                  selectedModels={selectedModels}
                  onModelsChange={setSelectedModels}
                  maxModels={MAX_MODELS}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* 予約方式選択 */}
            <BookingTypeSelector
              value={formData.booking_type}
              onChange={handleBookingTypeChange}
              disabled={isLoading}
            />

            {/* 予約設定 */}
            <BookingSettingsForm
              bookingType={formData.booking_type}
              settings={bookingSettings}
              onChange={setBookingSettings}
              disabled={isLoading}
            />

            {/* 複数予約許可設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {t('form.bookingSettings')}
              </h3>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <label className="text-base font-medium">
                    {t('form.allowMultipleBookings')}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {t('form.allowMultipleBookingsDescription')}
                  </p>
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div>• {t('form.multipleBookingDisabled')}</div>
                    <div>• {t('form.multipleBookingEnabled')}</div>
                  </div>
                </div>
                <Switch
                  checked={formData.allow_multiple_bookings}
                  onCheckedChange={checked =>
                    handleSwitchChange('allow_multiple_bookings', checked)
                  }
                  disabled={isLoading}
                />
              </div>

              {formData.allow_multiple_bookings && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                      💡
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">
                        {t('form.multipleBookingEnabledTitle')}
                      </p>
                      <ul className="space-y-1 text-xs">
                        <li>• {t('form.multipleBookingFeature1')}</li>
                        <li>• {t('form.multipleBookingFeature2')}</li>
                        <li>• {t('form.multipleBookingFeature3')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 悪い評価ユーザーのブロック設定 */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <label
                    htmlFor="block_users_with_bad_ratings"
                    className="text-sm font-medium cursor-pointer"
                  >
                    {t('form.blockUsersWithBadRatings')}
                  </label>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('form.blockUsersWithBadRatingsDescription')}
                  </p>
                </div>
                <Switch
                  id="block_users_with_bad_ratings"
                  checked={formData.block_users_with_bad_ratings}
                  onCheckedChange={checked =>
                    handleSwitchChange('block_users_with_bad_ratings', checked)
                  }
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 撮影枠設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('form.slotSettings')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('form.slotSettingsDescription')}
              </p>

              <PhotoSessionSlotForm
                photoSessionId={initialData?.id || 'temp'}
                onSlotsChange={setPhotoSessionSlots}
                baseDate={
                  formData.start_time
                    ? formData.start_time.split('T')[0]
                    : new Date().toISOString().split('T')[0]
                }
                allowMultipleBookings={formData.allow_multiple_bookings}
              />
            </div>

            {/* 複数枠割引設定 - 複数予約が許可されている場合のみ表示 */}
            {formData.allow_multiple_bookings && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">複数枠割引設定</h3>
                <p className="text-sm text-muted-foreground">
                  複数の撮影枠を予約した場合に適用される割引を設定できます
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="multi_slot_discount_threshold">
                      適用条件（枠数）
                    </Label>
                    <Input
                      id="multi_slot_discount_threshold"
                      type="number"
                      min="2"
                      max="10"
                      placeholder="例: 2"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      この枠数以上で割引適用
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="multi_slot_discount_type">割引タイプ</Label>
                    <select
                      id="multi_slot_discount_type"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="none">割引なし</option>
                      <option value="percentage">パーセンテージ割引</option>
                      <option value="fixed_amount">固定金額割引</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="multi_slot_discount_value">割引値</Label>
                    <Input
                      id="multi_slot_discount_value"
                      type="number"
                      min="0"
                      placeholder="例: 10 または 1000"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      %または円で入力
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="multi_slot_discount_description">
                    割引説明
                  </Label>
                  <Textarea
                    id="multi_slot_discount_description"
                    placeholder="例: 2枠以上のご予約で10%割引！"
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* 支払い方法設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('form.paymentTiming')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('form.paymentTimingDescription')}
              </p>

              <RadioGroup
                value={formData.payment_timing}
                onValueChange={(value: 'prepaid' | 'cash_on_site') => {
                  setFormData(prev => ({ ...prev, payment_timing: value }));
                }}
                disabled={isLoading}
                className="space-y-4"
              >
                {/* Stripe決済（事前決済） */}
                <div className="relative">
                  <RadioGroupItem
                    value="prepaid"
                    id="payment_prepaid"
                    className="sr-only"
                  />
                  <Label
                    htmlFor="payment_prepaid"
                    className="block cursor-pointer transition-all duration-200"
                  >
                    <Card
                      className={`transition-all duration-200 hover:shadow-md ${
                        formData.payment_timing === 'prepaid'
                          ? 'ring-2 ring-primary shadow-md'
                          : 'hover:border-muted-foreground/20'
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-800 border-blue-200">
                              <CreditCard className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {t('form.paymentTimingPrepaid')}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                予約時にStripe決済を完了していただきます
                              </p>
                            </div>
                          </div>
                          {formData.payment_timing === 'prepaid' && (
                            <Badge variant="default" className="ml-2">
                              選択中
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  </Label>
                </div>

                {/* 現地払い */}
                <div className="relative">
                  <RadioGroupItem
                    value="cash_on_site"
                    id="payment_cash_on_site"
                    className="sr-only"
                    disabled={!canEnableCashOnSite}
                  />
                  <Label
                    htmlFor="payment_cash_on_site"
                    className={`block transition-all duration-200 ${
                      !canEnableCashOnSite
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                    }`}
                  >
                    <Card
                      className={`transition-all duration-200 ${
                        !canEnableCashOnSite
                          ? 'opacity-50'
                          : formData.payment_timing === 'cash_on_site'
                            ? 'ring-2 ring-primary shadow-md'
                            : 'hover:border-muted-foreground/20 hover:shadow-md'
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 text-green-800 border-green-200">
                              <Wallet className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {t('form.paymentTimingCashOnSite')}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                撮影当日に現地でお支払いいただきます
                              </p>
                              {!canEnableCashOnSite && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                  {t('form.cashOnSiteRequiresSubscription')}
                                  {currentPlanName && (
                                    <span className="ml-1">
                                      （現在のプラン: {currentPlanName}）
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                          {formData.payment_timing === 'cash_on_site' &&
                            canEnableCashOnSite && (
                              <Badge variant="default" className="ml-2">
                                選択中
                              </Badge>
                            )}
                        </div>
                      </CardHeader>
                    </Card>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* 公開設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {t('form.publishSettings')}
              </h3>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <label className="text-base font-medium">
                    {t('form.publishLabel')}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {t('form.publishDescription')}
                  </p>
                </div>
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={checked =>
                    handleSwitchChange('is_published', checked)
                  }
                />
              </div>
            </div>

            <ActionBarSentinel className="pt-4 pb-0">
              <Button
                type="submit"
                className="text-base font-medium w-full transition-colors"
                disabled={isLoading}
                variant="cta"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {isEditing ? t('form.updating') : t('form.creating')}
                  </>
                ) : isEditing ? (
                  t('form.updateButton')
                ) : (
                  t('form.createButton')
                )}
              </Button>
            </ActionBarSentinel>
          </form>
        </CardContent>
      </Card>

      {/* 下部固定ActionBar（Sentinel非表示時のみ表示） */}
      <ActionBar
        actions={actionBarButtons}
        maxColumns={1}
        background="blur"
        sticky={true}
        autoHide={true}
      />
      {/* ActionBar用のスペーサー（fixed要素の高さ分） */}
      <div className="h-20 md:h-20 flex-shrink-0" />
    </div>
  );
}
