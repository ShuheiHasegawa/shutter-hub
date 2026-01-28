'use client';

import { useState, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { updateStudioAction } from '@/app/actions/studio';
import { StudioWithStats, StudioPhoto } from '@/types/database';
import { VALIDATION } from '@/constants/common';
import { PrefectureSelect } from '@/components/ui/prefecture-select';
import { StudioImageUpload } from './StudioImageUpload';
import {
  ActionBar,
  ActionBarButton,
  ActionBarSentinel,
} from '@/components/ui/action-bar';
import dynamic from 'next/dynamic';

// SSRエラー回避のため動的インポート
const MapPicker = dynamic(
  () =>
    import('@/components/ui/map-picker').then(mod => ({
      default: mod.MapPicker,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
        地図を読み込み中...
      </div>
    ),
  }
);

interface StudioEditFormProps {
  studio: StudioWithStats;
  initialPhotos?: StudioPhoto[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function StudioEditForm({
  studio,
  initialPhotos = [],
  onSuccess,
  onCancel,
}: StudioEditFormProps) {
  const t = useTranslations('studio');
  const tForm = useTranslations('studio.form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<StudioPhoto[]>(initialPhotos);
  const formRef = useRef<HTMLFormElement>(null);

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
          .min(1, tForm('validation.addressRequired'))
          .max(200, tForm('validation.addressMaxLength', { max: 200 })),
        prefecture: z.string().min(1, tForm('validation.prefectureRequired')),
        city: z
          .string()
          .min(1, tForm('validation.cityRequired'))
          .max(50, tForm('validation.cityMaxLength')),
        access_info: z
          .string()
          .max(300, 'アクセス情報は300文字以内で入力してください')
          .optional(),
        phone: z
          .string()
          .optional()
          .refine(
            value => !value || /^[\d\-\(\)\+\s]*$/.test(value),
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
        hourly_rate_min: z.coerce
          .number()
          .positive('料金は正の数値で入力してください')
          .optional()
          .catch(undefined),
        hourly_rate_max: z.coerce
          .number()
          .positive('料金は正の数値で入力してください')
          .optional()
          .catch(undefined),
        total_area: z.coerce
          .number()
          .positive('面積は正の数値で入力してください')
          .optional()
          .catch(undefined),
        max_capacity: z.coerce
          .number()
          .positive('定員は1人以上の数値で入力してください')
          .optional()
          .catch(undefined),
        parking_available: z.boolean(),
        wifi_available: z.boolean(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }),
    [tForm]
  );

  type FormData = z.infer<typeof formSchema>;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: studio.name || '',
      description: studio.description || '',
      address: studio.address || '',
      prefecture: studio.prefecture || '',
      city: studio.city || '',
      access_info: studio.access_info || '',
      phone: studio.phone || '',
      email: studio.email || '',
      website_url: studio.website_url || '',
      hourly_rate_min: studio.hourly_rate_min?.toString() || '',
      hourly_rate_max: studio.hourly_rate_max?.toString() || '',
      total_area: studio.total_area?.toString() || '',
      max_capacity: studio.max_capacity?.toString() || '',
      parking_available: studio.parking_available || false,
      wifi_available: studio.wifi_available || false,
      latitude: studio.latitude ?? undefined,
      longitude: studio.longitude ?? undefined,
    },
  });

  const handleSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // 空文字をundefinedに変換（Studioタイプに合わせる）
      const formData = {
        ...data,
        description: data.description || undefined,
        access_info: data.access_info || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        website_url: data.website_url || undefined,
      };

      const result = await updateStudioAction(studio.id, formData);

      if (result.success) {
        toast.success('スタジオ情報を更新しました');
        onSuccess();
      } else {
        setError(result.error || 'スタジオの更新に失敗しました');
      }
    } catch {
      setError('スタジオの更新中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 下部固定アクションバー用ボタン
  const actionBarButtons: ActionBarButton[] = [
    {
      id: 'cancel',
      label: 'キャンセル',
      variant: 'outline',
      onClick: onCancel,
      disabled: isSubmitting,
    },
    {
      id: 'submit',
      label: isSubmitting ? '保存中...' : '保存',
      variant: 'cta',
      onClick: () => formRef.current?.requestSubmit(),
      loading: isSubmitting,
      disabled: isSubmitting,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Wikipedia風の注意書き */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">{t('editNotice.title')}</p>
            <p className="text-sm">{t('editNotice.description')}</p>
          </div>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
        >
          {/* 画像アップロード */}
          <Card>
            <CardHeader>
              <CardTitle>スタジオ画像</CardTitle>
            </CardHeader>
            <CardContent>
              <StudioImageUpload
                mode="edit"
                studioId={studio.id}
                initialPhotos={photos}
                onPhotosChange={setPhotos}
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
                      <Input {...field} placeholder="スタジオ名を入力" />
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
                        placeholder="スタジオの説明・特徴を入力"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 住所・アクセス */}
          <Card>
            <CardHeader>
              <CardTitle>住所・アクセス</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="prefecture"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {tForm('labels.prefectureRequired')}
                      </FormLabel>
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
                      <FormLabel>{tForm('labels.cityRequired')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={tForm('labels.cityPlaceholder')}
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
                    <FormLabel>{tForm('labels.addressRequired')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={tForm('labels.addressPlaceholder')}
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

          {/* 連絡先 */}
          <Card>
            <CardHeader>
              <CardTitle>連絡先</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        placeholder="contact@studio.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ウェブサイト</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        type="url"
                        placeholder="https://www.studio.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 料金・設備 */}
          <Card>
            <CardHeader>
              <CardTitle>料金・設備</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hourly_rate_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>最低料金（円/時）</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="3000"
                          value={String(field.value || '')}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
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
                      <FormLabel>最高料金（円/時）</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="8000"
                          value={String(field.value || '')}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="total_area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>総面積（㎡）</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="50"
                          value={String(field.value || '')}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
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
                      <FormLabel>最大収容人数（人）</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="20"
                          value={String(field.value || '')}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 設備チェックボックス */}
              <div className="space-y-4">
                <h4 className="font-medium">設備・サービス</h4>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="parking_available"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
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
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Wi-Fi完備</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 注意事項 */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              スタジオ情報の変更は履歴として保存されます。重要な変更を行う際は慎重に入力してください。
            </AlertDescription>
          </Alert>

          {/* ページ下部の保存ボタン（ActionBar自動制御） */}
          <ActionBarSentinel className="pt-4 pb-0">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                variant="cta"
                className="flex-1 text-base font-medium transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </ActionBarSentinel>
        </form>
      </Form>

      {/* 下部固定ActionBar（Sentinel非表示時のみ表示） */}
      <ActionBar
        actions={actionBarButtons}
        maxColumns={2}
        background="blur"
        sticky={true}
        autoHide={true}
      />
      {/* ActionBar用のスペーサー（fixed要素の高さ分） */}
      <div className="h-20 md:h-20 flex-shrink-0" />
    </div>
  );
}
