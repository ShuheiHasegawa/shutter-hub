'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';

/**
 * プロフィールページリダイレクト
 * /profile → /profile/[userId] への自動リダイレクト（デファクトスタンダード）
 */
export default function ProfileRedirectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // 未認証の場合はログインページへ
        router.push('/auth/signin');
      } else {
        // 認証済みの場合は自分のプロフィールページへリダイレクト
        router.replace(`/profile/${user.id}`);
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>プロフィールページに移動中...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // リダイレクト中の表示
  return (
    <AuthenticatedLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>プロフィールページに移動中...</p>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
