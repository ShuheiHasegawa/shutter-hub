'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export interface DashboardStats {
  // 共通統計
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  averageRating: number;
  totalReviews: number;

  // ユーザータイプ別統計
  userTypeStats: {
    // モデル向け
    participatedSessions?: number;
    invitationsReceived?: number;

    // フォトグラファー向け
    instantRequestsCount?: number;
    monthlyEarnings?: number;

    // 主催者向け
    organizedSessions?: number;
    totalParticipants?: number;
    avgSessionRating?: number;
  };

  // 月次トレンド
  monthlyTrend: {
    sessions: number;
    earnings?: number;
    month: string;
  }[];
}

export interface RecentActivity {
  id: string;
  type: 'booking' | 'review' | 'payment' | 'session_created' | 'invitation';
  title: string;
  description: string;
  timestamp: string;
  relatedId?: string;
  status?: string;
}

export interface UpcomingEvent {
  id: string;
  type: 'photo_session' | 'instant_request';
  title: string;
  startTime: string;
  location?: string;
  organizerName?: string;
  participantsCount?: number;
  status: string;
}

export async function getDashboardStats(
  userId: string,
  userType: string
): Promise<{
  success: boolean;
  data?: DashboardStats;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // 基本統計の並行取得
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalSessions = 0;
    let upcomingSessions = 0;
    let completedSessions = 0;
    let userTypeStats = {};

    if (userType === 'organizer') {
      // 主催者の統計
      const [
        { data: sessions },
        { data: upcoming },
        { data: completed },
        { data: participants },
      ] = await Promise.all([
        supabase.from('photo_sessions').select('*').eq('organizer_id', userId),
        supabase
          .from('photo_sessions')
          .select('*')
          .eq('organizer_id', userId)
          .gte('start_time', now.toISOString()),
        supabase
          .from('photo_sessions')
          .select('*')
          .eq('organizer_id', userId)
          .lt('end_time', now.toISOString()),
        supabase
          .from('bookings')
          .select('*, photo_session:photo_sessions!inner(*)')
          .eq('photo_sessions.organizer_id', userId)
          .eq('status', 'confirmed'),
      ]);

      totalSessions = sessions?.length || 0;
      upcomingSessions = upcoming?.length || 0;
      completedSessions = completed?.length || 0;

      userTypeStats = {
        organizedSessions: totalSessions,
        totalParticipants: participants?.length || 0,
      };
    } else if (userType === 'photographer') {
      // フォトグラファーの統計
      const [
        { data: instantRequests },
        { data: _thisMonthRequests },
        { data: participatedSessions },
      ] = await Promise.all([
        supabase
          .from('instant_photo_requests')
          .select('*')
          .eq('photographer_id', userId),
        supabase
          .from('instant_photo_requests')
          .select('*')
          .eq('photographer_id', userId)
          .gte('created_at', thisMonth.toISOString()),
        supabase
          .from('bookings')
          .select('*, photo_session:photo_sessions(*)')
          .eq('user_id', userId)
          .eq('status', 'confirmed'),
      ]);

      totalSessions = participatedSessions?.length || 0;
      upcomingSessions =
        participatedSessions?.filter(
          b => b.photo_session && new Date(b.photo_session.start_time) > now
        ).length || 0;
      completedSessions =
        participatedSessions?.filter(
          b => b.photo_session && new Date(b.photo_session.end_time) < now
        ).length || 0;

      userTypeStats = {
        instantRequestsCount: instantRequests?.length || 0,
        monthlyEarnings: 0, // TODO: 支払いデータから算出
      };
    } else {
      // モデルの統計
      const [{ data: participatedSessions }, { data: invitations }] =
        await Promise.all([
          supabase
            .from('bookings')
            .select('*, photo_session:photo_sessions(*)')
            .eq('user_id', userId)
            .eq('status', 'confirmed'),
          supabase.from('model_invitations').select('*').eq('model_id', userId),
        ]);

      totalSessions = participatedSessions?.length || 0;
      upcomingSessions =
        participatedSessions?.filter(
          b => b.photo_session && new Date(b.photo_session.start_time) > now
        ).length || 0;
      completedSessions =
        participatedSessions?.filter(
          b => b.photo_session && new Date(b.photo_session.end_time) < now
        ).length || 0;

      userTypeStats = {
        participatedSessions: totalSessions,
        invitationsReceived: invitations?.length || 0,
      };
    }

    // レビュー統計を取得
    const { data: reviews } = await supabase
      .from('photo_session_reviews')
      .select('rating')
      .eq(userType === 'organizer' ? 'organizer_id' : 'model_id', userId);

    const averageRating =
      reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // 月次トレンドデータ（簡易版）
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        month: month.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'short',
        }),
        sessions: Math.floor((Math.random() * totalSessions) / 3), // TODO: 実際のデータで置き換え
      };
    }).reverse();

    return {
      success: true,
      data: {
        totalSessions,
        upcomingSessions,
        completedSessions,
        averageRating,
        totalReviews: reviews?.length || 0,
        userTypeStats,
        monthlyTrend,
      },
    };
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    return {
      success: false,
      error: 'ダッシュボード統計の取得に失敗しました',
    };
  }
}

export async function getRecentActivity(
  userId: string,
  userType: string
): Promise<{
  success: boolean;
  data?: RecentActivity[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const activities: RecentActivity[] = [];

    // 最近の予約
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select(
        '*, photo_session:photo_sessions(title, organizer:profiles(display_name))'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    recentBookings?.forEach(booking => {
      activities.push({
        id: booking.id,
        type: 'booking',
        title: '新しい予約',
        description: `「${booking.photo_session?.title}」に予約しました`,
        timestamp: booking.created_at,
        relatedId: booking.photo_session_id,
        status: booking.status,
      });
    });

    // 最近のレビュー（受け取った分）
    const { data: recentReviews } = await supabase
      .from('photo_session_reviews')
      .select(
        '*, photo_session:photo_sessions(title), reviewer:profiles(display_name)'
      )
      .eq(userType === 'organizer' ? 'organizer_id' : 'model_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    recentReviews?.forEach(review => {
      activities.push({
        id: review.id,
        type: 'review',
        title: '新しいレビュー',
        description: `「${review.photo_session?.title}」にレビューが投稿されました`,
        timestamp: review.created_at,
        relatedId: review.photo_session_id,
      });
    });

    // 主催者の場合：最近作成したフォトセッション
    if (userType === 'organizer') {
      const { data: recentSessions } = await supabase
        .from('photo_sessions')
        .select('*')
        .eq('organizer_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      recentSessions?.forEach(session => {
        activities.push({
          id: session.id,
          type: 'session_created',
          title: 'フォトセッション作成',
          description: `「${session.title}」を作成しました`,
          timestamp: session.created_at,
          relatedId: session.id,
        });
      });
    }

    // 活動を時間順でソート
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      success: true,
      data: activities.slice(0, 10), // 最新10件
    };
  } catch (error) {
    logger.error('Recent activity error:', error);
    return {
      success: false,
      error: '最近のアクティビティの取得に失敗しました',
    };
  }
}

export async function getUpcomingEvents(
  userId: string,
  userType: string
): Promise<{
  success: boolean;
  data?: UpcomingEvent[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const events: UpcomingEvent[] = [];
    const now = new Date();

    // 今後のフォトセッション（参加者として）
    const { data: upcomingBookings } = await supabase
      .from('bookings')
      .select(
        `
        *,
        photo_session:photo_sessions(
          id,
          title,
          start_time,
          location,
          organizer:profiles(display_name)
        )
      `
      )
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .gte('photo_sessions.start_time', now.toISOString())
      .order('photo_sessions.start_time', { ascending: true })
      .limit(5);

    upcomingBookings?.forEach(booking => {
      if (booking.photo_session) {
        events.push({
          id: booking.id,
          type: 'photo_session',
          title: booking.photo_session.title,
          startTime: booking.photo_session.start_time,
          location: booking.photo_session.location,
          organizerName: booking.photo_session.organizer?.display_name,
          status: booking.status,
        });
      }
    });

    // 主催者の場合：主催予定のフォトセッション
    if (userType === 'organizer') {
      const { data: hostingSessions } = await supabase
        .from('photo_sessions')
        .select(
          `
          *,
          bookings(*)
        `
        )
        .eq('organizer_id', userId)
        .gte('start_time', now.toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      hostingSessions?.forEach(session => {
        events.push({
          id: session.id,
          type: 'photo_session',
          title: `主催: ${session.title}`,
          startTime: session.start_time,
          location: session.location,
          participantsCount: session.bookings?.length || 0,
          status: 'hosting',
        });
      });
    }

    // イベントを時間順でソート
    events.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return {
      success: true,
      data: events.slice(0, 5), // 最新5件
    };
  } catch (error) {
    logger.error('Upcoming events error:', error);
    return {
      success: false,
      error: '今後の予定の取得に失敗しました',
    };
  }
}
