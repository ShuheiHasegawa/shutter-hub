'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FollowButton } from '@/components/social/FollowButton';
import {
  User,
  Calendar,
  MapPin,
  Loader2,
  ArrowLeft,
  UserX,
  Camera,
  Verified,
  Star,
  Heart,
  Users,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { PhotobookGallery } from '@/components/profile/PhotobookGallery';

interface ProfileData {
  id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  user_type: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
  follow_status?: 'accepted' | 'pending';
  is_mutual_follow: boolean;
}

export default function UserProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const locale = useLocale();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [followStats, setFollowStats] = useState<FollowStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('overview');

  const userId = params.userId as string;
  const isOwnProfile = user?.id === userId;

  // フォロー状態を更新する関数をuseCallbackでメモ化
  const updateFollowStats = useCallback(async () => {
    if (!user || isOwnProfile) return;

    try {
      const supabase = createClient();

      // フォロー数を取得
      const { data: followersData, error: followersError } = await supabase
        .from('follows')
        .select('id')
        .eq('following_id', userId)
        .eq('status', 'accepted');

      if (followersError) {
        console.warn('Followers fetch error:', followersError);
      }

      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('status', 'accepted');

      if (followingError) {
        console.warn('Following fetch error:', followingError);
      }

      // 現在のフォロー関係を確認
      const { data: followRelation, error: followRelationError } =
        await supabase
          .from('follows')
          .select('status')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle(); // singleの代わりにmaybeSingleを使用

      if (followRelationError) {
        console.warn('Follow relation fetch error:', followRelationError);
      }

      const { data: mutualFollow, error: mutualFollowError } = await supabase
        .from('follows')
        .select('status')
        .eq('follower_id', userId)
        .eq('following_id', user.id)
        .maybeSingle(); // singleの代わりにmaybeSingleを使用

      if (mutualFollowError) {
        console.warn('Mutual follow fetch error:', mutualFollowError);
      }

      setFollowStats({
        followers_count: followersData?.length || 0,
        following_count: followingData?.length || 0,
        is_following: followRelation?.status === 'accepted',
        follow_status: followRelation?.status as
          | 'accepted'
          | 'pending'
          | undefined,
        is_mutual_follow:
          followRelation?.status === 'accepted' &&
          mutualFollow?.status === 'accepted',
      });
    } catch (error) {
      console.error('Follow stats update error:', error);
      // エラーが発生してもフォロー機能を無効にしない
      setFollowStats({
        followers_count: 0,
        following_count: 0,
        is_following: false,
        follow_status: undefined,
        is_mutual_follow: false,
      });
    }
  }, [user, userId, isOwnProfile]);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!userId) return;

      setIsLoading(true);
      try {
        const supabase = createClient();

        // プロフィール情報を取得する
        const { data: profile, error } = await supabase
          .from('profiles')
          .select(
            `
            id,
            display_name,
            email,
            avatar_url,
            bio,
            location,
            website,
            user_type,
            is_verified,
            created_at,
            updated_at
          `
          )
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('プロフィール取得エラー:', error);
          toast.error('プロフィールの読み込みに失敗しました');
          return;
        }

        if (!profile) {
          toast.error('プロフィールが見つかりません');
          return;
        }

        setProfile(profile);

        // フォロー統計情報を取得（自分以外のプロフィールの場合）
        if (!isOwnProfile && user) {
          await updateFollowStats();
        }
      } catch (error) {
        console.error('Profile load error:', error);
        toast.error('プロフィールの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [userId, user, isOwnProfile, updateFollowStats]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP', {
      locale: locale === 'ja' ? ja : undefined,
    });
  };

  const renderUserBadge = (userType: string, isVerified: boolean) => {
    const badgeVariant = userType === 'photographer' ? 'default' : 'secondary';
    const badgeText =
      userType === 'photographer' ? 'フォトグラファー' : 'モデル';

    return (
      <div className="flex items-center gap-2">
        <Badge variant={badgeVariant} className="flex items-center gap-1">
          <Camera className="h-3 w-3" />
          {badgeText}
        </Badge>
        {isVerified && (
          <div className="flex items-center gap-1">
            <Verified className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-blue-600">認証済み</span>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">プロフィールを読み込み中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <UserX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">ユーザーが見つかりません</h1>
          <p className="text-muted-foreground mb-6">
            指定されたユーザーは存在しないか、削除されています。
          </p>
          <Button asChild>
            <Link href="/timeline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              タイムラインに戻る
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/timeline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {profile.display_name || 'ユーザー'}
              </h1>
              <p className="text-muted-foreground">プロフィール</p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <Button variant="outline" asChild>
                <Link href="/profile/edit">
                  <User className="h-4 w-4 mr-2" />
                  プロフィール編集
                </Link>
              </Button>
            ) : (
              user && (
                <FollowButton
                  userId={userId}
                  isFollowing={followStats?.is_following}
                  followStatus={followStats?.follow_status}
                  isMutualFollow={followStats?.is_mutual_follow}
                  size="md"
                  onFollowChange={updateFollowStats}
                />
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* プロフィール情報 */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6">
                {/* アバターと基本情報 */}
                <div className="flex flex-col items-center text-center space-y-4">
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

                    {renderUserBadge(profile.user_type, profile.is_verified)}

                    {/* フォロー統計 */}
                    {followStats && (
                      <div className="flex items-center justify-center gap-4 text-sm">
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
                      <h4 className="text-sm font-medium mb-2">ウェブサイト</h4>
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

            {/* 評価統計（今後実装予定） */}
            <Card>
              <CardHeader>
                <CardTitle>評価統計</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">実装予定の機能です</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList>
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2"
                >
                  <Star className="h-4 w-4" />
                  概要
                </TabsTrigger>
                <TabsTrigger
                  value="photobooks"
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  フォトブック
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="flex items-center gap-2"
                >
                  <Heart className="h-4 w-4" />
                  レビュー
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  活動履歴
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* 活動統計 */}
                <Card>
                  <CardHeader>
                    <CardTitle>活動統計</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">-</p>
                        <p className="text-sm text-muted-foreground">
                          主催撮影会
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">-</p>
                        <p className="text-sm text-muted-foreground">
                          参加撮影会
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">-</p>
                        <p className="text-sm text-muted-foreground">投稿数</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">-</p>
                        <p className="text-sm text-muted-foreground">
                          レビュー数
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 最近の活動 */}
                <Card>
                  <CardHeader>
                    <CardTitle>最近の活動</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        最近の活動データはありません
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="photobooks">
                <Card>
                  <CardHeader>
                    <CardTitle>フォトブック</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PhotobookGallery
                      userId={userId}
                      isOwnProfile={isOwnProfile}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews">
                <Card>
                  <CardHeader>
                    <CardTitle>レビュー一覧</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        実装予定の機能です
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>活動履歴</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        活動履歴機能は実装予定です
                      </p>
                    </div>
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
