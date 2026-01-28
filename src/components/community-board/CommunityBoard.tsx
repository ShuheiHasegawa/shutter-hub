'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CommunityBoardHeader } from './CommunityBoardHeader';
import { CommunityBoardPost } from './CommunityBoardPost';
import { CommunityBoardPostForm } from './CommunityBoardPostForm';
import { CommunityBoardSidebar } from './CommunityBoardSidebar';
import { CommunityBoardProps, CommunityCategory, CommunityPost } from './types';
import { toast } from 'sonner';
import type { ReactionType } from '@/constants/reactions';
import { Card } from '@/components/ui/card';

export function CommunityBoard({
  currentUserId,
  isOrganizer,
  posts,
  participantCount,
  eventTimeRange,
  onPost,
  onEdit,
  onDelete,
  onReaction,
  onPin,
}: CommunityBoardProps) {
  const t = useTranslations('communityBoard');
  const [selectedCategory, setSelectedCategory] = useState<
    CommunityCategory | 'all'
  >('all');

  // ピン留めされた投稿と通常の投稿を分離し、古い順にソート
  const sortedPosts = useMemo(() => {
    const pinned = posts.filter(p => p.isPinned);
    const unpinned = posts.filter(p => !p.isPinned);

    // 古い順にソート（createdAtの昇順）
    const sortByDate = (a: CommunityPost, b: CommunityPost) => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    };

    return [...pinned.sort(sortByDate), ...unpinned.sort(sortByDate)];
  }, [posts]);

  // カテゴリフィルタリング
  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'all') {
      return sortedPosts;
    }
    return sortedPosts.filter(post => post.category === selectedCategory);
  }, [sortedPosts, selectedCategory]);

  const handlePost = async (content: string, category: CommunityCategory) => {
    try {
      await onPost(content, category);
      toast.success(t('postSuccess', { defaultValue: '投稿しました' }));
    } catch (error) {
      toast.error(t('postError', { defaultValue: '投稿に失敗しました' }));
      throw error;
    }
  };

  const handleEdit = async (postId: string, content: string) => {
    try {
      await onEdit(postId, content);
      toast.success(t('editSuccess', { defaultValue: '投稿を更新しました' }));
    } catch (error) {
      toast.error(t('editError', { defaultValue: '更新に失敗しました' }));
      throw error;
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await onDelete(postId);
      toast.success(t('deleteSuccess', { defaultValue: '投稿を削除しました' }));
    } catch (error) {
      toast.error(t('deleteError', { defaultValue: '削除に失敗しました' }));
      throw error;
    }
  };

  const handleReaction = async (postId: string, emoji: ReactionType) => {
    try {
      await onReaction(postId, emoji);
    } catch (error) {
      toast.error(
        t('reactionError', { defaultValue: 'リアクションに失敗しました' })
      );
      throw error;
    }
  };

  const handlePin = async (postId: string, isPinned: boolean) => {
    try {
      await onPin(postId, isPinned);
      toast.success(
        isPinned
          ? t('pinSuccess', { defaultValue: 'ピン留めしました' })
          : t('unpinSuccess', { defaultValue: 'ピン留めを解除しました' })
      );
    } catch (error) {
      toast.error(t('pinError', { defaultValue: 'ピン留めに失敗しました' }));
      throw error;
    }
  };

  return (
    <Card className="min-h-screen">
      <CommunityBoardHeader
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('emptyPosts')}</p>
            </div>
          ) : (
            filteredPosts.map(post => (
              <CommunityBoardPost
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                isOrganizer={isOrganizer}
                onReaction={emoji => handleReaction(post.id, emoji)}
                onEdit={content => handleEdit(post.id, content)}
                onDelete={() => handleDelete(post.id)}
                onPin={isPinned => handlePin(post.id, isPinned)}
              />
            ))
          )}
        </div>

        <div className="space-y-4">
          <CommunityBoardPostForm onPost={handlePost} />
          <CommunityBoardSidebar
            participantCount={participantCount}
            postCount={posts.length}
            eventTimeRange={eventTimeRange}
          />
        </div>
      </div>
    </Card>
  );
}
