'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  MapPin,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  Flag,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Camera,
  Verified,
} from 'lucide-react';
import { toast } from 'sonner';
import { likePost, repostPost, deletePost } from '@/app/actions/posts';
import { PostWithUser } from '@/types/social';
import Link from 'next/link';

interface PostCardProps {
  post: PostWithUser;
  onUpdate?: () => void;
  showActions?: boolean;
  className?: string;
}

export function PostCard({
  post,
  onUpdate,
  showActions = true,
  className,
}: PostCardProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(
    post.is_liked_by_current_user || false
  );
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isReposted, setIsReposted] = useState(
    post.is_reposted_by_current_user || false
  );
  const [repostsCount, setRepostsCount] = useState(post.reposts_count);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.id === post.user_id;
  const isRepost = post.post_type === 'repost';
  const displayPost = isRepost ? post.original_post : post;

  if (!displayPost) return null;

  const handleLike = async () => {
    if (!user || isLiking) return;

    setIsLiking(true);
    try {
      const result = await likePost(displayPost.id);
      if (result.success) {
        setIsLiked(result.isLiked);
        setLikesCount(prev => (result.isLiked ? prev + 1 : prev - 1));
      } else {
        toast.error(result.message || 'いいねに失敗しました');
      }
    } catch {
      toast.error('いいねに失敗しました');
    } finally {
      setIsLiking(false);
    }
  };

  const handleRepost = async () => {
    if (!user || isReposting || isRepost) return;

    setIsReposting(true);
    try {
      const result = await repostPost(displayPost.id);
      if (result.success) {
        setIsReposted(true);
        setRepostsCount(prev => prev + 1);
        toast.success('リポストしました');
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.message || 'リポストに失敗しました');
      }
    } catch {
      toast.error('リポストに失敗しました');
    } finally {
      setIsReposting(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner || isDeleting) return;

    if (!confirm('この投稿を削除しますか？')) return;

    setIsDeleting(true);
    try {
      const result = await deletePost(post.id);
      if (result.success) {
        toast.success('投稿を削除しました');
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.message || '投稿の削除に失敗しました');
      }
    } catch {
      toast.error('投稿の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayPost.user.display_name}さんの投稿`,
          text: displayPost.content,
          url: `${window.location.origin}/posts/${displayPost.id}`,
        });
      } catch {
        // ユーザーがキャンセルした場合など
      }
    } else {
      // フォールバック: クリップボードにコピー
      try {
        await navigator.clipboard.writeText(
          `${window.location.origin}/posts/${displayPost.id}`
        );
        toast.success('URLをコピーしました');
      } catch {
        toast.error('URLのコピーに失敗しました');
      }
    }
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex(prev =>
      prev === 0 ? (displayPost.image_urls?.length || 1) - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev =>
      prev === (displayPost.image_urls?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  const formatContent = (content: string) => {
    return content
      .replace(
        /#([a-zA-Z0-9_]+)/g,
        '<span class="text-blue-600 hover:underline cursor-pointer">#$1</span>'
      )
      .replace(
        /@([a-zA-Z0-9_]+)/g,
        '<span class="text-blue-600 hover:underline cursor-pointer">@$1</span>'
      );
  };

  const renderUserBadge = (userType: string, isVerified: boolean) => {
    const badgeVariant = userType === 'photographer' ? 'default' : 'secondary';
    const badgeText =
      userType === 'photographer' ? 'フォトグラファー' : 'モデル';

    return (
      <div className="flex items-center gap-1">
        <Badge variant={badgeVariant} className="text-xs">
          {badgeText}
        </Badge>
        {isVerified && <Verified className="h-4 w-4 text-blue-500" />}
      </div>
    );
  };

  return (
    <Card className={className}>
      {/* リポストヘッダー */}
      {isRepost && (
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Repeat2 className="h-4 w-4" />
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.user.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {post.user.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <span>{post.user.display_name}さんがリポストしました</span>
          </div>
          {post.repost_comment && (
            <p className="mt-2 text-sm pl-6">{post.repost_comment}</p>
          )}
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={displayPost.user.avatar_url || undefined} />
              <AvatarFallback>
                {displayPost.user.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${displayPost.user.id}`}>
                  <h3 className="font-semibold truncate hover:text-primary transition-colors cursor-pointer">
                    {displayPost.user.display_name || 'Unknown User'}
                  </h3>
                </Link>
                {renderUserBadge(
                  displayPost.user.user_type,
                  displayPost.user.is_verified
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {formatDistanceToNow(new Date(displayPost.created_at), {
                    addSuffix: true,
                    locale: ja,
                  })}
                </span>
                {displayPost.is_edited && (
                  <span className="text-xs">(編集済み)</span>
                )}
              </div>
            </div>
          </div>

          {/* アクションメニュー */}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  投稿を開く
                </DropdownMenuItem>
                {isOwner ? (
                  <>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      編集
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      削除
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem className="text-red-600">
                    <Flag className="h-4 w-4 mr-2" />
                    報告
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 投稿内容 */}
        <div
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: formatContent(displayPost.content),
          }}
        />

        {/* 画像表示 */}
        {displayPost.image_urls && displayPost.image_urls.length > 0 && (
          <div className="relative">
            <Dialog
              open={isImageDialogOpen}
              onOpenChange={setIsImageDialogOpen}
            >
              <DialogTrigger asChild>
                <div className="relative cursor-pointer group">
                  <img
                    src={displayPost.image_urls[currentImageIndex]}
                    alt="投稿画像"
                    className="w-full max-h-[400px] object-cover rounded-lg"
                  />
                  {displayPost.image_urls.length > 1 && (
                    <Badge className="absolute top-2 right-2">
                      {currentImageIndex + 1}/{displayPost.image_urls.length}
                    </Badge>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg" />
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>画像を表示</DialogTitle>
                </DialogHeader>
                <div className="relative">
                  <img
                    src={displayPost.image_urls[currentImageIndex]}
                    alt="投稿画像"
                    className="w-full max-h-[70vh] object-contain"
                  />
                  {displayPost.image_urls.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2"
                        onClick={handlePreviousImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={handleNextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <Badge>
                          {currentImageIndex + 1}/
                          {displayPost.image_urls.length}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* 画像ナビゲーション */}
            {displayPost.image_urls.length > 1 && (
              <div className="flex justify-center mt-2 space-x-1">
                {displayPost.image_urls.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex
                        ? 'bg-blue-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 撮影会情報 */}
        {displayPost.photo_session && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">撮影会</span>
              </div>
              <h4 className="font-semibold">
                {displayPost.photo_session.title}
              </h4>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{displayPost.photo_session.date}</span>
                </div>
                {displayPost.photo_session.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{displayPost.photo_session.location}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 位置情報 */}
        {displayPost.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{displayPost.location}</span>
          </div>
        )}

        {/* ハッシュタグ */}
        {displayPost.hashtags && displayPost.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {displayPost.hashtags.map(hashtag => (
              <Badge key={hashtag} variant="outline" className="text-blue-600">
                #{hashtag}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {/* アクションボタン */}
        {showActions && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-2 ${
                  isLiked
                    ? 'text-red-500 hover:text-red-600'
                    : 'text-muted-foreground'
                }`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{likesCount}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-muted-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{displayPost.comments_count}</span>
              </Button>

              {!isRepost && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRepost}
                  disabled={isReposting}
                  className={`flex items-center gap-2 ${
                    isReposted
                      ? 'text-green-500 hover:text-green-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Repeat2 className="h-4 w-4" />
                  <span>{repostsCount}</span>
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-muted-foreground"
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 最近のいいね */}
        {displayPost.recent_likes && displayPost.recent_likes.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {displayPost.recent_likes.slice(0, 3).map(user => (
                <Avatar
                  key={user.id}
                  className="h-6 w-6 border-2 border-background"
                >
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {user.display_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span>
              {displayPost.recent_likes[0].display_name}
              {displayPost.recent_likes.length > 1 &&
                ` 他${displayPost.recent_likes.length - 1}人`}
              がいいねしました
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
