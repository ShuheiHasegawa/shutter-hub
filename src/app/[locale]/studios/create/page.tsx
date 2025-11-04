'use client';

import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { StudioCreateForm } from '@/components/studio/StudioCreateForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import { BuildingIcon } from 'lucide-react';

export default function CreateStudioPage() {
  const router = useRouter();

  const handleSuccess = (studioId: string) => {
    router.push(`/studios/${studioId}`);
  };

  return (
    <AuthenticatedLayout>
      <div>
        {/* ヘッダー */}
        <PageTitleHeader
          title="スタジオ作成"
          icon={<BuildingIcon className="h-6 w-6" />}
          backButton={{ href: '/studios', variant: 'ghost' }}
        />

        {/* フォーム */}
        <Card>
          <CardHeader>
            <CardTitle>スタジオ情報入力</CardTitle>
          </CardHeader>
          <CardContent>
            <ErrorBoundary
              fallback={
                <div className="p-4 text-center">
                  <h3 className="text-lg font-semibold text-red-600 mb-2">
                    エラーが発生しました
                  </h3>
                  <p className="text-gray-600 mb-4">
                    フォームの読み込み中に問題が発生しました。
                  </p>
                  <Button onClick={() => window.location.reload()}>
                    ページを再読み込み
                  </Button>
                </div>
              }
              onError={() => {
                // ErrorBoundary fallback will handle the error display
              }}
            >
              <StudioCreateForm onSuccess={handleSuccess} />
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
