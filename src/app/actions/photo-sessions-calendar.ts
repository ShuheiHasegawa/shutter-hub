'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export type PhotoSessionCalendarData = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  booking_type:
    | 'first_come'
    | 'lottery'
    | 'management'
    | 'priority'
    | 'waitlist';
  current_participants: number;
  max_participants: number;
  is_full: boolean;
};

export type PhotoSessionsCalendarResult = {
  success: boolean;
  data?: PhotoSessionCalendarData[];
  error?: string;
};

/**
 * ユーザーに関連する撮影会データを取得する（カレンダー表示用）
 */
export async function getPhotoSessionsForCalendar(
  userId: string,
  userType: 'model' | 'photographer' | 'organizer',
  startDate?: string,
  endDate?: string
): Promise<PhotoSessionsCalendarResult> {
  try {
    const supabase = await createClient();

    // 日付範囲のデフォルト値（現在月の前後1ヶ月）
    const now = new Date();
    const defaultStartDate =
      startDate ||
      new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const defaultEndDate =
      endDate ||
      new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

    let query = supabase
      .from('photo_sessions')
      .select(
        `
        id,
        title,
        start_time,
        end_time,
        booking_type,
        current_participants,
        max_participants,
        organizer_id
      `
      )
      .gte('start_time', defaultStartDate)
      .lte('start_time', defaultEndDate)
      .eq('is_published', true)
      .order('start_time', { ascending: true });

    // ユーザータイプに応じてフィルタリング
    if (userType === 'organizer') {
      // 主催者：自分が開催する撮影会
      query = query.eq('organizer_id', userId);
    } else {
      // モデル・フォトグラファー：参加予定or予約可能な撮影会
      // 将来的にはuser_bookingsテーブルとJOINして参加予定の撮影会も表示
    }

    const { data, error } = await query;

    if (error) {
      logger.error('撮影会カレンダーデータ取得エラー:', error);
      return {
        success: false,
        error: 'カレンダーデータの取得に失敗しました',
      };
    }

    // is_fullフラグを動的に計算
    const processedData: PhotoSessionCalendarData[] = (data || []).map(
      session => ({
        ...session,
        is_full: session.current_participants >= session.max_participants,
      })
    );

    logger.info('撮影会カレンダーデータ取得成功:', {
      userId,
      userType,
      sessionCount: processedData.length,
      dateRange: { startDate: defaultStartDate, endDate: defaultEndDate },
    });

    return {
      success: true,
      data: processedData,
    };
  } catch (error) {
    logger.error('撮影会カレンダーデータ取得エラー:', error);
    return {
      success: false,
      error: '予期しないエラーが発生しました',
    };
  }
}
