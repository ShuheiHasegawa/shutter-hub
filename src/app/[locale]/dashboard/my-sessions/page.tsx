'use client';

import { PhotoSessionList } from '@/components/photo-sessions/PhotoSessionList';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MySessionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations('dashboard');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/ja/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('mySessions')}</h1>
          <p className="text-muted-foreground mt-1">
            あなたが参加・主催する撮影会の一覧
          </p>
        </div>

        <PhotoSessionList organizerId={user.id} />
      </div>
    </DashboardLayout>
  );
}
