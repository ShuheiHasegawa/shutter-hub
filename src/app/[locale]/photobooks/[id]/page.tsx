import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Photobook from '@/components/photobook/Photobook';
import { samplePhotobook } from '@/constants/samplePhotobookData';
import { Photo, Photobook as PhotobookType } from '@/types/photobook';

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
    console.error('Error fetching pages:', pagesError);
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

  const handlePhotoClick = (photo: Photo) => {
    console.log('Photo clicked:', photo);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← 戻る
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {photobook.title}
                </h1>
                {photobook.description && (
                  <p className="text-sm text-gray-600">
                    {photobook.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* 統計情報 */}
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <span>👁</span>
                  <span>{statistics.view_count}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>❤️</span>
                  <span>{statistics.likes_count}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>💬</span>
                  <span>{statistics.comments_count}</span>
                </div>
              </div>

              {/* 公開状態 */}
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  photobook.isPublished
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {photobook.isPublished ? '公開中' : '非公開'}
              </div>

              {/* オーナーのみの編集ボタン */}
              {isOwner && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      (window.location.href = `/photobooks/${resolvedParams.id}/edit`)
                    }
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    編集
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                    共有
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 作成日時表示 */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500">
            作成日: {photobook.createdAt.toLocaleDateString('ja-JP')}
            {photobook.updatedAt.getTime() !==
              photobook.createdAt.getTime() && (
              <span className="ml-2">
                更新日: {photobook.updatedAt.toLocaleDateString('ja-JP')}
              </span>
            )}
          </p>
        </div>

        {/* フォトブック表示コンポーネント */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <Photobook
            photobook={photobook}
            isEditable={false}
            onPhotoClick={handlePhotoClick}
          />
        </div>

        {/* アクションボタン（ゲスト用） */}
        {!isOwner && (
          <div className="mt-8 text-center space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <button className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
                <span className="mr-2">❤️</span>
                いいね ({statistics.likes_count})
              </button>
              <button className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                <span className="mr-2">📤</span>
                共有
              </button>
              <button className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors">
                <span className="mr-2">💬</span>
                コメント
              </button>
            </div>

            <p className="text-sm text-gray-600">
              このフォトブックが気に入ったら、作成者をフォローしてさらなる作品をチェックしましょう
            </p>
          </div>
        )}

        {/* 関連フォトブック（将来実装） */}
        {!isOwner && (
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              同じ作成者の他の作品
            </h3>
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <p className="text-gray-600">
                関連するフォトブックの表示機能は今後実装予定です
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
