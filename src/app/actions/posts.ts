'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  CreatePostData,
  PostWithUser,
  PostSearchFilters,
  PostStats,
  TrendingTopic,
  TimelinePost,
  CommentWithUser,
} from '@/types/social';

// 投稿を作成
export async function createPost(
  postData: CreatePostData
): Promise<{ success: boolean; data?: PostWithUser; message?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    // ハッシュタグを抽出してマスターに登録
    const hashtags = postData.hashtags || [];
    const hashtagIds: string[] = [];

    for (const hashtagName of hashtags) {
      const { data: existingHashtag } = await supabase
        .from('sns_hashtags')
        .select('id')
        .eq('name', hashtagName.toLowerCase())
        .single();

      if (existingHashtag) {
        hashtagIds.push(existingHashtag.id);
      } else {
        const { data: newHashtag, error: hashtagError } = await supabase
          .from('sns_hashtags')
          .insert({
            name: hashtagName.toLowerCase(),
            usage_count: 0,
          })
          .select('id')
          .single();

        if (!hashtagError && newHashtag) {
          hashtagIds.push(newHashtag.id);
        }
      }
    }

    // 投稿を作成
    const { data: post, error: postError } = await supabase
      .from('sns_posts')
      .insert({
        user_id: user.id,
        content: postData.content,
        post_type: postData.post_type,
        visibility: postData.visibility,
        image_urls: postData.image_files?.map(f => f.name) || [], // 後で実際のURLに置換
        image_count: postData.image_files?.length || 0,
        photo_session_id: postData.photo_session_id,
        original_post_id: postData.original_post_id,
        repost_comment: postData.repost_comment,
        location: postData.location,
      })
      .select('*')
      .single();

    if (postError) {
      console.error('投稿作成エラー詳細:', postError);
      return { success: false, message: `ポストの作成に失敗しました: ${postError.message}` };
    }

    // ハッシュタグとの関連を作成
    if (hashtagIds.length > 0) {
      await supabase.from('sns_post_hashtags').insert(
        hashtagIds.map(hashtagId => ({
          post_id: post.id,
          hashtag_id: hashtagId,
        }))
      );
    }

    // メンションがある場合は関連を作成
    if (postData.mentions && postData.mentions.length > 0) {
      // ユーザー名からユーザーIDを取得
      const { data: mentionedUsers } = await supabase
        .from('profiles')
        .select('id')
        .in('display_name', postData.mentions);

      if (mentionedUsers && mentionedUsers.length > 0) {
        await supabase.from('sns_post_mentions').insert(
          mentionedUsers.map(user => ({
            post_id: post.id,
            mentioned_user_id: user.id,
          }))
        );
      }
    }

    // ユーザー情報を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, user_type, is_verified')
      .eq('id', user.id)
      .single();

    revalidatePath('/timeline');
    revalidatePath('/posts');

    return {
      success: true,
      data: {
        ...post,
        user: profile || {
          id: user.id,
          display_name: 'Unknown User',
          avatar_url: null,
          user_type: 'model' as const,
          is_verified: false,
        },
        hashtags,
        mentions: postData.mentions || [],
        is_liked_by_current_user: false,
        is_reposted_by_current_user: false,
      },
    };
  } catch (error) {
    console.error('投稿作成エラー:', error);
    console.error('投稿データ:', postData);
    return { success: false, message: `投稿の作成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// 投稿にいいね
export async function likePost(
  postId: string
): Promise<{ success: boolean; isLiked: boolean; message?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, isLiked: false, message: 'ログインが必要です' };
    }

    // 既存のいいねをチェック
    const { data: existingLike } = await supabase
      .from('sns_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // いいねを削除
      const { error } = await supabase
        .from('sns_post_likes')
        .delete()
        .eq('id', existingLike.id);

      if (error) {
        return { success: false, isLiked: true, message: 'いいねの削除に失敗しました' };
      }

      revalidatePath('/timeline');
      return { success: true, isLiked: false };
    } else {
      // いいねを追加
      const { error } = await supabase
        .from('sns_post_likes')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) {
        return { success: false, isLiked: false, message: 'いいねの追加に失敗しました' };
      }

      revalidatePath('/timeline');
      return { success: true, isLiked: true };
    }
  } catch (error) {
    console.error('いいね処理エラー:', error);
    return { success: false, isLiked: false, message: 'いいね処理に失敗しました' };
  }
}

// 投稿にコメント
export async function commentOnPost(
  postId: string,
  content: string,
  parentCommentId?: string
): Promise<{ success: boolean; data?: CommentWithUser; message?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    const { data: comment, error: commentError } = await supabase
      .from('sns_post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_comment_id: parentCommentId,
      })
      .select('*')
      .single();

    if (commentError) {
      return { success: false, message: 'コメントの投稿に失敗しました' };
    }

    // ユーザー情報を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, user_type, is_verified')
      .eq('id', user.id)
      .single();

    revalidatePath('/timeline');
    revalidatePath(`/posts/${postId}`);

    return {
      success: true,
      data: {
        ...comment,
        user: profile || {
          id: user.id,
          display_name: 'Unknown User',
          avatar_url: null,
          user_type: 'model' as const,
          is_verified: false,
        },
        is_liked_by_current_user: false,
        replies: [],
      },
    };
  } catch (error) {
    console.error('コメント投稿エラー:', error);
    return { success: false, message: 'コメントの投稿に失敗しました' };
  }
}

// 投稿をリポスト
export async function repostPost(
  originalPostId: string,
  comment?: string
): Promise<{ success: boolean; data?: PostWithUser; message?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    // 既にリポストしているかチェック
    const { data: existingRepost } = await supabase
      .from('sns_posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('original_post_id', originalPostId)
      .eq('post_type', 'repost')
      .single();

    if (existingRepost) {
      return { success: false, message: '既にリポストしています' };
    }

    const { data: repost, error: repostError } = await supabase
      .from('sns_posts')
      .insert({
        user_id: user.id,
        content: comment || '',
        post_type: 'repost',
        visibility: 'public',
        original_post_id: originalPostId,
        repost_comment: comment,
      })
      .select('*')
      .single();

    if (repostError) {
      return { success: false, message: 'リポストに失敗しました' };
    }

    // ユーザー情報を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, user_type, is_verified')
      .eq('id', user.id)
      .single();

    revalidatePath('/timeline');

    return {
      success: true,
      data: {
        ...repost,
        user: profile || {
          id: user.id,
          display_name: 'Unknown User',
          avatar_url: null,
          user_type: 'model' as const,
          is_verified: false,
        },
        is_liked_by_current_user: false,
        is_reposted_by_current_user: true,
      },
    };
  } catch (error) {
    console.error('リポストエラー:', error);
    return { success: false, message: 'リポストに失敗しました' };
  }
}

// タイムライン投稿を取得
export async function getTimelinePosts(
  page = 1,
  limit = 20
): Promise<{ success: boolean; data?: TimelinePost[]; message?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    const offset = (page - 1) * limit;

    // 全てのパブリック投稿を取得（簡素化版）
    const { data: posts, error } = await supabase
      .from('sns_posts')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, message: `タイムラインの取得に失敗しました: ${error.message}` };
    }

    // ユーザー情報を別途取得
    const userIds = [...new Set(posts.map(post => post.user_id))];
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, user_type, is_verified')
      .in('id', userIds);

    const profilesMap = new Map(profiles?.map(profile => [profile.id, profile]) || []);

    const timelinePosts: TimelinePost[] = posts.map(post => ({
      ...post,
      user: profilesMap.get(post.user_id) || {
        id: post.user_id,
        display_name: 'Unknown User',
        avatar_url: null,
        user_type: 'model' as const,
        is_verified: false,
      },
      is_liked_by_current_user: false, // 簡素化
      is_reposted_by_current_user: false,
      original_post: undefined, // 簡素化
      photo_session: undefined, // 簡素化
    }));

    return { success: true, data: timelinePosts };
  } catch (error) {
    console.error('タイムライン取得エラー:', error);
    return { success: false, message: 'タイムラインの取得に失敗しました' };
  }
}

// 投稿を検索
export async function searchPosts(
  filters: PostSearchFilters,
  page = 1,
  limit = 20
): Promise<{ success: boolean; data?: PostWithUser[]; message?: string }> {
  try {
    const supabase = await createClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('sns_posts')
      .select(`
        *,
        photo_sessions (
          id,
          title,
          date,
          location
        )
      `);

    // フィルター適用
    if (filters.query) {
      query = query.ilike('content', `%${filters.query}%`);
    }

    if (filters.post_type) {
      query = query.eq('post_type', filters.post_type);
    }

    if (filters.visibility) {
      query = query.eq('visibility', filters.visibility);
    }

    if (filters.has_images) {
      query = query.gt('image_count', 0);
    }

    if (filters.user_ids && filters.user_ids.length > 0) {
      query = query.in('user_id', filters.user_ids);
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    // ソート
    const sortBy = filters.sort_by || 'newest';
    switch (sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'most_liked':
        query = query.order('likes_count', { ascending: false });
        break;
      case 'most_commented':
        query = query.order('comments_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data: posts, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return { success: false, message: '投稿の検索に失敗しました' };
    }

    // ユーザー情報を別途取得
    const userIds = [...new Set(posts.map(post => post.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, user_type, is_verified')
      .in('id', userIds);

    const profilesMap = new Map(profiles?.map(profile => [profile.id, profile]) || []);

    const postsWithUser: PostWithUser[] = posts.map(post => ({
      ...post,
      user: profilesMap.get(post.user_id) || {
        id: post.user_id,
        display_name: 'Unknown User',
        avatar_url: null,
        user_type: 'model' as const,
        is_verified: false,
      },
      photo_session: post.photo_sessions?.[0] || undefined,
    }));

    return { success: true, data: postsWithUser };
  } catch (error) {
    console.error('投稿検索エラー:', error);
    return { success: false, message: '投稿の検索に失敗しました' };
  }
}

// トレンドハッシュタグを取得
export async function getTrendingHashtags(
  limit = 10
): Promise<{ success: boolean; data?: TrendingTopic[]; message?: string }> {
  try {
    const supabase = await createClient();

    const { data: hashtags, error } = await supabase
      .from('sns_trending_hashtags')
      .select('*')
      .limit(limit);

    if (error) {
      return { success: false, message: 'トレンドの取得に失敗しました' };
    }

    const trendingTopics: TrendingTopic[] = hashtags.map(hashtag => ({
      hashtag: hashtag.name,
      posts_count: hashtag.usage_count,
      engagement_score: hashtag.trending_score,
      growth_rate: hashtag.recent_posts || 0,
      category: 'general',
    }));

    return { success: true, data: trendingTopics };
  } catch (error) {
    console.error('トレンド取得エラー:', error);
    return { success: false, message: 'トレンドの取得に失敗しました' };
  }
}

// ユーザーの投稿統計を取得
export async function getUserPostStats(
  userId: string
): Promise<{ success: boolean; data?: PostStats; message?: string }> {
  try {
    const supabase = await createClient();

    const { data: stats, error } = await supabase
      .from('user_post_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return { success: false, message: '統計の取得に失敗しました' };
    }

    // 最も人気の投稿を取得
    const { data: mostLikedPost } = await supabase
      .from('sns_posts')
      .select('*')
      .eq('user_id', userId)
      .order('likes_count', { ascending: false })
      .limit(1)
      .single();

    const postStats: PostStats = {
      total_posts: stats.total_posts || 0,
      total_likes: stats.total_likes || 0,
      total_comments: stats.total_comments || 0,
      total_reposts: stats.total_reposts || 0,
      average_engagement: stats.average_engagement || 0,
      top_hashtags: [], // TODO: ハッシュタグ統計実装
      most_liked_post: mostLikedPost
        ? {
            ...mostLikedPost,
            user: {
              id: userId,
              display_name: 'Unknown User',
              avatar_url: null,
              user_type: 'model' as const,
              is_verified: false,
            },
          }
        : undefined,
    };

    return { success: true, data: postStats };
  } catch (error) {
    console.error('統計取得エラー:', error);
    return { success: false, message: '統計の取得に失敗しました' };
  }
}

// 投稿を削除
export async function deletePost(
  postId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    // 投稿の所有者確認
    const { data: post, error: postError } = await supabase
      .from('sns_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return { success: false, message: '投稿が見つかりません' };
    }

    if (post.user_id !== user.id) {
      return { success: false, message: '削除権限がありません' };
    }

    const { error } = await supabase.from('sns_posts').delete().eq('id', postId);

    if (error) {
      return { success: false, message: '投稿の削除に失敗しました' };
    }

    revalidatePath('/timeline');
    revalidatePath('/posts');

    return { success: true };
  } catch (error) {
    console.error('投稿削除エラー:', error);
    return { success: false, message: '投稿の削除に失敗しました' };
  }
} 