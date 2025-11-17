'use client';

import { useEffect } from 'react';
import { useAuth, useUserProfile, useRequireUserType } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { UserType } from '@/types/database';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = '/auth/signin',
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        router.push(redirectTo);
      } else if (!requireAuth && user) {
        router.push('/');
      }
    }
  }, [user, loading, requireAuth, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null;
  }

  if (!requireAuth && user) {
    return null;
  }

  return <>{children}</>;
}

interface UserTypeGuardProps {
  children: React.ReactNode;
  userType: UserType;
  redirectTo?: string;
}

/**
 * ユーザータイプガードコンポーネント
 * 特定のユーザータイプ（model/photographer/organizer）が必要な場合に使用
 */
export function UserTypeGuard({
  children,
  userType,
  redirectTo = '/auth/signin',
}: UserTypeGuardProps) {
  const { user, profile, loading } = useRequireUserType(userType);
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.push(redirectTo);
    }
  }, [user, profile, loading, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return <>{children}</>;
}

interface AdminGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * 管理者権限ガードコンポーネント
 * 管理者権限が必要な場合に使用
 */
export function AdminGuard({
  children,
  redirectTo = '/auth/signin',
}: AdminGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const router = useRouter();
  const loading = authLoading || profileLoading;

  useEffect(() => {
    if (!loading) {
      if (!user || !profile) {
        router.push(redirectTo);
        return;
      }

      const role = profile.role as 'user' | 'admin' | 'super_admin' | null;
      if (!role || !['admin', 'super_admin'].includes(role)) {
        router.push(redirectTo);
      }
    }
  }, [user, profile, loading, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const role = profile.role as 'user' | 'admin' | 'super_admin' | null;
  if (!role || !['admin', 'super_admin'].includes(role)) {
    return null;
  }

  return <>{children}</>;
}
