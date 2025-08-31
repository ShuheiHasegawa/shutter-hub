'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthenticatedLayout } from '@/components/layout/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageTitleHeader } from '@/components/ui/page-title-header';
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
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error || !studio) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Alert>
            <AlertDescription>
              {error || 'スタジオが見つかりません'}
            </AlertDescription>
          </Alert>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* ヘッダー */}
        <PageTitleHeader
          title="スタジオ編集"
          description={`${studio.name}の情報を編集します`}
          backButton={{ href: `/studios/${studioId}`, variant: 'ghost' }}
          className="mb-6"
        />

        {/* 編集フォーム */}
        <StudioEditForm
          studio={studio}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </AuthenticatedLayout>
  );
}
