'use client';

import {
  useState,
  Suspense,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { logger } from '@/lib/utils/logger';
// import { queryMonitor, monitoredCall } from '@/lib/utils/query-performance-monitor';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FollowButton } from '@/components/social/FollowButton';
import { OrganizerModelsProfileView } from '@/components/profile/organizer/OrganizerModelsProfileView';
import { UserReviewList } from '@/components/profile/UserReviewList';
import { getOrganizerModelsByUserIdAction } from '@/app/actions/organizer-model';
import {
  User,
  Calendar,
  MapPin,
  Loader2,
  Camera,
  Verified,
  Star,
  Heart,
  Users,
  BookOpen,
  UserCheck,
  TrendingUp,
  MessageSquare,
  UserIcon,
  Pencil,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { PhotobookGallery } from '@/components/profile/PhotobookGallery';
import { UserScheduleManager } from '@/components/profile/UserScheduleManager';
import {
  ProfileSkeleton,
  ProfileCompactSkeleton,
} from '@/components/profile/ProfileSkeleton';
import { ProfileErrorBoundary } from '@/components/profile/ProfileErrorBoundary';
import { ActivityChartsContainer } from '@/components/profile/activity-charts/ActivityChartsContainer';
import { useProfilePageData } from '@/hooks/useProfile';
import type { OrganizerModelWithProfile } from '@/types/organizer-model';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { getOrganizersOfModelAction } from '@/app/actions/organizer-model';

export default function UserProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const locale = useLocale();

  // シンプルなパフォーマンス監視
  const [organizerModels, setOrganizerModels] = useState<
    OrganizerModelWithProfile[]
  >([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('schedule');
  const [affiliations, setAffiliations] = useState<
    { organizer_id: string; organizer_name: string | null }[]
  >([]);

  // 所属取得の実行制御（重複実行防止）- userId ごとに管理
  const affiliationsFetchedRef = useRef<Map<string, boolean>>(new Map());
  const isFetchingAffiliationsRef = useRef(false);

  const userId = params.userId as string;
  const isOwnProfile = user?.id === userId;

  // 所属の重複除外（フロント側でユニーク化）
  const uniqueAffiliations = useMemo(() => {
    const seen = new Set<string>();
    return affiliations.filter(a => {
      const nameKey = (a.organizer_name || '').trim().toLowerCase();
      const fallbackKey = (a.organizer_id || '').trim();
      const key = nameKey || fallbackKey;
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [affiliations]);

  // コンポーネントマウント・アンマウントログ
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('🏗️ [ProfilePage] Component MOUNTED', {
        userId,
        timestamp: new Date().toISOString(),
        userAgent:
          typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      });
    }

    return () => {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('🗑️ [ProfilePage] Component UNMOUNTING', {
          userId,
          timestamp: new Date().toISOString(),
        });
      }
    };
  }, [userId]);

  // SWRフックでデータ取得（並列実行）
  const {
    profile,
    followStats,
    activityStats,
    isLoading: profileLoading,
  } = useProfilePageData(userId, user?.id || '');
  const statsLoading = profileLoading; // 並列実行のため同じローディング状態

  // プロフィール変更の監視
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.info('🔄 [ProfilePage] Profile data changed', {
        userId,
        userType: profile?.user_type,
        displayName: profile?.display_name,
        isLoading: profileLoading,
        timestamp: new Date().toISOString(),
      });
    }
  }, [profile, profileLoading, userId]);

  // 運営者の所属モデルデータ取得の実行制御
  const organizerModelsFetchedRef = useRef<Map<string, boolean>>(new Map());
  const isFetchingOrganizerModelsRef = useRef(false);

  // 運営者の所属モデルデータ取得
  const loadOrganizerModels = useCallback(async () => {
    if (profile?.user_type !== 'organizer') {
      return;
    }

    setModelsLoading(true);
    try {
      const result = await getOrganizerModelsByUserIdAction(userId);
      if (result.success && Array.isArray(result.data)) {
        setOrganizerModels(result.data);
      } else {
        setOrganizerModels([]);
      }
    } catch (error) {
      logger.error('💥 [ProfilePage] 所属モデル取得例外:', error);
      setOrganizerModels([]);
    } finally {
      setModelsLoading(false);
    }
  }, [profile?.user_type, userId]);

  // プロフィール読み込み完了後に所属モデルを取得
  useEffect(() => {
    if (!profile) return;

    // React Strict Mode による重複実行を完全防止
    if (
      organizerModelsFetchedRef.current.get(userId) ||
      isFetchingOrganizerModelsRef.current
    ) {
      return;
    }

    if (profile.user_type === 'organizer') {
      isFetchingOrganizerModelsRef.current = true;
      loadOrganizerModels().finally(() => {
        organizerModelsFetchedRef.current.set(userId, true);
        isFetchingOrganizerModelsRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user_type, userId]);

  // モデルの所属運営を取得
  useEffect(() => {
    // React Strict Mode による重複実行を完全防止
    if (
      affiliationsFetchedRef.current.get(userId) ||
      isFetchingAffiliationsRef.current
    ) {
      return;
    }

    if (profile?.user_type !== 'model') {
      return;
    }

    isFetchingAffiliationsRef.current = true;

    const fetchAffiliations = async () => {
      try {
        const res = await getOrganizersOfModelAction(userId);
        if (res.success && res.data) {
          setAffiliations(res.data);
        } else {
          setAffiliations([]);
        }
      } catch (error) {
        setAffiliations([]);
        logger.error('💥 [ProfilePage] 所属運営取得例外:', error);
      } finally {
        affiliationsFetchedRef.current.set(userId, true);
        isFetchingAffiliationsRef.current = false;
      }
    };

    fetchAffiliations();
  }, [userId, profile?.user_type]);

  // パフォーマンス統計の出力（開発環境のみ）- 一時的に無効化
  // useEffect(() => {
  //   if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true') {
  //     const timer = setTimeout(() => {
  //       // 統計出力機能は後で実装
  //       logger.info('[ProfilePage] Performance monitoring disabled');
  //     }, 5000);

  //     return () => clearTimeout(timer);
  //   }
  // }, []);

  // 日付フォーマット関数
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP', {
      locale: locale === 'ja' ? ja : undefined,
    });
  };

  // イニシャル取得関数
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // ユーザータイプバッジ表示関数
  const renderUserBadge = (userType: string, isVerified: boolean) => {
    const getUserTypeData = (type: string) => {
      switch (type) {
        case 'model':
          return { label: 'モデル', variant: 'secondary' as const, icon: User };
        case 'photographer':
          return {
            label: 'フォトグラファー',
            variant: 'default' as const,
            icon: Camera,
          };
        case 'organizer':
          return { label: '運営者', variant: 'outline' as const, icon: Users };
        default:
          return {
            label: 'ユーザー',
            variant: 'secondary' as const,
            icon: User,
          };
      }
    };

    const typeData = getUserTypeData(userType);
    const IconComponent = typeData.icon;

    return (
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Badge variant={typeData.variant} className="flex items-center gap-1">
          <IconComponent className="h-3 w-3" />
          {typeData.label}
        </Badge>
        {isVerified && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Verified className="h-3 w-3 text-blue-500" />
            認証済み
          </Badge>
        )}
      </div>
    );
  };

  if (profileLoading) {
    return (
      <AuthenticatedLayout>
        <ProfileSkeleton />
      </AuthenticatedLayout>
    );
  }

  if (!profile) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <User className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-medium">
                プロフィールが見つかりません
              </h3>
              <p className="text-muted-foreground">
                指定されたユーザーは存在しないか、削除された可能性があります。
              </p>
            </div>
            <Button onClick={() => router.back()}>戻る</Button>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <ProfileErrorBoundary>
        <div>
          {/* ヘッダー */}
          <PageTitleHeader
            title="プロフィール"
            icon={<UserIcon className="h-6 w-6" />}
            backButton={{ variant: 'ghost' }}
          />

          <div className="space-y-4 lg:space-y-6">
            {/* プロフィール情報 */}
            <div className="space-y-4 lg:space-y-6">
              <Card>
                <CardContent className="p-6 relative">
                  {/* 右上の編集/フォローボタン */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    {isOwnProfile ? (
                      <>
                        <Button
                          variant="cta"
                          onClick={() => router.push('/profile/edit')}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          編集
                        </Button>
                      </>
                    ) : (
                      user &&
                      followStats && (
                        <FollowButton
                          userId={userId}
                          isFollowing={followStats.is_following}
                          followStatus={followStats.follow_status}
                          isMutualFollow={followStats.is_mutual_follow}
                          size="sm"
                          onFollowChange={() => {
                            // SWRが自動的にキャッシュを更新
                          }}
                        />
                      )
                    )}
                  </div>

                  {/* アバターと基本情報 */}
                  <div className="flex flex-col items-center text-center space-y-4 mt-8">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-lg">
                        {profile.display_name ? (
                          getInitials(profile.display_name)
                        ) : (
                          <User className="h-8 w-8" />
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">
                        {profile.display_name || 'ユーザー'}
                      </h3>

                      <div className="flex items-center justify-center gap-2">
                        {renderUserBadge(
                          profile.user_type,
                          profile.is_verified
                        )}
                      </div>

                      {/* 所属運営バッジ（モデルのみ） */}
                      {profile.user_type === 'model' &&
                        uniqueAffiliations.length > 0 && (
                          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                            {uniqueAffiliations.map(org => (
                              <Badge
                                key={org.organizer_id}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                <Users className="h-3 w-3" />
                                {org.organizer_name
                                  ? `${org.organizer_name} 所属`
                                  : '所属'}
                              </Badge>
                            ))}
                          </div>
                        )}

                      {/* フォロー統計（自分・他人共通表示） */}
                      {followStats && (
                        <div className="flex items-center justify-center gap-4 text-sm pt-4">
                          <div className="text-center">
                            <p className="font-semibold">
                              {followStats.followers_count}
                            </p>
                            <p className="text-muted-foreground">フォロワー</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold">
                              {followStats.following_count}
                            </p>
                            <p className="text-muted-foreground">フォロー中</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* 詳細情報 */}
                  <div className="space-y-4 text-left">
                    {profile.bio && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">自己紹介</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {profile.bio}
                        </p>
                      </div>
                    )}

                    {profile.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{profile.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {formatDate(profile.created_at)}に参加
                      </span>
                    </div>

                    {profile.website && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          ウェブサイト
                        </h4>
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {profile.website}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* メインコンテンツ */}
            <div className="space-y-4 lg:space-y-6">
              <Tabs
                value={currentTab}
                onValueChange={newTab => {
                  if (process.env.NODE_ENV === 'development') {
                    logger.info('[ProfilePage] タブ変更を実行', {
                      from: currentTab,
                      to: newTab,
                      userId,
                    });
                  }
                  setCurrentTab(newTab);
                }}
              >
                <TabsList
                  className={`grid w-full ${profile?.user_type === 'organizer' ? 'grid-cols-5' : 'grid-cols-4'}`}
                >
                  <TabsTrigger
                    value="schedule"
                    className="flex items-center justify-center gap-1 lg:gap-2 px-1 lg:px-3 min-w-0"
                  >
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden lg:inline whitespace-nowrap">
                      スケジュール
                    </span>
                  </TabsTrigger>
                  {/* 運営者の場合のみ所属モデルタブを表示 */}
                  {profile?.user_type === 'organizer' && (
                    <TabsTrigger
                      value="models"
                      className="flex items-center justify-center gap-1 lg:gap-2 px-1 lg:px-3 min-w-0"
                    >
                      <UserCheck className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden lg:inline whitespace-nowrap">
                        所属モデル
                      </span>
                      <span className="hidden lg:inline">
                        ({organizerModels.length})
                      </span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="photobooks"
                    className="flex items-center justify-center gap-1 lg:gap-2 px-1 lg:px-3 min-w-0"
                  >
                    <BookOpen className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden lg:inline whitespace-nowrap">
                      フォトブック
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="reviews"
                    className="flex items-center justify-center gap-1 lg:gap-2 px-1 lg:px-3 min-w-0"
                  >
                    <Heart className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden lg:inline whitespace-nowrap">
                      レビュー
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="flex items-center justify-center gap-1 lg:gap-2 px-1 lg:px-3 min-w-0"
                  >
                    <TrendingUp className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden lg:inline whitespace-nowrap">
                      活動統計
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="schedule">
                  <div className="space-y-6">
                    <Suspense fallback={<ProfileCompactSkeleton />}>
                      <UserScheduleManager
                        userId={userId}
                        isOwnProfile={isOwnProfile}
                        userType={
                          profile?.user_type as
                            | 'model'
                            | 'photographer'
                            | 'organizer'
                        }
                      />
                    </Suspense>

                    {/* 活動統計サマリー */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          活動統計サマリー
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {statsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : activityStats ? (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="flex items-center justify-center mb-2">
                                  <Camera className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="text-2xl font-bold">
                                  {activityStats.organizedSessions}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  主催撮影会
                                </div>
                              </div>

                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="flex items-center justify-center mb-2">
                                  <Users className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="text-2xl font-bold">
                                  {activityStats.participatedSessions}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  参加撮影会
                                </div>
                              </div>

                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="flex items-center justify-center mb-2">
                                  <Star className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="text-2xl font-bold">
                                  {activityStats.sessionReviews}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  撮影会レビュー
                                </div>
                              </div>

                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="flex items-center justify-center mb-2">
                                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="text-2xl font-bold">
                                  {activityStats.receivedReviews}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  受信レビュー
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-muted-foreground">
                              データを読み込めませんでした
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* 運営者の場合のみ所属モデルタブを表示 */}
                {profile?.user_type === 'organizer' && (
                  <TabsContent value="models">
                    <OrganizerModelsProfileView
                      models={organizerModels}
                      isLoading={modelsLoading}
                      showContactButton={!isOwnProfile}
                      isOwnProfile={isOwnProfile}
                    />
                  </TabsContent>
                )}

                <TabsContent value="photobooks">
                  <Suspense fallback={<ProfileCompactSkeleton />}>
                    <PhotobookGallery
                      userId={userId}
                      isOwnProfile={isOwnProfile}
                    />
                  </Suspense>
                </TabsContent>

                <TabsContent value="reviews">
                  <Suspense fallback={<ProfileCompactSkeleton />}>
                    <UserReviewList userId={userId} />
                  </Suspense>
                </TabsContent>

                <TabsContent value="activity">
                  <Suspense fallback={<ProfileCompactSkeleton />}>
                    <ActivityChartsContainer
                      userId={userId}
                      isOwnProfile={isOwnProfile}
                    />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </ProfileErrorBoundary>
    </AuthenticatedLayout>
  );
}
