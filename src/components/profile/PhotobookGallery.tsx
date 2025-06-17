'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Eye,
  Heart,
  Calendar,
  Lock,
  Grid3X3,
  List,
  Image as ImageIcon,
  Crown,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PhotobookData } from '@/types/photobook';

interface PhotobookGalleryProps {
  userId: string;
  isOwnProfile: boolean;
}

export const PhotobookGallery: React.FC<PhotobookGalleryProps> = ({
  userId,
  isOwnProfile,
}) => {
  const [photobooks, setPhotobooks] = useState<PhotobookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const loadPhotobooks = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        let query = supabase
          .from('photobooks')
          .select(
            `
            id,
            user_id,
            title,
            description,
            cover_image_url,
            is_published,
            is_public,
            subscription_plan,
            created_at,
            updated_at,
            photobook_statistics (
              view_count,
              likes_count,
              comments_count
            )
          `
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        // 自分のプロフィール以外は公開フォトブックのみ表示
        if (!isOwnProfile) {
          query = query.eq('is_published', true).eq('is_public', true);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error loading photobooks:', error);
          return;
        }

        setPhotobooks(data || []);
      } catch (error) {
        console.error('Failed to load photobooks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPhotobooks();
  }, [userId, isOwnProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">フォトブックを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (photobooks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen size={32} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isOwnProfile
            ? 'フォトブックがありません'
            : '公開フォトブックがありません'}
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {isOwnProfile
            ? '撮影した写真を美しいフォトブックにまとめて、作品ポートフォリオを作成しましょう。'
            : 'このユーザーはまだフォトブックを公開していません。'}
        </p>
        {isOwnProfile && (
          <Link
            href="/photobooks/create"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <BookOpen size={20} className="mr-2" />
            最初のフォトブックを作成
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* コントロールバー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">フォトブック</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {photobooks.length}冊
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* 表示モード切り替え */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="グリッド表示"
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="リスト表示"
            >
              <List size={16} />
            </button>
          </div>

          {isOwnProfile && (
            <Link
              href="/photobooks"
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              管理
            </Link>
          )}
        </div>
      </div>

      {/* フォトブック一覧 */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
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
                  ? 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group'
                  : 'bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center space-x-4 hover:shadow-md transition-shadow group'
              }
            >
              {viewMode === 'grid' ? (
                // グリッド表示
                <Link href={`/photobooks/${photobook.id}`} className="block">
                  {/* カバー画像 */}
                  <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
                    {photobook.cover_image_url ? (
                      <Image
                        src={photobook.cover_image_url}
                        alt={photobook.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon size={48} className="text-gray-400" />
                      </div>
                    )}

                    {/* オーバーレイ情報 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center justify-between text-white text-sm">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <Eye size={14} />
                              <span>
                                {photobook.photobook_statistics?.[0]
                                  ?.view_count || 0}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart size={14} />
                              <span>
                                {photobook.photobook_statistics?.[0]
                                  ?.likes_count || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 状態表示 */}
                    <div className="absolute top-2 right-2 flex items-center space-x-2">
                      {!photobook.is_published && (
                        <div className="bg-gray-900/80 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                          <Lock size={12} />
                          <span>非公開</span>
                        </div>
                      )}
                      {photobook.subscription_plan === 'premium' && (
                        <div className="bg-purple-600 text-white p-1.5 rounded-full">
                          <Crown size={12} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 情報エリア */}
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900 mb-1 line-clamp-1">
                      {photobook.title}
                    </h4>
                    {photobook.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {photobook.description}
                      </p>
                    )}
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar size={12} className="mr-1" />
                      <span>
                        {new Date(photobook.created_at).toLocaleDateString(
                          'ja-JP'
                        )}
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                // リスト表示
                <>
                  {/* サムネイル */}
                  <Link
                    href={`/photobooks/${photobook.id}`}
                    className="flex-shrink-0"
                  >
                    <div className="w-16 h-20 bg-gray-100 rounded relative overflow-hidden">
                      {photobook.cover_image_url ? (
                        <Image
                          src={photobook.cover_image_url}
                          alt={photobook.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon size={24} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* 情報 */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/photobooks/${photobook.id}`}
                      className="block"
                    >
                      <h4 className="font-medium text-gray-900 mb-1">
                        {photobook.title}
                      </h4>
                      {photobook.description && (
                        <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                          {photobook.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar size={12} />
                          <span>
                            {new Date(photobook.created_at).toLocaleDateString(
                              'ja-JP'
                            )}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye size={12} />
                          <span>
                            {photobook.photobook_statistics?.[0]?.view_count ||
                              0}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart size={12} />
                          <span>
                            {photobook.photobook_statistics?.[0]?.likes_count ||
                              0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* ステータス */}
                  <div className="flex items-center space-x-2">
                    {!photobook.is_published && (
                      <div className="text-gray-400" title="非公開">
                        <Lock size={16} />
                      </div>
                    )}
                    {photobook.subscription_plan === 'premium' && (
                      <div className="text-purple-600" title="プレミアム">
                        <Crown size={16} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* フッター */}
      {isOwnProfile && photobooks.length > 0 && (
        <div className="text-center pt-6">
          <Link
            href="/photobooks"
            className="inline-flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <BookOpen size={16} className="mr-2" />
            すべてのフォトブックを管理
          </Link>
        </div>
      )}
    </div>
  );
};
