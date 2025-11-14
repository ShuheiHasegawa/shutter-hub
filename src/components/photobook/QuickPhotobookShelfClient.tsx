'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  BookOpen,
  Eye,
  Edit3,
  MoreVertical,
  Plus,
  Calendar,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeletePhotobookDialog } from '@/components/photobook/DeletePhotobookDialog';
import type {
  PhotobookListItem,
  PhotobookPlanLimits,
} from '@/types/quick-photobook';
import { FormattedDateTime } from '@/components/ui/formatted-display';

interface QuickPhotobookShelfClientProps {
  photobooks: PhotobookListItem[];
  planLimits: PhotobookPlanLimits;
  userId: string;
}

/**
 * クイックフォトブック本棚のクライアントコンポーネント
 */
export function QuickPhotobookShelfClient({
  photobooks,
  planLimits,
  userId,
}: QuickPhotobookShelfClientProps) {
  // クイックフォトブックの最大数を表示数として使用
  const maxDisplayCount = planLimits.quick.maxPhotobooks;
  const displayPhotobooks = photobooks.slice(0, maxDisplayCount);

  // プラン上限チェック
  const canCreateNew = displayPhotobooks.length < maxDisplayCount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* 新規作成カード */}
      <div className="group transform transition-all duration-300 hover:-translate-y-2">
        {canCreateNew ? (
          <Link href="/photobooks/quick/create">
            <div className="surface-accent rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-dashed border-emerald-300/50">
              <div className="aspect-[3/4] flex items-center justify-center">
                <div className="text-center">
                  <Plus className="h-12 w-12 mx-auto mb-3 opacity-80" />
                  <p className="text-sm font-medium opacity-90">新規作成</p>
                  <p className="text-xs opacity-70 mt-1">
                    クイックフォトブック
                  </p>
                  <p className="text-xs opacity-60 mt-1">
                    {displayPhotobooks.length}/{maxDisplayCount}冊
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="surface-neutral rounded-lg shadow-lg border-2 border-dashed border-gray-400/50 opacity-60">
            <div className="aspect-[3/4] flex items-center justify-center">
              <div className="text-center">
                <Plus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium opacity-70">上限達成</p>
                <p className="text-xs opacity-60 mt-1">
                  {displayPhotobooks.length}/{maxDisplayCount}冊
                </p>
                <p className="text-xs opacity-50 mt-1">プラン変更で増量可</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 既存フォトブック */}
      {displayPhotobooks.map(photobook => (
        <div
          key={photobook.id}
          className="group transform transition-all duration-300 hover:-translate-y-2 relative"
        >
          {/* アクションボタン（右上） */}
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 surface-neutral"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">アクションメニュー</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem asChild>
                  <Link href={`/photobooks/quick/${photobook.id}/edit`}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    編集
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/photobooks/quick/${photobook.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    表示
                  </Link>
                </DropdownMenuItem>
                <DeletePhotobookDialog
                  photobookId={photobook.id}
                  photobookTitle={photobook.title}
                  userId={userId}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* フォトブックカード */}
          <Link href={`/photobooks/quick/${photobook.id}`} className="block">
            <div className="surface-primary rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
              {/* カバー画像 */}
              <div className="aspect-[3/4] rounded-t-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                {photobook.cover_image_url ? (
                  <Image
                    src={photobook.cover_image_url}
                    alt={photobook.title}
                    width={300}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-700 dark:to-emerald-800">
                    <BookOpen className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}
              </div>

              {/* フォトブック情報 */}
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2 truncate">
                  {photobook.title}
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center text-xs opacity-70">
                    <Calendar className="h-3 w-3 mr-1" />
                    <FormattedDateTime
                      value={new Date(photobook.updated_at)}
                      format="date-short"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs opacity-70">
                      <BookOpen className="h-3 w-3 mr-1" />
                      <span>
                        {photobook.current_pages}/{photobook.max_pages}ページ
                      </span>
                    </div>

                    <div className="flex items-center text-xs brand-success">
                      {photobook.is_published ? (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          <span>公開中</span>
                        </>
                      ) : (
                        <>
                          <Edit3 className="h-3 w-3 mr-1" />
                          <span>下書き</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      ))}

      {/* 空のスロット（プラン上限まで表示） */}
      {Array.from({
        length: Math.max(0, maxDisplayCount - displayPhotobooks.length - 1), // -1 は新規作成カードの分
      }).map((_, index) => (
        <div
          key={`empty-quick-${index}`}
          className="aspect-[3/4] bg-emerald-700/20 dark:bg-emerald-600/20 rounded-lg border-2 border-dashed border-emerald-600/30 dark:border-emerald-500/30 flex items-center justify-center opacity-60"
        >
          <div className="text-center text-emerald-600/70 dark:text-emerald-400/70">
            <Zap className="h-8 w-8 mx-auto mb-2" />
            <p className="text-xs">作成待ち</p>
          </div>
        </div>
      ))}
    </div>
  );
}
