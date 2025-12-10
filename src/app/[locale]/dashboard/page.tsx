'use client';

import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { getProfile } from '@/lib/auth/profile';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PhotographerInstantDashboard } from '@/components/instant/PhotographerInstantDashboard';
import { ModelInvitationNotifications } from '@/components/profile/organizer/ModelInvitationNotifications';
import { DashboardStatsCards } from '@/components/dashboard/DashboardStatsCards';
import { RecentActivity as RecentActivityComponent } from '@/components/dashboard/RecentActivity';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import {
  getDashboardStats,
  getRecentActivity,
  getUpcomingEvents,
  DashboardStats,
  RecentActivity as RecentActivityType,
  UpcomingEvent,
} from '@/app/actions/dashboard-stats';
import { CheckCircle, X, AlertTriangle } from 'lucide-react';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { getPendingAdminLotterySelections } from '@/app/actions/admin-lottery';
import Link from 'next/link';

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

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale || 'ja';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  );
  const [recentActivity, setRecentActivity] = useState<RecentActivityType[]>(
    []
  );
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [pendingAdminLotteries, setPendingAdminLotteries] = useState<
    Array<{
      id: string;
      photoSessionId: string;
      photoSessionTitle: string;
      eventDate: string;
      selectionDeadline: string;
      maxSelections: number;
      status: string;
      isOverdue: boolean;
      daysUntilDeadline: number;
    }>
  >([]);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    try {
      const { data, error } = await getProfile(user.id);

      if (error) {
        // ネットワークエラーなどの場合はエラーログを出力しない（過度なログを避ける）
        if (
          error.code === 'UNEXPECTED_ERROR' ||
          error.message?.includes('fetch')
        ) {
          logger.error('プロフィール取得エラー（ネットワークエラー）:', {
            code: error.code,
            message: error.message,
          });
          // ネットワークエラーの場合は再試行しない（ユーザーに通知する）
          setProfileLoading(false);
          return;
        }

        logger.error('プロフィール取得エラー:', error);
        // プロフィールが存在しない場合は設定ページにリダイレクト
        if (error.code === 'PGRST116' || error.code === 'PROFILE_NOT_FOUND') {
          router.push(`/${locale}/auth/setup-profile`);
          return;
        }
      } else if (data) {
        setProfile(data);
      }
    } catch (error) {
      logger.error('予期しないエラー:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [user, router, locale]);

  const loadDashboardData = useCallback(async () => {
    if (!user || !profile) return;

    setDashboardLoading(true);
    try {
      const [statsResult, activityResult, eventsResult] = await Promise.all([
        getDashboardStats(user.id, profile.user_type),
        getRecentActivity(user.id, profile.user_type),
        getUpcomingEvents(user.id, profile.user_type),
      ]);

      if (statsResult.success && statsResult.data) {
        setDashboardStats(statsResult.data);
      }
      if (activityResult.success) {
        setRecentActivity(activityResult.data || []);
      }
      if (eventsResult.success) {
        setUpcomingEvents(eventsResult.data || []);
      }
    } catch (error) {
      logger.error('ダッシュボードデータ取得エラー:', error);
    } finally {
      setDashboardLoading(false);
    }
  }, [user, profile]);

  // URLクエリパラメータから成功メッセージを取得
  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      setSuccessMessage(decodeURIComponent(success));
      // URLから成功メッセージを除去
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/auth/signin`);
      return;
    }

    if (user) {
      loadProfile();
    }
  }, [user, loading, router, locale, loadProfile]);

  // プロフィール更新時にログ出力とダッシュボードデータ取得
  useEffect(() => {
    if (profile) {
      logger.info('Dashboard: プロフィール情報', {
        userId: user?.id,
        userType: profile.user_type,
        email: profile.email,
        displayName: profile.display_name,
        shouldShowInvitations: profile.user_type === 'model',
      });
      loadDashboardData();

      // 運営者の場合、未処理の管理抽選を取得
      if (profile.user_type === 'organizer') {
        getPendingAdminLotterySelections().then(result => {
          if (result.data) {
            setPendingAdminLotteries(result.data);
          }
        });
      }
    }
  }, [profile, user, loadDashboardData]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
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

  return (
    <AuthenticatedLayout>
      <>
        {/* 成功メッセージアラート */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 flex items-center justify-between">
              <span>{successMessage}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccessMessage(null)}
                className="h-auto p-1 text-green-600 hover:text-green-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <PageTitleHeader title="ダッシュボード" />

        {/* モデル向け招待通知 */}
        {profile.user_type === 'model' && <ModelInvitationNotifications />}

        {/* 運営者向け：未処理の管理抽選警告 */}
        {profile.user_type === 'organizer' &&
          pendingAdminLotteries.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-2">
                <span className="font-medium">
                  当選者選択が必要な管理抽選が{pendingAdminLotteries.length}
                  件あります
                </span>
                <div className="space-y-1">
                  {pendingAdminLotteries.slice(0, 3).map(lottery => (
                    <Link
                      key={lottery.id}
                      href={`/${locale}/photo-sessions/${lottery.photoSessionId}`}
                      className="block text-sm hover:underline"
                    >
                      • {lottery.photoSessionTitle}
                      {lottery.isOverdue ? (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          期限超過
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2 text-xs">
                          あと{lottery.daysUntilDeadline}日
                        </Badge>
                      )}
                    </Link>
                  ))}
                  {pendingAdminLotteries.length > 3 && (
                    <span className="text-sm text-muted-foreground">
                      ...他{pendingAdminLotteries.length - 3}件
                    </span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

        {/* 統計カード */}
        {dashboardStats && !dashboardLoading && (
          <DashboardStatsCards
            stats={dashboardStats}
            userType={profile.user_type}
          />
        )}

        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>プロフィール</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  {profile.avatar_url && (
                    <Image
                      className="h-16 w-16 rounded-full object-cover"
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      width={64}
                      height={64}
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">
                      {profile.display_name || 'ユーザー'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {getUserTypeLabel(profile.user_type)}
                      </span>
                      {profile.is_verified && (
                        <Badge variant="secondary">認証済み</Badge>
                      )}
                    </div>
                    {profile.location && (
                      <p className="text-sm text-muted-foreground mt-1">
                        📍 {profile.location}
                      </p>
                    )}
                  </div>
                </div>

                {profile.bio && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">自己紹介</h4>
                    <p className="text-muted-foreground">{profile.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* カメラマン向け即座撮影ダッシュボード */}
            {profile.user_type === 'photographer' && (
              <PhotographerInstantDashboard userId={user.id} />
            )}
          </div>

          {/* 右カラム */}
          <div className="space-y-6">
            {/* 今後の予定 */}
            <UpcomingEvents
              events={upcomingEvents}
              isLoading={dashboardLoading}
            />

            {/* 最近のアクティビティ */}
            <RecentActivityComponent
              activities={recentActivity}
              isLoading={dashboardLoading}
            />
          </div>
        </div>
      </>
    </AuthenticatedLayout>
  );
}
