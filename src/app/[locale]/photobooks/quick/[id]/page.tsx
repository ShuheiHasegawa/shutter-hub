import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/server';
import {
  getPhotobook,
  getPhotobookImages,
} from '@/app/actions/quick-photobook';
import { QuickPhotobookViewer } from '@/components/photobook/quick/QuickPhotobookViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * ビューアーローディング
 */
function ViewerSkeleton() {
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

      {/* メインビューアー */}
      <Card>
        <CardContent className="p-8">
          <Skeleton className="aspect-[4/5] w-full max-w-md mx-auto" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * ビューアーコンテンツ
 */
async function ViewerContent({
  photobookId,
  isOwner,
}: {
  photobookId: string;
  isOwner: boolean;
}) {
  const user = await getCurrentUser();

  if (!user && isOwner) {
    redirect('/auth/login');
  }

  const [photobook, images] = await Promise.all([
    getPhotobook(photobookId, user?.id || ''),
    getPhotobookImages(photobookId, user?.id || ''),
  ]);

  if (!photobook) {
    notFound();
  }

  // 非公開フォトブックは所有者のみ閲覧可能
  if (!photobook.is_published && photobook.user_id !== user?.id) {
    notFound();
  }

  return (
    <QuickPhotobookViewer
      photobook={photobook}
      images={images}
      isOwner={photobook.user_id === user?.id}
    />
  );
}

/**
 * クイックフォトブック表示ページ
 */
interface ViewQuickPhotobookPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    owner?: string;
  }>;
}

export default async function ViewQuickPhotobookPage({
  params,
  searchParams,
}: ViewQuickPhotobookPageProps) {
  const { id } = await params;
  const { owner } = await searchParams;
  const isOwner = owner === 'true';

  return (
    <Suspense fallback={<ViewerSkeleton />}>
      <ViewerContent photobookId={id} isOwner={isOwner} />
    </Suspense>
  );
}

/**
 * メタデータ生成
 */
export async function generateMetadata({
  params,
}: ViewQuickPhotobookPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const photobook = await getPhotobook(id, user?.id || '');

    if (!photobook) {
      return {
        title: 'フォトブックが見つかりません | ShutterHub',
      };
    }

    // 非公開フォトブックのメタデータは制限
    if (!photobook.is_published && photobook.user_id !== user?.id) {
      return {
        title: 'プライベートフォトブック | ShutterHub',
      };
    }

    return {
      title: `${photobook.title} | ShutterHub`,
      description:
        photobook.description || 'ShutterHubで作成されたクイックフォトブック',
      openGraph: {
        title: photobook.title,
        description:
          photobook.description || 'ShutterHubで作成されたフォトブック',
        images: photobook.cover_image_url
          ? [
              {
                url: photobook.cover_image_url,
                width: 1200,
                height: 630,
                alt: photobook.title,
              },
            ]
          : undefined,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: photobook.title,
        description:
          photobook.description || 'ShutterHubで作成されたフォトブック',
        images: photobook.cover_image_url
          ? [photobook.cover_image_url]
          : undefined,
      },
    };
  } catch {
    // メタデータ生成エラーは致命的ではないため、ログのみ記録
    return {
      title: 'クイックフォトブック | ShutterHub',
    };
  }
}
