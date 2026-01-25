'use server';

import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';
import { requireAuthForAction } from '@/lib/auth/server-actions';
import type {
  CommunityPost,
  CommunityCategory,
} from '@/components/community-board/types';
import type { ReactionType } from '@/constants/reactions';

/**
 * コミュニティボードの投稿一覧を取得する
 */
export async function getCommunityPosts(
  sessionId: string
): Promise<CommunityPost[]> {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      logger.error('認証エラー:', authResult.error);
      return [];
    }
    const { user, supabase } = authResult.data;

    // 投稿を取得（RLSポリシーで参加者・主催者のみフィルタリング）
    const { data: posts, error: postsError } = await supabase
      .from('community_board_posts')
      .select('*')
      .eq('photo_session_id', sessionId)
      .order('created_at', { ascending: true }); // 古い順

    if (postsError) {
      logger.error('投稿取得エラー:', postsError);
      return [];
    }

    if (!posts || posts.length === 0) {
      return [];
    }

    // 各投稿のリアクション数を取得
    const postIds = posts.map(p => p.id);
    const { data: reactions, error: reactionsError } = await supabase
      .from('community_board_reactions')
      .select('post_id, reaction_type, user_id')
      .in('post_id', postIds);

    if (reactionsError) {
      logger.error('リアクション取得エラー:', reactionsError);
    }

    // 投稿者情報を取得
    const authorIds = [...new Set(posts.map(p => p.author_id))];
    const { data: authors, error: authorsError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', authorIds);

    if (authorsError) {
      logger.error('投稿者情報取得エラー:', authorsError);
    }

    // 撮影会情報を取得（主催者判定用）
    const { data: session, error: sessionError } = await supabase
      .from('photo_sessions')
      .select('organizer_id')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      logger.error('撮影会情報取得エラー:', sessionError);
    }

    // データを結合してCommunityPost形式に変換
    const authorMap = new Map((authors || []).map(a => [a.id, a]));

    const reactionMap = new Map<string, Map<ReactionType, number>>();
    const userReactionMap = new Map<string, ReactionType | null>();

    // リアクションを集計
    (reactions || []).forEach(reaction => {
      const postId = reaction.post_id;
      const reactionType = reaction.reaction_type as ReactionType;
      const isUserReaction = reaction.user_id === user.id;

      // リアクション数の集計
      if (!reactionMap.has(postId)) {
        reactionMap.set(postId, new Map());
      }
      const counts = reactionMap.get(postId)!;
      counts.set(reactionType, (counts.get(reactionType) || 0) + 1);

      // ユーザーのリアクションを記録
      if (isUserReaction) {
        userReactionMap.set(postId, reactionType);
      }
    });

    // CommunityPost形式に変換
    const communityPosts: CommunityPost[] = posts.map(post => {
      const author = authorMap.get(post.author_id);
      const isOrganizer = session?.organizer_id === post.author_id;

      // リアクション数の初期化
      const reactionCounts: Record<ReactionType, number> = {
        '👍': 0,
        '❤️': 0,
        '😂': 0,
        '😮': 0,
        '😢': 0,
        '😡': 0,
      };

      // リアクション数を設定
      const postReactions = reactionMap.get(post.id);
      if (postReactions) {
        postReactions.forEach((count, emoji) => {
          reactionCounts[emoji] = count;
        });
      }

      return {
        id: post.id,
        authorId: post.author_id,
        authorName: author?.display_name || 'Unknown',
        authorImage: author?.avatar_url || undefined,
        content: post.content,
        category: post.category as CommunityCategory,
        createdAt: new Date(post.created_at),
        updatedAt: post.updated_at ? new Date(post.updated_at) : undefined,
        reactions: reactionCounts,
        userReaction: userReactionMap.get(post.id) || null,
        isOrganizer,
        isPinned: post.is_pinned,
      };
    });

    return communityPosts;
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return [];
  }
}

/**
 * コミュニティボードに投稿を作成する
 */
export async function createCommunityPost(data: {
  sessionId: string;
  content: string;
  category: CommunityCategory;
}): Promise<{ data?: CommunityPost; error?: string }> {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // バリデーション
    if (!data.content.trim()) {
      return { error: '投稿内容を入力してください' };
    }

    // 投稿を作成
    const { data: post, error: createError } = await supabase
      .from('community_board_posts')
      .insert({
        photo_session_id: data.sessionId,
        author_id: user.id,
        content: data.content.trim(),
        category: data.category,
      })
      .select()
      .single();

    if (createError) {
      logger.error('投稿作成エラー:', createError);
      return { error: '投稿の作成に失敗しました' };
    }

    // 投稿者情報を取得
    const { data: author } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    // 撮影会情報を取得（主催者判定用）
    const { data: session } = await supabase
      .from('photo_sessions')
      .select('organizer_id')
      .eq('id', data.sessionId)
      .single();

    const communityPost: CommunityPost = {
      id: post.id,
      authorId: post.author_id,
      authorName: author?.display_name || 'Unknown',
      authorImage: author?.avatar_url || undefined,
      content: post.content,
      category: post.category as CommunityCategory,
      createdAt: new Date(post.created_at),
      updatedAt: post.updated_at ? new Date(post.updated_at) : undefined,
      reactions: {
        '👍': 0,
        '❤️': 0,
        '😂': 0,
        '😮': 0,
        '😢': 0,
        '😡': 0,
      },
      userReaction: null,
      isOrganizer: session?.organizer_id === post.author_id,
      isPinned: post.is_pinned,
    };

    revalidatePath(`/photo-sessions/${data.sessionId}`);
    return { data: communityPost };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: '予期しないエラーが発生しました' };
  }
}

/**
 * コミュニティボードの投稿を更新する
 */
export async function updateCommunityPost(data: {
  postId: string;
  content: string;
}): Promise<{ data?: CommunityPost; error?: string }> {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // バリデーション
    if (!data.content.trim()) {
      return { error: '投稿内容を入力してください' };
    }

    // 投稿を更新（RLSポリシーで投稿者本人のみ更新可能）
    const { data: post, error: updateError } = await supabase
      .from('community_board_posts')
      .update({
        content: data.content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.postId)
      .eq('author_id', user.id)
      .select()
      .single();

    if (updateError) {
      logger.error('投稿更新エラー:', updateError);
      return { error: '投稿の更新に失敗しました' };
    }

    if (!post) {
      return { error: '投稿が見つかりません' };
    }

    // 投稿者情報を取得
    const { data: author } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', post.author_id)
      .single();

    // 撮影会情報を取得（主催者判定用）
    const { data: session } = await supabase
      .from('photo_sessions')
      .select('organizer_id')
      .eq('id', post.photo_session_id)
      .single();

    // リアクション情報を取得
    const { data: reactions } = await supabase
      .from('community_board_reactions')
      .select('reaction_type, user_id')
      .eq('post_id', post.id);

    const reactionCounts: Record<ReactionType, number> = {
      '👍': 0,
      '❤️': 0,
      '😂': 0,
      '😮': 0,
      '😢': 0,
      '😡': 0,
    };

    let userReaction: ReactionType | null = null;

    (reactions || []).forEach(reaction => {
      const reactionType = reaction.reaction_type as ReactionType;
      reactionCounts[reactionType] = (reactionCounts[reactionType] || 0) + 1;
      if (reaction.user_id === user.id) {
        userReaction = reactionType;
      }
    });

    const communityPost: CommunityPost = {
      id: post.id,
      authorId: post.author_id,
      authorName: author?.display_name || 'Unknown',
      authorImage: author?.avatar_url || undefined,
      content: post.content,
      category: post.category as CommunityCategory,
      createdAt: new Date(post.created_at),
      updatedAt: post.updated_at ? new Date(post.updated_at) : undefined,
      reactions: reactionCounts,
      userReaction,
      isOrganizer: session?.organizer_id === post.author_id,
      isPinned: post.is_pinned,
    };

    revalidatePath(`/photo-sessions/${post.photo_session_id}`);
    return { data: communityPost };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: '予期しないエラーが発生しました' };
  }
}

/**
 * コミュニティボードの投稿を削除する
 */
export async function deleteCommunityPost(
  postId: string
): Promise<{ error?: string }> {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { supabase } = authResult.data;

    // 投稿情報を取得（sessionIdを取得するため）
    const { data: post, error: fetchError } = await supabase
      .from('community_board_posts')
      .select('photo_session_id')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return { error: '投稿が見つかりません' };
    }

    // 投稿を削除（RLSポリシーで投稿者本人または主催者のみ削除可能）
    const { error: deleteError } = await supabase
      .from('community_board_posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      logger.error('投稿削除エラー:', deleteError);
      return { error: '投稿の削除に失敗しました' };
    }

    revalidatePath(`/photo-sessions/${post.photo_session_id}`);
    return {};
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: '予期しないエラーが発生しました' };
  }
}

/**
 * コミュニティボードの投稿にリアクションを追加/更新する
 */
export async function addCommunityReaction(data: {
  postId: string;
  reactionType: ReactionType;
}): Promise<{ error?: string }> {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // リアクションタイプのバリデーション
    const validReactions: ReactionType[] = ['👍', '❤️', '😂', '😮', '😢', '😡'];
    if (!validReactions.includes(data.reactionType)) {
      return { error: 'Invalid reaction type' };
    }

    // 既存のリアクションをチェック
    const { data: existingReaction, error: checkError } = await supabase
      .from('community_board_reactions')
      .select('*')
      .eq('post_id', data.postId)
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      logger.error('リアクションチェックエラー:', checkError);
      return { error: 'Failed to check existing reaction' };
    }

    // 投稿情報を取得（sessionIdを取得するため）
    const { data: post } = await supabase
      .from('community_board_posts')
      .select('photo_session_id')
      .eq('id', data.postId)
      .single();

    if (existingReaction) {
      // 同じリアクションの場合は削除、違うリアクションの場合は更新
      if (existingReaction.reaction_type === data.reactionType) {
        // 削除
        const { error: deleteError } = await supabase
          .from('community_board_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (deleteError) {
          logger.error('リアクション削除エラー:', deleteError);
          return { error: 'Failed to delete reaction' };
        }
      } else {
        // 更新
        const { error: updateError } = await supabase
          .from('community_board_reactions')
          .update({ reaction_type: data.reactionType })
          .eq('id', existingReaction.id);

        if (updateError) {
          logger.error('リアクション更新エラー:', updateError);
          return { error: 'Failed to update reaction' };
        }
      }
    } else {
      // 新しいリアクションを作成
      const { error: createError } = await supabase
        .from('community_board_reactions')
        .insert({
          post_id: data.postId,
          user_id: user.id,
          reaction_type: data.reactionType,
        });

      if (createError) {
        logger.error('リアクション作成エラー:', createError);
        return { error: 'Failed to create reaction' };
      }
    }

    if (post) {
      revalidatePath(`/photo-sessions/${post.photo_session_id}`);
    }
    return {};
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: '予期しないエラーが発生しました' };
  }
}

/**
 * コミュニティボードの投稿をピン留め/解除する（主催者のみ）
 */
export async function toggleCommunityPin(data: {
  postId: string;
  isPinned: boolean;
}): Promise<{ error?: string }> {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // 投稿情報を取得
    const { data: post, error: fetchError } = await supabase
      .from('community_board_posts')
      .select('photo_session_id')
      .eq('id', data.postId)
      .single();

    if (fetchError || !post) {
      return { error: '投稿が見つかりません' };
    }

    // 主催者かどうかを確認
    const { data: session, error: sessionError } = await supabase
      .from('photo_sessions')
      .select('organizer_id')
      .eq('id', post.photo_session_id)
      .single();

    if (sessionError || !session) {
      return { error: '撮影会情報が見つかりません' };
    }

    if (session.organizer_id !== user.id) {
      return { error: '主催者のみピン留めが可能です' };
    }

    // ピン留め状態を更新
    const { error: updateError } = await supabase
      .from('community_board_posts')
      .update({ is_pinned: data.isPinned })
      .eq('id', data.postId);

    if (updateError) {
      logger.error('ピン留め更新エラー:', updateError);
      return { error: 'ピン留めの更新に失敗しました' };
    }

    revalidatePath(`/photo-sessions/${post.photo_session_id}`);
    return {};
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { error: '予期しないエラーが発生しました' };
  }
}
