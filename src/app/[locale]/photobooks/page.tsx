import React from 'react';
import { samplePhotobook } from '@/constants/samplePhotobookData';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Eye, Calendar, User } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'フォトブック・ライブラリ | ShutterHub',
  description:
    'プロフェッショナルな写真集のサンプルをご覧ください。美しい本棚風のレイアウトでフォトブックを閲覧できます。',
  keywords: [
    'フォトブック',
    '写真集',
    'ライブラリ',
    'サンプル',
    'ポートフォリオ',
    'ShutterHub',
  ],
  openGraph: {
    title: 'フォトブック・ライブラリ | ShutterHub',
    description: 'プロフェッショナルな写真集のサンプルをご覧ください',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'フォトブック・ライブラリ | ShutterHub',
    description: 'プロフェッショナルな写真集のサンプルをご覧ください',
  },
};

export default function PhotobooksPage() {
  // サンプルフォトブックを配列として扱う（本棚表示のため）
  const samplePhotobooks = [samplePhotobook];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* フォトブックについてのカード */}
        <div className="brounded-lg p-4 border">
          <h3 className="text-lg font-semibold mb-2">フォトブックについて</h3>
          <p className="leading-relaxed text-sm">
            ShutterHubのフォトブック機能では、撮影した写真を美しいレイアウトで整理し、
            プロフェッショナルな写真集として作成することができます。
            様々なテンプレートとレイアウトオプションをご用意しており、
            あなたの作品を最高の形で表現できます。
          </p>
        </div>

        {/* 本棚セクション */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              サンプルフォトブック
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              プロフェッショナルな写真集のサンプルをご覧ください
            </p>
          </div>

          <div className="p-6">
            {/* 本棚風レイアウト */}
            <div className="relative">
              {/* 本棚の背景 */}
              <div className="bg-gradient-to-b from-amber-800 to-amber-900 dark:from-amber-900 dark:to-amber-950 rounded-lg p-8 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {samplePhotobooks.map(photobook => (
                    <div
                      key={photobook.id}
                      className="group cursor-pointer transform transition-all duration-300 hover:-translate-y-2 hover:rotate-1"
                    >
                      {/* フォトブックカード */}
                      <Link
                        href={`/photobook/view/${photobook.id}`}
                        className="block"
                      >
                        <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
                          {/* カバー画像 */}
                          <div className="aspect-[3/4] rounded-t-lg overflow-hidden bg-gray-100">
                            {photobook.coverPhoto ? (
                              <Image
                                src={photobook.coverPhoto.src}
                                alt={
                                  photobook.coverPhoto.alt || photobook.title
                                }
                                width={300}
                                height={400}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                <BookOpen className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* フォトブック情報 */}
                          <div className="p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                              {photobook.title}
                            </h3>

                            {photobook.description && (
                              <p
                                className="text-sm text-gray-600 mb-3 overflow-hidden"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical' as const,
                                }}
                              >
                                {photobook.description}
                              </p>
                            )}

                            <div className="space-y-2">
                              <div className="flex items-center text-xs text-gray-500">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(
                                  photobook.createdAt
                                ).toLocaleDateString('ja-JP')}
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-xs text-gray-500">
                                  <User className="h-3 w-3 mr-1" />
                                  <span>サンプル作品</span>
                                </div>

                                <div className="flex items-center text-xs text-blue-600">
                                  <Eye className="h-3 w-3 mr-1" />
                                  <span>閲覧する</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}

                  {/* 空のスロット（本棚の雰囲気作り） */}
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="aspect-[3/4] bg-amber-700/20 dark:bg-amber-600/20 rounded-lg border-2 border-dashed border-amber-600/30 dark:border-amber-500/30 flex items-center justify-center opacity-60"
                    >
                      <div className="text-center text-amber-600/70 dark:text-amber-400/70">
                        <BookOpen className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-xs">今後追加予定</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 本棚の装飾 */}
              <div className="absolute -bottom-2 left-0 right-0 h-4 bg-gradient-to-b from-amber-900 to-amber-950 dark:from-amber-950 dark:to-black rounded-b-lg shadow-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
