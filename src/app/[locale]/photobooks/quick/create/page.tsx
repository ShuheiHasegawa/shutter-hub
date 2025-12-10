import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth/server';
import { checkPhotobookCreationLimit } from '@/app/actions/quick-photobook';
import { QuickPhotobookCreateForm } from '@/components/photobook/quick/QuickPhotobookCreateForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

/**
 * 制限チェックコンポーネント
 */
async function CreateFormWrapper() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            フォトブックを作成するにはログインが必要です。
          </AlertDescription>
        </Alert>
        <div className="mt-6 text-center">
          <Button asChild>
            <Link href="/auth/signin?redirect=/photobooks/quick/create">
              ログインしてフォトブックを作成
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const limitCheck = await checkPhotobookCreationLimit(user.id);

  if (!limitCheck.allowed) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-red-600">
            作成上限に達しています
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p>現在のプランでは最大 {limitCheck.limit} 冊まで作成できます。</p>
          <p className="text-sm">
            現在: {limitCheck.current_usage} / {limitCheck.limit} 冊
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" asChild>
              <Link href="/photobooks/quick">戻る</Link>
            </Button>
            <Button asChild>
              <Link href="/subscription">プランをアップグレード</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <QuickPhotobookCreateForm userId={user.id} />;
}

/**
 * クイックフォトブック作成ページ
 */
export default function CreateQuickPhotobookPage() {
  return (
    <div className="space-y-8">
      {/* ページヘッダー */}
      <PageTitleHeader
        title="クイックフォトブック作成"
        description="シンプルで素早くフォトブックを作成"
      />

      {/* 作成フォーム */}
      <Suspense
        fallback={
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>読み込み中...</p>
            </CardContent>
          </Card>
        }
      >
        <CreateFormWrapper />
      </Suspense>
    </div>
  );
}
