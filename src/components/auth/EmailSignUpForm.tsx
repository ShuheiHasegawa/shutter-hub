'use client';

import { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { useRouter, useParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

const signUpSchema = z
  .object({
    email: z
      .string()
      .email('有効なメールアドレスを入力してください')
      .min(1, 'メールアドレスは必須です'),
    password: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)/,
        'パスワードは英数字を含む必要があります'
      ),
    confirmPassword: z.string().min(1, 'パスワード確認は必須です'),
    fullName: z
      .string()
      .min(1, '名前は必須です')
      .max(50, '名前は50文字以内で入力してください'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function EmailSignUpForm() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'ja';
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
    },
  });

  const onSubmit = async (data: SignUpFormValues) => {
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (error) {
        logger.error('サインアップエラー:', error);
        toast.error(`サインアップに失敗しました: ${error.message}`);
        return;
      }

      if (authData?.user && !authData.session) {
        // メール確認が必要な場合
        setIsEmailSent(true);
        toast.success('確認メールを送信しました。メールをご確認ください。');
      } else if (authData?.user && authData.session) {
        // 即座にログイン成功（メール確認不要の場合）
        toast.success('アカウントが作成されました');
        router.push(`/${locale}/auth/setup-profile`);
      }
    } catch (error) {
      logger.error('予期しないエラー:', error);
      toast.error('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <Alert className="border-green-200 bg-green-50 text-green-800">
        <Mail className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">確認メールを送信しました</p>
            <p className="text-sm">
              {form.getValues('email')} に確認メールを送信しました。
              メール内のリンクをクリックしてアカウントを有効化してください。
            </p>
            <p className="text-sm">
              メールが届かない場合は、迷惑メールフォルダもご確認ください。
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>お名前</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input placeholder="山田太郎" className="pl-10" {...field} />
                </div>
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
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="example@email.com"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>パスワード</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="8文字以上の英数字"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>パスワード確認</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="パスワードを再入力"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              アカウント作成中...
            </>
          ) : (
            'アカウントを作成'
          )}
        </Button>
      </form>
    </Form>
  );
}
