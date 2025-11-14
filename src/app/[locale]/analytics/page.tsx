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
import { Progress } from '@/components/ui/progress';
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
        <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  総撮影会数
                </p>
                <div className="p-1.5 md:p-2 rounded-lg bg-blue-100 flex-shrink-0">
                  <Camera className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />
                </div>
              </div>
              <div className="flex flex-col space-y-0.5">
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                  {stats.totalSessions}
                </p>
                <p className="text-xs text-muted-foreground">
                  今月: {stats.thisMonthSessions}件
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  総収益
                </p>
                <div className="p-1.5 md:p-2 rounded-lg bg-emerald-100 flex-shrink-0">
                  <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                </div>
              </div>
              <div className="flex flex-col space-y-0.5">
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                  <FormattedPrice value={stats.totalEarnings} format="simple" />
                </p>
                <p className="text-xs text-muted-foreground">
                  今月:{' '}
                  <FormattedPrice
                    value={stats.thisMonthEarnings}
                    format="simple"
                  />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  平均評価
                </p>
                <div className="p-1.5 md:p-2 rounded-lg bg-yellow-100 flex-shrink-0">
                  <Star className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600" />
                </div>
              </div>
              <div className="flex flex-col space-y-0.5">
                <div className="flex items-baseline space-x-0.5">
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                    {stats.averageRating.toFixed(1)}
                  </p>
                  <span className="text-xs md:text-sm text-muted-foreground">
                    /5.0
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`h-2.5 w-2.5 ${
                        star <= stats.averageRating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  予定撮影会
                </p>
                <div className="p-1.5 md:p-2 rounded-lg bg-green-100 flex-shrink-0">
                  <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600" />
                </div>
              </div>
              <div className="flex flex-col space-y-0.5">
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                  {stats.upcomingSessions}
                </p>
                <p className="text-xs text-muted-foreground">
                  完了: {stats.completedSessions}件
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 運営者向け詳細統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>撮影会ステータス</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>予定</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.upcomingSessions}</span>
                  <Progress
                    value={(stats.upcomingSessions / stats.totalSessions) * 100}
                    className="w-20"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>完了</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.completedSessions}</span>
                  <Progress
                    value={
                      (stats.completedSessions / stats.totalSessions) * 100
                    }
                    className="w-20"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>人気エリア</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.popularLocations.map((location, index) => (
                <div
                  key={location.location}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span>{location.location}</span>
                  </div>
                  <span className="font-bold">{location.count}件</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderPhotographerStats = () => (
    <>
      {/* カメラマン向け統計 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8">
        <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  撮影回数
                </p>
                <div className="p-1.5 md:p-2 rounded-lg bg-blue-100 flex-shrink-0">
                  <Camera className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />
                </div>
              </div>
              <div className="flex flex-col space-y-0.5">
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                  {stats.totalSessions}
                </p>
                <p className="text-xs text-muted-foreground">
                  今月: {stats.thisMonthSessions}回
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  総収入
                </p>
                <div className="p-1.5 md:p-2 rounded-lg bg-emerald-100 flex-shrink-0">
                  <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                </div>
              </div>
              <div className="flex flex-col space-y-0.5">
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                  <FormattedPrice value={stats.totalEarnings} format="simple" />
                </p>
                <p className="text-xs text-muted-foreground">
                  今月:{' '}
                  <FormattedPrice
                    value={stats.thisMonthEarnings}
                    format="simple"
                  />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  顧客評価
                </p>
                <div className="p-1.5 md:p-2 rounded-lg bg-yellow-100 flex-shrink-0">
                  <Star className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600" />
                </div>
              </div>
              <div className="flex flex-col space-y-0.5">
                <div className="flex items-baseline space-x-0.5">
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                    {stats.averageRating.toFixed(1)}
                  </p>
                  <span className="text-xs md:text-sm text-muted-foreground">
                    /5.0
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalReviews}件のレビュー
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  完了率
                </p>
                <div className="p-1.5 md:p-2 rounded-lg bg-purple-100 flex-shrink-0">
                  <Activity className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-600" />
                </div>
              </div>
              <div className="flex flex-col space-y-0.5">
                <div className="flex items-baseline space-x-0.5">
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                    {stats.totalSessions > 0
                      ? Math.round(
                          (stats.completedSessions / stats.totalSessions) * 100
                        )
                      : 0}
                  </p>
                  <span className="text-xs md:text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  完了: {stats.completedSessions}件
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* カメラマン向け詳細統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>撮影パフォーマンス</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>完了した撮影</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-success">
                    {stats.completedSessions}
                  </span>
                  <Progress
                    value={
                      (stats.completedSessions / stats.totalSessions) * 100
                    }
                    className="w-20"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>キャンセル</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-error">
                    {stats.cancelledSessions}
                  </span>
                  <Progress
                    value={
                      (stats.cancelledSessions / stats.totalSessions) * 100
                    }
                    className="w-20"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>平均収入/回</span>
                <span className="font-bold">
                  <FormattedPrice
                    value={
                      stats.totalSessions > 0
                        ? Math.round(stats.totalEarnings / stats.totalSessions)
                        : 0
                    }
                    format="simple"
                  />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>活動エリア</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.popularLocations.map(location => (
                <div
                  key={location.location}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{location.location}</span>
                  </div>
                  <span className="font-bold">{location.count}回</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderModelStats = () => (
    <>
      {/* モデル向け統計 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8">
        <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  参加撮影会
                </p>
                <div className="p-1.5 md:p-2 rounded-lg bg-blue-100 flex-shrink-0">
                  <Camera className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />
                </div>
              </div>
              <div className="flex flex-col space-y-0.5">
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                  {stats.totalSessions}
                </p>
                <p className="text-xs text-muted-foreground">
                  今月: {stats.thisMonthSessions}回
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  評価
                </p>
                <div className="p-1.5 md:p-2 rounded-lg bg-yellow-100 flex-shrink-0">
                  <Star className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600" />
                </div>
              </div>
              <div className="flex flex-col space-y-0.5">
                <div className="flex items-baseline space-x-0.5">
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                    {stats.averageRating.toFixed(1)}
                  </p>
                  <span className="text-xs md:text-sm text-muted-foreground">
                    /5.0
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`h-2.5 w-2.5 ${
                        star <= stats.averageRating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  予定撮影会
                </p>
                <div className="p-1.5 md:p-2 rounded-lg bg-green-100 flex-shrink-0">
                  <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600" />
                </div>
              </div>
              <div className="flex flex-col space-y-0.5">
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                  {stats.upcomingSessions}
                </p>
                <p className="text-xs text-muted-foreground">今後の参加予定</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  完了率
                </p>
                <div className="p-1.5 md:p-2 rounded-lg bg-purple-100 flex-shrink-0">
                  <Award className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-600" />
                </div>
              </div>
              <div className="flex flex-col space-y-0.5">
                <div className="flex items-baseline space-x-0.5">
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                    {stats.totalSessions > 0
                      ? Math.round(
                          (stats.completedSessions / stats.totalSessions) * 100
                        )
                      : 0}
                  </p>
                  <span className="text-xs md:text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  完了: {stats.completedSessions}回
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* モデル向け詳細統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>撮影会参加状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>予定</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-info">
                    {stats.upcomingSessions}
                  </span>
                  <Progress
                    value={(stats.upcomingSessions / stats.totalSessions) * 100}
                    className="w-20"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>完了</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-success">
                    {stats.completedSessions}
                  </span>
                  <Progress
                    value={
                      (stats.completedSessions / stats.totalSessions) * 100
                    }
                    className="w-20"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>キャンセル</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-error">
                    {stats.cancelledSessions}
                  </span>
                  <Progress
                    value={
                      (stats.cancelledSessions / stats.totalSessions) * 100
                    }
                    className="w-20"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>活動エリア</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.popularLocations.map(location => (
                <div
                  key={location.location}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    <span>{location.location}</span>
                  </div>
                  <span className="font-bold">{location.count}回</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
