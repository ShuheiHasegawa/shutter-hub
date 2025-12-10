'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import {
  createPhotobook,
  checkPhotobookCreationLimit,
  getPhotobookPlanLimits,
} from '@/app/actions/quick-photobook';
import { PhotobookCreateLimitDisplay } from '../common/PhotobookPlanGate';
import { PlanLimitCheck, PhotobookPlanLimits } from '@/types/quick-photobook';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

/**
 * フォームスキーマを定義する
 */
const createPhotobookSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(100, 'タイトルは100文字以内で入力してください'),
  description: z
    .string()
    .max(500, '説明は500文字以内で入力してください')
    .optional(),
});

type CreatePhotobookForm = z.infer<typeof createPhotobookSchema>;

/**
 * プラン制限表示コンポーネント
 */
function PlanLimitsInfo({
  maxPages,
  maxPhotobooks,
  currentUsage,
}: {
  maxPages: number;
  maxPhotobooks: number;
  currentUsage: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          現在のプラン制限
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="mb-1">最大ページ数</p>
            <Badge variant="outline">{maxPages} ページ</Badge>
          </div>
          <div>
            <p className="mb-1">フォトブック数</p>
            <Badge variant="outline">
              {currentUsage}/{maxPhotobooks} 冊
            </Badge>
          </div>
          <div>
            <p className="mb-1">レイアウト</p>
            <Badge variant="outline">1ページ1枚</Badge>
          </div>
        </div>
        <p className="text-xs mt-3">
          より多くのページや高度な編集機能をお求めの場合は、
          <Link href="/subscription" className="text-blue-600 hover:underline">
            プランのアップグレード
          </Link>
          をご検討ください。
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * クイックフォトブック作成フォーム
 */
interface QuickPhotobookCreateFormProps {
  userId: string;
}

export function QuickPhotobookCreateForm({
  userId,
}: QuickPhotobookCreateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limitCheck, setLimitCheck] = useState<PlanLimitCheck | null>(null);
  const [planLimits, setPlanLimits] = useState<PhotobookPlanLimits | null>(
    null
  );

  const form = useForm<CreatePhotobookForm>({
    resolver: zodResolver(createPhotobookSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  // プラン制限チェック
  useEffect(() => {
    const checkLimits = async () => {
      const [limits, planLimitsData] = await Promise.all([
        checkPhotobookCreationLimit(userId, 'quick'),
        getPhotobookPlanLimits(userId),
      ]);
      setLimitCheck(limits);
      setPlanLimits(planLimitsData);
    };
    checkLimits();
  }, [userId]);

  const onSubmit = async (data: CreatePhotobookForm) => {
    try {
      setIsSubmitting(true);

      const result = await createPhotobook(userId, {
        title: data.title,
        description: data.description,
        photobook_type: 'quick',
        // プラン制限に基づく最大ページ数を適用する
        max_pages: planLimits?.quick.maxPages ?? 5,
      });

      if (result.success && result.photobookId) {
        toast.success('フォトブックが作成されました');
        router.push(`/photobooks/quick/${result.photobookId}/edit`);
      } else {
        toast.error(
          result.error?.message || 'フォトブックの作成に失敗しました'
        );
      }
    } catch (error) {
      logger.error('Error creating photobook:', error);
      toast.error('予期しないエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // プラン制限チェック中の表示
  if (!limitCheck || !planLimits) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>プラン制限を確認中...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* プラン制限表示 */}
      <PhotobookCreateLimitDisplay
        limitCheck={limitCheck}
        photobookType="quick"
      />

      {/* 制限に達している場合はフォーム非表示 */}
      {!limitCheck.allowed ? null : (
        <>
          {/* プラン制限情報 */}
          <PlanLimitsInfo
            maxPages={planLimits.quick.maxPages}
            maxPhotobooks={planLimits.quick.maxPhotobooks}
            currentUsage={limitCheck.current_usage}
          />

          {/* メインフォーム */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                フォトブック情報
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* タイトル */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>タイトル *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="例: 2024年 春の撮影会"
                            {...field}
                          />
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
                            placeholder="フォトブックの内容や思い出を簡単に説明してください"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          このフォトブックについて簡単に説明できます（最大500文字）
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 最大ページ数は作成時にプラン制限を自動適用する */}
                  <div className="text-sm opacity-80">
                    作成時の最大ページ数は現在のプラン上限（
                    {planLimits?.quick.maxPages ?? '-'}ページ）を自動適用する
                  </div>

                  {/* 送信ボタン */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1"
                      variant="cta"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          作成中...
                        </>
                      ) : (
                        <>フォトブックを作成</>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
