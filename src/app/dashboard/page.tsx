'use client';

import { useAuth } from '@/hooks/useAuth';
import { getProfile } from '@/lib/auth/profile';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
      return;
    }

    if (user) {
      loadProfile();
    }
  }, [user, loading, router]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await getProfile(user.id);

      if (error) {
        console.error('プロフィール取得エラー:', error);
        // プロフィールが存在しない場合は設定ページにリダイレクト
        if (error.code === 'PGRST116') {
          router.push('/auth/setup-profile');
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
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                ShutterHub v2
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {profile.display_name || profile.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                {profile.avatar_url && (
                  <img
                    className="h-20 w-20 rounded-full"
                    src={profile.avatar_url}
                    alt={profile.display_name}
                  />
                )}
                <div className="ml-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {profile.display_name || 'ユーザー'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {getUserTypeLabel(profile.user_type)}
                    {profile.is_verified && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        認証済み
                      </span>
                    )}
                  </p>
                  {profile.location && (
                    <p className="text-sm text-gray-500 mt-1">
                      📍 {profile.location}
                    </p>
                  )}
                </div>
              </div>

              {profile.bio && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    自己紹介
                  </h3>
                  <p className="mt-2 text-gray-600">{profile.bio}</p>
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  クイックアクション
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {profile.user_type === 'organizer' && (
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md text-sm font-medium">
                      撮影会を作成
                    </button>
                  )}
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md text-sm font-medium">
                    撮影会を検索
                  </button>
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-md text-sm font-medium">
                    プロフィール編集
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
