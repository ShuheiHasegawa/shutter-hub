'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateProfile } from '@/lib/auth/profile';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const profileFormSchema = z.object({
  user_type: z.enum(['model', 'photographer', 'organizer']),
  display_name: z
    .string()
    .min(1, '表示名は必須です')
    .max(50, '表示名は50文字以内で入力してください'),
  bio: z
    .string()
    .max(500, '自己紹介は500文字以内で入力してください')
    .optional(),
  location: z
    .string()
    .max(100, '所在地は100文字以内で入力してください')
    .optional(),
  website: z
    .string()
    .url('有効なURLを入力してください')
    .optional()
    .or(z.literal('')),
  instagram_handle: z
    .string()
    .max(30, 'Instagramハンドルは30文字以内で入力してください')
    .optional(),
  twitter_handle: z
    .string()
    .max(15, 'Twitterハンドルは15文字以内で入力してください')
    .optional(),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内で入力してください')
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  initialData?: Partial<ProfileFormValues>;
  isEditing?: boolean;
  onSuccess?: () => void;
}

export function ProfileForm({
  initialData,
  isEditing = false,
  onSuccess,
}: ProfileFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      user_type: initialData?.user_type || 'model',
      display_name:
        initialData?.display_name || user?.user_metadata?.full_name || '',
      bio: initialData?.bio || '',
      location: initialData?.location || '',
      website: initialData?.website || '',
      instagram_handle: initialData?.instagram_handle || '',
      twitter_handle: initialData?.twitter_handle || '',
      phone: initialData?.phone || '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) {
      toast({
        title: 'エラー',
        description: '認証が必要です',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      let result;

      if (isEditing) {
        result = await updateProfile(user.id, data);
      } else {
        console.log('サーバーサイドAPIでプロフィールを作成します:', data);

        const response = await fetch('/api/profile/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            profileData: {
              email: user.email,
              display_name: data.display_name,
              user_type: data.user_type,
              bio: data.bio,
              location: data.location,
              website: data.website,
              instagram_handle: data.instagram_handle,
              twitter_handle: data.twitter_handle,
              phone: data.phone,
            },
          }),
        });

        const apiResult = await response.json();

        if (!response.ok || !apiResult.success) {
          console.error('サーバーサイドAPI エラー:', apiResult);
          result = { error: apiResult.error || 'API call failed' };
        } else {
          console.log('サーバーサイドAPI 成功:', apiResult);
          result = { data: apiResult.data, error: null };
        }
      }

      if (result.error) {
        console.error('プロフィール保存エラー:', result.error);
        toast({
          title: 'エラー',
          description: 'プロフィールの保存に失敗しました',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: '成功',
        description: isEditing
          ? 'プロフィールを更新しました'
          : 'プロフィールを作成しました',
      });

      if (onSuccess) {
        onSuccess();
      } else if (!isEditing) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('予期しないエラー:', error);
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {isEditing ? 'プロフィール編集' : 'プロフィール設定'}
        </CardTitle>
        {!isEditing && (
          <p className="text-center text-muted-foreground">
            ShutterHub v2へようこそ！プロフィールを設定してください。
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex justify-center mb-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="text-lg">
              {user?.user_metadata?.full_name?.charAt(0) ||
                user?.email?.charAt(0) ||
                '?'}
            </AvatarFallback>
          </Avatar>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="user_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ユーザータイプ *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="ユーザータイプを選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="model">モデル</SelectItem>
                      <SelectItem value="photographer">
                        フォトグラファー
                      </SelectItem>
                      <SelectItem value="organizer">主催者</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    あなたの主な役割を選択してください。後で変更することも可能です。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>表示名 *</FormLabel>
                  <FormControl>
                    <Input placeholder="表示名を入力してください" {...field} />
                  </FormControl>
                  <FormDescription>
                    他のユーザーに表示される名前です。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>自己紹介</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="あなたについて教えてください..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    あなたの経験、興味、専門分野などを記載してください。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>所在地</FormLabel>
                  <FormControl>
                    <Input placeholder="東京都渋谷区" {...field} />
                  </FormControl>
                  <FormDescription>
                    活動エリアの参考として表示されます。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ウェブサイト</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>電話番号</FormLabel>
                    <FormControl>
                      <Input placeholder="090-1234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="instagram_handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                          @
                        </span>
                        <Input
                          placeholder="username"
                          className="rounded-l-none"
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
                name="twitter_handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>X (Twitter)</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                          @
                        </span>
                        <Input
                          placeholder="username"
                          className="rounded-l-none"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {isEditing ? '更新中...' : '作成中...'}
                </>
              ) : isEditing ? (
                'プロフィールを更新'
              ) : (
                'プロフィールを作成'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
