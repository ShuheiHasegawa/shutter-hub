'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StudioCreateForm } from '@/components/studio/StudioCreateForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';

export default function CreateStudioPage() {
  const router = useRouter();

  const handleSuccess = (studioId: string) => {
    router.push(`/studios/${studioId}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link href="/studios">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              スタジオ一覧に戻る
            </Button>
          </Link>

          <h1 className="text-3xl font-bold">新しいスタジオを追加</h1>
          <p className="text-gray-600 mt-1">
            撮影会で利用するスタジオの情報を登録してください
          </p>
        </div>

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
              <StudioCreateForm
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
