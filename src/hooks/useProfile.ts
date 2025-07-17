'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getProfile } from '@/lib/auth/profile';

interface ProfileData {
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

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      try {
        setProfileLoading(true);
        setError(null);

        const { data, error: profileError } = await getProfile(user.id);

        if (profileError) {
          console.error('プロフィール取得エラー:', profileError);
          setError('プロフィール情報の取得に失敗しました');
          setProfile(null);
          return;
        }

        setProfile(data);
      } catch (err) {
        console.error('予期しないエラー:', err);
        setError('予期しないエラーが発生しました');
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    }

    fetchProfile();
  }, [user?.id]);

  return {
    user,
    profile,
    loading: authLoading || profileLoading,
    error,
    // プロフィール画像のURL（保存済み画像 > OAuth画像 > デフォルト）
    avatarUrl: profile?.avatar_url || user?.user_metadata?.avatar_url || null,
    displayName:
      profile?.display_name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      'ユーザー',
  };
}
