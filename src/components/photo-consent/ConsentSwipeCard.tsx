'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  motion,
  PanInfo,
  useMotionValue,
  useTransform,
  useAnimation,
} from 'framer-motion';
import {
  Heart,
  X,
  MessageCircle,
  Maximize2,
  User,
  Calendar,
  Camera,
} from 'lucide-react';
import { SwipeablePhotoConsent } from '@/types/photo-consent';

interface ConsentSwipeCardProps {
  consent: SwipeablePhotoConsent;
  onSwipe: (consentId: string, direction: 'left' | 'right' | 'up') => void;
  onPreview: (consent: SwipeablePhotoConsent) => void;
  isActive: boolean;
  stackIndex: number;
}

export const ConsentSwipeCard: React.FC<ConsentSwipeCardProps> = ({
  consent,
  onSwipe,
  onPreview,
  isActive,
  stackIndex,
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimation();

  // スワイプに基づく回転とスケール変換
  const rotate = useTransform(x, [-300, 0, 300], [-30, 0, 30]);
  const scale = useTransform(x, [-300, 0, 300], [0.8, 1, 0.8]);
  const opacity = useTransform(x, [-300, 0, 300], [0.5, 1, 0.5]);

  // ハプティックフィードバック（モバイル対応）
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (
      typeof window !== 'undefined' &&
      'navigator' in window &&
      'vibrate' in navigator
    ) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30],
      };
      navigator.vibrate(patterns[type]);
    }
  };

  // スワイプ処理
  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 100;
    const { offset, velocity } = info;

    if (Math.abs(offset.x) > threshold || Math.abs(velocity.x) > 500) {
      // 左右スワイプ (承認/拒否)
      const direction = offset.x > 0 ? 'right' : 'left';
      triggerHaptic(direction === 'right' ? 'light' : 'medium');

      controls
        .start({
          x: direction === 'right' ? 1000 : -1000,
          opacity: 0,
          transition: { duration: 0.3 },
        })
        .then(() => {
          onSwipe(consent.id, direction);
        });
    } else if (offset.y < -threshold || velocity.y < -500) {
      // 上スワイプ (要相談)
      triggerHaptic('heavy');

      controls
        .start({
          y: -1000,
          opacity: 0,
          transition: { duration: 0.3 },
        })
        .then(() => {
          onSwipe(consent.id, 'up');
        });
    } else {
      // カードを元の位置に戻す
      controls.start({
        x: 0,
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 30 },
      });
    }
  };

  // プレビューモード切り替え
  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
    triggerHaptic('light');
    onPreview(consent);
  };

  // カードスタック効果のスタイル計算
  const getStackStyle = () => {
    if (!isActive) {
      return {
        scale: 1 - stackIndex * 0.05,
        y: stackIndex * 8,
        zIndex: 10 - stackIndex,
        opacity: 1 - stackIndex * 0.1,
      };
    }
    return { scale: 1, y: 0, zIndex: 20, opacity: 1 };
  };

  return (
    <motion.div
      ref={cardRef}
      className={`absolute inset-0 w-full h-full ${
        isActive ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
      }`}
      style={{
        x: isActive ? x : 0,
        y: isActive ? y : 0,
        rotate: isActive ? rotate : 0,
        scale: isActive ? scale : getStackStyle().scale,
        opacity: isActive ? opacity : getStackStyle().opacity,
        zIndex: getStackStyle().zIndex,
      }}
      animate={isActive ? undefined : getStackStyle()}
      drag={isActive}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="relative w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        {/* 写真表示エリア */}
        <div className="relative h-2/3 overflow-hidden">
          <Image
            src={consent.photoUrl}
            alt="Photo for consent"
            fill
            className="object-cover"
            priority={isActive}
          />

          {/* プレビューボタン */}
          <button
            onClick={togglePreview}
            className="absolute top-4 right-4 p-3 bg-black/20 backdrop-blur-sm rounded-full text-white hover:bg-black/30 transition-colors"
          >
            <Maximize2 size={20} />
          </button>

          {/* スワイプインジケーター */}
          <motion.div
            className="absolute top-4 left-4 px-3 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-full opacity-0"
            style={{
              opacity: useTransform(x, [-150, -50], [1, 0]),
            }}
          >
            拒否
          </motion.div>

          <motion.div
            className="absolute top-4 right-16 px-3 py-1.5 bg-green-500 text-white text-sm font-semibold rounded-full opacity-0"
            style={{
              opacity: useTransform(x, [50, 150], [0, 1]),
            }}
          >
            承認
          </motion.div>

          <motion.div
            className="absolute top-4 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-yellow-500 text-white text-sm font-semibold rounded-full opacity-0"
            style={{
              opacity: useTransform(y, [-150, -50], [1, 0]),
            }}
          >
            要相談
          </motion.div>
        </div>

        {/* 情報表示エリア */}
        <div className="h-1/3 p-6 bg-gradient-to-t from-white to-gray-50">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                {consent.photographer.displayName}
              </h3>
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <User size={14} className="mr-1" />
                <span>{consent.model.displayName}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  consent.consentStatus === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : consent.consentStatus === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {consent.consentStatus === 'pending'
                  ? '保留中'
                  : consent.consentStatus === 'approved'
                    ? '承認済'
                    : '拒否'}
              </div>
            </div>
          </div>

          <div className="flex items-center text-sm text-gray-500 mb-3">
            <Calendar size={14} className="mr-1" />
            <span>
              {new Date(consent.createdAt).toLocaleDateString('ja-JP')}
            </span>
            <Camera size={14} className="ml-4 mr-1" />
            <span>{consent.usageScope.join(', ') || '使用範囲未指定'}</span>
          </div>

          {consent.requestMessage && (
            <p className="text-sm text-gray-700 line-clamp-2 mb-4">
              {consent.requestMessage}
            </p>
          )}

          {/* アクションボタン（非アクティブカード用） */}
          {!isActive && (
            <div className="flex items-center justify-center space-x-4 pt-2">
              <button className="p-3 bg-red-100 rounded-full text-red-600 hover:bg-red-200 transition-colors">
                <X size={20} />
              </button>
              <button className="p-3 bg-yellow-100 rounded-full text-yellow-600 hover:bg-yellow-200 transition-colors">
                <MessageCircle size={20} />
              </button>
              <button className="p-3 bg-green-100 rounded-full text-green-600 hover:bg-green-200 transition-colors">
                <Heart size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
