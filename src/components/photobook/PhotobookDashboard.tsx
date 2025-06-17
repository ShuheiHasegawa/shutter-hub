'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  BookOpen,
  Edit3,
  Eye,
  Trash2,
  Calendar,
  Image as ImageIcon,
  Lock,
  Crown,
  Grid,
} from 'lucide-react';

interface PhotobookData {
  id: string;
  title: string;
  created_at: string;
  is_published: boolean;
  cover_image_url?: string;
}

interface PhotobookLimits {
  maxPhotobooks: number;
  maxPages: number;
  maxPhotos: number;
  hasPremiumTemplates: boolean;
}

interface PhotobookDashboardProps {
  photobooks: PhotobookData[];
  limits: PhotobookLimits;
  subscriptionPlan: string;
  canCreateNew: boolean;
}

export const PhotobookDashboard: React.FC<PhotobookDashboardProps> = ({
  photobooks,
  limits,
  subscriptionPlan,
  canCreateNew,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // フォトブック作成
  const handleCreatePhotobook = () => {
    if (!canCreateNew) {
      // アップグレード促進
      alert(
        'フォトブックの作成上限に達しました。プレミアムプランにアップグレードしてください。'
      );
      return;
    }
    // フォトブック作成ページに遷移
    window.location.href = '/photobooks/create';
  };

  // フォトブック削除
  const handleDeletePhotobook = async (photobookId: string) => {
    if (confirm('このフォトブックを削除しますか？この操作は元に戻せません。')) {
      try {
        // TODO: Server Actionで削除処理
        console.log('Deleting photobook:', photobookId);
      } catch (error) {
        console.error('Failed to delete photobook:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* コントロールバー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            マイフォトブック
          </h2>
          <span className="text-sm text-gray-500">{photobooks.length}冊</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* 表示モード切り替え */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BookOpen size={16} />
            </button>
          </div>

          {/* 新規作成ボタン */}
          <button
            onClick={handleCreatePhotobook}
            disabled={!canCreateNew}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              canCreateNew
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus size={18} />
            <span>新しいフォトブック</span>
          </button>
        </div>
      </div>

      {/* フォトブック一覧 */}
      {photobooks.length === 0 ? (
        // 空の状態
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen size={48} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            最初のフォトブックを作成しましょう
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            撮影した写真を美しいフォトブックにまとめて、作品ポートフォリオを作成できます。
          </p>
          <button
            onClick={handleCreatePhotobook}
            disabled={!canCreateNew}
            className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              canCreateNew
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus size={20} />
            <span>フォトブックを作成</span>
          </button>

          {!canCreateNew && (
            <p className="text-sm text-orange-600 mt-3">
              作成上限に達しました。プレミアムプランで無制限に作成できます。
            </p>
          )}
        </div>
      ) : (
        // フォトブック一覧表示
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }
        >
          <AnimatePresence>
            {photobooks.map(photobook => (
              <motion.div
                key={photobook.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={
                  viewMode === 'grid'
                    ? 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow'
                    : 'bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center space-x-4 hover:shadow-md transition-shadow'
                }
              >
                {viewMode === 'grid' ? (
                  // グリッド表示
                  <>
                    {/* カバー画像 */}
                    <div className="aspect-[3/4] bg-gray-100 relative">
                      {photobook.cover_image_url ? (
                        <Image
                          src={photobook.cover_image_url}
                          alt={photobook.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon size={48} className="text-gray-400" />
                        </div>
                      )}

                      {/* 公開状態 */}
                      <div className="absolute top-2 right-2">
                        {photobook.is_published ? (
                          <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            公開中
                          </div>
                        ) : (
                          <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                            非公開
                          </div>
                        )}
                      </div>

                      {/* プレミアム表示 */}
                      {limits.hasPremiumTemplates && (
                        <div className="absolute top-2 left-2">
                          <Crown size={16} className="text-yellow-500" />
                        </div>
                      )}
                    </div>

                    {/* 情報エリア */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
                        {photobook.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <Calendar size={14} className="mr-1" />
                        <span>
                          {new Date(photobook.created_at).toLocaleDateString(
                            'ja-JP'
                          )}
                        </span>
                      </div>

                      {/* アクションボタン */}
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/photobooks/${photobook.id}`}
                          className="flex-1 flex items-center justify-center space-x-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          <Eye size={14} />
                          <span>表示</span>
                        </Link>
                        <Link
                          href={`/photobooks/${photobook.id}/edit`}
                          className="flex-1 flex items-center justify-center space-x-1 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                        >
                          <Edit3 size={14} />
                          <span>編集</span>
                        </Link>
                        <button
                          onClick={() => handleDeletePhotobook(photobook.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  // リスト表示
                  <>
                    {/* サムネイル */}
                    <div className="w-16 h-20 bg-gray-100 rounded flex-shrink-0 relative">
                      {photobook.cover_image_url ? (
                        <Image
                          src={photobook.cover_image_url}
                          alt={photobook.title}
                          fill
                          className="object-cover rounded"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon size={24} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* 情報 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {photobook.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          <span>
                            {new Date(photobook.created_at).toLocaleDateString(
                              'ja-JP'
                            )}
                          </span>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            photobook.is_published
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {photobook.is_published ? '公開中' : '非公開'}
                        </div>
                      </div>
                    </div>

                    {/* アクション */}
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/photobooks/${photobook.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        href={`/photobooks/${photobook.id}/edit`}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={16} />
                      </Link>
                      <button
                        onClick={() => handleDeletePhotobook(photobook.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* プラン制限の詳細表示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              subscriptionPlan === 'premium'
                ? 'bg-purple-100 text-purple-600'
                : subscriptionPlan === 'admin'
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            {subscriptionPlan === 'premium' || subscriptionPlan === 'admin' ? (
              <Crown size={16} />
            ) : (
              <Lock size={16} />
            )}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">
              {subscriptionPlan === 'premium'
                ? 'プレミアムプラン'
                : subscriptionPlan === 'admin'
                  ? '管理者プラン'
                  : 'フリープラン'}
            </h4>
            <p className="text-sm text-gray-600">
              現在のプランの利用状況と制限
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-1">フォトブック作成数</div>
            <div className="text-lg font-semibold text-gray-900">
              {photobooks.length}
              {limits.maxPhotobooks === -1 ? '' : ` / ${limits.maxPhotobooks}`}
              <span className="text-sm font-normal text-gray-500 ml-1">冊</span>
            </div>
            {limits.maxPhotobooks !== -1 && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min((photobooks.length / limits.maxPhotobooks) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-1">ページ数制限</div>
            <div className="text-lg font-semibold text-gray-900">
              {limits.maxPages === -1
                ? '無制限'
                : `最大 ${limits.maxPages}ページ`}
            </div>
          </div>

          <div className="bg-white rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-1">
              プレミアムテンプレート
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {limits.hasPremiumTemplates ? '利用可能' : '利用不可'}
            </div>
          </div>
        </div>

        {subscriptionPlan === 'free' && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 mb-2">
              プレミアムプランで制限を解除し、より多くの機能をご利用いただけます
            </p>
            <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
              プランをアップグレード
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
