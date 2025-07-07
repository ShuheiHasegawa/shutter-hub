'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Image as ImageIcon,
  MapPin,
  Hash,
  AtSign,
  X,
  Plus,
  Users,
  Lock,
  Globe,
  Eye,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createPost } from '@/app/actions/posts';
import { CreatePostData, PostType, PostVisibility } from '@/types/social';

interface CreatePostFormProps {
  onSuccess?: () => void;
  photoSessionId?: string; // 撮影会関連投稿の場合
  className?: string;
}

const VISIBILITY_OPTIONS = [
  {
    value: 'public' as PostVisibility,
    label: 'パブリック',
    icon: Globe,
    description: '全ユーザーが見ることができます',
  },
  {
    value: 'followers' as PostVisibility,
    label: 'フォロワー',
    icon: Users,
    description: 'フォロワーのみが見ることができます',
  },
  {
    value: 'mutual_follows' as PostVisibility,
    label: '相互フォロー',
    icon: Eye,
    description: '相互フォローのユーザーのみ',
  },
  {
    value: 'private' as PostVisibility,
    label: 'プライベート',
    icon: Lock,
    description: '自分のみが見ることができます',
  },
];

export function CreatePostForm({
  onSuccess,
  photoSessionId,
  className,
}: CreatePostFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [newHashtag, setNewHashtag] = useState('');
  const [newMention, setNewMention] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            投稿するにはログインが必要です
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + selectedFiles.length > 10) {
      toast.error('画像は最大10枚まで選択できます');
      return;
    }

    // 画像ファイルのみを許可
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast.error('画像ファイルのみを選択してください');
    }

    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddHashtag = () => {
    if (newHashtag && !hashtags.includes(newHashtag.toLowerCase())) {
      setHashtags(prev => [...prev, newHashtag.toLowerCase()]);
      setNewHashtag('');
    }
  };

  const handleRemoveHashtag = (hashtag: string) => {
    setHashtags(prev => prev.filter(h => h !== hashtag));
  };

  const handleAddMention = () => {
    if (newMention && !mentions.includes(newMention)) {
      setMentions(prev => [...prev, newMention]);
      setNewMention('');
    }
  };

  const handleRemoveMention = (mention: string) => {
    setMentions(prev => prev.filter(m => m !== mention));
  };

  const extractHashtagsFromContent = (text: string): string[] => {
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(match => match.slice(1).toLowerCase()) : [];
  };

  const extractMentionsFromContent = (text: string): string[] => {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(match => match.slice(1)) : [];
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedFiles.length === 0) {
      toast.error('投稿内容または画像を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      // コンテンツからハッシュタグとメンションを自動抽出
      const contentHashtags = extractHashtagsFromContent(content);
      const contentMentions = extractMentionsFromContent(content);

      const allHashtags = [...new Set([...hashtags, ...contentHashtags])];
      const allMentions = [...new Set([...mentions, ...contentMentions])];

      // 投稿タイプを自動判定
      const postType: PostType = photoSessionId
        ? 'photo_session'
        : selectedFiles.length > 0
          ? 'image'
          : 'text';

      const postData: CreatePostData = {
        content,
        post_type: postType,
        visibility,
        image_files: selectedFiles,
        photo_session_id: photoSessionId || undefined,
        location: location.trim() || undefined,
        hashtags: allHashtags,
        mentions: allMentions,
      };

      const result = await createPost(postData);

      if (result.success) {
        toast.success('投稿を作成しました');
        // フォームをリセット
        setContent('');
        setSelectedFiles([]);
        setHashtags([]);
        setMentions([]);
        setLocation('');

        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/timeline');
          router.refresh();
        }
      } else {
        toast.error(result.message || '投稿の作成に失敗しました');
      }
    } catch (error) {
      console.error('投稿作成エラー:', error);
      toast.error('投稿の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVisibilityOption = VISIBILITY_OPTIONS.find(
    option => option.value === visibility
  );

  // 投稿タイプを自動判定
  const postType = photoSessionId
    ? 'photo_session'
    : selectedFiles.length > 0
      ? 'image'
      : 'text';

  // 現在の投稿タイプを表示用に取得
  const currentPostType = postType;
  const postTypeLabel =
    currentPostType === 'photo_session'
      ? '撮影会投稿'
      : currentPostType === 'image'
        ? '画像投稿'
        : 'テキスト投稿';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback>
              {user.user_metadata?.display_name?.[0] || user.email?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">新しい投稿</CardTitle>
            <p className="text-sm text-muted-foreground">
              {user.user_metadata?.display_name || user.email} • {postTypeLabel}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 投稿内容 */}
        <Textarea
          placeholder="今何をしていますか？"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={4}
          className="min-h-[100px] resize-none"
        />

        {/* 投稿設定 */}
        <Tabs value="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings">設定</TabsTrigger>
            <TabsTrigger value="media">メディア</TabsTrigger>
            <TabsTrigger value="hashtags">ハッシュタグ</TabsTrigger>
            <TabsTrigger value="mentions">メンション</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4 mt-4">
            {/* 公開範囲 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">公開範囲</label>
              <Select
                value={visibility}
                onValueChange={(value: PostVisibility) => setVisibility(value)}
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {selectedVisibilityOption && (
                        <>
                          <selectedVisibilityOption.icon className="h-4 w-4" />
                          <span>{selectedVisibilityOption.label}</span>
                        </>
                      )}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 位置情報 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                位置情報（オプション）
              </label>
              <Textarea
                placeholder="場所を入力..."
                value={location}
                onChange={e => setLocation(e.target.value)}
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4 mt-4">
            {/* 画像アップロード */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  画像 ({selectedFiles.length}/10)
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={selectedFiles.length >= 10}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  画像を追加
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* 選択された画像プレビュー */}
              {selectedFiles.length > 0 && (
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                  <div className="flex w-max space-x-4 p-4">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="h-24 w-24 rounded-md object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          <TabsContent value="hashtags" className="space-y-4 mt-4">
            {/* ハッシュタグ */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Hash className="h-4 w-4" />
                ハッシュタグ
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ハッシュタグを入力"
                  value={newHashtag}
                  onChange={e => setNewHashtag(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddHashtag()}
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                <Button onClick={handleAddHashtag} size="sm">
                  追加
                </Button>
              </div>

              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {hashtags.map(hashtag => (
                    <Badge
                      key={hashtag}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      #{hashtag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveHashtag(hashtag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="mentions" className="space-y-4 mt-4">
            {/* メンション */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <AtSign className="h-4 w-4" />
                メンション
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ユーザー名を入力"
                  value={newMention}
                  onChange={e => setNewMention(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddMention()}
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                <Button onClick={handleAddMention} size="sm">
                  追加
                </Button>
              </div>

              {mentions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mentions.map(mention => (
                    <Badge
                      key={mention}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      @{mention}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveMention(mention)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* 投稿ボタン */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {content.length}/2000文字
          </div>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting || (!content.trim() && selectedFiles.length === 0)
            }
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                投稿中...
              </>
            ) : (
              '投稿する'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
