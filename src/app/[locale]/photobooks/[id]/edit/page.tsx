import React from 'react';
import { logger } from '@/lib/utils/logger';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Photobook from '@/components/photobook/Photobook';
import { samplePhotobook } from '@/constants/samplePhotobookData';
import { Photobook as PhotobookType } from '@/types/photobook';

interface PhotobookEditPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: PhotobookEditPageProps): Promise<Metadata> {
  const supabase = await createClient();
  const resolvedParams = await params;

  const { data: photobook, error } = await supabase
    .from('photobooks')
    .select('title')
    .eq('id', resolvedParams.id)
    .single();

  if (error || !photobook) {
    return {
      title: 'フォトブック編集 | ShutterHub',
      description: 'フォトブックを編集します',
    };
  }

  return {
    title: `${photobook.title} - 編集 | ShutterHub`,
    description: `${photobook.title}を編集しています`,
  };
}

async function getEditablePhotobookData(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // フォトブック基本情報を取得
  const { data: photobook, error: photobookError } = await supabase
    .from('photobooks')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id) // 所有者のみ編集可能
    .single();

  if (photobookError || !photobook) {
    return null;
  }

  // ページとフォト情報を取得（今後の実装用）
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
  };

  return {
    photobook: photobookData,
    subscriptionPlan: photobook.subscription_plan,
    maxPages: photobook.max_pages,
    maxPhotos: photobook.max_photos,
    currentPages: photobook.current_pages,
    currentPhotos: photobook.current_photos,
  };
}

export default async function PhotobookEditPage({
  params,
}: PhotobookEditPageProps) {
  const resolvedParams = await params;
  const data = await getEditablePhotobookData(resolvedParams.id);

  if (!data) {
    redirect('/auth/signin');
  }

  const {
    photobook,
    subscriptionPlan,
    maxPages,
    maxPhotos,
    currentPages,
    currentPhotos,
  } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() =>
                  (window.location.href = `/photobooks/${resolvedParams.id}`)
                }
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← 表示に戻る
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {photobook.title} - 編集
                </h1>
                <p className="text-sm text-gray-600">
                  写真を配置して、フォトブックを編集しましょう
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  subscriptionPlan === 'premium'
                    ? 'bg-purple-100 text-purple-800'
                    : subscriptionPlan === 'admin'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {subscriptionPlan === 'premium'
                  ? 'PREMIUM'
                  : subscriptionPlan === 'admin'
                    ? 'ADMIN'
                    : 'FREE'}
              </span>

              <div className="text-xs text-gray-500">
                {maxPages === -1
                  ? `${currentPages}ページ`
                  : `${currentPages}/${maxPages}ページ`}
              </div>

              <div className="flex items-center space-x-2">
                <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                  保存
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  プレビュー
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    photobook.isPublished
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {photobook.isPublished ? '非公開にする' : '公開する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* プラン制限の表示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">
                編集中:{' '}
                {subscriptionPlan === 'free'
                  ? 'フリープラン'
                  : subscriptionPlan === 'premium'
                    ? 'プレミアムプラン'
                    : '管理者プラン'}
              </h3>
              <div className="text-sm text-blue-700 space-x-4">
                <span>
                  ページ:{' '}
                  {maxPages === -1
                    ? `${currentPages}`
                    : `${currentPages}/${maxPages}`}
                </span>
                <span>
                  写真:{' '}
                  {maxPhotos === -1
                    ? `${currentPhotos}`
                    : `${currentPhotos}/${maxPhotos}`}
                </span>
              </div>
            </div>

            {subscriptionPlan === 'free' && (
              <div className="text-right">
                <p className="text-sm text-blue-700 mb-2">
                  制限を解除しますか？
                </p>
                <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
                  プレミアムにアップグレード
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 編集ツールバー */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                写真を追加
              </button>
              <button className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                ページを追加
              </button>
              <button className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors">
                レイアウト変更
              </button>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>自動保存</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>履歴保存</span>
              </div>
            </div>
          </div>
        </div>

        {/* フォトブック編集コンポーネント */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <Photobook
            photobook={photobook}
            isEditable={true}
            onPhotoClick={photo => logger.debug('Photo clicked:', photo)}
          />
        </div>

        {/* フッター情報 */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Ctrl+S で保存</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Ctrl+Z で元に戻す</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>ドラッグで写真移動</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            最終保存: {photobook.updatedAt.toLocaleString('ja-JP')}
          </p>
        </div>
      </div>
    </div>
  );
}
