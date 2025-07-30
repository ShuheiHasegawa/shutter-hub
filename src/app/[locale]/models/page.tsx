'use client';

import { useProfile } from '@/hooks/useProfile';
import { OrganizerModelManagement } from '@/components/profile/organizer/OrganizerModelManagement';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

export default function ModelsPage() {
  const { profile, loading: profileLoading } = useProfile();

  // 運営権限チェック
  const isOrganizer = profile?.user_type === 'organizer';

  // プロフィール読み込み中
  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 運営権限なし
  if (!isOrganizer) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              このページは運営者のみがアクセスできます。
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              モデル管理
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              所属モデルの管理、招待の送信・確認を行います
            </p>
          </div>

          <OrganizerModelManagement
            showStatistics={true}
            showRefreshButton={true}
            defaultTab="models"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
