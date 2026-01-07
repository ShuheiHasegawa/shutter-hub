'use client';

import Link from 'next/link';
import { EmptyImage } from '@/components/ui/empty-image';
import {
  BookOpen,
  Eye,
  Edit3,
  MoreVertical,
  Calendar,
  Trash2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PhotobookCreateCard } from '../common/PhotobookCreateCard';
import { PhotobookStatusBadge } from '../common/PhotobookStatusBadge';
import type {
  PhotobookListItem,
  PhotobookPlanLimits,
} from '@/types/quick-photobook';
import { FormattedDateTime } from '@/components/ui/formatted-display';

interface AdvancedPhotobookShelfClientProps {
  photobooks: PhotobookListItem[];
  planLimits: PhotobookPlanLimits;
  userId: string;
}

/**
 * アドバンスドフォトブック本棚のクライアントコンポーネント
 */
export function AdvancedPhotobookShelfClient({
  photobooks,
  planLimits,
  userId: _userId,
}: AdvancedPhotobookShelfClientProps) {
  // アドバンスドフォトブックの最大数を表示数として使用
  const maxDisplayCount = planLimits.advanced.maxPhotobooks || 10; // 開発用: デフォルト10
  const displayPhotobooks = photobooks.slice(0, maxDisplayCount || 10);

  // プラン上限チェック（開発中は常にtrue）
  // TODO: 本番環境では元に戻す
  const canCreateNew = true; // displayPhotobooks.length < maxDisplayCount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* 新規作成カード */}
      <PhotobookCreateCard
        canCreate={canCreateNew}
        createUrl="/photobooks/advanced/create"
        typeLabel="アドバンスドフォトブック"
        currentCount={displayPhotobooks.length}
        maxCount={maxDisplayCount}
        borderColor="border-amber-300/50"
      />

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
                  <Link href={`/photobooks/advanced/${photobook.id}/edit`}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    編集
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/photobooks/advanced/${photobook.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    表示
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={e => {
                    e.preventDefault();
                    // TODO: アドバンスド削除ダイアログの実装
                    if (
                      window.confirm(
                        `「${photobook.title}」を削除しますか？この操作は元に戻せません。`
                      )
                    ) {
                      // TODO: 削除処理を実装
                      // logger.info('Delete photobook:', photobook.id);
                    }
                  }}
                  className="text-error focus:text-error cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* フォトブックカード */}
          <Link href={`/photobooks/advanced/${photobook.id}`} className="block">
            <div className="surface-primary rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
              {/* カバー画像 */}
              <div className="aspect-[3/4] rounded-t-lg overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
                <EmptyImage
                  src={photobook.cover_image_url || undefined}
                  alt={photobook.title}
                  fallbackIcon={BookOpen}
                  fallbackIconSize="lg"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
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

                    <PhotobookStatusBadge
                      isPublished={photobook.is_published}
                    />
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
          key={`empty-advanced-${index}`}
          className="aspect-[3/4] bg-amber-700/20 dark:bg-amber-600/20 rounded-lg border-2 border-dashed border-amber-600/30 dark:border-amber-500/30 flex items-center justify-center opacity-60"
        >
          <div className="text-center text-amber-600/70 dark:text-amber-400/70">
            <Plus className="h-8 w-8 mx-auto mb-2" />
            <p className="text-xs">作成待ち</p>
          </div>
        </div>
      ))}
    </div>
  );
}
