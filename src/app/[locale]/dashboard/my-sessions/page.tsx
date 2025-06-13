'use client';

import { PhotoSessionList } from '@/components/photo-sessions/PhotoSessionList';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useRequireAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';

export default function MySessionsPage() {
  const t = useTranslations('dashboard');
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('mySessions.title')}</h1>
          <p className="text-muted-foreground">{t('mySessions.description')}</p>
        </div>

        <PhotoSessionList
          organizerId={user?.id}
          showCreateButton={true}
          title={t('mySessions.title')}
        />
      </div>
    </DashboardLayout>
  );
}
