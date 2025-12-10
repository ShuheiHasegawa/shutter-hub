'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePhotobookEditorStore } from '@/stores/photobook-editor-store';
import { cn } from '@/lib/utils';
import type { PhotobookPage, PageElement } from '@/types/photobook-editor';

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
}

// ページプレビューコンポーネント
const PagePreview: React.FC<{
  page: PhotobookPage;
  zoom: number;
}> = ({ page, zoom }) => {
  const baseWidth = 600;
  const baseHeight = 450;

  return (
    <div
      className="relative bg-white shadow-2xl rounded-sm overflow-hidden transition-transform duration-300"
      style={{
        width: `${baseWidth * zoom}px`,
        height: `${baseHeight * zoom}px`,
        backgroundColor: page.layout.backgroundColor || '#ffffff',
      }}
    >
      {/* ページ要素を描画 */}
      {page.elements
        .filter(el => el.style.visible !== false)
        .sort((a, b) => (a.style.zIndex || 0) - (b.style.zIndex || 0))
        .map(element => (
          <PreviewElement
            key={element.id}
            element={element}
            containerWidth={baseWidth * zoom}
            containerHeight={baseHeight * zoom}
          />
        ))}

      {/* ページ番号 */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-400">
        {page.pageNumber}
      </div>
    </div>
  );
};

// 個別要素プレビュー
const PreviewElement: React.FC<{
  element: PageElement;
  containerWidth: number;
  containerHeight: number;
}> = ({ element, containerWidth, containerHeight }) => {
  const x = (element.transform.x / 100) * containerWidth;
  const y = (element.transform.y / 100) * containerHeight;
  const width = (element.transform.width / 100) * containerWidth;
  const height = (element.transform.height / 100) * containerHeight;

  if (element.type === 'image' && element.data.type === 'image') {
    // 画像がない場合はスキップ
    if (!element.data.src || element.data.src.trim() === '') {
      return null;
    }

    return (
      <div
        className="absolute overflow-hidden"
        style={{
          left: x,
          top: y,
          width,
          height,
          opacity: element.style.opacity || 1,
          transform: `rotate(${element.transform.rotation || 0}deg)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={element.data.src}
          alt={element.data.alt || '画像'}
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center' }}
        />
      </div>
    );
  }

  if (element.type === 'text' && element.data.type === 'text') {
    return (
      <div
        className="absolute"
        style={{
          left: x,
          top: y,
          width,
          fontSize: element.data.fontSize,
          fontFamily: element.data.fontFamily,
          color: element.data.color,
          textAlign: element.data.align as 'left' | 'center' | 'right',
          opacity: element.style.opacity || 1,
          transform: `rotate(${element.transform.rotation || 0}deg)`,
        }}
      >
        {element.data.content}
      </div>
    );
  }

  return null;
};

export const PreviewModal: React.FC<PreviewModalProps> = ({
  open,
  onClose,
}) => {
  const { currentProject } = usePhotobookEditorStore();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  // ページ数
  const totalPages = currentProject?.pages.length || 0;
  const currentPage = currentProject?.pages[currentPageIndex];

  // ページナビゲーション
  const goToPrevPage = useCallback(() => {
    setCurrentPageIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPageIndex(prev => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);

  // キーボードナビゲーション
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevPage();
          break;
        case 'ArrowRight':
          goToNextPage();
          break;
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          setZoom(prev => Math.min(2, prev + 0.25));
          break;
        case '-':
          setZoom(prev => Math.max(0.5, prev - 0.25));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, goToPrevPage, goToNextPage, onClose]);

  // モーダルが開いたらページインデックスをリセット
  useEffect(() => {
    if (open) {
      setCurrentPageIndex(0);
      setZoom(1);
    }
  }, [open]);

  if (!open || !currentProject) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: '#171717' }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: '#262626' }}
      >
        <div className="text-white">
          <h2 className="text-lg font-semibold">{currentProject.meta.title}</h2>
          <p className="text-sm text-white/60">プレビューモード</p>
        </div>

        <div className="flex items-center gap-4">
          {/* ズームコントロール */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
              className="text-white hover:bg-white/20"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-white text-sm w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(prev => Math.min(2, prev + 0.25))}
              className="text-white hover:bg-white/20"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* 閉じるボタン */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-8">
        {/* 前ページボタン */}
        <Button
          variant="ghost"
          size="lg"
          onClick={goToPrevPage}
          disabled={currentPageIndex === 0}
          className={cn(
            'absolute left-4 z-10 rounded-full w-12 h-12 bg-white/10 hover:bg-white/20',
            currentPageIndex === 0 && 'opacity-30 cursor-not-allowed'
          )}
        >
          <ChevronLeft className="h-8 w-8 text-white" />
        </Button>

        {/* ページプレビュー */}
        {currentPage && <PagePreview page={currentPage} zoom={zoom} />}

        {/* 次ページボタン */}
        <Button
          variant="ghost"
          size="lg"
          onClick={goToNextPage}
          disabled={currentPageIndex === totalPages - 1}
          className={cn(
            'absolute right-4 z-10 rounded-full w-12 h-12 bg-white/10 hover:bg-white/20',
            currentPageIndex === totalPages - 1 &&
              'opacity-30 cursor-not-allowed'
          )}
        >
          <ChevronRight className="h-8 w-8 text-white" />
        </Button>
      </div>

      {/* フッター：ページインジケーター */}
      <div
        className="flex items-center justify-center gap-2 py-4"
        style={{ backgroundColor: '#262626' }}
      >
        {currentProject.pages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentPageIndex(index)}
            className={cn(
              'w-3 h-3 rounded-full transition-all',
              index === currentPageIndex
                ? 'bg-white scale-125'
                : 'bg-white/40 hover:bg-white/60'
            )}
            aria-label={`ページ ${index + 1}`}
          />
        ))}
      </div>

      {/* キーボードショートカットヒント */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/40 text-xs">
        ← → ページ移動 | + - ズーム | Esc 閉じる
      </div>
    </div>
  );
};

export default PreviewModal;
