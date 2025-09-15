'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PhotobookImage } from '@/types/quick-photobook';

/**
 * ページナビゲーション
 */
interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function PageNavigation({
  currentPage,
  totalPages,
  onPageChange,
}: PageNavigationProps) {
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium">
          {currentPage} / {totalPages}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * 単一ページ表示
 */
interface PageDisplayProps {
  image: PhotobookImage;
  viewMode: 'mobile' | 'desktop';
}

function PageDisplay({ image, viewMode }: PageDisplayProps) {
  const isMobile = viewMode === 'mobile';

  return (
    <div
      className={cn(
        'relative bg-white border rounded-lg overflow-hidden shadow-sm',
        isMobile ? 'aspect-[3/4]' : 'aspect-[4/5]'
      )}
    >
      {/* ページ番号バッジ */}
      <Badge variant="secondary" className="absolute top-2 left-2 z-10 text-xs">
        {image.page_number}
      </Badge>

      {/* 画像表示 */}
      <div className="w-full h-full p-4 flex items-center justify-center relative">
        <Image
          src={image.image_url}
          alt={image.original_filename || `ページ ${image.page_number}`}
          fill
          className={cn(
            'object-contain rounded',
            image.orientation === 'portrait' && 'object-contain',
            image.orientation === 'landscape' && 'object-contain',
            image.orientation === 'square' && 'object-contain'
          )}
        />
      </div>

      {/* 画像情報（デスクトップのみ） */}
      {!isMobile && (
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {image.orientation === 'portrait' && '縦長'}
          {image.orientation === 'landscape' && '横長'}
          {image.orientation === 'square' && '正方形'}
        </div>
      )}
    </div>
  );
}

/**
 * 空ページ表示
 */
interface EmptyPageProps {
  pageNumber: number;
  viewMode: 'mobile' | 'desktop';
}

function EmptyPage({ pageNumber, viewMode }: EmptyPageProps) {
  const isMobile = viewMode === 'mobile';

  return (
    <div
      className={cn(
        'relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center',
        isMobile ? 'aspect-[3/4]' : 'aspect-[4/5]'
      )}
    >
      <Badge variant="outline" className="absolute top-2 left-2 text-xs">
        {pageNumber}
      </Badge>

      <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
      <p className="text-sm text-gray-500 text-center">画像未追加</p>
    </div>
  );
}

/**
 * サムネイル一覧（横スクロール対応）
 */
interface ThumbnailListProps {
  images: PhotobookImage[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function ThumbnailList({
  images,
  currentPage,
  totalPages,
  onPageChange,
}: ThumbnailListProps) {
  return (
    <div className="p-4 surface-neutral rounded-lg">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {Array.from({ length: totalPages }, (_, index) => {
          const pageNumber = index + 1;
          const image = images.find(img => img.page_number === pageNumber);

          return (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                'flex-shrink-0 w-16 h-20 sm:w-20 sm:h-24 rounded border-2 transition-all hover:scale-105 relative',
                currentPage === pageNumber
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-300 hover:border-gray-400'
              )}
            >
              {image ? (
                <div className="relative w-full h-full">
                  <Image
                    src={image.image_url}
                    alt={`ページ ${pageNumber}`}
                    fill
                    className="object-cover rounded"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center rounded">
                  <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 bg-black/70 text-white text-xs px-1 py-0.5 rounded-tr">
                {pageNumber}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * クイックフォトブックプレビューメインコンポーネント
 */
interface QuickPhotobookPreviewProps {
  images: PhotobookImage[];
  viewMode?: 'mobile' | 'desktop';
  maxPages?: number;
}

export function QuickPhotobookPreview({
  images,
  viewMode = 'desktop',
  maxPages = 15,
}: QuickPhotobookPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(images.length, 1);
  const currentImage = images.find(img => img.page_number === currentPage);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* サムネイル一覧（PC・スマホ共通） */}
        {images.length > 1 && (
          <ThumbnailList
            images={images}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}

        {/* メインプレビューエリア */}
        <div className="p-4">
          {currentImage ? (
            <PageDisplay image={currentImage} viewMode={viewMode} />
          ) : (
            <EmptyPage pageNumber={currentPage} viewMode={viewMode} />
          )}
        </div>

        {/* ページナビゲーション */}
        {totalPages > 1 && (
          <PageNavigation
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}

        {/* 統計情報 */}
        <div className="px-4 py-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span>総ページ数: {images.length}</span>
              <span>最大: {maxPages}ページ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded"></div>
                <span className="text-xs">
                  縦長:{' '}
                  {images.filter(img => img.orientation === 'portrait').length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded"></div>
                <span className="text-xs">
                  横長:{' '}
                  {images.filter(img => img.orientation === 'landscape').length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded"></div>
                <span className="text-xs">
                  正方形:{' '}
                  {images.filter(img => img.orientation === 'square').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 空状態 */}
        {images.length === 0 && (
          <div className="p-8 text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              まだ画像がありません
            </h3>
            <p>画像をアップロードしてプレビューを確認しましょう</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
