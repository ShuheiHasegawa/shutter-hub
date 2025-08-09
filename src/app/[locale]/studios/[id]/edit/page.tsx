'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getStudioDetailAction } from '@/app/actions/studio';
import { StudioEditForm } from '@/components/studio/StudioEditForm';
import { StudioWithStats } from '@/types/database';

export default function StudioEditPage() {
  const params = useParams();
  const router = useRouter();
  const studioId = params.id as string;

  const [studio, setStudio] = useState<StudioWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudio = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getStudioDetailAction(studioId);

        if (result.success && result.studio) {
          setStudio(result.studio);
        } else {
          setError(result.error || 'スタジオの取得に失敗しました');
        }
      } catch {
        setError('スタジオの取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    if (studioId) {
      fetchStudio();
    }
  }, [studioId]);

  const handleSuccess = () => {
    router.push(`/studios/${studioId}`);
  };

  const handleCancel = () => {
    router.push(`/studios/${studioId}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !studio) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Alert>
            <AlertDescription>
              {error || 'スタジオが見つかりません'}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link href={`/studios/${studioId}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              スタジオ詳細に戻る
            </Button>
          </Link>

          <h1 className="text-3xl font-bold">スタジオ編集</h1>
          <p className="text-gray-600 mt-2">{studio.name}の情報を編集します</p>
        </div>

        {/* 編集フォーム */}
        <StudioEditForm
          studio={studio}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </DashboardLayout>
  );
}
