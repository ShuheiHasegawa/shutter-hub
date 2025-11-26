'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useSimpleProfile';
import {
  createPhotoSessionWithSlotsAction,
  PhotoSessionWithSlotsData,
} from '@/app/actions/photo-session-slots';
import type {
  PhotoSessionWithOrganizer,
  BookingType,
  BookingSettings,
} from '@/types/database';
import type { PhotoSessionSlot, SelectedModel } from '@/types/photo-session';
import type {
  WeightCalculationMethod,
  ModelSelectionScope,
  ChekiSelectionScope,
} from '@/types/multi-slot-lottery';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { ImageUpload } from '@/components/photo-sessions/ImageUpload';
import { BookingTypeSelector } from '@/components/photo-sessions/BookingTypeSelector';
import { BookingSettingsForm } from '@/components/photo-sessions/BookingSettingsForm';
import PhotoSessionSlotForm from '@/components/photo-sessions/PhotoSessionSlotForm';
import { ModelSelectionForm } from '@/components/photo-sessions/ModelSelectionForm';
import { Label } from '@/components/ui/label';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { CameraIcon, ArrowLeft } from 'lucide-react';
import {
  ActionBar,
  ActionBarButton,
  ActionBarSentinel,
} from '@/components/ui/action-bar';
import { StudioSelectWithClear } from '@/components/studio/StudioSelectCombobox';
import { getStudioForAutoFillAction } from '@/app/actions/studio';
import { useSubscription } from '@/hooks/useSubscription';
import { checkCanEnableCashOnSite } from '@/app/actions/photo-session-slots';

interface JointSessionFormProps {
  initialData?: PhotoSessionWithOrganizer;
  initialModels?: SelectedModel[];
  initialSlots?: PhotoSessionSlot[];
  initialStudioId?: string | null;
  isEditing?: boolean;
  onSuccess?: () => void;
  onBack?: () => void;
}

export function JointSessionForm({
  initialData,
  initialModels = [],
  initialSlots = [],
  initialStudioId = null,
  isEditing = false,
  onSuccess,
  onBack,
}: JointSessionFormProps) {
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
    title: initialData?.title || '',
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
    is_published: initialData?.is_published || false,
    image_urls: initialData?.image_urls || [],
  });

  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(
    initialStudioId || null
  );

  const [bookingSettings, setBookingSettings] = useState<BookingSettings>({});
  const [photoSessionSlots, setPhotoSessionSlots] = useState<
    PhotoSessionSlot[]
  >(initialSlots || []);
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>(
    initialModels || []
  );

  // 抽選設定（抽選方式選択時のみ使用）
  const [lotterySettings, setLotterySettings] = useState({
    enable_lottery_weight: false,
    weight_calculation_method: 'linear' as WeightCalculationMethod,
    weight_multiplier: 1.0,
    enable_model_selection: false,
    model_selection_scope: 'per_slot' as ModelSelectionScope,
    enable_cheki_selection: false,
    cheki_selection_scope: 'total_only' as ChekiSelectionScope,
  });

  const {
    currentSubscription: _currentSubscription,
    isLoading: _isSubscriptionLoading,
  } = useSubscription();

  const ENABLE_CASH_ON_SITE =
    process.env.NEXT_PUBLIC_ENABLE_CASH_ON_SITE === 'true';
  const CASH_ON_SITE_REQUIRES_SUBSCRIPTION =
    process.env.NEXT_PUBLIC_CASH_ON_SITE_REQUIRES_SUBSCRIPTION !== 'false';

  // const [canEnableCashOnSite, setCanEnableCashOnSite] = useState(false);
  // const [currentPlanName, setCurrentPlanName] = useState<string | undefined>();

  useEffect(() => {
    if (!ENABLE_CASH_ON_SITE) {
      setCanEnableCashOnSite(false);
      return;
    }

    if (!CASH_ON_SITE_REQUIRES_SUBSCRIPTION) {
      setCanEnableCashOnSite(true);
      setCurrentPlanName(undefined);
      return;
    }

    if (user?.id) {
      checkCanEnableCashOnSite(user.id).then(result => {
        setCanEnableCashOnSite(result.canEnable);
        setCurrentPlanName(result.currentPlan);
      });
    }
  }, [user?.id, ENABLE_CASH_ON_SITE, CASH_ON_SITE_REQUIRES_SUBSCRIPTION]);

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
    if ((name === 'location' || name === 'address') && selectedStudioId) {
      setSelectedStudioId(null);
    }
  };

  const handleStudioSelect = async (studioId: string | null) => {
    setSelectedStudioId(studioId);

    if (!studioId) {
      setFormData(prev => ({
        ...prev,
        location: '',
        address: '',
      }));
      return;
    }

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

  const handleSwitchChange = useCallback((name: string, checked: boolean) => {
    setFormData(prev => {
      if (prev[name as keyof typeof prev] === checked) {
        return prev;
      }
      return { ...prev, [name]: checked };
    });
  }, []);

  const handleImageUrlsChange = useCallback((urls: string[]) => {
    setFormData(prev => ({ ...prev, image_urls: urls }));
  }, []);

  const handleBookingTypeChange = useCallback((bookingType: BookingType) => {
    setFormData(prev => {
      if (prev.booking_type === bookingType) {
        return prev;
      }
      return { ...prev, booking_type: bookingType };
    });
  }, []);

  const handleBookingSettingsChange = useCallback(
    (newSettings: BookingSettings) => {
      setBookingSettings(prev => {
        if (JSON.stringify(prev) === JSON.stringify(newSettings)) {
          return prev;
        }
        return newSettings;
      });
    },
    []
  );

  const calculateDateTimeFromSlots = (slots: PhotoSessionSlot[]) => {
    if (slots.length === 0) return { start_time: '', end_time: '' };

    const sortedSlots = [...slots].sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const firstSlot = sortedSlots[0];
    const lastSlot = sortedSlots[sortedSlots.length - 1];

    const startTime = firstSlot.start_time.includes('T')
      ? firstSlot.start_time.split('.')[0]
      : firstSlot.start_time;

    const endTime = lastSlot.end_time.includes('T')
      ? lastSlot.end_time.split('.')[0]
      : lastSlot.end_time;

    return {
      start_time: startTime,
      end_time: endTime,
    };
  };

  const hasRestoredModels = useRef(false);
  useEffect(() => {
    if (
      isEditing &&
      initialModels &&
      initialModels.length > 0 &&
      !hasRestoredModels.current
    ) {
      // 合同撮影会ではfee_amountを0に設定
      const modelsWithZeroFee = initialModels.map(model => ({
        ...model,
        fee_amount: 0,
      }));
      setSelectedModels(modelsWithZeroFee);
      hasRestoredModels.current = true;
    }
  }, [isEditing, initialModels]);

  const hasRestoredStudio = useRef(false);
  useEffect(() => {
    if (isEditing && initialStudioId && !hasRestoredStudio.current) {
      setSelectedStudioId(initialStudioId);
      hasRestoredStudio.current = true;
    }
  }, [isEditing, initialStudioId]);

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

  // モデル選択時にfee_amountを0に設定
  const handleModelsChange = (models: SelectedModel[]) => {
    const modelsWithZeroFee = models.map(model => ({
      ...model,
      fee_amount: 0,
    }));
    setSelectedModels(modelsWithZeroFee);
  };

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

    if (!formData.title.trim()) {
      toast({
        title: tErrors('title'),
        description: t('form.validation.titleRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (!selectedStudioId && !formData.location.trim()) {
      toast({
        title: tErrors('title'),
        description: 'スタジオを選択するか、場所情報を入力してください',
        variant: 'destructive',
      });
      return;
    }

    if (isOrganizer && selectedModels.length === 0) {
      toast({
        title: tErrors('title'),
        description: '出演モデルを最低1名選択してください',
        variant: 'destructive',
      });
      return;
    }

    if (!hasSlots) {
      toast({
        title: tErrors('title'),
        description: '撮影枠を最低1つ設定してください',
        variant: 'destructive',
      });
      return;
    }

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
      // 合同撮影会は1つの撮影会として作成（session_type='joint'）
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
        studio_id: selectedStudioId || undefined,
        selected_models: isOrganizer
          ? selectedModels.map(m => ({ ...m, fee_amount: 0 }))
          : undefined,
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
        session_type: 'joint',
        // 抽選方式・管理抽選の場合、抽選設定を追加
        lottery_settings:
          formData.booking_type === 'lottery' ||
          formData.booking_type === 'admin_lottery'
            ? lotterySettings
            : undefined,
      };

      const result =
        await createPhotoSessionWithSlotsAction(sessionWithSlotsData);

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
        description: t('form.success.created'),
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

  const actionBarButtons: ActionBarButton[] = [
    ...(onBack && !isEditing
      ? [
          {
            id: 'back',
            label: '戻る',
            variant: 'outline' as const,
            onClick: onBack,
            icon: <ArrowLeft className="h-4 w-4" />,
          },
        ]
      : []),
    {
      id: 'submit',
      label: isEditing ? t('form.updateButton') : t('form.createButton'),
      variant: 'cta' as const,
      onClick: () => formRef.current?.requestSubmit(),
      loading: isLoading,
      disabled: isLoading,
    },
  ];

  return (
    <div>
      <PageTitleHeader
        title={isEditing ? t('form.editTitle') : '合同撮影会を作成'}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
              </div>

              {/* スタジオ選択 */}
              <div className="space-y-4">
                <Label>場所情報</Label>
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
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    スタジオを選択すると、場所情報が自動入力されます
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium mb-2"
                >
                  場所: {t('form.required')}
                </label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="撮影会の場所"
                  required
                  disabled={isLoading || !!selectedStudioId}
                />
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium mb-2"
                >
                  住所
                </label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="詳細な住所"
                  disabled={isLoading || !!selectedStudioId}
                />
              </div>

              {!hasSlots && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="start_time"
                      className="block text-sm font-medium mb-2"
                    >
                      開始日時 {t('form.required')}
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
                      終了日時 {t('form.required')}
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

            {/* 運営アカウントのみ：モデル選択セクション（紐づけのみ） */}
            {isOrganizer && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">出演モデル設定</h3>
                <p className="text-sm text-muted-foreground">
                  出演するモデルを選択してください。合同撮影会ではモデルごとの料金設定は不要です。
                </p>

                <ModelSelectionForm
                  selectedModels={selectedModels}
                  onModelsChange={handleModelsChange}
                  maxModels={MAX_MODELS}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* 予約方式選択 */}
            <BookingTypeSelector
              value={formData.booking_type || 'first_come'}
              onChange={handleBookingTypeChange}
              disabled={isLoading}
            />

            {/* 予約設定 */}
            <BookingSettingsForm
              bookingType={formData.booking_type}
              settings={bookingSettings}
              onChange={handleBookingSettingsChange}
              disabled={isLoading}
            />

            {/* 抽選設定（抽選方式・管理抽選選択時のみ表示） */}
            {(formData.booking_type === 'lottery' ||
              formData.booking_type === 'admin_lottery') && (
              <div className="space-y-6 p-4 border rounded-lg">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium">複数スロット抽選設定</h3>
                  <p className="text-sm text-muted-foreground">
                    複数スロット抽選の詳細設定を行います
                  </p>
                </div>

                {/* 重み付き抽選設定 */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">
                        応募数による当選確率調整
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        応募枠が多いユーザーほど当選確率が高くなります
                      </p>
                    </div>
                    <Switch
                      checked={lotterySettings.enable_lottery_weight}
                      onCheckedChange={checked =>
                        setLotterySettings({
                          ...lotterySettings,
                          enable_lottery_weight: checked,
                        })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  {lotterySettings.enable_lottery_weight && (
                    <div className="space-y-4 pt-4 border-t">
                      {/* 重み計算方法の説明 */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-2">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          💡 重み計算方法とは？
                        </p>
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          応募枠数に応じて、抽選の当選確率を調整する仕組みです。
                          <br />
                          例：10枠募集で3名が応募した場合
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>重み計算方法</Label>
                        <Select
                          value={lotterySettings.weight_calculation_method}
                          onValueChange={value =>
                            setLotterySettings({
                              ...lotterySettings,
                              weight_calculation_method:
                                value as WeightCalculationMethod,
                            })
                          }
                          disabled={isLoading}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linear">
                              線形（応募数 = 重み）
                            </SelectItem>
                            <SelectItem value="bonus">
                              ボーナス（基本重み + ボーナス）
                            </SelectItem>
                            <SelectItem value="custom">カスタム</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* 計算方法別の詳細説明 */}
                        <div className="p-3 bg-muted rounded-lg space-y-2">
                          {lotterySettings.weight_calculation_method ===
                            'linear' && (
                            <>
                              <p className="text-xs font-medium">
                                📊 線形方式：応募枠数 = 当選確率の重み
                              </p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>• Aさん（1枠応募）：重み = 1</p>
                                <p>• Bさん（4枠応募）：重み = 4</p>
                                <p>• Cさん（10枠応募）：重み = 10</p>
                                <p className="pt-1 font-medium">
                                  → Cさんの当選確率はAさんの10倍
                                </p>
                              </div>
                            </>
                          )}
                          {lotterySettings.weight_calculation_method ===
                            'bonus' && (
                            <>
                              <p className="text-xs font-medium">
                                🎁 ボーナス方式：基本重み1 + ボーナス重み
                              </p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>• Aさん（1枠応募）：重み = 1 + 0 = 1</p>
                                <p>• Bさん（4枠応募）：重み = 1 + 3 = 4</p>
                                <p>• Cさん（10枠応募）：重み = 1 + 9 = 10</p>
                                <p className="pt-1 font-medium">
                                  →
                                  全員に基本確率を保証しつつ、多く応募した人にボーナス
                                </p>
                              </div>
                            </>
                          )}
                          {lotterySettings.weight_calculation_method ===
                            'custom' && (
                            <>
                              <p className="text-xs font-medium">
                                ⚙️ カスタム方式：独自の計算式
                              </p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>
                                  •
                                  重み倍率を使用して、応募数に対する重みの影響を調整できます
                                </p>
                                <p>
                                  • 例：倍率0.5の場合、4枠応募でも重みは2（4 ×
                                  0.5）
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>重み倍率</Label>
                        <Input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={lotterySettings.weight_multiplier}
                          onChange={e =>
                            setLotterySettings({
                              ...lotterySettings,
                              weight_multiplier:
                                parseFloat(e.target.value) || 1.0,
                            })
                          }
                          disabled={isLoading}
                        />
                        <div className="p-3 bg-muted rounded-lg space-y-1">
                          <p className="text-xs font-medium">
                            🔢 重み倍率の効果（4枠応募の場合）
                          </p>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>
                              • 倍率 0.5：重み = 4 × 0.5 = 2（控えめな調整）
                            </p>
                            <p>• 倍率 1.0：重み = 4 × 1.0 = 4（標準）</p>
                            <p>• 倍率 2.0：重み = 4 × 2.0 = 8（強い調整）</p>
                          </div>
                        </div>
                      </div>

                      {/* 実際の当選確率シミュレーション */}
                      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg space-y-2">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          📈 当選確率シミュレーション
                        </p>
                        <div className="text-xs text-green-800 dark:text-green-200 space-y-1">
                          <p className="font-medium">
                            例：10枠募集、3名応募の場合
                          </p>
                          <div className="pl-2 space-y-0.5">
                            <p>• Aさん（1枠）：重み = 1</p>
                            <p>• Bさん（4枠）：重み = 4</p>
                            <p>• Cさん（5枠）：重み = 5</p>
                            <p className="pt-1">合計重み = 1 + 4 + 5 = 10</p>
                          </div>
                          <div className="pl-2 space-y-0.5 pt-2 border-t border-green-200 dark:border-green-800">
                            <p className="font-medium">当選確率：</p>
                            <p>• Aさん：1/10 = 10%</p>
                            <p>• Bさん：4/10 = 40%</p>
                            <p>• Cさん：5/10 = 50%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 推しモデル選択設定 */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">
                        推しモデル選択機能
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        ユーザーが推しモデルを選択できるようにします
                      </p>
                    </div>
                    <Switch
                      checked={lotterySettings.enable_model_selection}
                      onCheckedChange={checked =>
                        setLotterySettings({
                          ...lotterySettings,
                          enable_model_selection: checked,
                        })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  {lotterySettings.enable_model_selection && (
                    <div className="space-y-2 pt-4 border-t">
                      <Label>モデル選択範囲</Label>
                      <Select
                        value={lotterySettings.model_selection_scope}
                        onValueChange={value =>
                          setLotterySettings({
                            ...lotterySettings,
                            model_selection_scope: value as ModelSelectionScope,
                          })
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_slot">
                            スロットごとに選択
                          </SelectItem>
                          <SelectItem value="session_wide">
                            撮影会全体で1名のみ
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {lotterySettings.model_selection_scope === 'per_slot' &&
                          '各スロットで異なるモデルを選択可能'}
                        {lotterySettings.model_selection_scope ===
                          'session_wide' && '撮影会全体で1名のモデルを選択'}
                      </p>
                    </div>
                  )}
                </div>

                {/* チェキ選択設定 */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">
                        チェキ選択機能
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        ユーザーがチェキ枚数を選択できるようにします
                      </p>
                    </div>
                    <Switch
                      checked={lotterySettings.enable_cheki_selection}
                      onCheckedChange={checked =>
                        setLotterySettings({
                          ...lotterySettings,
                          enable_cheki_selection: checked,
                        })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  {lotterySettings.enable_cheki_selection && (
                    <div className="space-y-2 pt-4 border-t">
                      <Label>チェキ選択範囲</Label>
                      <Select
                        value={lotterySettings.cheki_selection_scope}
                        onValueChange={value =>
                          setLotterySettings({
                            ...lotterySettings,
                            cheki_selection_scope: value as ChekiSelectionScope,
                          })
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_slot">
                            スロットごとに選択
                          </SelectItem>
                          <SelectItem value="total_only">
                            全スロット合計で選択
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {lotterySettings.cheki_selection_scope === 'per_slot' &&
                          '各スロットで異なる枚数を選択可能'}
                        {lotterySettings.cheki_selection_scope ===
                          'total_only' && '全スロットの合計枚数を選択'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 複数予約許可設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {t('form.bookingSettings')}
              </h3>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('form.allowMultipleBookings')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('form.allowMultipleBookingsDescription')}
                  </p>
                </div>
                <Switch
                  checked={formData.allow_multiple_bookings}
                  onCheckedChange={checked =>
                    handleSwitchChange('allow_multiple_bookings', checked)
                  }
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 撮影枠設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">撮影枠設定</h3>
              <PhotoSessionSlotForm
                slots={photoSessionSlots}
                onSlotsChange={setPhotoSessionSlots}
                disabled={isLoading}
              />
            </div>

            {/* 公開設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {t('form.publishSettings')}
              </h3>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('form.publishLabel')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('form.publishDescription')}
                  </p>
                </div>
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={checked =>
                    handleSwitchChange('is_published', checked)
                  }
                  disabled={isLoading}
                />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <ActionBarSentinel />
      <ActionBar
        actions={actionBarButtons}
        maxColumns={onBack && !isEditing ? 2 : 1}
        background="blur"
      />
    </div>
  );
}
