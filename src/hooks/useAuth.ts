'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Profile, UserType } from '@/types/database';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 初期認証状態を取得
    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          // セッションがない状態（AuthSessionMissingError）は正常な状態なのでエラーログを出力しない
          if (
            error.name === 'AuthSessionMissingError' ||
            error.message?.includes('Auth session missing') ||
            error.message?.includes('session')
          ) {
            // セッションがない場合はユーザーをnullに設定して続行（正常な状態）
            setUser(null);
            setLoading(false);
            return;
          }

          // ネットワークエラーなどの場合はログを出力しない（過度なログを避ける）
          if (
            error.message?.includes('fetch') ||
            error.message?.includes('network')
          ) {
            // ネットワークエラーの場合はユーザーをnullに設定して続行
            setUser(null);
            setLoading(false);
            return;
          }

          // その他のエラーのみログ出力
          logger.error('認証状態取得エラー:', error);
        }

        setUser(user);
      } catch (error) {
        // 予期しないエラー（ネットワークエラーなど）
        logger.error('認証状態取得中の予期しないエラー:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const logout = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error('ログアウトに失敗しました');
        logger.error('Logout error:', error);
        return;
      }

      toast.success('ログアウトしました');
      router.push('/ja/auth/signin');
    } catch (error) {
      logger.error('Logout error:', error);
      toast.error('ログアウト処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, logout };
}

/**
 * Client Components用のプロフィール取得フック
 * ユーザーのプロフィール情報を取得する
 */
export function useUserProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<
    (Profile & { role?: 'user' | 'admin' | 'super_admin' | null }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, role')
          .eq('id', user.id)
          .single();

        if (error) {
          logger.error('Profile fetch error in useUserProfile:', error);
          setProfile(null);
        } else {
          setProfile(
            data as Profile & {
              role?: 'user' | 'admin' | 'super_admin' | null;
            }
          );
        }
      } catch (error) {
        logger.error('Unexpected error in useUserProfile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, authLoading, supabase]);

  return { profile, loading: authLoading || loading };
}

/**
 * Client Components用の認証必須フック
 * 認証が必要なコンポーネントで使用する
 * 認証されていない場合はnullを返す
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();

  return { user, loading };
}

/**
 * Client Components用のユーザータイプ必須フック
 * 特定のユーザータイプが必要なコンポーネントで使用する
 *
 * @param userType - 必要なユーザータイプ
 * @returns チェック成功時: { user, profile, loading: false }
 *          チェック失敗時: { user: null, profile: null, loading: false }
 */
export function useRequireUserType(userType: UserType) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || profileLoading) {
      setLoading(true);
      return;
    }

    setLoading(false);
  }, [authLoading, profileLoading]);

  // 認証されていない、またはプロフィールが取得できない場合
  if (!user || !profile) {
    return { user: null, profile: null, loading };
  }

  // ユーザータイプが一致しない場合
  if (profile.user_type !== userType) {
    return { user: null, profile: null, loading: false };
  }

  return { user, profile, loading: false };
}
