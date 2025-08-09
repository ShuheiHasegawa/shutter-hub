'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createStudioAction } from '@/app/actions/studio';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { PREFECTURES } from '@/constants/japan';
import { VALIDATION } from '@/constants/common';

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
    .regex(VALIDATION.phone.pattern, '有効な電話番号を入力してください')
    .optional(),
  email: z.string().email('有効なメールアドレスを入力してください').optional(),
  website_url: z.string().url('有効なURLを入力してください').optional(),
  total_area: z
    .number()
    .positive('面積は正の数値で入力してください')
    .optional(),
  max_capacity: z
    .number()
    .positive('最大収容人数は正の数値で入力してください')
    .optional(),
  parking_available: z.boolean(),
  wifi_available: z.boolean(),
  hourly_rate_min: z
    .number()
    .positive('最低料金は正の数値で入力してください')
    .optional(),
  hourly_rate_max: z
    .number()
    .positive('最高料金は正の数値で入力してください')
    .optional(),
});

type FormData = z.infer<typeof formSchema>;

interface StudioCreateFormProps {
  onSuccess?: (studioId: string) => void;
  onCancel?: () => void;
}

export function StudioCreateForm({
  onSuccess,
  onCancel,
}: StudioCreateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<FormData>({
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
    },
  });

  const onSubmit = async (data: FormData) => {
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
        return;
      }

      const result = await createStudioAction(data);

      if (result.success && result.studio) {
        toast({
          title: '成功',
          description:
            'スタジオが作成されました。管理者の承認をお待ちください。',
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <Select
                onValueChange={value => form.setValue('prefecture', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="都道府県を選択" />
                </SelectTrigger>
                <SelectContent>
                  {PREFECTURES.map(prefecture => (
                    <SelectItem key={prefecture} value={prefecture}>
                      {prefecture}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                {...form.register('total_area', { valueAsNumber: true })}
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
                {...form.register('max_capacity', { valueAsNumber: true })}
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
                {...form.register('hourly_rate_min', { valueAsNumber: true })}
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
                {...form.register('hourly_rate_max', { valueAsNumber: true })}
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

      {/* 注意事項 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          作成されたスタジオ情報は管理者による承認後に公開されます。
          承認には1-3営業日かかる場合があります。
        </AlertDescription>
      </Alert>

      {/* アクションボタン */}
      <div className="flex gap-4 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '作成中...' : 'スタジオを作成'}
        </Button>
      </div>
    </form>
  );
}
