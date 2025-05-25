import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { UserProfileCard } from '@/components/profile/UserProfileCard';
import { UserRatingStats } from '@/components/profile/UserRatingStats';
import { UserReviewList } from '@/components/profile/UserReviewList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Star,
  Calendar,
  Camera,
  Users,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';

export default async function ProfilePage() {
  const t = await getTranslations('pages.profile');
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/signin');
  }

  // ユーザープロフィール情報を取得
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/auth/setup-profile');
  }

  // ユーザーの評価統計を取得
  const { data: ratingStats } = await supabase
    .from('user_rating_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // ユーザーが主催した撮影会の数を取得
  const { count: organizedSessionsCount } = await supabase
    .from('photo_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('organizer_id', user.id);

  // ユーザーが参加した撮影会の数を取得
  const { count: participatedSessionsCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'confirmed');

  // ユーザーが受け取ったレビューの数を取得
  const { count: receivedReviewsCount } = await supabase
    .from('user_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('reviewee_id', user.id)
    .eq('status', 'published');

  // 撮影会レビューの数を取得（主催者として）
  const { count: sessionReviewsCount } = await supabase
    .from('photo_session_reviews')
    .select('photo_sessions!inner(*)', { count: 'exact', head: true })
    .eq('photo_sessions.organizer_id', user.id)
    .eq('status', 'published');

  const userStats = {
    organizedSessions: organizedSessionsCount || 0,
    participatedSessions: participatedSessionsCount || 0,
    receivedReviews: receivedReviewsCount || 0,
    sessionReviews: sessionReviewsCount || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            {t('title')}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* プロフィール情報 */}
          <div className="lg:col-span-1 space-y-6">
            <UserProfileCard profile={profile} />

            {/* 活動統計 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  活動統計
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {userStats.organizedSessions}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Camera className="h-3 w-3" />
                      主催撮影会
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {userStats.participatedSessions}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Users className="h-3 w-3" />
                      参加撮影会
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {userStats.sessionReviews}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Star className="h-3 w-3" />
                      撮影会レビュー
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {userStats.receivedReviews}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      受信レビュー
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 評価統計 */}
            {ratingStats && <UserRatingStats stats={ratingStats} />}
          </div>

          {/* メインコンテンツ */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="reviews" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="reviews"
                  className="flex items-center gap-2"
                >
                  <Star className="h-4 w-4" />
                  レビュー
                </TabsTrigger>
                <TabsTrigger
                  value="sessions"
                  className="flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  撮影会
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  活動履歴
                </TabsTrigger>
              </TabsList>

              <TabsContent value="reviews" className="space-y-6">
                <UserReviewList userId={user.id} />
              </TabsContent>

              <TabsContent value="sessions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>撮影会管理</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      撮影会管理機能は今後実装予定です。
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>活動履歴</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      活動履歴機能は今後実装予定です。
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
