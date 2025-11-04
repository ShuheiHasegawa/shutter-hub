'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

/**
 * ユーザーが悪い評価を受けているかチェックする
 * 主催として評価された撮影会は除外
 *
 * @param userId チェック対象のユーザーID
 * @param photoSessionId チェック対象の撮影会ID（主催として評価された撮影会を除外するため）
 * @returns 悪い評価がある場合はtrue、ない場合はfalse
 */
export async function checkUserHasBadRating(
  userId: string,
  photoSessionId: string
): Promise<{
  success: boolean;
  hasBadRating: boolean;
  error?: string;
}> {
  try {
    logger.info('checkUserHasBadRating called', { userId, photoSessionId });
    const supabase = await createClient();

    // 撮影会の主催者IDを取得
    const { data: photoSession, error: sessionError } = await supabase
      .from('photo_sessions')
      .select('organizer_id')
      .eq('id', photoSessionId)
      .single();

    if (sessionError || !photoSession) {
      logger.error('撮影会取得エラー:', sessionError);
      return {
        success: false,
        hasBadRating: false,
        error: '撮影会情報の取得に失敗しました',
      };
    }

    // 1. user_reviewsテーブルで悪い評価をチェック
    // 主催として評価された撮影会は除外（reviewee_role = 'organizer'の場合は対象外）
    // ただし、参加者同士の相互評価は含む
    const { data: userReviews, error: userReviewsError } = await supabase
      .from('user_reviews')
      .select('id, photo_session_id, reviewee_role')
      .eq('reviewee_id', userId)
      .eq('overall_rating', 1) // 1 = bad
      .eq('status', 'published')
      .not('photo_session_id', 'is', null);

    if (userReviewsError) {
      logger.error('user_reviews取得エラー:', userReviewsError);
      return {
        success: false,
        hasBadRating: false,
        error: '評価情報の取得に失敗しました',
      };
    }

    // 主催として評価された撮影会を除外（reviewee_role = 'organizer'の場合は除外）
    const badUserReviews =
      userReviews?.filter(review => {
        // 主催として評価された場合は除外
        if (review.reviewee_role === 'organizer') {
          return false;
        }
        return true;
      }) || [];

    if (badUserReviews.length > 0) {
      logger.info('悪い評価あり（user_reviews）', {
        userId,
        badReviewCount: badUserReviews.length,
      });
      return {
        success: true,
        hasBadRating: true,
      };
    }

    // 2. photo_session_reviewsテーブルで悪い評価をチェック
    // photo_session_reviewsは撮影会への評価で、評価される側は主催者
    // ユーザーが主催者として受けた悪い評価をチェック
    // まず、ユーザーが主催者である撮影会のIDを取得（チェック対象の撮影会は除外）
    const { data: userOrganizedSessions, error: sessionsError } = await supabase
      .from('photo_sessions')
      .select('id')
      .eq('organizer_id', userId)
      .neq('id', photoSessionId); // チェック対象の撮影会は除外

    if (sessionsError) {
      logger.error('主催撮影会取得エラー:', sessionsError);
      return {
        success: false,
        hasBadRating: false,
        error: '評価情報の取得に失敗しました',
      };
    }

    // ユーザーが主催者である撮影会への悪い評価をチェック
    if (userOrganizedSessions && userOrganizedSessions.length > 0) {
      const sessionIds = userOrganizedSessions.map(s => s.id);
      const { data: sessionReviews, error: sessionReviewsError } =
        await supabase
          .from('photo_session_reviews')
          .select('id')
          .in('photo_session_id', sessionIds)
          .eq('overall_rating', 1) // 1 = bad
          .eq('status', 'published')
          .limit(1); // 1件でもあれば十分

      if (sessionReviewsError) {
        logger.error('photo_session_reviews取得エラー:', sessionReviewsError);
        return {
          success: false,
          hasBadRating: false,
          error: '評価情報の取得に失敗しました',
        };
      }

      if (sessionReviews && sessionReviews.length > 0) {
        logger.info('悪い評価あり（photo_session_reviews）', {
          userId,
          badReviewCount: sessionReviews.length,
        });
        return {
          success: true,
          hasBadRating: true,
        };
      }
    }

    logger.info('悪い評価なし', { userId });
    return {
      success: true,
      hasBadRating: false,
    };
  } catch (error) {
    logger.error('checkUserHasBadRating実行エラー:', error);
    return {
      success: false,
      hasBadRating: false,
      error: '予期しないエラーが発生しました',
    };
  }
}
