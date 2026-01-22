'use client';

import { useState, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const formSchema = z.object({
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
    .min(VALIDATION.address.minLength, '住所は必須です')
    .max(
      VALIDATION.address.maxLength,
      `住所は${VALIDATION.address.maxLength}文字以内で入力してください`
    ),
  prefecture: z.string().min(1, '都道府県は必須です'),
  city: z
    .string()
    .min(1, '市区町村は必須です')
    .max(50, '市区町村は50文字以内で入力してください'),
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
});

// type FormData = z.infer<typeof formSchema>;

interface StudioCreateFormProps {
  onSuccess?: (studioId: string) => void;
}

export function StudioCreateForm({ onSuccess }: StudioCreateFormProps) {
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
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
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
            <div>
              <Label htmlFor="name">スタジオ名 *</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="○○スタジオ"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="スタジオの特徴や設備について説明してください"
                rows={3}
              />
              {form.formState.errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 所在地情報 */}
        <Card>
          <CardHeader>
            <CardTitle>所在地情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prefecture">都道府県 *</Label>
                <PrefectureSelect
                  value={form.watch('prefecture')}
                  onValueChange={value => form.setValue('prefecture', value)}
                />
                {form.formState.errors.prefecture && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.prefecture.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="city">市区町村 *</Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  placeholder="渋谷区"
                />
                {form.formState.errors.city && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.city.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="address">住所 *</Label>
              <Input
                id="address"
                {...form.register('address')}
                placeholder="渋谷1-1-1 渋谷ビル3F"
              />
              {form.formState.errors.address && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="access_info">アクセス情報</Label>
              <Textarea
                id="access_info"
                {...form.register('access_info')}
                placeholder="JR渋谷駅より徒歩3分"
                rows={2}
              />
              {form.formState.errors.access_info && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.access_info.message}
                </p>
              )}
            </div>

            {/* 地図選択 */}
            <div>
              <MapPicker
                address={form.watch('address')}
                prefecture={form.watch('prefecture')}
                city={form.watch('city')}
                onAddressChange={address => {
                  form.setValue('address', address, { shouldValidate: true });
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
              <div>
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  placeholder="03-1234-5678"
                />
                {form.formState.errors.phone && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="info@studio.com"
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="website_url">ウェブサイトURL</Label>
              <Input
                id="website_url"
                {...form.register('website_url')}
                placeholder="https://studio.com"
              />
              {form.formState.errors.website_url && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.website_url.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 施設情報 */}
        <Card>
          <CardHeader>
            <CardTitle>施設情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total_area">総面積 (㎡)</Label>
                <Input
                  id="total_area"
                  type="number"
                  {...form.register('total_area')}
                  placeholder="50"
                />
                {form.formState.errors.total_area && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.total_area.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="max_capacity">最大収容人数</Label>
                <Input
                  id="max_capacity"
                  type="number"
                  {...form.register('max_capacity')}
                  placeholder="10"
                />
                {form.formState.errors.max_capacity && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.max_capacity.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hourly_rate_min">最低時間料金 (円)</Label>
                <Input
                  id="hourly_rate_min"
                  type="number"
                  {...form.register('hourly_rate_min')}
                  placeholder="3000"
                />
                {form.formState.errors.hourly_rate_min && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.hourly_rate_min.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="hourly_rate_max">最高時間料金 (円)</Label>
                <Input
                  id="hourly_rate_max"
                  type="number"
                  {...form.register('hourly_rate_max')}
                  placeholder="8000"
                />
                {form.formState.errors.hourly_rate_max && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.hourly_rate_max.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="parking_available"
                  checked={form.watch('parking_available')}
                  onCheckedChange={checked =>
                    form.setValue('parking_available', checked)
                  }
                />
                <Label htmlFor="parking_available">駐車場あり</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="wifi_available"
                  checked={form.watch('wifi_available')}
                  onCheckedChange={checked =>
                    form.setValue('wifi_available', checked)
                  }
                />
                <Label htmlFor="wifi_available">Wi-Fi利用可能</Label>
              </div>
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
