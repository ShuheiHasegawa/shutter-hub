'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedImage } from '@/types/quick-photobook';

/**
 * プレビューモードタイプ
 */
type PreviewMode = 'mobile' | 'desktop-spread';

/**
 * プレビューモーダルコンポーネント
 */
interface PhotobookPreviewModalProps {
  images: UnifiedImage[];
  coverImageId?: string;
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PhotobookPreviewModal({
  images,
  coverImageId,
  trigger,
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
}: PhotobookPreviewModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // 外部制御がある場合はそれを使用、ない場合は内部状態を使用
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnOpenChange || setInternalIsOpen;
  const [currentPage, setCurrentPage] = useState(0);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop-spread');

  // 表紙画像
  const coverImage = images.find(img => img.id === coverImageId);

  // ページ画像（表紙を除く）
  const pageImages = images.filter(img => img.id !== coverImageId);

  // 全体のページ構成（表紙 + ページ画像）
  const allPages = [...(coverImage ? [coverImage] : []), ...pageImages];

  // 見開き表示用のページペア（表紙は単独、その他は見開き）
  const getPagePairs = () => {
    const pairs: (UnifiedImage | null)[][] = [];

    // 表紙は単独
    if (coverImage) {
      pairs.push([coverImage, null]);
    }

    // ページ画像は見開き
    for (let i = 0; i < pageImages.length; i += 2) {
      pairs.push([pageImages[i] || null, pageImages[i + 1] || null]);
    }

    return pairs;
  };

  const pagePairs = getPagePairs();

  // ページナビゲーション
  const goToNextPage = () => {
    if (previewMode === 'desktop-spread') {
      setCurrentPage(prev => Math.min(prev + 1, pagePairs.length - 1));
    } else {
      setCurrentPage(prev => Math.min(prev + 1, allPages.length - 1));
    }
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  };

  // スワイプ・ドラッグ操作
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // タッチイベント
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNextPage();
    }
    if (isRightSwipe) {
      goToPrevPage();
    }
  };

  // マウスイベント（PC用ドラッグ）
  const onMouseDown = (e: React.MouseEvent) => {
    setTouchEnd(null);
    setTouchStart(e.clientX);
    setIsDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTouchEnd(e.clientX);
  };

  const onMouseUp = () => {
    if (!isDragging || !touchStart || !touchEnd) {
      setIsDragging(false);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftDrag = distance > 50;
    const isRightDrag = distance < -50;

    if (isLeftDrag) {
      goToNextPage();
    }
    if (isRightDrag) {
      goToPrevPage();
    }

    setIsDragging(false);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowLeft') {
        goToPrevPage();
      } else if (e.key === 'ArrowRight') {
        goToNextPage();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, previewMode]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              フォトブックプレビュー
            </DialogTitle>

            {/* プレビューモード切り替え */}
            <div className="flex items-center gap-2">
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setPreviewMode('mobile');
                  setCurrentPage(0);
                }}
              >
                <Smartphone className="h-4 w-4 mr-1" />
                モバイル
              </Button>
              <Button
                variant={
                  previewMode === 'desktop-spread' ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => {
                  setPreviewMode('desktop-spread');
                  setCurrentPage(0);
                }}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                見開き
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* プレビュー表示エリア（スワイプ・ドラッグ対応） */}
        <div
          className={cn(
            'relative select-none',
            isDragging && 'cursor-grabbing'
          )}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {/* モバイルプレビュー（1ページずつ） */}
          {previewMode === 'mobile' && (
            <div className="flex flex-col items-center space-y-4 min-h-[500px]">
              {allPages[currentPage] && (
                <div className="space-y-2">
                  <div className="w-64 h-80 bg-gray-100 rounded-lg overflow-hidden shadow-lg relative">
                    <Image
                      src={allPages[currentPage].preview}
                      alt={
                        allPages[currentPage].id === coverImageId
                          ? '表紙'
                          : `ページ ${allPages[currentPage].pageNumber}`
                      }
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* デスクトップ見開き表示 */}
          {previewMode === 'desktop-spread' && (
            <div className="flex flex-col items-center space-y-4 min-h-[500px]">
              {pagePairs[currentPage] && (
                <div className="space-y-2">
                  {/* 表紙の場合（単独表示） */}
                  {pagePairs[currentPage][0]?.id === coverImageId &&
                    !pagePairs[currentPage][1] && (
                      <div className="w-80 h-96 bg-gray-100 rounded-lg overflow-hidden shadow-lg relative">
                        <Image
                          src={pagePairs[currentPage][0]!.preview}
                          alt="表紙"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                  {/* 見開きページ */}
                  {pagePairs[currentPage][0]?.id !== coverImageId && (
                    <div className="flex gap-2">
                      {/* 左ページ */}
                      <div className="w-80 h-96 bg-gray-100 rounded-l-lg overflow-hidden shadow-lg relative">
                        {pagePairs[currentPage][0] ? (
                          <Image
                            src={pagePairs[currentPage][0]!.preview}
                            alt={`ページ ${pagePairs[currentPage][0]!.pageNumber}`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <BookOpen className="h-12 w-12" />
                          </div>
                        )}
                      </div>

                      {/* 右ページ */}
                      <div className="w-80 h-96 bg-gray-100 rounded-r-lg overflow-hidden shadow-lg relative">
                        {pagePairs[currentPage][1] ? (
                          <Image
                            src={pagePairs[currentPage][1]!.preview}
                            alt={`ページ ${pagePairs[currentPage][1]!.pageNumber}`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <BookOpen className="h-12 w-12" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ページ番号表示（控えめ） */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <Badge variant="secondary" className="text-xs opacity-60">
              {previewMode === 'desktop-spread'
                ? `${currentPage + 1} / ${Math.max(1, pagePairs.length)}`
                : `${currentPage + 1} / ${Math.max(1, allPages.length)}`}
            </Badge>
          </div>

          {/* スワイプ・ドラッグヒント（初回のみ） */}
          {currentPage === 0 && (
            <>
              <div className="absolute top-1/2 left-4 transform -translate-y-1/2 text-gray-400 text-sm opacity-50">
                ←<span className="hidden sm:inline">ドラッグ/</span>スワイプ
              </div>
              <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-gray-400 text-sm opacity-50">
                <span className="hidden sm:inline">ドラッグ/</span>スワイプ→
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
