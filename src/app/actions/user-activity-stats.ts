'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import type {
  MonthlyActivityData,
  SessionTypeData,
  RatingTrendData,
} from '@/types/user-activity-stats';

/**
 * ユーザーの月別活動統計を取得する
 * 過去12ヶ月の撮影会参加・主催データを返す
 */
export async function getMonthlyActivityStats(
  userId: string
): Promise<MonthlyActivityData[]> {
  try {
    const supabase = await createClient();

    logger.info('[getMonthlyActivityStats] 月別活動統計取得開始', {
      userId,
    });

    const { data, error } = await supabase.rpc('get_monthly_activity_stats', {
      target_user_id: userId,
    });

    if (error) {
      logger.error('[getMonthlyActivityStats] PostgreSQL関数エラー', {
        error: error.message,
        userId,
      });
      throw new Error(`月別活動統計の取得に失敗しました: ${error.message}`);
    }

    if (!data) {
      logger.warn('[getMonthlyActivityStats] データなし', { userId });
      return [];
    }

    logger.info('[getMonthlyActivityStats] 月別活動統計取得成功', {
      userId,
      dataCount: data.length,
    });

    return data as MonthlyActivityData[];
  } catch (error) {
    logger.error('[getMonthlyActivityStats] 予期しないエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    throw new Error(
      '月別活動統計の取得中にエラーが発生しました。時間をおいて再試行してください。'
    );
  }
}

/**
 * ユーザーの撮影会タイプ分布を取得する
 * スタジオ・屋外・イベント等のタイプ別参加統計を返す
 */
export async function getSessionTypeDistribution(
  userId: string
): Promise<SessionTypeData[]> {
  try {
    const supabase = await createClient();

    logger.info('[getSessionTypeDistribution] タイプ分布統計取得開始', {
      userId,
    });

    const { data, error } = await supabase.rpc(
      'get_session_type_distribution',
      {
        target_user_id: userId,
      }
    );

    if (error) {
      logger.error('[getSessionTypeDistribution] PostgreSQL関数エラー', {
        error: error.message,
        userId,
      });
      throw new Error(`タイプ分布統計の取得に失敗しました: ${error.message}`);
    }

    if (!data) {
      logger.warn('[getSessionTypeDistribution] データなし', { userId });
      return [];
    }

    logger.info('[getSessionTypeDistribution] タイプ分布統計取得成功', {
      userId,
      dataCount: data.length,
    });

    return data as SessionTypeData[];
  } catch (error) {
    logger.error('[getSessionTypeDistribution] 予期しないエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    throw new Error(
      'タイプ分布統計の取得中にエラーが発生しました。時間をおいて再試行してください。'
    );
  }
}

/**
 * ユーザーの評価推移を取得する
 * 時系列での評価スコア変化データを返す
 */
export async function getRatingTrend(
  userId: string
): Promise<RatingTrendData[]> {
  try {
    const supabase = await createClient();

    logger.info('[getRatingTrend] 評価推移統計取得開始', {
      userId,
    });

    const { data, error } = await supabase.rpc('get_rating_trend', {
      target_user_id: userId,
    });

    if (error) {
      logger.error('[getRatingTrend] PostgreSQL関数エラー', {
        error: error.message,
        userId,
      });
      throw new Error(`評価推移統計の取得に失敗しました: ${error.message}`);
    }

    if (!data) {
      logger.warn('[getRatingTrend] データなし', { userId });
      return [];
    }

    logger.info('[getRatingTrend] 評価推移統計取得成功', {
      userId,
      dataCount: data.length,
    });

    return data as RatingTrendData[];
  } catch (error) {
    logger.error('[getRatingTrend] 予期しないエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    throw new Error(
      '評価推移統計の取得中にエラーが発生しました。時間をおいて再試行してください。'
    );
  }
}

/**
 * ユーザーの包括的な活動統計を一括取得する
 * パフォーマンス最適化のため、複数の統計を並行取得
 */
export async function getComprehensiveActivityStats(userId: string) {
  try {
    logger.info('[getComprehensiveActivityStats] 包括統計取得開始', {
      userId,
    });

    // 並行でデータ取得（パフォーマンス最適化）
    const [monthlyData, typeData, ratingData] = await Promise.allSettled([
      getMonthlyActivityStats(userId),
      getSessionTypeDistribution(userId),
      getRatingTrend(userId),
    ]);

    const result = {
      monthlyActivity:
        monthlyData.status === 'fulfilled' ? monthlyData.value : [],
      sessionTypes: typeData.status === 'fulfilled' ? typeData.value : [],
      ratingTrend: ratingData.status === 'fulfilled' ? ratingData.value : [],
      errors: [] as string[],
    };

    // エラーのチェックと記録
    if (monthlyData.status === 'rejected') {
      logger.error('[getComprehensiveActivityStats] 月別統計エラー', {
        error: monthlyData.reason,
        userId,
      });
      result.errors.push('月別活動統計の取得に失敗しました');
    }

    if (typeData.status === 'rejected') {
      logger.error('[getComprehensiveActivityStats] タイプ分布エラー', {
        error: typeData.reason,
        userId,
      });
      result.errors.push('タイプ分布統計の取得に失敗しました');
    }

    if (ratingData.status === 'rejected') {
      logger.error('[getComprehensiveActivityStats] 評価推移エラー', {
        error: ratingData.reason,
        userId,
      });
      result.errors.push('評価推移統計の取得に失敗しました');
    }

    logger.info('[getComprehensiveActivityStats] 包括統計取得完了', {
      userId,
      hasMonthlyData: result.monthlyActivity.length > 0,
      hasTypeData: result.sessionTypes.length > 0,
      hasRatingData: result.ratingTrend.length > 0,
      errorCount: result.errors.length,
    });

    return result;
  } catch (error) {
    logger.error('[getComprehensiveActivityStats] 予期しないエラー', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    throw new Error(
      '活動統計の取得中にエラーが発生しました。時間をおいて再試行してください。'
    );
  }
}
