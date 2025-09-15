'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Save,
  Eye,
  EyeOff,
  BookOpen,
  Loader2,
  Info,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Photobook } from '@/types/quick-photobook';
import { updatePhotobook } from '@/app/actions/quick-photobook';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

/**
 * 設定フォームスキーマ
 */
const settingsSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(100, 'タイトルは100文字以内で入力してください'),
  description: z
    .string()
    .max(500, '説明は500文字以内で入力してください')
    .optional(),
  max_pages: z
    .number()
    .min(1, '最低1ページは必要です')
    .max(15, '最大15ページまでです'),
  is_published: z.boolean(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

/**
 * クイックフォトブック設定コンポーネント
 */
interface QuickPhotobookSettingsProps {
  photobook: Photobook;
  userId: string;
  onUpdate: () => void;
}

export function QuickPhotobookSettings({
  photobook,
  userId,
  onUpdate,
}: QuickPhotobookSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      title: photobook.title,
      description: photobook.description || '',
      max_pages: photobook.max_pages,
      is_published: photobook.is_published,
    },
  });

  const onSubmit = async (data: SettingsForm) => {
    try {
      setIsSaving(true);

      const result = await updatePhotobook(photobook.id, userId, {
        title: data.title,
        description: data.description,
        max_pages: data.max_pages,
        is_published: data.is_published,
      });

      if (result.success) {
        toast.success('設定を保存しました');
        onUpdate();
      } else {
        throw new Error(result.error?.message || '設定の保存に失敗しました');
      }
    } catch (error) {
      logger.error('Settings save error:', error);
      toast.error('設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 設定フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            基本設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* タイトル */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>タイトル</FormLabel>
                    <FormControl>
                      <Input placeholder="フォトブックのタイトル" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 説明 */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>説明（任意）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="フォトブックの内容や思い出を説明してください"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      フォトブックの内容について簡単に説明できます
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 最大ページ数 */}
              <FormField
                control={form.control}
                name="max_pages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>最大ページ数</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={photobook.current_pages} // 現在のページ数より少なくできない
                        max={15}
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      現在 {photobook.current_pages}{' '}
                      ページ使用中（削除はできません）
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* 公開設定 */}
              <FormField
                control={form.control}
                name="is_published"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        {field.value ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-600" />
                        )}
                        フォトブックを公開
                      </FormLabel>
                      <FormDescription>
                        公開すると他のユーザーがフォトブックを閲覧できます
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* 保存ボタン */}
              <Button
                type="submit"
                disabled={isSaving || !form.formState.isDirty}
                className="w-full"
                variant="cta"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    設定を保存
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* フォトブック情報・統計統合セクション */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            フォトブック情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 基本統計グリッド */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 surface-neutral rounded-lg">
              <p className="text-2xl font-bold">{photobook.current_pages}</p>
              <p className="text-sm">現在のページ数</p>
            </div>
            <div className="text-center p-3 surface-neutral rounded-lg">
              <p className="text-2xl font-bold">{photobook.max_pages}</p>
              <p className="text-sm">最大ページ数</p>
            </div>
            <div className="text-center p-3 surface-neutral rounded-lg">
              <p className="text-2xl font-bold">
                {Math.round(
                  (photobook.current_pages / photobook.max_pages) * 100
                )}
                %
              </p>
              <p className="text-sm">完成度</p>
            </div>
            <div className="text-center p-3 surface-neutral rounded-lg">
              <Badge
                variant={photobook.is_published ? 'default' : 'secondary'}
                className="text-sm"
              >
                {photobook.is_published ? '公開中' : '下書き'}
              </Badge>
              <p className="text-sm mt-1">公開状態</p>
            </div>
          </div>

          <Separator />

          {/* フォトブック詳細情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                フォトブック仕様
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>タイプ:</span>
                  <Badge variant="outline">
                    {photobook.photobook_type === 'quick'
                      ? 'クイック'
                      : 'アドバンスド'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>レイアウト:</span>
                  <Badge variant="outline">1ページ1枚</Badge>
                </div>
                <div className="flex justify-between">
                  <span>表紙:</span>
                  <span>
                    {photobook.cover_image_url ? '設定済み' : '未設定'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                作成・更新情報
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>作成日:</span>
                  <span>
                    {new Date(photobook.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>最終更新:</span>
                  <span>
                    {new Date(photobook.updated_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>フォトブックID:</span>
                  <span className="text-xs font-mono opacity-70">
                    {photobook.id}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* アドバンスド版案内 */}
          {photobook.photobook_type === 'quick' && (
            <>
              <Separator />
              <div className="p-4 surface-accent rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">
                      より高度な編集をお求めの方へ
                    </h4>
                    <p className="text-sm mb-3 opacity-80">
                      アドバンスドフォトブックでは、より多彩なレイアウトと高度な編集機能をご利用いただけます。
                    </p>
                    <Button variant="cta" size="sm" asChild>
                      <Link href="/photobooks/advanced">
                        アドバンスド版を試す
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
