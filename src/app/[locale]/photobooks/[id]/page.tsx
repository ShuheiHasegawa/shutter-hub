import React from 'react';
import { logger } from '@/lib/utils/logger';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { samplePhotobook } from '@/constants/samplePhotobookData';
import { Photobook as PhotobookType } from '@/types/photobook';
import { PhotobookPageClient } from '@/components/photobook/PhotobookPageClient';

interface PhotobookPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: PhotobookPageProps): Promise<Metadata> {
  const supabase = await createClient();
  const resolvedParams = await params;

  const { data: photobook, error } = await supabase
    .from('photobooks')
    .select('title, description')
    .eq('id', resolvedParams.id)
    .single();

  if (error || !photobook) {
    return {
      title: 'フォトブックが見つかりません | ShutterHub',
      description:
        '指定されたフォトブックは存在しないか、アクセス権限がありません。',
    };
  }

  return {
    title: `${photobook.title} | ShutterHub`,
    description: photobook.description || 'ShutterHubで作成されたフォトブック',
  };
}

async function getPhotobookData(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // フォトブック基本情報を取得
  const { data: photobook, error: photobookError } = await supabase
    .from('photobooks')
    .select(
      `
      *,
      photobook_statistics (
        view_count,
        likes_count,
        comments_count
      )
    `
    )
    .eq('id', id)
    .single();

  if (photobookError || !photobook) {
    return null;
  }

  // アクセス権限チェック
  const isOwner = user?.id === photobook.user_id;
  const isPublic = photobook.is_published && photobook.is_public;

  if (!isOwner && !isPublic) {
    return null;
  }

  // ページとフォト情報を取得
  const { error: pagesError } = await supabase
    .from('photobook_pages')
    .select(
      `
      *,
      photobook_photos (*)
    `
    )
    .eq('photobook_id', id)
    .order('page_number');

  if (pagesError) {
    logger.error('Error fetching pages:', pagesError);
  }

  // 既存のPhotobook型に変換（一時的にサンプルデータを使用）
  const photobookData: PhotobookType = {
    ...samplePhotobook,
    id: photobook.id,
    userId: photobook.user_id,
    title: photobook.title,
    description: photobook.description || '',
    isPublished: photobook.is_published,
    createdAt: new Date(photobook.created_at),
    updatedAt: new Date(photobook.updated_at),
    // TODO: データベースのページ・写真データを既存の型に変換
    // 現在は表示のためサンプルデータを使用
  };

  return {
    photobook: photobookData,
    isOwner,
    statistics: photobook.photobook_statistics?.[0] || {
      view_count: 0,
      likes_count: 0,
      comments_count: 0,
    },
  };
}

export default async function PhotobookPage({ params }: PhotobookPageProps) {
  const resolvedParams = await params;
  const data = await getPhotobookData(resolvedParams.id);

  if (!data) {
    notFound();
  }

  const { photobook, isOwner, statistics } = data;

  // ビュー数を増加（オーナー以外の場合）
  if (!isOwner) {
    const supabase = await createClient();
    await supabase
      .from('photobook_statistics')
      .update({
        view_count: statistics.view_count + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('photobook_id', resolvedParams.id);
  }

  return (
    <PhotobookPageClient
      photobook={photobook}
      isOwner={isOwner}
      statistics={statistics}
      photobookId={resolvedParams.id}
    />
  );
}
