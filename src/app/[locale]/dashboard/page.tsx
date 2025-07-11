'use client';

import { useAuth } from '@/hooks/useAuth';
import { getProfile } from '@/lib/auth/profile';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PhotographerInstantDashboard } from '@/components/instant/PhotographerInstantDashboard';
import Image from 'next/image';

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
  const locale = params.locale || 'ja';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await getProfile(user.id);

      if (error) {
        console.error('プロフィール取得エラー:', error);
        // プロフィールが存在しない場合は設定ページにリダイレクト
        if (error.code === 'PGRST116' || error.code === 'PROFILE_NOT_FOUND') {
          router.push(`/${locale}/auth/setup-profile`);
          return;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('予期しないエラー:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [user, router, locale]);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/auth/signin`);
      return;
    }

    if (user) {
      loadProfile();
    }
  }, [user, loading, router, locale, loadProfile]);

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
    <DashboardLayout>
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
    </DashboardLayout>
  );
}
