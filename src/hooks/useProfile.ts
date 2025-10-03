import useSWR, { mutate } from 'swr';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

// プロフィールデータの型定義
export interface ProfileData {
  id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  user_type: 'model' | 'photographer' | 'organizer';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  username?: string | null;
}

// フォロー統計の型定義
export interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
  follow_status?: 'accepted' | 'pending';
  is_mutual_follow: boolean;
}

// 活動統計の型定義
export interface UserActivityStats {
  organizedSessions: number;
  participatedSessions: number;
  receivedReviews: number;
  sessionReviews: number;
}

// プロフィールデータ取得関数
async function fetchProfile(userId: string): Promise<ProfileData> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    logger.error('プロフィール取得エラー:', error);
    throw new Error('プロフィールの取得に失敗しました');
  }

  return data;
}

// フォロー統計取得関数
async function fetchFollowStats(
  userId: string,
  currentUserId: string
): Promise<FollowStats> {
  const supabase = createClient();

  const [
    { data: followersData },
    { data: followingData },
    { data: isFollowingData },
  ] = await Promise.all([
    // フォロワー数
    supabase
      .from('user_follow_stats')
      .select('followers_count')
      .eq('user_id', userId)
      .single(),

    // フォロー中数
    supabase
      .from('user_follow_stats')
      .select('following_count')
      .eq('user_id', userId)
      .single(),

    // 現在のユーザーがフォローしているか
    supabase
      .from('follows')
      .select('status')
      .eq('follower_id', currentUserId)
      .eq('following_id', userId)
      .eq('status', 'accepted')
      .maybeSingle(),
  ]);

  return {
    followers_count: followersData?.followers_count || 0,
    following_count: followingData?.following_count || 0,
    is_following: !!isFollowingData,
    follow_status: isFollowingData?.status || undefined,
    is_mutual_follow: false, // 後で実装
  };
}

// 活動統計取得関数
async function fetchUserActivityStats(
  userId: string
): Promise<UserActivityStats> {
  const supabase = createClient();

  const [
    { count: organizedSessionsCount },
    { count: participatedSessionsCount },
    { count: receivedReviewsCount },
    { count: sessionReviewsCount },
  ] = await Promise.all([
    // 主催した撮影会数
    supabase
      .from('photo_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', userId),

    // 参加した撮影会数
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'confirmed'),

    // 受け取ったレビュー数
    supabase
      .from('user_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('reviewee_id', userId)
      .eq('status', 'published'),

    // 撮影会レビュー数
    supabase
      .from('photo_session_reviews')
      .select('photo_sessions!photo_session_reviews_photo_session_id_fkey(*)', {
        count: 'exact',
        head: true,
      })
      .eq('photo_sessions.organizer_id', userId)
      .eq('status', 'published'),
  ]);

  return {
    organizedSessions: organizedSessionsCount || 0,
    participatedSessions: participatedSessionsCount || 0,
    receivedReviews: receivedReviewsCount || 0,
    sessionReviews: sessionReviewsCount || 0,
  };
}

/**
 * プロフィールデータ用SWRフック
 */
export function useProfileData(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `profile-data-${userId}` : null,
    () => fetchProfile(userId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5分間重複防止
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  return {
    profile: data,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * フォロー統計用SWRフック
 */
export function useFollowStats(
  userId: string,
  currentUserId: string,
  isOwnProfile: boolean
) {
  const { data, error, isLoading, mutate } = useSWR(
    !isOwnProfile && userId && currentUserId ? `follow-stats-${userId}` : null,
    () => fetchFollowStats(userId, currentUserId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 600000, // 10分間重複防止
      errorRetryCount: 2,
    }
  );

  return {
    followStats: data,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * 活動統計用SWRフック
 */
export function useUserActivityStats(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `activity-stats-${userId}` : null,
    () => fetchUserActivityStats(userId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1800000, // 30分間重複防止
      errorRetryCount: 2,
    }
  );

  return {
    activityStats: data,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * プロフィール関連データの一括無効化
 */
export function invalidateProfileCache(userId: string) {
  // 関連するキャッシュを全て無効化
  mutate(`profile-data-${userId}`);
  mutate(`follow-stats-${userId}`);
  mutate(`activity-stats-${userId}`);
  logger.info('プロフィールキャッシュを無効化:', { userId });
}

/**
 * 手動リフレッシュ機能
 */
export function refreshProfileData(userId: string) {
  invalidateProfileCache(userId);
  logger.info('プロフィールデータを手動リフレッシュ:', { userId });
}
