'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { getOrganizerModelsAction } from '@/app/actions/organizer-model';
import { OrganizerModelsList } from '@/components/profile/organizer/OrganizerModelsList';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';
import type { OrganizerModelWithProfile } from '@/types/organizer-model';

export default function ModelsPage() {
  const { profile, loading: profileLoading } = useProfile();
  const [models, setModels] = useState<OrganizerModelWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 運営権限チェック
  const isOrganizer = profile?.user_type === 'organizer';

  const loadModels = async () => {
    if (!isOrganizer) return;

    try {
      setLoading(true);
      setError(null);

      const result = await getOrganizerModelsAction();

      if (result.success) {
        const modelsData = Array.isArray(result.data) ? result.data : [];
        setModels(modelsData);
        logger.info('モデル一覧取得成功', { count: modelsData.length });
      } else {
        setError(result.error || '所属モデルの取得に失敗しました');
        logger.error('モデル一覧取得エラー:', result.error);
      }
    } catch (error) {
      const errorMessage = '予期しないエラーが発生しました';
      setError(errorMessage);
      logger.error('モデル一覧読み込みエラー:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profileLoading && isOrganizer) {
      loadModels();
    } else if (!profileLoading && !isOrganizer) {
      setLoading(false);
    }
  }, [profileLoading, isOrganizer]);

  // プロフィール読み込み中
  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 統計情報 - ミニマルデザイン */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {models.length}
                  </p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    所属モデル
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {models.filter(m => m.status === 'active').length}
                  </p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    アクティブ
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {models.reduce(
                      (sum, m) => sum + (m.total_sessions_participated || 0),
                      0
                    )}
                  </p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    総参加数
                  </p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* モデル一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>所属モデル一覧</CardTitle>
            <CardDescription>
              所属モデルの詳細情報とステータス管理
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center space-x-4 p-4 border rounded-lg"
                  >
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <Alert>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : models.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  所属モデルがいません
                </h3>
                <p className="text-muted-foreground mb-4">
                  まだどのモデルも招待を承認していません。
                </p>
                <p className="text-sm text-muted-foreground">
                  プロフィールページからモデルを招待してください。
                </p>
              </div>
            ) : (
              <OrganizerModelsList models={models} onRefresh={loadModels} />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
