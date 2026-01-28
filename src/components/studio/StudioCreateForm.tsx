'use client';

import { useState, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createStudioAction } from '@/app/actions/studio';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { VALIDATION } from '@/constants/common';
import { PrefectureSelect } from '@/components/ui/prefecture-select';
import dynamic from 'next/dynamic';
import {
  ActionBar,
  ActionBarButton,
  ActionBarSentinel,
} from '@/components/ui/action-bar';
import { StudioImageUpload } from './StudioImageUpload';
import { useTranslations } from 'next-intl';

// SSRエラー回避のため動的インポート
const MapPicker = dynamic(
  () =>
    import('@/components/ui/map-picker').then(mod => ({
      default: mod.MapPicker,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
        地図を読み込み中...
      </div>
    ),
  }
);

interface StudioCreateFormProps {
  onSuccess?: (studioId: string) => void;
}

export function StudioCreateForm({ onSuccess }: StudioCreateFormProps) {
  const t = useTranslations('studio.form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // 一時IDを生成（コンポーネントマウント時に一度だけ生成）
  const tempId = useMemo(
    () => `temp_${Date.now()}_${crypto.randomUUID().split('-')[0]}`,
    []
  );

  // zodスキーマを動的に生成（多言語化対応）
  const formSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(VALIDATION.name.minLength, 'スタジオ名は必須です')
          .max(
            VALIDATION.name.maxLength,
            `スタジオ名は${VALIDATION.name.maxLength}文字以内で入力してください`
          ),
        description: z
          .string()
          .max(
            VALIDATION.description.maxLength,
            `説明は${VALIDATION.description.maxLength}文字以内で入力してください`
          )
          .optional(),
        address: z
          .string()
          .min(VALIDATION.address.minLength, t('validation.addressRequired'))
          .max(
            VALIDATION.address.maxLength,
            t('validation.addressMaxLength', {
              max: VALIDATION.address.maxLength,
            })
          ),
        prefecture: z.string().min(1, t('validation.prefectureRequired')),
        city: z
          .string()
          .min(1, t('validation.cityRequired'))
          .max(50, t('validation.cityMaxLength')),
        access_info: z
          .string()
          .max(300, 'アクセス情報は300文字以内で入力してください')
          .optional(),
        phone: z
          .string()
          .optional()
          .refine(
            value => !value || VALIDATION.phone.pattern.test(value),
            '有効な電話番号を入力してください'
          ),
        email: z
          .string()
          .optional()
          .refine(
            value => !value || z.string().email().safeParse(value).success,
            '有効なメールアドレスを入力してください'
          ),
        website_url: z
          .string()
          .optional()
          .refine(
            value => !value || z.string().url().safeParse(value).success,
            '有効なURLを入力してください'
          ),
        total_area: z.coerce
          .number()
          .positive('面積は正の数値で入力してください')
          .optional()
          .catch(undefined),
        max_capacity: z.coerce
          .number()
          .positive('最大収容人数は正の数値で入力してください')
          .optional()
          .catch(undefined),
        parking_available: z.boolean(),
        wifi_available: z.boolean(),
        hourly_rate_min: z.coerce
          .number()
          .positive('最低料金は正の数値で入力してください')
          .optional()
          .catch(undefined),
        hourly_rate_max: z.coerce
          .number()
          .positive('最高料金は正の数値で入力してください')
          .optional()
          .catch(undefined),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }),
    [t]
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      prefecture: '',
      city: '',
      access_info: '',
      phone: '',
      email: '',
      website_url: '',
      parking_available: false,
      wifi_available: false,
      latitude: undefined,
      longitude: undefined,
    },
  });

  const handleSaveClick = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // 料金の整合性チェック
      if (
        data.hourly_rate_min &&
        data.hourly_rate_max &&
        data.hourly_rate_min > data.hourly_rate_max
      ) {
        form.setError('hourly_rate_max', {
          message: '最高料金は最低料金以上である必要があります',
        });
        setIsSubmitting(false);
        return;
      }

      const result = await createStudioAction({
        ...data,
        image_urls: imageUrls,
      });

      if (result.success && result.studio) {
        toast({
          title: '成功',
          description: 'スタジオが作成されました。',
        });

        if (onSuccess) {
          onSuccess(result.studio.id);
        } else {
          router.push(`/studios/${result.studio.id}`);
        }
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'スタジオの作成に失敗しました',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'エラー',
        description: 'スタジオの作成中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionBarActions: ActionBarButton[] = [
    {
      id: 'save',
      label: '保存',
      variant: 'cta',
      onClick: handleSaveClick,
      loading: isSubmitting,
      disabled: isSubmitting,
    },
  ];

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* 画像アップロード */}
          <Card>
            <CardHeader>
              <CardTitle>スタジオ画像</CardTitle>
            </CardHeader>
            <CardContent>
              <StudioImageUpload
                mode="create"
                tempId={tempId}
                initialImageUrls={imageUrls}
                onImageUrlsChange={setImageUrls}
                maxImages={10}
                disabled={isSubmitting}
              />
            </CardContent>
          </Card>

          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>スタジオ名 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="○○スタジオ" />
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
                    <FormLabel>説明</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="スタジオの特徴や設備について説明してください"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 所在地情報 */}
          <Card>
            <CardHeader>
              <CardTitle>所在地情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="prefecture"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('labels.prefectureRequired')}</FormLabel>
                      <FormControl>
                        <PrefectureSelect
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('labels.cityRequired')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('labels.cityPlaceholder')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('labels.addressRequired')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('labels.addressPlaceholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="access_info"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>アクセス情報</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="JR渋谷駅より徒歩3分"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 地図選択 */}
              <div>
                <MapPicker
                  address={form.watch('address')}
                  prefecture={form.watch('prefecture')}
                  city={form.watch('city')}
                  onAddressChange={address => {
                    form.setValue('address', address, { shouldValidate: true });
                  }}
                  onPrefectureChange={prefecture => {
                    form.setValue('prefecture', prefecture, {
                      shouldValidate: true,
                    });
                  }}
                  onCityChange={city => {
                    form.setValue('city', city, { shouldValidate: true });
                  }}
                  onCoordinatesChange={(lat, lng) => {
                    form.setValue('latitude', lat);
                    form.setValue('longitude', lng);
                  }}
                  height="300px"
                />
              </div>
            </CardContent>
          </Card>

          {/* 連絡先情報 */}
          <Card>
            <CardHeader>
              <CardTitle>連絡先情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>電話番号</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          placeholder="03-1234-5678"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>メールアドレス</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          type="email"
                          placeholder="info@studio.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="website_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ウェブサイトURL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="https://studio.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 施設情報 */}
          <Card>
            <CardHeader>
              <CardTitle>施設情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="total_area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>総面積 (㎡)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50"
                          value={String(field.value || '')}
                          onChange={e => {
                            const value = e.target.value;
                            field.onChange(
                              value === '' ? undefined : Number(value)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>最大収容人数</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10"
                          value={String(field.value || '')}
                          onChange={e => {
                            const value = e.target.value;
                            field.onChange(
                              value === '' ? undefined : Number(value)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hourly_rate_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>最低時間料金 (円)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="3000"
                          value={String(field.value || '')}
                          onChange={e => {
                            const value = e.target.value;
                            field.onChange(
                              value === '' ? undefined : Number(value)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hourly_rate_max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>最高時間料金 (円)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="8000"
                          value={String(field.value || '')}
                          onChange={e => {
                            const value = e.target.value;
                            field.onChange(
                              value === '' ? undefined : Number(value)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="parking_available"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>駐車場あり</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wifi_available"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Wi-Fi利用可能</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ページ下部の保存ボタン（ActionBar自動制御） */}
          <ActionBarSentinel className="pt-4">
            <Button
              type="button"
              variant="cta"
              size="sm"
              onClick={handleSaveClick}
              disabled={isSubmitting}
              className="text-base font-medium w-full transition-colors"
            >
              {isSubmitting ? '保存中…' : '保存'}
            </Button>
          </ActionBarSentinel>
        </form>
      </Form>

      {/* 固定フッターアクションバー */}
      <ActionBar
        actions={actionBarActions}
        maxColumns={1}
        background="blur"
        sticky={true}
        autoHide={true}
      />
    </>
  );
}
