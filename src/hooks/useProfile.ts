import useSWR, { mutate } from 'swr';
import { logger } from '@/lib/utils/logger';
import {
  executeQuery,
  executeParallelQueries,
} from '@/lib/supabase/query-wrapper';

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
  return await executeQuery<ProfileData>(
    'fetchProfile',
    supabase => supabase.from('profiles').select('*').eq('id', userId).single(),
    { detailed: true }
  );
}

// フォロー統計取得関数
async function fetchFollowStats(
  userId: string,
  currentUserId: string
): Promise<FollowStats> {
  const results = await executeParallelQueries({
    followersData: {
      operation: 'fetchFollowersCount',
      queryBuilder: supabase =>
        supabase
          .from('user_follow_stats')
          .select('followers_count')
          .eq('user_id', userId)
          .single(),
      options: { detailed: false },
    },
    followingData: {
      operation: 'fetchFollowingCount',
      queryBuilder: supabase =>
        supabase
          .from('user_follow_stats')
          .select('following_count')
          .eq('user_id', userId)
          .single(),
      options: { detailed: false },
    },
    isFollowingData: {
      operation: 'checkFollowStatus',
      queryBuilder: supabase =>
        supabase
          .from('follows')
          .select('status')
          .eq('follower_id', currentUserId)
          .eq('following_id', userId)
          .eq('status', 'accepted')
          .maybeSingle(),
      options: { detailed: false },
    },
  });

  const { followersData, followingData, isFollowingData } = results;

  return {
    followers_count:
      (followersData as { followers_count?: number } | null)?.followers_count ||
      0,
    following_count:
      (followingData as { following_count?: number } | null)?.following_count ||
      0,
    is_following: !!(isFollowingData as { status?: string } | null)?.status,
    follow_status: (isFollowingData as { status?: string } | null)?.status as
      | 'accepted'
      | 'pending'
      | undefined,
    is_mutual_follow: false, // 後で実装
  };
}

// 活動統計取得関数
async function fetchUserActivityStats(
  userId: string
): Promise<UserActivityStats> {
  const results = await executeParallelQueries({
    /**
     * 撮影会開催統計取得関数
     */
    organizedSessions: {
      operation: 'fetchOrganizedSessionsCount',
      queryBuilder: supabase =>
        supabase
          .from('photo_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('organizer_id', userId),
      options: { detailed: false },
    },
    /**
     * 撮影会参加統計取得関数
     */
    participatedSessions: {
      operation: 'fetchParticipatedSessionsCount',
      queryBuilder: supabase =>
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'confirmed'),
      options: { detailed: false },
    },
    /**
     * レビュー統計取得関数
     */
    receivedReviews: {
      operation: 'fetchReceivedReviewsCount',
      queryBuilder: supabase =>
        supabase
          .from('user_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('reviewee_id', userId)
          .eq('status', 'published'),
      options: { detailed: false },
    },
    /**
     * 撮影会レビュー統計取得関数
     */
    sessionReviews: {
      operation: 'fetchSessionReviewsCount',
      queryBuilder: supabase =>
        supabase
          .from('photo_session_reviews')
          .select(
            'photo_sessions!photo_session_reviews_photo_session_id_fkey(*)',
            {
              count: 'exact',
              head: true,
            }
          )
          .eq('photo_sessions.organizer_id', userId)
          .eq('status', 'published'),
      options: { detailed: false },
    },
  });

  const {
    organizedSessions,
    participatedSessions,
    receivedReviews,
    sessionReviews,
  } = results;

  const organizedSessionsCount = (
    organizedSessions as { count?: number } | null
  )?.count;
  const participatedSessionsCount = (
    participatedSessions as { count?: number } | null
  )?.count;
  const receivedReviewsCount = (receivedReviews as { count?: number } | null)
    ?.count;
  const sessionReviewsCount = (sessionReviews as { count?: number } | null)
    ?.count;

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

/**
 * プロフィールページ用データ取得フック（並列実行）
 * プロフィール、フォロー統計、活動統計を並列で取得する
 */
export function useProfilePageData(userId: string, currentUserId: string) {
  const { data, error, isLoading } = useSWR(
    userId ? `profile-page-${userId}` : null,
    async () => {
      // 並列実行
      const [profile, followStats, activityStats] = await Promise.all([
        fetchProfile(userId),
        fetchFollowStats(userId, currentUserId),
        fetchUserActivityStats(userId),
      ]);

      return { profile, followStats, activityStats };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5分間重複防止
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  return {
    profile: data?.profile,
    followStats: data?.followStats,
    activityStats: data?.activityStats,
    isLoading,
    error,
  };
}
