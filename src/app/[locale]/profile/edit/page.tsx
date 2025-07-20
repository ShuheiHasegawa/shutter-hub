'use client';

import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { OrganizerModelManagement } from '@/components/profile/organizer/OrganizerModelManagement';
import { getProfile } from '@/lib/auth/profile';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/ui/back-button';
import { AlertCircle } from 'lucide-react';

interface Profile {
  id: string;
  user_type: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  instagram_handle: string | null;
  twitter_handle: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export default function EditProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/ja/auth/signin');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) return;

      try {
        setProfileLoading(true);
        setError(null);

        const { data, error: profileError } = await getProfile(user.id);

        if (profileError) {
          logger.error('プロフィール取得エラー:', profileError);
          setError('プロフィール情報の取得に失敗しました');
          return;
        }

        if (!data) {
          setError('プロフィールが見つかりません');
          return;
        }

        setProfile(data);
      } catch (err) {
        logger.error('予期しないエラー:', err);
        setError('予期しないエラーが発生しました');
      } finally {
        setProfileLoading(false);
      }
    }

    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  if (authLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <BackButton href="/profile" variant="ghost" size="sm" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex justify-center">
                  <Skeleton className="h-24 w-24 rounded-full" />
                </div>

                <div className="space-y-4">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <BackButton href="/profile" variant="ghost" size="sm" />
            <div>
              <h1 className="text-2xl font-bold">プロフィール編集</h1>
              <p className="text-muted-foreground">エラーが発生しました</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <BackButton href="/profile" variant="ghost" size="sm" />
            <div>
              <h1 className="text-2xl font-bold">プロフィール編集</h1>
              <p className="text-muted-foreground">
                プロフィールが見つかりません
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
                <p>プロフィール情報が見つかりません</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton href="/profile" variant="ghost" size="sm" />
          <div>
            <h1 className="text-2xl font-bold">プロフィール編集</h1>
            <p className="text-muted-foreground">
              あなたのプロフィール情報を編集してください
            </p>
          </div>
        </div>

        {/* プロフィール編集セクション */}
        <div className="space-y-8">
          {/* メインコンテンツ */}
          <div className="max-w-2xl">
            <ProfileEditForm profile={profile} />
          </div>

          {/* 運営アカウント専用セクション */}
          {profile?.user_type === 'organizer' && (
            <div className="space-y-6">
              <div className="border-t pt-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">所属モデル管理</h2>
                  <p className="text-muted-foreground text-sm">
                    あなたの運営に所属するモデルの管理を行えます
                  </p>
                </div>
                <OrganizerModelManagement />
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
