/**
 * GDPR権利行使要求フォーム
 * データアクセス・削除・訂正・ポータビリティ要求
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Send,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit,
  Trash2,
  Download,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { createGdprRequest } from '@/app/actions/legal-documents';
import { toast } from '@/hooks/use-toast';
import { GdprRequestType } from '@/types/legal-documents';

const gdprRequestSchema = z.object({
  request_type: z.enum([
    'access',
    'rectification',
    'erasure',
    'portability',
    'restriction',
    'objection',
  ] as const),
  request_details: z
    .string()
    .min(20, 'より詳細な説明を入力してください（20文字以上）'),
  verification_method: z.enum(['email', 'phone', 'document'] as const),
  urgency_reason: z.string().optional(),
  data_categories: z.array(z.string()).optional(),
  confirmation: z.boolean().refine(val => val === true, {
    message: '本人確認と要求内容の確認が必要です',
  }),
});

type GdprRequestFormData = z.infer<typeof gdprRequestSchema>;

const requestTypeOptions = [
  {
    value: 'access' as GdprRequestType,
    label: 'データアクセス要求',
    description: '当社が保有するあなたの個人データの詳細を確認',
    icon: Eye,
    color: 'text-blue-600',
  },
  {
    value: 'rectification' as GdprRequestType,
    label: 'データ訂正要求',
    description: '不正確または不完全なデータの訂正・補完',
    icon: Edit,
    color: 'text-green-600',
  },
  {
    value: 'erasure' as GdprRequestType,
    label: 'データ削除要求',
    description: '個人データの完全削除（忘れられる権利）',
    icon: Trash2,
    color: 'text-red-600',
  },
  {
    value: 'portability' as GdprRequestType,
    label: 'データポータビリティ要求',
    description: '構造化された形式でのデータ提供',
    icon: Download,
    color: 'text-purple-600',
  },
  {
    value: 'restriction' as GdprRequestType,
    label: '処理制限要求',
    description: '特定データの処理を一時停止',
    icon: Shield,
    color: 'text-orange-600',
  },
  {
    value: 'objection' as GdprRequestType,
    label: '処理への異議',
    description: '正当な利益に基づく処理への異議申立て',
    icon: AlertCircle,
    color: 'text-gray-600',
  },
];

const verificationMethods = [
  { value: 'email', label: 'メールアドレス認証' },
  { value: 'phone', label: '電話番号認証' },
  { value: 'document', label: '身分証明書提出' },
];

const dataCategoryOptions = [
  'プロフィール情報',
  '撮影会参加履歴',
  'メッセージ・コミュニケーション',
  '支払い・取引情報',
  '写真・画像データ',
  'ログイン・アクセス履歴',
  'デバイス・技術情報',
  'マーケティング・分析データ',
];

export function GdprRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const form = useForm<GdprRequestFormData>({
    resolver: zodResolver(gdprRequestSchema),
    defaultValues: {
      request_type: undefined,
      request_details: '',
      verification_method: 'email',
      urgency_reason: '',
      data_categories: [],
      confirmation: false,
    },
  });

  const watchedRequestType = form.watch('request_type');
  const selectedRequestType = requestTypeOptions.find(
    option => option.value === watchedRequestType
  );

  const onSubmit = async (data: GdprRequestFormData) => {
    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const result = await createGdprRequest({
        request_type: data.request_type,
        request_details: data.request_details,
        verification_method: data.verification_method,
      });

      if (result.success) {
        setSubmissionResult({
          success: true,
          message:
            'GDPR要求が正常に提出されました。通常30日以内に対応いたします。',
        });
        form.reset();
        toast({
          title: '要求を受付けました',
          description: 'GDPR要求が正常に提出されました。',
        });
      } else {
        setSubmissionResult({
          success: false,
          message: result.error || '要求の提出に失敗しました。',
        });
        toast({
          title: 'エラー',
          description: result.error || '要求の提出に失敗しました。',
          variant: 'destructive',
        });
      }
    } catch {
      setSubmissionResult({
        success: false,
        message: '予期しないエラーが発生しました。',
      });
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionResult?.success) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
              要求を受付けました
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-4">
              {submissionResult.message}
            </p>
            <Button
              variant="outline"
              onClick={() => setSubmissionResult(null)}
              className="border-green-300 hover:bg-green-100"
            >
              新しい要求を作成
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 要求タイプ選択 */}
        <FormField
          control={form.control}
          name="request_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>権利の種類</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="行使する権利を選択してください" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {requestTypeOptions.map(option => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${option.color}`} />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedRequestType && (
                <FormDescription>
                  {selectedRequestType.description}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 要求詳細 */}
        <FormField
          control={form.control}
          name="request_details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>要求の詳細</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
                    watchedRequestType === 'access'
                      ? '確認したいデータの種類や期間など、具体的に記載してください。例：2023年1月以降の撮影会参加履歴とメッセージ履歴'
                      : watchedRequestType === 'erasure'
                        ? '削除したいデータの種類や理由を記載してください。例：アカウント削除のため全データの完全削除を希望'
                        : '具体的な要求内容と理由を記載してください'
                  }
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                より迅速な対応のため、具体的な要求内容をお書きください。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* データカテゴリ選択（アクセス・削除要求の場合） */}
        {(watchedRequestType === 'access' ||
          watchedRequestType === 'erasure' ||
          watchedRequestType === 'portability') && (
          <FormField
            control={form.control}
            name="data_categories"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel>対象データカテゴリ（オプション）</FormLabel>
                  <FormDescription>
                    特定のデータのみを対象とする場合は選択してください
                  </FormDescription>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {dataCategoryOptions.map(category => (
                    <FormField
                      key={category}
                      control={form.control}
                      name="data_categories"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={category}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(category)}
                                onCheckedChange={checked => {
                                  return checked
                                    ? field.onChange([
                                        ...(field.value || []),
                                        category,
                                      ])
                                    : field.onChange(
                                        field.value?.filter(
                                          value => value !== category
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {category}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              </FormItem>
            )}
          />
        )}

        {/* 本人確認方法 */}
        <FormField
          control={form.control}
          name="verification_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>本人確認方法</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {verificationMethods.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                本人確認のため、追加情報の提供をお願いする場合があります
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 緊急性の理由（削除要求の場合） */}
        {watchedRequestType === 'erasure' && (
          <FormField
            control={form.control}
            name="urgency_reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>緊急性の理由（オプション）</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="通常の30日以内の対応では間に合わない場合、その理由を記載してください"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* 重要な注意事項 */}
        {watchedRequestType === 'erasure' && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 dark:text-red-300">
              <strong>重要:</strong> データ削除要求は元に戻すことができません。
              削除されたデータの復元は技術的に不可能です。
              慎重にご検討の上、要求を提出してください。
            </AlertDescription>
          </Alert>
        )}

        {/* 確認チェックボックス */}
        <FormField
          control={form.control}
          name="confirmation"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>本人確認と要求内容の確認</FormLabel>
                <FormDescription>
                  私は本人であることを確認し、上記の要求内容が正確であることを確認します。
                  偽の情報や他人の権利侵害にあたる要求でないことを保証します。
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* エラー表示 */}
        {submissionResult && !submissionResult.success && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{submissionResult.message}</AlertDescription>
          </Alert>
        )}

        {/* 送信ボタン */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              要求を提出中...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              権利行使要求を提出
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          要求の提出後、通常30日以内（複雑な場合は最大90日）に対応いたします。
          緊急を要する場合は、お問い合わせフォームもご利用ください。
        </p>
      </form>
    </Form>
  );
}
