import useSWR from 'swr';
import {
  getMonthlyActivityStats,
  getSessionTypeDistribution,
  getRatingTrend,
  getComprehensiveActivityStats,
} from '@/app/actions/user-activity-stats';
import type {
  MonthlyActivityData,
  SessionTypeData,
  RatingTrendData,
} from '@/types/user-activity-stats';

/**
 * ユーザーの月別活動統計を取得するSWRフック
 */
export function useMonthlyActivityStats(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `monthly-activity-${userId}` : null,
    () => getMonthlyActivityStats(userId),
    {
      // 5分間キャッシュ（統計データは頻繁に変わらない）
      dedupingInterval: 300000,
      // フォーカス時の再取得を無効化（統計データは安定）
      revalidateOnFocus: false,
      // 初回取得時のみエラーリトライ
      errorRetryCount: 1,
      // ネットワーク復帰時の再取得
      revalidateOnReconnect: true,
    }
  );

  return {
    monthlyData: data || [],
    error,
    isLoading,
    refresh: mutate,
  };
}

/**
 * ユーザーの撮影会タイプ分布を取得するSWRフック
 */
export function useSessionTypeDistribution(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `session-types-${userId}` : null,
    () => getSessionTypeDistribution(userId),
    {
      dedupingInterval: 300000,
      revalidateOnFocus: false,
      errorRetryCount: 1,
      revalidateOnReconnect: true,
    }
  );

  return {
    typeData: data || [],
    error,
    isLoading,
    refresh: mutate,
  };
}

/**
 * ユーザーの評価推移を取得するSWRフック
 */
export function useRatingTrend(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `rating-trend-${userId}` : null,
    () => getRatingTrend(userId),
    {
      dedupingInterval: 300000,
      revalidateOnFocus: false,
      errorRetryCount: 1,
      revalidateOnReconnect: true,
    }
  );

  return {
    ratingData: data || [],
    error,
    isLoading,
    refresh: mutate,
  };
}

/**
 * ユーザーの包括的な活動統計を取得するSWRフック
 * パフォーマンス最適化のため、一括でデータを取得
 */
export function useComprehensiveActivityStats(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `comprehensive-stats-${userId}` : null,
    () => getComprehensiveActivityStats(userId),
    {
      dedupingInterval: 300000,
      revalidateOnFocus: false,
      errorRetryCount: 1,
      revalidateOnReconnect: true,
    }
  );

  return {
    stats: data || {
      monthlyActivity: [] as MonthlyActivityData[],
      sessionTypes: [] as SessionTypeData[],
      ratingTrend: [] as RatingTrendData[],
      errors: [] as string[],
    },
    error,
    isLoading,
    refresh: mutate,
  };
}

/**
 * すべての統計データを個別のフックで取得
 * 段階的ローディングを行いたい場合に使用
 */
export function useAllActivityCharts(userId: string) {
  const monthlyStats = useMonthlyActivityStats(userId);
  const typeStats = useSessionTypeDistribution(userId);
  const ratingStats = useRatingTrend(userId);

  const isAnyLoading =
    monthlyStats.isLoading || typeStats.isLoading || ratingStats.isLoading;
  const hasAnyError =
    monthlyStats.error || typeStats.error || ratingStats.error;

  return {
    monthlyData: monthlyStats.monthlyData,
    typeData: typeStats.typeData,
    ratingData: ratingStats.ratingData,
    isLoading: isAnyLoading,
    error: hasAnyError,
    refreshAll: () => {
      monthlyStats.refresh();
      typeStats.refresh();
      ratingStats.refresh();
    },
  };
}
