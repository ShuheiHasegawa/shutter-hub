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
import { useToast } from '@/hooks/use-toast';
import { User, Save } from 'lucide-react';

const profileEditSchema = z.object({
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

type ProfileEditValues = z.infer<typeof profileEditSchema>;

interface ProfileEditFormProps {
  profile: {
    id: string;
    user_type: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    instagram_handle: string | null;
    twitter_handle: string | null;
    phone: string | null;
    created_at: string;
    updated_at: string;
  };
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      user_type:
        (profile.user_type as 'model' | 'photographer' | 'organizer') ||
        'model',
      display_name: profile.display_name || '',
      bio: profile.bio || '',
      location: profile.location || '',
      website: profile.website || '',
      instagram_handle: profile.instagram_handle || '',
      twitter_handle: profile.twitter_handle || '',
      phone: profile.phone || '',
    },
  });

  const onSubmit = async (data: ProfileEditValues) => {
    setIsLoading(true);
    try {
      const result = await updateProfile(profile.id, data);

      if (result.error) {
        console.error('プロフィール更新エラー:', result.error);
        toast({
          title: 'エラー',
          description: 'プロフィールの更新に失敗しました',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: '成功',
        description: 'プロフィールを更新しました',
      });

      // プロフィールページに戻る
      router.push('/profile');
      router.refresh();
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          プロフィール編集
        </CardTitle>
        <p className="text-muted-foreground">
          あなたのプロフィール情報を更新してください。
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center mb-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-lg">
              {profile.display_name ? (
                getInitials(profile.display_name)
              ) : (
                <User className="h-8 w-8" />
              )}
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
                    あなたの主な役割を選択してください。
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
                      rows={4}
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

            <div className="flex gap-4 pt-6">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    更新中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    プロフィールを更新
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/profile')}
                disabled={isLoading}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
