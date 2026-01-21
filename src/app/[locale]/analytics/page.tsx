'use client';

import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { getProfile } from '@/lib/auth/profile';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  DollarSign,
  Camera,
  Calendar,
  Star,
  Activity,
  MapPin,
  Heart,
  Award,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { FormattedPrice } from '@/components/ui/formatted-display';
import { StatsCard } from '@/components/analytics/StatsCard';
import { DetailStatsCard } from '@/components/analytics/DetailStatsCard';
import { LocationStats } from '@/components/analytics/LocationStats';
import { useTranslations } from 'next-intl';

interface Profile {
  id: string;
  email: string;
  display_name: string;
  user_type: 'model' | 'photographer' | 'organizer';
  avatar_url: string;
  bio: string;
  location: string;
  is_verified: boolean;
}

interface UserStats {
  totalSessions: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  thisMonthSessions: number;
  thisMonthEarnings: number;
  popularLocations: Array<{ location: string; count: number }>;
  monthlyTrend: Array<{ month: string; count: number; earnings: number }>;
  topRatedSessions: Array<{ title: string; rating: number; date: string }>;
  upcomingSessions: number;
  completedSessions: number;
  cancelledSessions: number;
}

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'ja';
  const t = useTranslations('analytics');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadUserStats = async (
    supabase: SupabaseClient,
    userId: string,
    userType: string,
    user?: { user_metadata?: { language?: string; timezone?: string } }
  ): Promise<UserStats> => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 基本統計
    let totalSessions = 0;
    let totalEarnings = 0;
    let thisMonthSessions = 0;
    let thisMonthEarnings = 0;
    let upcomingSessions = 0;
    let completedSessions = 0;
    let cancelledSessions = 0;

    if (userType === 'organizer') {
      // 運営者の統計
      const { data: sessions } = await supabase
        .from('photo_sessions')
        .select('*')
        .eq('organizer_id', userId);

      const { data: thisMonthSessionsData } = await supabase
        .from('photo_sessions')
        .select('*')
        .eq('organizer_id', userId)
        .gte('created_at', thisMonth.toISOString());

      totalSessions = sessions?.length || 0;
      thisMonthSessions = thisMonthSessionsData?.length || 0;

      // 収益計算（参加者数 × 料金）
      if (sessions) {
        totalEarnings = sessions.reduce(
          (sum, session) =>
            sum +
            session.current_participants * (session.price_per_person || 0),
          0
        );
      }

      if (thisMonthSessionsData) {
        thisMonthEarnings = thisMonthSessionsData.reduce(
          (sum, session) =>
            sum +
            session.current_participants * (session.price_per_person || 0),
          0
        );
      }

      // ステータス別セッション数
      upcomingSessions =
        sessions?.filter(s => new Date(s.start_time) > now).length || 0;
      completedSessions =
        sessions?.filter(s => new Date(s.end_time) < now).length || 0;
    } else if (userType === 'photographer') {
      // カメラマンの統計（即座撮影含む）
      const { data: instantBookings } = await supabase
        .from('instant_bookings')
        .select('*')
        .eq('photographer_id', userId);

      const { data: thisMonthBookings } = await supabase
        .from('instant_bookings')
        .select('*')
        .eq('photographer_id', userId)
        .gte('created_at', thisMonth.toISOString());

      totalSessions = instantBookings?.length || 0;
      thisMonthSessions = thisMonthBookings?.length || 0;

      if (instantBookings) {
        totalEarnings = instantBookings.reduce(
          (sum, booking) => sum + (booking.photographer_amount || 0),
          0
        );
      }

      if (thisMonthBookings) {
        thisMonthEarnings = thisMonthBookings.reduce(
          (sum, booking) => sum + (booking.photographer_amount || 0),
          0
        );
      }

      completedSessions =
        instantBookings?.filter(b => b.status === 'completed').length || 0;
      cancelledSessions =
        instantBookings?.filter(b => b.status === 'cancelled').length || 0;
    } else {
      // モデルの統計
      const { data: bookings } = await supabase
        .from('photo_session_participants')
        .select(
          `
          *,
          photo_session:photo_sessions(*)
        `
        )
        .eq('user_id', userId);

      const { data: thisMonthBookings } = await supabase
        .from('photo_session_participants')
        .select(
          `
          *,
          photo_session:photo_sessions(*)
        `
        )
        .eq('user_id', userId)
        .gte('created_at', thisMonth.toISOString());

      totalSessions = bookings?.length || 0;
      thisMonthSessions = thisMonthBookings?.length || 0;

      upcomingSessions =
        bookings?.filter(
          b => b.photo_session && new Date(b.photo_session.start_time) > now
        ).length || 0;

      completedSessions =
        bookings?.filter(
          b => b.photo_session && new Date(b.photo_session.end_time) < now
        ).length || 0;

      cancelledSessions =
        bookings?.filter(b => b.status === 'cancelled').length || 0;
    }

    // レビュー統計
    const { data: reviews } = await supabase
      .from('photo_session_reviews')
      .select('rating')
      .eq(
        userType === 'organizer'
          ? 'organizer_id'
          : userType === 'photographer'
            ? 'photographer_id'
            : 'model_id',
        userId
      );

    const averageRating =
      reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // 人気の場所
    const popularLocations = [
      { location: '東京都', count: Math.floor(totalSessions * 0.4) },
      { location: '大阪府', count: Math.floor(totalSessions * 0.3) },
      { location: '神奈川県', count: Math.floor(totalSessions * 0.2) },
    ];

    // 月次トレンド（仮データ）
    const userLocale =
      user?.user_metadata?.language === 'en' ? 'en-US' : 'ja-JP';
    const userTimezone = user?.user_metadata?.timezone || 'Asia/Tokyo';
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        month: new Intl.DateTimeFormat(userLocale, {
          year: 'numeric',
          month: 'short',
          timeZone: userTimezone,
        }).format(date),
        count: Math.max(0, totalSessions - i * 2),
        earnings: Math.max(0, totalEarnings - i * 5000),
      };
    }).reverse();

    return {
      totalSessions,
      totalEarnings,
      averageRating,
      totalReviews: reviews?.length || 0,
      thisMonthSessions,
      thisMonthEarnings,
      popularLocations,
      monthlyTrend,
      topRatedSessions: [],
      upcomingSessions,
      completedSessions,
      cancelledSessions,
    };
  };

  const loadProfileAndStats = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await getProfile(
        user.id
      );

      if (profileError) {
        logger.error('プロフィール取得エラー:', profileError);
        return;
      }

      setProfile(profileData);

      // 統計データを取得
      const supabase = createClient();
      const statsData = await loadUserStats(
        supabase,
        user.id,
        profileData.user_type,
        user
      );
      setStats(statsData);
    } catch (error) {
      logger.error('データ取得エラー:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/auth/signin`);
      return;
    }

    if (user) {
      loadProfileAndStats();
    }
  }, [user, loading, router, locale, loadProfileAndStats]);

  if (loading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>統計データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile || !stats) {
    return (
      <AuthenticatedLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>データの読み込みに失敗しました</AlertDescription>
        </Alert>
      </AuthenticatedLayout>
    );
  }

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'model':
        return 'モデル';
      case 'photographer':
        return 'フォトグラファー';
      case 'organizer':
        return '主催者';
      default:
        return userType;
    }
  };

  const renderOrganizerStats = () => (
    <>
      {/* 運営者向け統計 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8">
        <StatsCard
          label="総撮影会数"
          value={stats.totalSessions}
          subValue={`${t('thisMonth')}: ${stats.thisMonthSessions}件`}
          icon={Camera}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          label="総収益"
          value={stats.totalEarnings}
          subValue={stats.thisMonthEarnings}
          subValueLabel={t('thisMonth')}
          icon={DollarSign}
          iconBgColor="bg-success/10"
          iconColor="text-success"
          showPrice={true}
        />
        <StatsCard
          label="平均評価"
          value={stats.averageRating}
          icon={Star}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          showStars={true}
          rating={stats.averageRating}
        />
        <StatsCard
          label="予定撮影会"
          value={stats.upcomingSessions}
          subValue={`${t('completed')}: ${stats.completedSessions}件`}
          icon={Calendar}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
      </div>

      {/* 運営者向け詳細統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <DetailStatsCard
          title="撮影会ステータス"
          items={[
            {
              label: '予定',
              value: stats.upcomingSessions,
              total: stats.totalSessions,
            },
            {
              label: '完了',
              value: stats.completedSessions,
              total: stats.totalSessions,
            },
          ]}
        />
        <LocationStats
          title="人気エリア"
          locations={stats.popularLocations}
          unit="件"
        />
      </div>
    </>
  );

  const renderPhotographerStats = () => (
    <>
      {/* カメラマン向け統計 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8">
        <StatsCard
          label="撮影回数"
          value={stats.totalSessions}
          subValue={`${t('thisMonth')}: ${stats.thisMonthSessions}回`}
          icon={Camera}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          label="総収入"
          value={stats.totalEarnings}
          subValue={stats.thisMonthEarnings}
          subValueLabel={t('thisMonth')}
          icon={DollarSign}
          iconBgColor="bg-success/10"
          iconColor="text-success"
          showPrice={true}
        />
        <StatsCard
          label="顧客評価"
          value={stats.averageRating}
          subValue={`${stats.totalReviews}${t('reviews')}`}
          icon={Star}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          showStars={true}
          rating={stats.averageRating}
        />
        <StatsCard
          label="完了率"
          value={
            stats.totalSessions > 0
              ? Math.round(
                  (stats.completedSessions / stats.totalSessions) * 100
                )
              : 0
          }
          subValue={`${t('completed')}: ${stats.completedSessions}件`}
          icon={Activity}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* カメラマン向け詳細統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <DetailStatsCard
          title="撮影パフォーマンス"
          items={[
            {
              label: '完了した撮影',
              value: stats.completedSessions,
              total: stats.totalSessions,
              color: 'success',
            },
            {
              label: 'キャンセル',
              value: stats.cancelledSessions,
              total: stats.totalSessions,
              color: 'error',
            },
            {
              label: '平均収入/回',
              value:
                stats.totalSessions > 0
                  ? Math.round(stats.totalEarnings / stats.totalSessions)
                  : 0,
              total: stats.totalSessions,
              showPrice: true,
            },
          ]}
        />
        <LocationStats
          title="活動エリア"
          locations={stats.popularLocations}
          icon={MapPin}
          unit="回"
        />
      </div>
    </>
  );

  const renderModelStats = () => (
    <>
      {/* モデル向け統計 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8">
        <StatsCard
          label="参加撮影会"
          value={stats.totalSessions}
          subValue={`${t('thisMonth')}: ${stats.thisMonthSessions}回`}
          icon={Camera}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          label="評価"
          value={stats.averageRating}
          icon={Star}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          showStars={true}
          rating={stats.averageRating}
        />
        <StatsCard
          label="予定撮影会"
          value={stats.upcomingSessions}
          subValue="今後の参加予定"
          icon={Calendar}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          label="完了率"
          value={
            stats.totalSessions > 0
              ? Math.round(
                  (stats.completedSessions / stats.totalSessions) * 100
                )
              : 0
          }
          subValue={`${t('completed')}: ${stats.completedSessions}回`}
          icon={Award}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* モデル向け詳細統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <DetailStatsCard
          title="撮影会参加状況"
          items={[
            {
              label: '予定',
              value: stats.upcomingSessions,
              total: stats.totalSessions,
              color: 'info',
            },
            {
              label: '完了',
              value: stats.completedSessions,
              total: stats.totalSessions,
              color: 'success',
            },
            {
              label: 'キャンセル',
              value: stats.cancelledSessions,
              total: stats.totalSessions,
              color: 'error',
            },
          ]}
        />
        <LocationStats
          title="活動エリア"
          locations={stats.popularLocations}
          icon={Heart}
          unit="回"
        />
      </div>
    </>
  );

  return (
    <AuthenticatedLayout>
      <PageTitleHeader
        title="統計・分析"
        icon={<BarChart3 className="h-6 w-6" />}
      />
      <div className="space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm">
            {getUserTypeLabel(profile.user_type)}
          </Badge>
        </div>

        {/* ユーザータイプ別統計表示 */}
        {profile.user_type === 'organizer' && renderOrganizerStats()}
        {profile.user_type === 'photographer' && renderPhotographerStats()}
        {profile.user_type === 'model' && renderModelStats()}

        {/* 月次トレンド（共通） */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              月次トレンド
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.monthlyTrend.map(month => (
                <div
                  key={month.month}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{month.month}</Badge>
                    <div>
                      <div className="font-medium">{month.count}件</div>
                      {profile.user_type !== 'model' && (
                        <div className="text-sm text-muted-foreground">
                          <FormattedPrice
                            value={month.earnings}
                            format="simple"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${Math.min((month.count / Math.max(...stats.monthlyTrend.map(m => m.count))) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
