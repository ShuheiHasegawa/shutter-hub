'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StudioCreateForm } from '@/components/studio/StudioCreateForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
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
            <StudioCreateForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
