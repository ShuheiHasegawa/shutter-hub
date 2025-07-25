'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';
import {
  UserPreferences,
  UserFollowStats,
  FollowActionResult,
  BlockActionResult,
  FollowListFilter,
  UserSearchResult,
  UserWithFollowInfo,
  UpdatePrivacySettings,
  UpdateNotificationSettings,
  BlockReason,
} from '@/types/social';

// フォロー中のユーザー一覧を取得
export async function getFollowingUsers(userId: string): Promise<{
  success: boolean;
  data?: UserWithFollowInfo[];
  message?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    // まずフォロー中のユーザーIDを取得
    const { data: followData, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted');

    if (followError) {
      logger.error('Get following IDs error:', followError);
      return {
        success: false,
        message: 'フォロー中のユーザー取得に失敗しました',
      };
    }

    const followingIds = followData?.map(f => f.following_id) || [];

    if (followingIds.length === 0) {
      return { success: true, data: [] };
    }

    // ユーザーの詳細情報を取得
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followingIds);

    if (profileError) {
      logger.error('Get profiles error:', profileError);
      return { success: false, message: 'プロフィール取得に失敗しました' };
    }

    // 相互フォロー関係を確認
    const { data: mutualFollows } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId)
      .eq('status', 'accepted')
      .in('follower_id', followingIds);

    const mutualFollowIds = new Set(
      mutualFollows?.map(f => f.follower_id) || []
    );

    const users: UserWithFollowInfo[] = (profiles || []).map(profile => ({
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      user_type: profile.user_type,
      location: profile.location,
      website: profile.website,
      instagram_handle: profile.instagram_handle,
      twitter_handle: profile.twitter_handle,
      is_verified: profile.is_verified,
      created_at: profile.created_at,
      is_following: true,
      is_followed_by: mutualFollowIds.has(profile.id),
      is_mutual_follow: mutualFollowIds.has(profile.id),
      follow_status: 'accepted' as const,
    }));

    return { success: true, data: users };
  } catch (error) {
    logger.error('Get following users error:', error);
    return {
      success: false,
      message: 'フォロー中のユーザー取得に失敗しました',
    };
  }
}

// フォロワーユーザー一覧を取得
export async function getFollowerUsers(userId: string): Promise<{
  success: boolean;
  data?: UserWithFollowInfo[];
  message?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    // まずフォロワーのユーザーIDを取得
    const { data: followData, error: followError } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId)
      .eq('status', 'accepted');

    if (followError) {
      logger.error('Get follower IDs error:', followError);
      return { success: false, message: 'フォロワー取得に失敗しました' };
    }

    const followerIds = followData?.map(f => f.follower_id) || [];

    if (followerIds.length === 0) {
      return { success: true, data: [] };
    }

    // ユーザーの詳細情報を取得
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followerIds);

    if (profileError) {
      logger.error('Get profiles error:', profileError);
      return { success: false, message: 'プロフィール取得に失敗しました' };
    }

    // 相互フォロー関係を確認
    const { data: mutualFollows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted')
      .in('following_id', followerIds);

    const mutualFollowIds = new Set(
      mutualFollows?.map(f => f.following_id) || []
    );

    const users: UserWithFollowInfo[] = (profiles || []).map(profile => ({
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      user_type: profile.user_type,
      location: profile.location,
      website: profile.website,
      instagram_handle: profile.instagram_handle,
      twitter_handle: profile.twitter_handle,
      is_verified: profile.is_verified,
      created_at: profile.created_at,
      is_following: mutualFollowIds.has(profile.id),
      is_followed_by: true,
      is_mutual_follow: mutualFollowIds.has(profile.id),
      follow_status: 'accepted' as const,
    }));

    return { success: true, data: users };
  } catch (error) {
    logger.error('Get follower users error:', error);
    return { success: false, message: 'フォロワー取得に失敗しました' };
  }
}

// フォロー・アンフォロー機能
export async function followUser(
  targetUserId: string
): Promise<FollowActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    if (user.id === targetUserId) {
      return { success: false, message: '自分をフォローすることはできません' };
    }

    // ブロック状態をチェック
    const { data: isBlocked } = await supabase.rpc('is_user_blocked', {
      user1_id: user.id,
      user2_id: targetUserId,
    });

    if (isBlocked) {
      return { success: false, message: 'この操作は実行できません' };
    }

    // 対象ユーザーの設定を取得
    const { data: targetPreferences } = await supabase
      .from('user_preferences')
      .select('follow_approval_required')
      .eq('user_id', targetUserId)
      .single();

    const requiresApproval =
      targetPreferences?.follow_approval_required || false;
    const status = requiresApproval ? 'pending' : 'accepted';

    // フォロー関係を作成または更新
    const { error: followError } = await supabase.from('follows').upsert(
      {
        follower_id: user.id,
        following_id: targetUserId,
        status,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'follower_id,following_id',
      }
    );

    if (followError) {
      logger.error('Follow error:', followError);
      return { success: false, message: 'フォローに失敗しました' };
    }

    // パス再検証
    revalidatePath('/profile/[id]', 'page');
    revalidatePath('/social/followers');
    revalidatePath('/social/following');

    return {
      success: true,
      follow_status: status,
      requires_approval: requiresApproval,
      message: requiresApproval
        ? 'フォローリクエストを送信しました'
        : 'フォローしました',
    };
  } catch (error) {
    logger.error('Follow user error:', error);
    return { success: false, message: 'フォローに失敗しました' };
  }
}

export async function unfollowUser(
  targetUserId: string
): Promise<FollowActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId);

    if (error) {
      logger.error('Unfollow error:', error);
      return { success: false, message: 'アンフォローに失敗しました' };
    }

    // パス再検証
    revalidatePath('/profile/[id]', 'page');
    revalidatePath('/social/followers');
    revalidatePath('/social/following');

    return { success: true, message: 'アンフォローしました' };
  } catch (error) {
    logger.error('Unfollow user error:', error);
    return { success: false, message: 'アンフォローに失敗しました' };
  }
}

// フォローリクエスト承認・拒否
export async function approveFollowRequest(
  followerId: string
): Promise<FollowActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    const { error } = await supabase
      .from('follows')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('follower_id', followerId)
      .eq('following_id', user.id)
      .eq('status', 'pending');

    if (error) {
      logger.error('Approve follow request error:', error);
      return { success: false, message: 'リクエストの承認に失敗しました' };
    }

    revalidatePath('/social/follow-requests');
    revalidatePath('/social/followers');

    return { success: true, message: 'フォローリクエストを承認しました' };
  } catch (error) {
    logger.error('Approve follow request error:', error);
    return { success: false, message: 'リクエストの承認に失敗しました' };
  }
}

export async function rejectFollowRequest(
  followerId: string
): Promise<FollowActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', user.id)
      .eq('status', 'pending');

    if (error) {
      logger.error('Reject follow request error:', error);
      return { success: false, message: 'リクエストの拒否に失敗しました' };
    }

    revalidatePath('/social/follow-requests');

    return { success: true, message: 'フォローリクエストを拒否しました' };
  } catch (error) {
    logger.error('Reject follow request error:', error);
    return { success: false, message: 'リクエストの拒否に失敗しました' };
  }
}

// ブロック・アンブロック機能
export async function blockUser(
  targetUserId: string,
  reason?: BlockReason,
  description?: string
): Promise<BlockActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    if (user.id === targetUserId) {
      return { success: false, message: '自分をブロックすることはできません' };
    }

    // フォロー関係を削除
    await supabase
      .from('follows')
      .delete()
      .or(
        `and(follower_id.eq.${user.id},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${user.id})`
      );

    // ブロック関係を作成
    const { error: blockError } = await supabase.from('user_blocks').upsert(
      {
        blocker_id: user.id,
        blocked_id: targetUserId,
        reason,
        description,
      },
      {
        onConflict: 'blocker_id,blocked_id',
      }
    );

    if (blockError) {
      logger.error('Block user error:', blockError);
      return { success: false, message: 'ブロックに失敗しました' };
    }

    revalidatePath('/profile/[id]', 'page');
    revalidatePath('/social/blocked-users');

    return {
      success: true,
      is_blocked: true,
      message: 'ユーザーをブロックしました',
    };
  } catch (error) {
    logger.error('Block user error:', error);
    return { success: false, message: 'ブロックに失敗しました' };
  }
}

export async function unblockUser(
  targetUserId: string
): Promise<BlockActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', targetUserId);

    if (error) {
      logger.error('Unblock user error:', error);
      return { success: false, message: 'ブロック解除に失敗しました' };
    }

    revalidatePath('/profile/[id]', 'page');
    revalidatePath('/social/blocked-users');

    return {
      success: true,
      is_blocked: false,
      message: 'ブロックを解除しました',
    };
  } catch (error) {
    logger.error('Unblock user error:', error);
    return { success: false, message: 'ブロック解除に失敗しました' };
  }
}

// フォローリスト取得
export async function getFollowList(
  filter: FollowListFilter
): Promise<UserSearchResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('認証が必要です');
    }

    const limit = filter.limit || 20;
    const offset = filter.offset || 0;

    let query = supabase.from('user_follow_relationships').select(`
      *,
      follow_stats:user_follow_stats(*)
    `);

    // フィルタリング条件
    if (filter.type === 'followers') {
      query = query.eq('following_id', filter.user_id);
    } else if (filter.type === 'following') {
      query = query.eq('follower_id', filter.user_id);
    } else if (filter.type === 'mutual') {
      query = query.eq('follower_id', filter.user_id).eq('is_mutual', true);
    }

    if (filter.status) {
      query = query.eq('status', filter.status);
    } else {
      query = query.eq('status', 'accepted');
    }

    if (filter.search) {
      const searchTerm = `%${filter.search}%`;
      if (filter.type === 'followers') {
        query = query.ilike('follower_name', searchTerm);
      } else {
        query = query.ilike('following_name', searchTerm);
      }
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Get follow list error:', error);
      return { users: [], total_count: 0, has_more: false };
    }

    const users: UserWithFollowInfo[] = (data || []).map(item => {
      const isFollowerView = filter.type === 'followers';
      return {
        id: isFollowerView ? item.follower_id : item.following_id,
        display_name: isFollowerView ? item.follower_name : item.following_name,
        avatar_url: isFollowerView
          ? item.follower_avatar
          : item.following_avatar,
        user_type: isFollowerView ? item.follower_type : item.following_type,
        bio: null,
        location: null,
        website: null,
        instagram_handle: null,
        twitter_handle: null,
        is_verified: false,
        created_at: item.created_at,
        is_mutual_follow: item.is_mutual,
        follow_stats: item.follow_stats,
      };
    });

    return {
      users,
      total_count: count || 0,
      has_more: (count || 0) > offset + limit,
    };
  } catch (error) {
    logger.error('Get follow list error:', error);
    return { users: [], total_count: 0, has_more: false };
  }
}

// フォロー統計取得
export async function getUserFollowStats(
  userId: string
): Promise<UserFollowStats | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_follow_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Get follow stats error:', error);
      return null;
    }

    return (
      data || {
        user_id: userId,
        followers_count: 0,
        following_count: 0,
        mutual_follows_count: 0,
        updated_at: new Date().toISOString(),
      }
    );
  } catch (error) {
    logger.error('Get follow stats error:', error);
    return null;
  }
}

// ユーザー設定取得・更新
export async function getUserPreferences(
  userId?: string
): Promise<UserPreferences | null> {
  try {
    const supabase = await createClient();
    let targetUserId = userId;

    if (!targetUserId) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return null;
      targetUserId = user.id;
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Get user preferences error:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Get user preferences error:', error);
    return null;
  }
}

export async function updatePrivacySettings(
  settings: UpdatePrivacySettings
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

    const { error } = await supabase.from('user_preferences').upsert(
      {
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (error) {
      logger.error('Update privacy settings error:', error);
      return { success: false, message: '設定の更新に失敗しました' };
    }

    revalidatePath('/settings/privacy');
    return { success: true, message: 'プライバシー設定を更新しました' };
  } catch (error) {
    logger.error('Update privacy settings error:', error);
    return { success: false, message: '設定の更新に失敗しました' };
  }
}

export async function updateNotificationSettings(
  settings: UpdateNotificationSettings
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

    const { error } = await supabase.from('user_preferences').upsert(
      {
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (error) {
      logger.error('Update notification settings error:', error);
      return { success: false, message: '設定の更新に失敗しました' };
    }

    revalidatePath('/settings/notifications');
    return { success: true, message: '通知設定を更新しました' };
  } catch (error) {
    logger.error('Update notification settings error:', error);
    return { success: false, message: '設定の更新に失敗しました' };
  }
}

// ユーザー検索（@username対応版）
export async function searchUsers(
  query: string,
  limit = 20,
  offset = 0
): Promise<UserSearchResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { users: [], total_count: 0, has_more: false };
    }

    const searchTerm = `%${query}%`;
    const usernameQuery = query.replace('@', '').toLowerCase();

    // @username形式での検索を最優先し、その後通常検索を行う
    let data: UserWithFollowInfo[] = [];
    let count = 0;
    let searchError: Error | null = null;

    // まず@username形式での完全一致検索
    if (query.startsWith('@') || /^[a-zA-Z0-9_]+$/.test(query)) {
      const { data: usernameData, error: usernameError } = await supabase
        .from('profiles')
        .select(
          `
          *,
          follow_stats:user_follow_stats(*)
        `
        )
        .eq('username', usernameQuery)
        .neq('id', user.id)
        .limit(1);

      if (!usernameError && usernameData && usernameData.length > 0) {
        data = usernameData;
        count = 1;
      } else if (usernameError) {
        searchError = usernameError;
      }
    }

    // @username検索で結果がない場合は統合検索を実行
    if (data.length === 0 && !searchError) {
      const {
        data: searchData,
        error: searchDataError,
        count: searchCount,
      } = await supabase
        .from('profiles')
        .select(
          `
          *,
          follow_stats:user_follow_stats(*)
        `,
          { count: 'exact' }
        )
        .or(
          `username.ilike.${searchTerm},display_name.ilike.${searchTerm},bio.ilike.${searchTerm}`
        )
        .neq('id', user.id) // 自分を除外
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!searchDataError && searchData) {
        data = searchData;
        count = searchCount || 0;
      } else if (searchDataError) {
        searchError = searchDataError;
      }
    }

    if (searchError) {
      logger.error('Search users error:', searchError);
      return { users: [], total_count: 0, has_more: false };
    }

    // フォロー関係を並列で取得
    const userIds = (data || []).map(profile => profile.id);
    const [followingData, followersData, blockedData] = await Promise.all([
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', userIds),
      supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id)
        .in('follower_id', userIds),
      supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id)
        .in('blocked_id', userIds),
    ]);

    const followingIds = new Set(
      followingData.data?.map(f => f.following_id) || []
    );
    const followerIds = new Set(
      followersData.data?.map(f => f.follower_id) || []
    );
    const blockedIds = new Set(blockedData.data?.map(b => b.blocked_id) || []);

    const users: UserWithFollowInfo[] = (data || []).map(profile => ({
      id: profile.id,
      display_name: profile.display_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      user_type: profile.user_type,
      location: profile.location,
      website: profile.website,
      instagram_handle: profile.instagram_handle,
      twitter_handle: profile.twitter_handle,
      is_verified: profile.is_verified,
      created_at: profile.created_at,
      follow_stats: profile.follow_stats,
      is_following: followingIds.has(profile.id),
      is_followed_by: followerIds.has(profile.id),
      is_mutual_follow:
        followingIds.has(profile.id) && followerIds.has(profile.id),
      is_blocked: blockedIds.has(profile.id),
    }));

    return {
      users,
      total_count: count || 0,
      has_more: (count || 0) > offset + limit,
    };
  } catch (error) {
    logger.error('Search users error:', error);
    return { users: [], total_count: 0, has_more: false };
  }
}
