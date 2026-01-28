'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Profile, UserType } from '@/types/database';

// グローバルキャッシュ: 複数のuseAuth呼び出しで認証状態を共有
// SSR hydration問題を回避するため、クライアント側でのみ使用
let cachedUser: User | null | undefined = undefined;
let cachedLoading = true;
let authPromise: Promise<User | null> | null = null;

export function useAuth() {
  // SSR hydration問題を回避: クライアント側でのみキャッシュを使用
  const [user, setUser] = useState<User | null>(
    typeof window !== 'undefined' ? (cachedUser ?? null) : null
  );
  const [loading, setLoading] = useState(
    typeof window !== 'undefined' ? cachedLoading : true
  );
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Critical修正: リスナーは常に設定（早期リターンの前に配置）
    // これにより、他のタブでの認証状態変更やトークンリフレッシュを検知できる
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // キャッシュを更新（クライアント側でのみ）
      if (typeof window !== 'undefined') {
        cachedUser = session?.user || null;
        cachedLoading = false;
      }
      setUser(session?.user || null);
      setLoading(false);
    });

    // SSR時はリスナーのみ設定して終了
    if (typeof window === 'undefined') {
      return () => {
        subscription.unsubscribe();
      };
    }

    // キャッシュがあればそれを使用
    if (cachedUser !== undefined) {
      setUser(cachedUser);
      setLoading(false);
      // リスナーは既に設定済みなので、クリーンアップのみ返す
      return () => {
        subscription.unsubscribe();
      };
    }

    // 既に取得中の場合は、その Promise を再利用
    if (authPromise) {
      authPromise.then(user => {
        setUser(user);
        setLoading(false);
      });
      // リスナーは既に設定済みなので、クリーンアップのみ返す
      return () => {
        subscription.unsubscribe();
      };
    }

    // 初回のみ認証状態を取得
    const getUser = async (): Promise<User | null> => {
      try {
        // getUser()の代わりにgetSession()を使用（ローカルキャッシュから取得）
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          if (
            error.name === 'AuthSessionMissingError' ||
            error.message?.includes('Auth session missing') ||
            error.message?.includes('session')
          ) {
            cachedUser = null;
            cachedLoading = false;
            return null;
          }

          if (
            error.message?.includes('fetch') ||
            error.message?.includes('network')
          ) {
            cachedUser = null;
            cachedLoading = false;
            return null;
          }

          logger.error('認証状態取得エラー:', error);
          cachedUser = null;
          cachedLoading = false;
          return null;
        }

        cachedUser = session?.user || null;
        cachedLoading = false;
        return session?.user || null;
      } catch (error) {
        logger.error('認証状態取得中の予期しないエラー:', error);
        cachedUser = null;
        cachedLoading = false;
        return null;
      }
    };

    authPromise = getUser();
    authPromise.then(user => {
      setUser(user);
      setLoading(false);
      authPromise = null; // Promise完了後にクリア
    });

    // リスナーは既に設定済みなので、クリーンアップのみ返す
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]); // supabaseは安定した参照のため、実質的に初回のみ実行

  const logout = async (options?: {
    skipRedirect?: boolean;
    redirectTo?: string;
  }) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error('ログアウトに失敗しました');
        logger.error('Logout error:', error);
        return;
      }

      // キャッシュをクリア（クライアント側でのみ）
      if (typeof window !== 'undefined') {
        cachedUser = null;
        cachedLoading = false;
      }

      toast.success('ログアウトしました');

      // リダイレクトは呼び出し元で制御（skipRedirectがtrueの場合はスキップ）
      if (!options?.skipRedirect) {
        // ロケールを動的に取得（現在のパスから抽出、デフォルトは'ja'）
        let locale = 'ja';
        if (typeof window !== 'undefined') {
          const pathMatch = window.location.pathname.match(/^\/([a-z]{2})\//);
          if (pathMatch) {
            locale = pathMatch[1];
          }
        }
        const redirectPath = options?.redirectTo || `/${locale}/auth/signin`;
        router.push(redirectPath);
      }
    } catch (error) {
      logger.error('Logout error:', error);
      toast.error('ログアウト処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, logout };
}

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
 * 特定のユーザータイプが必要な場合に使用するフック
 * @param userType - 必要なユーザータイプ
 * @returns ユーザー、プロフィール、ローディング状態
 */
export function useRequireUserType(userType: UserType) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const loading = authLoading || profileLoading;

  const isValid = profile?.user_type === userType;

  return {
    user: isValid ? user : null,
    profile: isValid ? profile : null,
    loading,
  };
}
