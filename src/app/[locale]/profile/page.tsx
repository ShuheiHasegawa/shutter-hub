'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { UserProfileCard } from '@/components/profile/UserProfileCard';
// import { UserRatingStats } from '@/components/profile/UserRatingStats';
import { UserReviewList } from '@/components/profile/UserReviewList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Star,
  Calendar,
  Camera,
  Users,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface UserStats {
  organizedSessions: number;
  participatedSessions: number;
  receivedReviews: number;
  sessionReviews: number;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  // const [ratingStats, setRatingStats] = useState<unknown>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    organizedSessions: 0,
    participatedSessions: 0,
    receivedReviews: 0,
    sessionReviews: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/ja/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const loadProfileData = async () => {
      try {
        const supabase = createClient();

        // ユーザープロフィール情報を取得
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('プロフィール取得エラー:', profileError);
          return;
        }

        if (!profileData) {
          console.log(
            'プロフィールが見つかりません。設定ページにリダイレクトします。'
          );
          router.push('/ja/auth/setup-profile');
          return;
        }

        setProfile(profileData);

        // ユーザーの評価統計を取得
        // TODO: 型定義修正後に有効化
        // const { data: ratingStatsData } = await supabase
        //   .from('user_rating_stats')
        //   .select('*')
        //   .eq('user_id', user.id)
        //   .single();

        // setRatingStats(ratingStatsData);

        // 各種統計を並行取得
        const [
          { count: organizedSessionsCount },
          { count: participatedSessionsCount },
          { count: receivedReviewsCount },
          { count: sessionReviewsCount },
        ] = await Promise.all([
          // ユーザーが主催した撮影会の数
          supabase
            .from('photo_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('organizer_id', user.id),
          // ユーザーが参加した撮影会の数
          supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'confirmed'),
          // ユーザーが受け取ったレビューの数
          supabase
            .from('user_reviews')
            .select('*', { count: 'exact', head: true })
            .eq('reviewee_id', user.id)
            .eq('status', 'published'),
          // 撮影会レビューの数（主催者として）
          supabase
            .from('photo_session_reviews')
            .select(
              'photo_sessions!photo_session_reviews_photo_session_id_fkey(*)',
              { count: 'exact', head: true }
            )
            .eq('photo_sessions.organizer_id', user.id)
            .eq('status', 'published'),
        ]);

        setUserStats({
          organizedSessions: organizedSessionsCount || 0,
          participatedSessions: participatedSessionsCount || 0,
          receivedReviews: receivedReviewsCount || 0,
          sessionReviews: sessionReviewsCount || 0,
        });
      } catch (error) {
        console.error('プロフィールデータ取得エラー:', error);
      }
    };

    loadProfileData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* プロフィール情報 */}
          <div className="lg:col-span-1 space-y-6">
            {profile && <UserProfileCard profile={profile} />}

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
            {/* TODO: 評価統計の型定義を修正後に有効化 */}
            {/* {ratingStats && <UserRatingStats stats={ratingStats} />} */}
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
                <UserReviewList userId={user?.id || ''} />
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
