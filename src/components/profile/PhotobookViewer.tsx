'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Heart,
  MessageCircle,
  Share2,
  BookOpen,
  User,
  Calendar,
} from 'lucide-react';
import { Photobook } from '@/types/photobook';

interface PhotobookViewerProps {
  photobook: Photobook;
  isOpen: boolean;
  onClose: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  isLiked?: boolean;
  likeCount?: number;
  commentCount?: number;
}

export const PhotobookViewer: React.FC<PhotobookViewerProps> = ({
  photobook,
  isOpen,
  onClose,
  onLike,
  onComment,
  onShare,
  isLiked = false,
  likeCount = 0,
  commentCount = 0,
}) => {
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleNextSpread = useCallback(() => {
    if (currentSpreadIndex < photobook.spreads.length - 1) {
      setCurrentSpreadIndex(prev => prev + 1);
    }
  }, [currentSpreadIndex, photobook.spreads.length]);

  const handlePreviousSpread = useCallback(() => {
    if (currentSpreadIndex > 0) {
      setCurrentSpreadIndex(prev => prev - 1);
    }
  }, [currentSpreadIndex]);

  // キーボードナビゲーション
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          handlePreviousSpread();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          handleNextSpread();
          break;
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          setZoom(prev => Math.min(prev + 0.2, 3));
          break;
        case '-':
          setZoom(prev => Math.max(prev - 0.2, 0.5));
          break;
        case '0':
          setZoom(1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, handleNextSpread, handlePreviousSpread, onClose]);

  const currentSpread = photobook.spreads[currentSpreadIndex];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full flex flex-col"
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                title="閉じる (Esc)"
              >
                <X size={24} />
              </button>

              <div className="text-white">
                <h2 className="text-lg font-semibold">{photobook.title}</h2>
                <p className="text-sm text-white/80">
                  {currentSpreadIndex + 1} / {photobook.spreads.length}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* ズームコントロール */}
              <button
                onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                title="縮小 (-)"
              >
                <ZoomOut size={20} />
              </button>
              <span className="text-white text-sm min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                title="拡大 (+)"
              >
                <ZoomIn size={20} />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                title="リセット (0)"
              >
                <RotateCcw size={20} />
              </button>

              {/* フルスクリーン */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Maximize2 size={20} />
              </button>
            </div>
          </div>

          {/* メインビューエリア */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <div
              className="relative max-w-6xl w-full flex items-center justify-center"
              style={{ transform: `scale(${zoom})` }}
            >
              {/* ナビゲーションボタン */}
              {currentSpreadIndex > 0 && (
                <button
                  onClick={handlePreviousSpread}
                  className="absolute left-4 z-10 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  title="前のページ (←)"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {currentSpreadIndex < photobook.spreads.length - 1 && (
                <button
                  onClick={handleNextSpread}
                  className="absolute right-4 z-10 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  title="次のページ (→)"
                >
                  <ChevronRight size={24} />
                </button>
              )}

              {/* スプレッド表示 */}
              <motion.div
                key={currentSpreadIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg shadow-2xl overflow-hidden max-h-[calc(100vh-200px)]"
              >
                {currentSpread?.fullSpreadTemplate ? (
                  // フルスプレッド表示
                  <div className="aspect-[16/9] relative">
                    {currentSpread.photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className="absolute"
                        style={{
                          left: `${photo.position?.x || 0}%`,
                          top: `${photo.position?.y || 0}%`,
                          width: `${photo.position?.width || 100}%`,
                          height: `${photo.position?.height || 100}%`,
                          transform: `rotate(${photo.position?.rotation || 0}deg)`,
                          zIndex: photo.position?.zIndex || index,
                        }}
                      >
                        <Image
                          src={photo.src}
                          alt={photo.alt || ''}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  // 見開きページ表示
                  <div className="flex aspect-[16/9]">
                    {/* 左ページ */}
                    <div className="flex-1 relative bg-gray-50">
                      {currentSpread?.leftPageTemplate &&
                        currentSpread.photos
                          .filter(
                            (_, index) =>
                              index < currentSpread.photos.length / 2
                          )
                          .map((photo, index) => (
                            <div
                              key={photo.id}
                              className="absolute"
                              style={{
                                left: `${photo.position?.x || 0}%`,
                                top: `${photo.position?.y || 0}%`,
                                width: `${photo.position?.width || 50}%`,
                                height: `${photo.position?.height || 50}%`,
                                transform: `rotate(${photo.position?.rotation || 0}deg)`,
                                zIndex: photo.position?.zIndex || index,
                              }}
                            >
                              <Image
                                src={photo.src}
                                alt={photo.alt || ''}
                                fill
                                className="object-cover rounded"
                              />
                            </div>
                          ))}
                    </div>

                    {/* 中央の境界線 */}
                    <div className="w-px bg-gray-200"></div>

                    {/* 右ページ */}
                    <div className="flex-1 relative bg-gray-50">
                      {currentSpread?.rightPageTemplate &&
                        currentSpread.photos
                          .filter(
                            (_, index) =>
                              index >= currentSpread.photos.length / 2
                          )
                          .map((photo, index) => (
                            <div
                              key={photo.id}
                              className="absolute"
                              style={{
                                left: `${photo.position?.x || 0}%`,
                                top: `${photo.position?.y || 0}%`,
                                width: `${photo.position?.width || 50}%`,
                                height: `${photo.position?.height || 50}%`,
                                transform: `rotate(${photo.position?.rotation || 0}deg)`,
                                zIndex: photo.position?.zIndex || index,
                              }}
                            >
                              <Image
                                src={photo.src}
                                alt={photo.alt || ''}
                                fill
                                className="object-cover rounded"
                              />
                            </div>
                          ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* フッター（メタデータとアクション） */}
          <div className="p-4 bg-black/20 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              {/* メタデータ */}
              <div className="flex items-center space-x-6 text-white text-sm">
                <div className="flex items-center space-x-2">
                  <User size={16} />
                  <span>作成者: {photobook.userId}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar size={16} />
                  <span>
                    作成日: {photobook.createdAt.toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen size={16} />
                  <span>{photobook.spreads.length}ページ</span>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex items-center space-x-4">
                {onLike && (
                  <button
                    onClick={onLike}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isLiked
                        ? 'bg-red-600 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                    <span>{likeCount}</span>
                  </button>
                )}

                {onComment && (
                  <button
                    onClick={onComment}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <MessageCircle size={16} />
                    <span>{commentCount}</span>
                  </button>
                )}

                {onShare && (
                  <button
                    onClick={onShare}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Share2 size={16} />
                    <span>共有</span>
                  </button>
                )}
              </div>
            </div>

            {/* ナビゲーションヒント */}
            <div className="text-center mt-4">
              <p className="text-white/60 text-xs">
                ← → キーでページ移動 | +/- でズーム | Escで閉じる
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
