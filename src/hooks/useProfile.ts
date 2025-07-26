'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getProfile } from '@/lib/auth/profile';
import { logger } from '@/lib/utils/logger';

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

// グローバルなプロフィール更新通知システム
class ProfileUpdateNotifier {
  private listeners: (() => void)[] = [];

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    logger.debug('プロフィール更新リスナー登録', {
      listenerCount: this.listeners.length,
    });
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
      logger.debug('プロフィール更新リスナー解除', {
        listenerCount: this.listeners.length,
      });
    };
  }

  notify() {
    logger.debug('プロフィール更新通知実行', {
      listenerCount: this.listeners.length,
    });
    this.listeners.forEach((listener, index) => {
      logger.debug(`リスナー${index + 1}実行開始`);
      listener();
      logger.debug(`リスナー${index + 1}実行完了`);
    });
  }
}

const profileUpdateNotifier = new ProfileUpdateNotifier();

// プロフィール更新を通知するヘルパー関数
export const notifyProfileUpdate = () => {
  logger.debug('notifyProfileUpdate呼び出し');
  profileUpdateNotifier.notify();
};

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      logger.debug('ユーザーIDなし、プロフィール取得をスキップ');
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    try {
      logger.debug('プロフィール取得開始', { userId: user.id });
      setProfileLoading(true);
      setError(null);

      const { data, error: profileError } = await getProfile(user.id);

      if (profileError) {
        logger.error('プロフィール取得エラー', {
          profileError,
          userId: user.id,
        });
        setError('プロフィール情報の取得に失敗しました');
        setProfile(null);
        return;
      }

      logger.info('プロフィール取得成功', {
        userId: user.id,
        avatarUrl: data?.avatar_url,
        displayName: data?.display_name,
        updatedAt: data?.updated_at,
      });
      setProfile(data);
    } catch (err) {
      logger.error('予期しないエラー', { err, userId: user.id });
      setError('予期しないエラーが発生しました');
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    logger.debug('useProfile初期化、プロフィール取得実行');
    fetchProfile();
  }, [fetchProfile]);

  // プロフィール更新通知をリッスン
  useEffect(() => {
    logger.debug('プロフィール更新通知リスナー設定');
    const unsubscribe = profileUpdateNotifier.subscribe(() => {
      logger.debug('プロフィール更新通知受信、再取得実行');
      fetchProfile();
    });
    return unsubscribe;
  }, [fetchProfile]);

  // プロフィールを強制的に再取得する関数
  const refreshProfile = useCallback(() => {
    logger.debug('手動プロフィール再取得実行');
    fetchProfile();
  }, [fetchProfile]);

  // プロフィール画像のキャッシュバスティング用URLを生成
  // 画像が存在する場合のみキャッシュバスティングを適用
  const avatarUrlWithCacheBuster = profile?.avatar_url
    ? `${profile.avatar_url}?t=${profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now()}`
    : null;

  // プロフィール画像のURL優先順位：保存済み画像 > OAuth画像 > null
  const finalAvatarUrl =
    avatarUrlWithCacheBuster || user?.user_metadata?.avatar_url || null;

  logger.debug('useProfile最終値', {
    profileId: profile?.id,
    originalAvatarUrl: profile?.avatar_url,
    avatarUrlWithCacheBuster,
    finalAvatarUrl,
    displayName: profile?.display_name,
    loading: authLoading || profileLoading,
  });

  return {
    user,
    profile,
    loading: authLoading || profileLoading,
    error,
    refreshProfile,
    // プロフィール画像のURL（保存済み画像 > OAuth画像 > デフォルト）
    avatarUrl: finalAvatarUrl,
    displayName:
      profile?.display_name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      'ユーザー',
  };
}
