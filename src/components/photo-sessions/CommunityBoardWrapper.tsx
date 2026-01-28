'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import { CommunityBoard } from '@/components/community-board';
import type { CommunityCategory } from '@/components/community-board';
import type { ReactionType } from '@/constants/reactions';
import {
  getCommunityPosts,
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  addCommunityReaction,
  toggleCommunityPin,
} from '@/app/actions/community-board';

interface CommunityBoardWrapperProps {
  sessionId: string;
  currentUserId: string;
  isOrganizer: boolean;
  participantCount: number;
  eventTimeRange?: string;
}

/**
 * コミュニティボードのラッパーコンポーネント
 * Phase 1ではモックデータを使用し、Phase 4でDB連携に置き換える
 */
export function CommunityBoardWrapper({
  sessionId,
  currentUserId,
  isOrganizer,
  participantCount,
  eventTimeRange,
}: CommunityBoardWrapperProps) {
  // Phase 4: DB連携（SWR使用）
  const {
    data: posts = [],
    error: swrError,
    isLoading,
    mutate,
  } = useSWR(
    `community-board-${sessionId}`,
    () => getCommunityPosts(sessionId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  const handlePost = async (content: string, category: CommunityCategory) => {
    try {
      const result = await createCommunityPost({
        sessionId,
        content,
        category,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // SWRキャッシュを更新
      await mutate();
    } catch {
      toast.error('投稿に失敗しました');
    }
  };

  const handleEdit = async (postId: string, content: string) => {
    try {
      const result = await updateCommunityPost({
        postId,
        content,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // SWRキャッシュを更新
      await mutate();
    } catch {
      toast.error('更新に失敗しました');
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const result = await deleteCommunityPost(postId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // SWRキャッシュを更新
      await mutate();
    } catch {
      toast.error('削除に失敗しました');
    }
  };

  const handleReaction = async (postId: string, emoji: ReactionType) => {
    try {
      const result = await addCommunityReaction({
        postId,
        reactionType: emoji,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // SWRキャッシュを更新
      await mutate();
    } catch {
      toast.error('リアクションに失敗しました');
    }
  };

  const handlePin = async (postId: string, isPinned: boolean) => {
    try {
      const result = await toggleCommunityPin({
        postId,
        isPinned,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // SWRキャッシュを更新
      await mutate();
    } catch {
      toast.error('ピン留めに失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (swrError) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-destructive">データの取得に失敗しました</p>
      </div>
    );
  }

  return (
    <CommunityBoard
      sessionId={sessionId}
      currentUserId={currentUserId}
      isOrganizer={isOrganizer}
      posts={posts}
      participantCount={participantCount}
      eventTimeRange={eventTimeRange}
      onPost={handlePost}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onReaction={handleReaction}
      onPin={handlePin}
    />
  );
}
