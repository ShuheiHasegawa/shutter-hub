'use client';

import { logger } from '@/lib/utils/logger';
import Photobook from '@/components/photobook/Photobook';
import { Photo, Photobook as PhotobookType } from '@/types/photobook';
import { FormattedDateTime } from '@/components/ui/formatted-display';

interface PhotobookPageClientProps {
  photobook: PhotobookType;
  isOwner: boolean;
  statistics: {
    view_count: number;
    likes_count: number;
    comments_count: number;
  };
  photobookId: string;
}

export function PhotobookPageClient({
  photobook,
  isOwner,
  statistics,
  photobookId,
}: PhotobookPageClientProps) {
  const handlePhotoClick = (photo: Photo) => {
    logger.debug('Photo clicked:', photo);
  };

  const handleBackClick = () => {
    window.history.back();
  };

  const handleEditClick = () => {
    window.location.href = `/photobooks/${photobookId}/edit`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackClick}
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
                    onClick={handleEditClick}
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
            作成日:{' '}
            <FormattedDateTime
              value={photobook.createdAt}
              format="date-short"
            />
            {photobook.updatedAt.getTime() !==
              photobook.createdAt.getTime() && (
              <span className="ml-2">
                更新日:{' '}
                <FormattedDateTime
                  value={photobook.updatedAt}
                  format="date-short"
                />
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
