'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { formatTimeLocalized } from '@/lib/utils/date';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MoreHorizontal, Edit, Trash2, Pin, PinOff, User } from 'lucide-react';
import { EmojiReactionPicker } from '@/components/ui/emoji-reaction-picker';
import type { ReactionType } from '@/constants/reactions';
import { CommunityPost, CommunityCategory } from './types';
import { cn } from '@/lib/utils';

interface CommunityBoardPostProps {
  post: CommunityPost;
  currentUserId: string;
  isOrganizer: boolean;
  locale?: string;
  onReaction: (emoji: ReactionType) => Promise<void>;
  onEdit: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onPin: (isPinned: boolean) => Promise<void>;
}

export function CommunityBoardPost({
  post,
  currentUserId,
  isOrganizer,
  locale: localeProp,
  onReaction,
  onEdit,
  onDelete,
  onPin,
}: CommunityBoardPostProps) {
  const t = useTranslations('communityBoard');
  const currentLocale = useLocale();
  const locale = localeProp || currentLocale;
  const localeForFormat = locale === 'ja' ? 'ja-JP' : 'en-US';
  const [reactions, setReactions] = useState<Record<ReactionType, number>>(
    post.reactions
  );
  const [userReaction, setUserReaction] = useState<ReactionType | null>(
    post.userReaction
  );
  const [isReacting, setIsReacting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isEditing, setIsEditing] = useState(false);

  const isOwner = currentUserId === post.authorId;
  const canEdit = isOwner;
  const canDelete = isOwner || isOrganizer;
  const canPin = isOrganizer;

  const handleReaction = async (emoji: ReactionType) => {
    if (isReacting) return;
    setIsReacting(true);
    try {
      const previousReaction = userReaction;
      const newReaction = previousReaction === emoji ? null : emoji;

      // 楽観的更新
      setUserReaction(newReaction);
      setReactions(prev => {
        const updated = { ...prev };
        // 以前のリアクションがあれば減らす
        if (previousReaction) {
          updated[previousReaction] = Math.max(
            0,
            (updated[previousReaction] || 0) - 1
          );
        }
        // 新しいリアクションがあれば増やす
        if (newReaction) {
          updated[newReaction] = (updated[newReaction] || 0) + 1;
        }
        return updated;
      });

      await onReaction(emoji);
    } catch {
      // エラー時は状態を戻す
      setUserReaction(post.userReaction);
      setReactions(post.reactions);
    } finally {
      setIsReacting(false);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === post.content) {
      setIsEditDialogOpen(false);
      return;
    }
    setIsEditing(true);
    try {
      await onEdit(editContent);
      setIsEditDialogOpen(false);
    } catch {
      // エラーハンドリングは親コンポーネントで行う
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleteDialogOpen(false);
    try {
      await onDelete();
    } catch {
      // エラーハンドリングは親コンポーネントで行う
    }
  };

  const handlePin = async () => {
    try {
      await onPin(!post.isPinned);
    } catch {
      // エラーハンドリングは親コンポーネントで行う
    }
  };

  const getCategoryLabel = (category: CommunityCategory): string => {
    return t(`categories.${category}`);
  };

  const getCategoryBadgeVariant = (
    category: CommunityCategory
  ): 'default' | 'secondary' | 'outline' => {
    switch (category) {
      case 'announcement':
        return 'default';
      case 'question':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formattedTime = formatTimeLocalized(post.createdAt, localeForFormat);

  return (
    <>
      <Card
        className={cn(
          'overflow-hidden',
          post.isPinned &&
            'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
        )}
      >
        {post.isPinned && (
          <div className="px-4 pt-3 pb-1 text-sm text-amber-700 dark:text-amber-400 font-medium">
            ★ {t('pinnedMessage')}
          </div>
        )}
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarImage src={post.authorImage || undefined} />
                <AvatarFallback>
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">
                    {post.authorName}
                  </span>
                  {post.isOrganizer && (
                    <Badge variant="default" className="text-xs">
                      {t('organizer')}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {formattedTime}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                variant={getCategoryBadgeVariant(post.category)}
                className="text-xs"
              >
                {getCategoryLabel(post.category)}
              </Badge>
              {(canEdit || canDelete || canPin) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">{t('more')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canPin && (
                      <DropdownMenuItem onClick={handlePin}>
                        {post.isPinned ? (
                          <>
                            <PinOff className="mr-2 h-4 w-4" />
                            {t('unpin')}
                          </>
                        ) : (
                          <>
                            <Pin className="mr-2 h-4 w-4" />
                            {t('pin')}
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    {canEdit && (
                      <DropdownMenuItem
                        onClick={() => setIsEditDialogOpen(true)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        {t('edit')}
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('delete')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <p className="text-foreground leading-relaxed mb-4 whitespace-pre-wrap">
            {post.content}
          </p>

          <EmojiReactionPicker
            reactions={reactions}
            userReaction={userReaction}
            onReaction={handleReaction}
            disabled={isReacting}
          />
        </CardContent>
      </Card>

      {/* 編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit')}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder={t('placeholder')}
            className="min-h-[120px] resize-none"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isEditing}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isEditing || !editContent.trim()}
            >
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDelete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
