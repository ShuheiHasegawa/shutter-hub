'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { FormattedDateTime } from '@/components/ui/formatted-display';
import { PageTitleHeader } from '@/components/ui/page-title-header';
// PriceInput は不要（スロットで料金設定するため）
import { Check, CameraIcon, ArrowLeft } from 'lucide-react';
import {
  ActionBar,
  ActionBarButton,
  ActionBarSentinel,
} from '@/components/ui/action-bar';
import { StudioSelectWithClear } from '@/components/studio/StudioSelectCombobox';
import { getStudioForAutoFillAction } from '@/app/actions/studio';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useSubscription } from '@/hooks/useSubscription';
import { checkCanEnableCashOnSite } from '@/app/actions/photo-session-slots';
import { CreditCard, Wallet } from 'lucide-react';
import { formatDateToLocalString } from '@/lib/utils/time-utils';

interface PhotoSessionFormProps {
  initialData?: PhotoSessionWithOrganizer;
  initialModels?: SelectedModel[];
  initialSlots?: PhotoSessionSlot[];
  initialStudioId?: string | null;
  isEditing?: boolean;
  isDuplicating?: boolean;
  onSuccess?: () => void;
  onBack?: () => void;
}

export function PhotoSessionForm({
  initialData,
  initialModels = [],
  initialSlots = [],
  initialStudioId = null,
  isEditing = false,
  isDuplicating = false,
  onSuccess,
  onBack,
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

  // Zodスキーマ定義（多言語化対応）
  const formSchema = useMemo(
    () =>
      z
        .object({
          title: z.string().min(1, t('form.validation.titleRequired')),
          description: z.string().optional(),
          location: z.string().optional(),
          address: z.string().optional(),
          event_date: z.string().optional(),
          booking_type: z.enum(['first_come', 'lottery', 'priority']),
          allow_multiple_bookings: z.boolean(),
          block_users_with_bad_ratings: z.boolean(),
          payment_timing: z.enum(['prepaid', 'cash_on_site']),
          is_published: z.boolean(),
          image_urls: z.array(z.string()),
        })
        .superRefine((_data, _ctx) => {
          // スタジオ選択または場所情報入力のどちらか必須
          // このバリデーションはselectedStudioIdと連動するため、フォーム送信時にチェック
          // ここではスキーマレベルではチェックしない（handleSubmitでチェック）
        }),
    [t]
  );

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: isDuplicating
        ? `${initialData?.title || ''} (複製)`
        : initialData?.title || '',
      description: initialData?.description || '',
      location: initialData?.location || '',
      address: initialData?.address || '',
      event_date: initialData?.start_time
        ? formatDateToLocalString(new Date(initialData.start_time))
        : '',
      booking_type:
        (['first_come', 'lottery', 'priority'].includes(
          initialData?.booking_type || ''
        )
          ? (initialData?.booking_type as 'first_come' | 'lottery' | 'priority')
          : 'first_come') || 'first_come',
      allow_multiple_bookings: initialData?.allow_multiple_bookings || false,
      block_users_with_bad_ratings:
        initialData?.block_users_with_bad_ratings || false,
      payment_timing:
        (initialData?.payment_timing as 'prepaid' | 'cash_on_site') ||
        'prepaid',
      is_published: isDuplicating
        ? false
        : initialData?.is_published !== undefined
          ? initialData.is_published
          : true,
      image_urls: isDuplicating ? [] : initialData?.image_urls || [],
    },
  });

  // スタジオ選択状態（編集時は初期値から取得）
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

  // サブスクリプション状態を取得（将来の拡張用）
  const {
    currentSubscription: _currentSubscription,
    isLoading: _isSubscriptionLoading,
  } = useSubscription();

  // 環境変数で現地払い機能を制御
  const ENABLE_CASH_ON_SITE =
    process.env.NEXT_PUBLIC_ENABLE_CASH_ON_SITE === 'true';
  const CASH_ON_SITE_REQUIRES_SUBSCRIPTION =
    process.env.NEXT_PUBLIC_CASH_ON_SITE_REQUIRES_SUBSCRIPTION !== 'false'; // デフォルトtrue

  // 現地払いが有効化可能かチェック
  const [canEnableCashOnSite, setCanEnableCashOnSite] = useState(false);
  const [currentPlanName, setCurrentPlanName] = useState<string | undefined>();

  useEffect(() => {
    // 環境変数で現地払い機能が無効化されている場合は、常にfalse
    if (!ENABLE_CASH_ON_SITE) {
      setCanEnableCashOnSite(false);
      return;
    }

    // サブスクリプションチェックが不要な場合は、常に有効化
    if (!CASH_ON_SITE_REQUIRES_SUBSCRIPTION) {
      setCanEnableCashOnSite(true);
      setCurrentPlanName(undefined);
      return;
    }

    // 通常のサブスクリプションチェック
    if (user?.id) {
      checkCanEnableCashOnSite(user.id).then(result => {
        setCanEnableCashOnSite(result.canEnable);
        setCurrentPlanName(result.currentPlan);
      });
    }
  }, [user?.id, ENABLE_CASH_ON_SITE, CASH_ON_SITE_REQUIRES_SUBSCRIPTION]);

  // 運営アカウントかどうかの判定
  const isOrganizer = profile?.user_type === 'organizer';
  const MAX_MODELS = 99;

  // 手動入力時はスタジオ選択を解除する処理
  const handleLocationOrAddressChange = () => {
    if (selectedStudioId) {
      setSelectedStudioId(null);
    }
  };

  // スタジオ選択時の処理
  const handleStudioSelect = async (studioId: string | null) => {
    setSelectedStudioId(studioId);

    if (!studioId) {
      // スタジオ選択解除時はフォームデータをクリア
      form.setValue('location', '');
      form.setValue('address', '');
      return;
    }

    // スタジオ情報を取得して自動入力
    try {
      const result = await getStudioForAutoFillAction(studioId);
      if (result.success && result.studio) {
        form.setValue('location', result.studio!.name);
        form.setValue('address', result.studio!.address || '');
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

  const handleImageUrlsChange = useCallback(
    (urls: string[]) => {
      form.setValue('image_urls', urls);
    },
    [form]
  );

  const handleBookingTypeChange = useCallback(
    (bookingType: BookingType) => {
      // admin_lotteryはフォームでは使用しないため、lotteryに変換
      const formBookingType =
        bookingType === 'admin_lottery' ? 'lottery' : bookingType;
      if (['first_come', 'lottery', 'priority'].includes(formBookingType)) {
        form.setValue(
          'booking_type',
          formBookingType as 'first_come' | 'lottery' | 'priority'
        );
      }
    },
    [form]
  );

  const handleBookingSettingsChange = useCallback(
    (newSettings: BookingSettings) => {
      setBookingSettings(prev => {
        // 同じ値の場合は更新しない（無限ループ防止）
        if (JSON.stringify(prev) === JSON.stringify(newSettings)) {
          return prev;
        }
        return newSettings;
      });
    },
    []
  );

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

  // 編集時にモデル情報を復元（初回のみ）
  const hasRestoredModels = useRef(false);
  useEffect(() => {
    if (
      isEditing &&
      initialModels &&
      initialModels.length > 0 &&
      !hasRestoredModels.current
    ) {
      setSelectedModels(initialModels);
      hasRestoredModels.current = true;
    }
  }, [isEditing, initialModels]);

  // 編集時にスタジオ情報を復元（初回のみ）
  const hasRestoredStudio = useRef(false);
  useEffect(() => {
    if (isEditing && initialStudioId && !hasRestoredStudio.current) {
      setSelectedStudioId(initialStudioId);
      hasRestoredStudio.current = true;
    }
  }, [isEditing, initialStudioId]);

  // 撮影枠変更時に自動で日時を更新（start_time, end_timeはフォーム外で管理）
  const [startTime, setStartTime] = useState<string>(
    initialData?.start_time
      ? new Date(initialData.start_time).toISOString().slice(0, 16)
      : ''
  );
  const [endTime, setEndTime] = useState<string>(
    initialData?.end_time
      ? new Date(initialData.end_time).toISOString().slice(0, 16)
      : ''
  );

  useEffect(() => {
    if (photoSessionSlots && photoSessionSlots.length > 0) {
      const { start_time, end_time } =
        calculateDateTimeFromSlots(photoSessionSlots);
      setStartTime(start_time);
      setEndTime(end_time);
    }
  }, [photoSessionSlots]);

  // 撮影枠があるかどうかの判定
  const hasSlots = photoSessionSlots && photoSessionSlots.length > 0;

  const handleSubmit = async (data: FormData) => {
    if (!user) {
      toast({
        title: tErrors('title'),
        description: tErrors('unauthorized'),
        variant: 'destructive',
      });
      return;
    }

    // スタジオ選択または場所情報入力のどちらか必須
    if (!selectedStudioId && !data.location?.trim()) {
      form.setError('location', {
        message: t('form.validation.locationOrStudioRequired'),
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
    if (!startTime || !endTime) {
      toast({
        title: tErrors('title'),
        description: t('form.validation.dateTimeRequired'),
        variant: 'destructive',
      });
      return;
    }

    const startTimeDate = new Date(startTime);
    const endTimeDate = new Date(endTime);

    setIsLoading(true);
    try {
      // 運営アカウントの場合：一括作成
      if (isOrganizer && !isEditing) {
        const bulkData = {
          title: data.title,
          description: data.description || undefined,
          location: data.location || '',
          address: data.address || undefined,
          start_time: startTimeDate.toISOString(),
          end_time: endTimeDate.toISOString(),
          booking_type: data.booking_type,
          allow_multiple_bookings: data.allow_multiple_bookings,
          block_users_with_bad_ratings: data.block_users_with_bad_ratings,
          payment_timing: data.payment_timing,
          booking_settings: bookingSettings as Record<string, unknown>,
          is_published: data.is_published,
          image_urls: data.image_urls,
          studio_id: selectedStudioId || undefined,
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

        // 検証ログ: 一括作成パラメータ
        logger.info('[検証] 撮影会作成パラメータ:', {
          phase: 'form-submit',
          type: 'bulk-create',
          isOrganizer,
          isEditing,
          slotsCount: bulkData.slots.length,
          slots: bulkData.slots.map(slot => ({
            slot_number: slot.slot_number,
            max_participants: slot.max_participants,
            price_per_person: slot.price_per_person,
          })),
          calculatedMaxParticipants: bulkData.slots.reduce(
            (sum, slot) => sum + slot.max_participants,
            0
          ),
          fullData: bulkData,
        });

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
        title: data.title,
        description: data.description || undefined,
        location: data.location || '',
        address: data.address || undefined,
        start_time: startTimeDate.toISOString(),
        end_time: endTimeDate.toISOString(),
        booking_type: data.booking_type,
        allow_multiple_bookings: data.allow_multiple_bookings,
        payment_timing: data.payment_timing,
        booking_settings: bookingSettings as Record<string, unknown>,
        is_published: data.is_published,
        image_urls: data.image_urls,
        studio_id: selectedStudioId || undefined,
        selected_models: isOrganizer ? selectedModels : undefined,
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
        session_type: 'individual', // 個別撮影会として設定
      };

      // 検証ログ: 通常作成パラメータ
      logger.info('[検証] 撮影会作成パラメータ:', {
        phase: 'form-submit',
        type: 'single-create',
        isOrganizer,
        isEditing,
        slotsCount: sessionWithSlotsData.slots.length,
        slots: sessionWithSlotsData.slots.map(slot => ({
          slot_number: slot.slot_number,
          max_participants: slot.max_participants,
          price_per_person: slot.price_per_person,
        })),
        calculatedMaxParticipants: sessionWithSlotsData.slots.reduce(
          (sum, slot) => sum + slot.max_participants,
          0
        ),
        fullData: sessionWithSlotsData,
      });

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
          <Form {...form}>
            <form
              ref={formRef}
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* 画像アップロード */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">イメージ画像</h3>
                <ImageUpload
                  photoSessionId={initialData?.id || 'temp'}
                  initialImages={form.watch('image_urls')}
                  onImagesChange={handleImageUrlsChange}
                  maxImages={5}
                  disabled={isLoading}
                />
              </div>

              {/* 基本情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('form.basicInfo')}</h3>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('form.titleLabel')} {t('form.required')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('form.titlePlaceholder')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('form.descriptionLabel')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ''}
                          placeholder={t('form.descriptionPlaceholder')}
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 場所情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {t('form.locationInfo')}
                </h3>

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
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('form.locationLabel')} {t('form.required')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              placeholder={t('form.locationPlaceholder')}
                              onChange={e => {
                                field.onChange(e);
                                handleLocationOrAddressChange();
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.addressLabel')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              placeholder={t('form.addressPlaceholder')}
                              onChange={e => {
                                field.onChange(e);
                                handleLocationOrAddressChange();
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* スタジオ選択時の読み取り専用表示 */}
                {selectedStudioId && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                    <div>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        場所: {form.watch('location')}
                      </span>
                    </div>
                    {form.watch('address') && (
                      <div>
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                          住所: {form.watch('address')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 日時情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {t('form.dateTimeInfo')}
                </h3>

                {/* 開催日入力 */}
                <FormField
                  control={form.control}
                  name="event_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>開催日 {t('form.required')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          value={field.value || ''}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        撮影枠の日付計算に使用されます
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 撮影枠から自動計算される日時を常に読み取り専用表示 */}
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
                          <p className="text-xs font-medium mb-1">開始日時 *</p>
                          <p className="text-sm font-mono bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                            {startTime ? (
                              <FormattedDateTime
                                value={startTime}
                                format="datetime-long"
                              />
                            ) : (
                              '撮影枠を設定してください'
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1">終了日時 *</p>
                          <p className="text-sm font-mono bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                            {endTime ? (
                              <FormattedDateTime
                                value={endTime}
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
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    ※
                    個別撮影会では、選択した各モデルごとに別々の撮影会が作成されます。
                    タイトルには「- モデル名」が自動的に追加されます。
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
                value={form.watch('booking_type') || 'first_come'}
                onChange={handleBookingTypeChange}
                disabled={isLoading}
              />

              {/* 予約設定 */}
              <BookingSettingsForm
                bookingType={form.watch('booking_type')}
                settings={bookingSettings}
                onChange={handleBookingSettingsChange}
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
                  <FormField
                    control={form.control}
                    name="allow_multiple_bookings"
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    )}
                  />
                </div>

                {form.watch('allow_multiple_bookings') && (
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
                  <FormField
                    control={form.control}
                    name="block_users_with_bad_ratings"
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    )}
                  />
                </div>
              </div>

              {/* 撮影枠設定 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {t('form.slotSettings')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('form.slotSettingsDescription')}
                </p>

                <PhotoSessionSlotForm
                  photoSessionId={initialData?.id || 'temp'}
                  slots={isEditing ? photoSessionSlots : undefined}
                  onSlotsChange={setPhotoSessionSlots}
                  baseDate={
                    form.watch('event_date') ||
                    formatDateToLocalString(new Date())
                  }
                  allowMultipleBookings={form.watch('allow_multiple_bookings')}
                />
              </div>

              {/* 複数枠割引設定 - 複数予約が許可されている場合のみ表示 */}
              {form.watch('allow_multiple_bookings') && (
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
                      <Label htmlFor="multi_slot_discount_type">
                        割引タイプ
                      </Label>
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
                <h3 className="text-lg font-medium">
                  {t('form.paymentTiming')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('form.paymentTimingDescription')}
                </p>

                <FormField
                  control={form.control}
                  name="payment_timing"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={(
                            value: 'prepaid' | 'cash_on_site'
                          ) => {
                            // 環境変数で現地払いが無効化されている場合は、強制的にprepaidに戻す
                            if (
                              value === 'cash_on_site' &&
                              !ENABLE_CASH_ON_SITE
                            ) {
                              field.onChange('prepaid');
                              toast({
                                title: '現地払い機能は現在無効化されています',
                                variant: 'default',
                              });
                              return;
                            }
                            field.onChange(value);
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
                                  field.value === 'prepaid'
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
                                    {field.value === 'prepaid' && (
                                      <Badge variant="default" className="ml-2">
                                        選択中
                                      </Badge>
                                    )}
                                  </div>
                                </CardHeader>
                              </Card>
                            </Label>
                          </div>

                          {/* 現地払い（環境変数で制御） */}
                          {ENABLE_CASH_ON_SITE && (
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
                                      : field.value === 'cash_on_site'
                                        ? 'ring-2 ring-primary shadow-md'
                                        : 'hover:border-muted-foreground/20 hover:shadow-md'
                                  }`}
                                >
                                  <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-success/10 text-success border-success/30">
                                          <Wallet className="h-5 w-5" />
                                        </div>
                                        <div>
                                          <CardTitle className="text-base">
                                            {t('form.paymentTimingCashOnSite')}
                                          </CardTitle>
                                          <p className="text-sm text-muted-foreground mt-1">
                                            撮影当日に現地でお支払いいただきます
                                          </p>
                                          {/* サブスクリプションチェックが必要な場合のみ警告を表示 */}
                                          {CASH_ON_SITE_REQUIRES_SUBSCRIPTION &&
                                            !canEnableCashOnSite && (
                                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                                {t(
                                                  'form.cashOnSiteRequiresSubscription'
                                                )}
                                                {currentPlanName && (
                                                  <span className="ml-1">
                                                    （現在のプラン:{' '}
                                                    {currentPlanName}）
                                                  </span>
                                                )}
                                              </p>
                                            )}
                                        </div>
                                      </div>
                                      {field.value === 'cash_on_site' &&
                                        canEnableCashOnSite && (
                                          <Badge
                                            variant="default"
                                            className="ml-2"
                                          >
                                            選択中
                                          </Badge>
                                        )}
                                    </div>
                                  </CardHeader>
                                </Card>
                              </Label>
                            </div>
                          )}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  <FormField
                    control={form.control}
                    name="is_published"
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
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
          </Form>
        </CardContent>
      </Card>

      {/* 下部固定ActionBar（Sentinel非表示時のみ表示） */}
      <ActionBar
        actions={actionBarButtons}
        maxColumns={onBack && !isEditing ? 2 : 1}
        background="blur"
        sticky={true}
        autoHide={true}
      />
      {/* ActionBar用のスペーサー（fixed要素の高さ分） */}
      <div className="h-20 md:h-20 flex-shrink-0" />
    </div>
  );
}
