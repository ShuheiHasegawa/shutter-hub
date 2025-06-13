'use client';

import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface UseAuthOptions {
  requireAuth?: boolean;
  redirectTo?: string;
}

interface Profile {
  id: string;
  role: 'user' | 'admin' | 'super_admin';
  display_name?: string;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { requireAuth = false, redirectTo = '/auth/login' } = options;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (initialized) return;

    // 初期セッション取得
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
      setInitialized(true);

      // 認証が必要なページで未認証の場合はリダイレクト
      if (requireAuth && !session?.user) {
        router.push(redirectTo);
      }
    };

    getInitialSession();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // 認証が必要なページで未認証の場合はリダイレクト
      if (requireAuth && !session?.user) {
        router.push(redirectTo);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, initialized, requireAuth, redirectTo, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
  };
}

// 認証が必要なページ用の専用フック
export function useRequireAuth(redirectTo?: string) {
  return useAuth({ requireAuth: true, redirectTo });
}

// 管理者権限が必要なページ用の専用フック
export function useRequireAdmin(redirectTo?: string) {
  const { user, loading: authLoading } = useAuth({
    requireAuth: true,
    redirectTo,
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!user || authLoading) return;

    const checkAdminAccess = async () => {
      setLoading(true);
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('id, role, display_name')
          .eq('id', user.id)
          .single();

        if (error || !profileData) {
          console.error('プロフィール取得エラー:', error);
          setHasAdminAccess(false);
          router.push('/');
          return;
        }

        setProfile(profileData);

        const isAdmin = ['admin', 'super_admin'].includes(profileData.role);
        setHasAdminAccess(isAdmin);

        if (!isAdmin) {
          router.push('/');
        }
      } catch (error) {
        console.error('管理者権限チェックエラー:', error);
        setHasAdminAccess(false);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [user, authLoading, router, supabase]);

  return {
    user,
    profile,
    loading: authLoading || loading,
    hasAdminAccess,
    isAuthenticated: !!user,
  };
}
