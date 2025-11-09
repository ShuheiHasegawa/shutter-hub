'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { updateStudioAction } from '@/app/actions/studio';
import { StudioWithStats, StudioPhoto } from '@/types/database';
import { PREFECTURES } from '@/constants/japan';
import { VALIDATION } from '@/constants/common';
import { StudioImageUpload } from './StudioImageUpload';
import {
  ActionBar,
  ActionBarButton,
  ActionBarSentinel,
} from '@/components/ui/action-bar';

interface StudioEditFormProps {
  studio: StudioWithStats;
  initialPhotos?: StudioPhoto[];
  onSuccess: () => void;
  onCancel: () => void;
}

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
    .min(1, '住所は必須です')
    .max(200, '住所は200文字以内で入力してください'),
  prefecture: z.string().min(1, '都道府県を選択してください'),
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
});

type FormData = z.infer<typeof formSchema>;

export function StudioEditForm({
  studio,
  initialPhotos = [],
  onSuccess,
  onCancel,
}: StudioEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<StudioPhoto[]>(initialPhotos);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: studio.name || '',
      description: studio.description || '',
      address: studio.address || '',
      prefecture: studio.prefecture || '',
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
            <p className="font-medium">このスタジオ情報は誰でも編集可能です</p>
            <p className="text-sm">
              不適切な編集は報告機能で対応します。報告数が3件に達すると自動的に非表示になります。
            </p>
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
                studioId={studio.id}
                initialPhotos={photos}
                maxImages={10}
                disabled={isSubmitting}
                onPhotosChange={setPhotos}
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
              <FormField
                control={form.control}
                name="prefecture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>都道府県 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="都道府県を選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PREFECTURES.map(pref => (
                          <SelectItem key={pref} value={pref}>
                            {pref}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>住所 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="詳細住所を入力" />
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
                        placeholder="最寄り駅からの行き方など"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <div className="space-y-3">
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
