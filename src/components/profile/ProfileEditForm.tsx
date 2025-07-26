'use client';

import { useState, useEffect } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ActionSheet, ActionButton } from '@/components/ui/action-sheet';
import { ImageCropDialog } from '@/components/profile/ImageCropDialog';
import { UsernameSetupDialog } from '@/components/profile/UsernameSetupDialog';
import { updateProfile } from '@/lib/auth/profile';
import { useToast } from '@/hooks/use-toast';
import {
  uploadProfileImage,
  validateProfileImageFile,
} from '@/lib/storage/profile-images';
import { getCurrentUsername } from '@/app/actions/username';
import { notifyProfileUpdate } from '@/hooks/useProfile';
import { logger } from '@/lib/utils/logger';
import { User, Save, X, Camera, AtSign } from 'lucide-react';
import { OrganizerModelManagement } from '@/components/profile/organizer/OrganizerModelManagement';

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
    username?: string | null;
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
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  // 画像関連の状態管理
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('');
  const [originalFileName, setOriginalFileName] = useState<string>('');

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

  // 現在のusernameを取得
  useEffect(() => {
    getCurrentUsername().then(setCurrentUsername);
  }, []);

  // コンポーネントのクリーンアップ時にプレビューURLを解放
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルバリデーション
    const validation = validateProfileImageFile(file);
    if (!validation.valid) {
      toast({
        title: 'エラー',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    // トリミングダイアログ用の画像データを準備
    const imageUrl = URL.createObjectURL(file);
    setOriginalImageSrc(imageUrl);
    setOriginalFileName(file.name);
    setShowCropDialog(true);
  };

  const handleCropComplete = (croppedFile: File) => {
    // 既存のプレビューURLを解放
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // トリミング済み画像をセット
    setSelectedImageFile(croppedFile);
    const preview = URL.createObjectURL(croppedFile);
    setPreviewUrl(preview);
    setShowCropDialog(false);

    // 元画像URLをクリーンアップ
    if (originalImageSrc) {
      URL.revokeObjectURL(originalImageSrc);
    }
  };

  const handleCropCancel = () => {
    setShowCropDialog(false);
    // 元画像URLをクリーンアップ
    if (originalImageSrc) {
      URL.revokeObjectURL(originalImageSrc);
    }
  };

  const onSubmit = async (data: ProfileEditValues) => {
    setIsLoading(true);
    try {
      let avatarUrl = profile.avatar_url;

      // 新しい画像が選択されている場合のみアップロード
      if (selectedImageFile) {
        logger.debug('画像アップロード開始', {
          fileName: selectedImageFile.name,
          fileSize: selectedImageFile.size,
          userId: profile.id,
        });

        const { url, error } = await uploadProfileImage(
          selectedImageFile,
          profile.id
        );

        if (error) {
          logger.error('画像アップロード失敗', error);
          toast({
            title: 'エラー',
            description: error,
            variant: 'destructive',
          });
          return;
        }

        if (url) {
          logger.info('画像アップロード成功', { url });
          avatarUrl = url;
        } else {
          logger.warn('画像アップロード完了だがURLが空', { url });
        }
      } else {
        logger.debug('画像選択なし、既存のavatar_urlを使用', {
          avatarUrl: profile.avatar_url,
        });
      }

      // プロフィール更新
      const updateData = {
        ...data,
        avatar_url: avatarUrl || undefined,
      };

      logger.debug('プロフィール更新開始', {
        profileId: profile.id,
        updateData,
        avatarUrl,
      });

      const result = await updateProfile(profile.id, updateData);

      if (result.error) {
        logger.error('プロフィール更新エラー', result.error);
        toast({
          title: 'エラー',
          description: 'プロフィールの更新に失敗しました',
          variant: 'destructive',
        });
        return;
      }

      logger.info('プロフィール更新成功', {
        profileId: profile.id,
        newAvatarUrl: avatarUrl,
        updateResult: result,
      });

      toast({
        title: '成功',
        description: 'プロフィールを更新しました',
      });

      // プロフィール更新をグローバルに通知（キャッシュクリア）
      logger.debug('プロフィール更新通知開始');
      notifyProfileUpdate();
      logger.debug('プロフィール更新通知完了');

      // プレビューURLのクリーンアップ
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setSelectedImageFile(null);

      // 短時間待機してから遷移（プロフィール更新を確実に反映させるため）
      logger.debug('プロフィール反映待機開始（1秒）');
      await new Promise(resolve => setTimeout(resolve, 1000));
      logger.debug('プロフィール反映待機完了、画面遷移開始');

      // プロフィールページに戻る
      setShowActionSheet(false);
      router.push('/profile');
      router.refresh();
    } catch (error) {
      logger.error('予期しないエラー', error);
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // プレビューURLのクリーンアップ
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedImageFile(null);
    setShowActionSheet(false);
    router.push('/profile');
  };

  const handleSaveClick = () => {
    form.handleSubmit(onSubmit)();
  };

  // プロフィール編集用のアクションボタン
  const profileActions: ActionButton[] = [
    {
      id: 'cancel',
      label: 'キャンセル',
      variant: 'outline',
      onClick: handleCancel,
      icon: <X className="h-4 w-4" />,
      className:
        'border-muted-foreground/20 text-muted-foreground hover:bg-muted/50',
    },
    {
      id: 'save',
      label: 'プロフィールを更新',
      variant: 'default',
      onClick: handleSaveClick,
      loading: isLoading,
      icon: <Save className="h-4 w-4" />,
      className: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // 表示する画像URLを決定
  // プレビューがある場合はそれを優先、そうでなければキャッシュバスティング付きプロフィール画像
  const profileAvatarWithCacheBuster = profile.avatar_url
    ? `${profile.avatar_url}?t=${profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now()}`
    : null;
  const displayImageUrl = previewUrl || profileAvatarWithCacheBuster;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <Avatar className="h-24 w-24">
              <AvatarImage src={displayImageUrl || undefined} />
              <AvatarFallback className="text-lg">
                {profile.display_name ? (
                  getInitials(profile.display_name)
                ) : (
                  <User className="h-8 w-8" />
                )}
              </AvatarFallback>
            </Avatar>

            {/* アップロードボタンのオーバーレイ */}
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <Camera className="h-6 w-6 text-white" />
              </label>
            </div>

            {/* 隠しファイル入力 */}
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          <p className="text-sm text-muted-foreground mt-2 text-center">
            画像をクリックして変更
          </p>

          {/* 変更状態の表示 */}
          {selectedImageFile && (
            <Badge variant="outline" className="mt-2">
              画像変更待機中
            </Badge>
          )}
        </div>

        <Form {...form}>
          <form className="space-y-6">
            {/* ユーザー名設定セクション */}
            <div className="space-y-3">
              <FormLabel>ユーザー名</FormLabel>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  {currentUsername ? (
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                      <AtSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        @{currentUsername}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        設定済み
                      </Badge>
                    </div>
                  ) : (
                    <div className="p-3 border border-dashed rounded-md text-center text-muted-foreground">
                      <AtSign className="h-4 w-4 mx-auto mb-1" />
                      <p className="text-sm">ユーザー名が未設定です</p>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUsernameDialog(true)}
                  className="shrink-0"
                >
                  {currentUsername ? '変更' : '設定'}
                </Button>
              </div>
              <FormDescription>
                他のユーザーがあなたを@usernameで検索できるようになります
              </FormDescription>
            </div>

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

            {/* 運営アカウントの場合：所属モデル管理 */}
            {profile.user_type === 'organizer' && (
              <div className="space-y-4 pt-6 border-t">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">所属モデル管理</h3>
                  <p className="text-sm text-muted-foreground">
                    あなたの運営に所属するモデルの管理を行えます
                  </p>
                </div>
                <OrganizerModelManagement />
              </div>
            )}

            {/* ActionSheetを使った保存・キャンセルボタン */}
            <div className="pt-6">
              <ActionSheet
                trigger={
                  <Button className="w-full" size="lg">
                    変更を保存する
                  </Button>
                }
                title="変更の保存"
                description="プロフィールの変更を保存しますか？"
                actions={profileActions}
                open={showActionSheet}
                onOpenChange={setShowActionSheet}
              />
            </div>
          </form>
        </Form>

        {/* ユーザー名設定ダイアログ */}
        <UsernameSetupDialog
          open={showUsernameDialog}
          onOpenChange={setShowUsernameDialog}
          initialUsername={currentUsername || ''}
          variant={currentUsername ? 'change' : 'setup'}
          onSuccess={username => {
            setCurrentUsername(username);
            toast({
              title: '成功',
              description: `ユーザー名「@${username}」を設定しました`,
            });
          }}
        />

        {/* 画像トリミングダイアログ */}
        <ImageCropDialog
          isOpen={showCropDialog}
          onClose={handleCropCancel}
          imageSrc={originalImageSrc}
          onCropComplete={handleCropComplete}
          originalFileName={originalFileName}
        />
      </CardContent>
    </Card>
  );
}
