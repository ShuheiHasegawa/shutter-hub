import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import {
  getPhotobook,
  getPhotobookImages,
} from '@/app/actions/quick-photobook';
import { QuickPhotobookEditor } from '@/components/photobook/quick/QuickPhotobookEditor';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * エディターローディング
 */
function EditorSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* 左側：画像管理 */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full mb-4" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-20 w-20" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右側：プレビュー */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="aspect-[3/4] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * エディターコンテンツ
 */
async function EditorContent({ photobookId }: { photobookId: string }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  const [photobook, images] = await Promise.all([
    getPhotobook(photobookId, user.id),
    getPhotobookImages(photobookId, user.id),
  ]);

  if (!photobook) {
    notFound();
  }

  return (
    <QuickPhotobookEditor
      photobook={photobook}
      images={images}
      userId={user.id}
    />
  );
}

/**
 * クイックフォトブック編集ページ
 */
interface EditQuickPhotobookPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditQuickPhotobookPage({
  params,
}: EditQuickPhotobookPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditorContent photobookId={id} />
    </Suspense>
  );
}

export async function generateMetadata({
  params,
}: EditQuickPhotobookPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return {
      title: 'フォトブック編集 | ShutterHub',
    };
  }

  const photobook = await getPhotobook(id, user.id);

  return {
    title: photobook
      ? `${photobook.title} - 編集 | ShutterHub`
      : 'フォトブック編集 | ShutterHub',
  };
}
