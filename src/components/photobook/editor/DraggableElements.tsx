'use client';

import React from 'react';
import { Image, Type, Square, Circle, Triangle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
// import { debugLogger } from '@/lib/utils/debug-logger';
import { useNativeDrag, type DragItem } from './NativeDndProvider';
import type { ImageResource } from '@/types/photobook-editor';

// ============================================
// 基本ドラッグ要素コンポーネント
// ============================================

interface DraggableElementProps {
  type: DragItem['type'];
  data?: unknown;
  children: React.ReactNode;
  className?: string;
}

const DraggableElement: React.FC<DraggableElementProps> = ({
  type,
  data,
  children,
  className,
}) => {
  const { isDragging, dragProps } = useNativeDrag({ type, data });

  return (
    <div
      className={cn(
        'select-none transition-opacity border-2 border-dashed border-gray-300 rounded-lg p-4',
        'hover:border-blue-400 hover:bg-blue-50',
        isDragging ? 'opacity-50 transform scale-95' : 'opacity-100',
        className
      )}
      {...dragProps}
    >
      {children}
    </div>
  );
};

// ============================================
// 具体的なドラッグ要素
// ============================================

// 画像ボックス
export const DraggableImageBox: React.FC<{ className?: string }> = ({
  className,
}) => (
  <DraggableElement type="image-box" className={className}>
    <div className="flex flex-col items-center space-y-2">
      <Image className="h-8 w-8 text-blue-500" aria-label="画像ボックス" />
      <span className="text-sm font-medium text-gray-700">画像ボックス</span>
    </div>
  </DraggableElement>
);

// テキストボックス
export const DraggableTextBox: React.FC<{ className?: string }> = ({
  className,
}) => (
  <DraggableElement type="text-box" className={className}>
    <div className="flex flex-col items-center space-y-2">
      <Type className="h-8 w-8 text-green-500" aria-label="テキストボックス" />
      <span className="text-sm font-medium text-gray-700">
        テキストボックス
      </span>
    </div>
  </DraggableElement>
);

// 図形ボックス
export const DraggableShapeBox: React.FC<{ className?: string }> = ({
  className,
}) => (
  <DraggableElement type="shape-box" className={className}>
    <div className="flex flex-col items-center space-y-2">
      <div className="flex space-x-1">
        <Square className="h-6 w-6 text-purple-500" aria-label="四角形" />
        <Circle className="h-6 w-6 text-purple-500" aria-label="円形" />
        <Triangle className="h-6 w-6 text-purple-500" aria-label="三角形" />
      </div>
      <span className="text-sm font-medium text-gray-700">図形</span>
    </div>
  </DraggableElement>
);

// レイアウトテンプレート
export const DraggableLayoutTemplate: React.FC<{
  layout: {
    id: string;
    name: string;
    preview: string;
  };
  className?: string;
}> = ({ layout, className }) => (
  <DraggableElement type="layout-template" data={layout} className={className}>
    <div className="flex flex-col items-center space-y-2">
      <div className="w-16 h-12 bg-gray-200 rounded border flex items-center justify-center">
        <span className="text-xs text-gray-500">{layout.name}</span>
      </div>
      <span className="text-sm font-medium text-gray-700">{layout.name}</span>
    </div>
  </DraggableElement>
);

// アップロード済み画像
export const DraggableUploadedImage: React.FC<{ image: ImageResource }> = ({
  image,
}) => {
  const { isDragging, dragProps } = useNativeDrag({
    type: 'uploaded-image',
    data: image,
  });

  return (
    <div
      className={cn(
        'flex flex-col items-center space-y-2 p-2 border rounded-lg transition-opacity',
        'hover:bg-gray-50',
        isDragging ? 'opacity-50' : 'opacity-100'
      )}
      {...dragProps}
    >
      <div className="w-24 h-24 overflow-hidden rounded-md bg-gray-200 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.thumbnailSrc || image.src}
          alt={image.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* 画像名とサイズ */}
      <div className="text-center">
        <p className="text-xs font-medium text-gray-700 truncate">
          {image.name}
        </p>
        <p className="text-xs text-gray-500">
          {(image.size / 1024 / 1024).toFixed(1)}MB
        </p>
      </div>
    </div>
  );
};

// スター装飾
export const DraggableDecoration: React.FC<{ className?: string }> = ({
  className,
}) => (
  <DraggableElement type="decoration" className={className}>
    <div className="flex flex-col items-center space-y-2">
      <Star
        className="h-8 w-8 text-yellow-500 fill-current"
        aria-label="装飾"
      />
      <span className="text-sm font-medium text-gray-700">装飾</span>
    </div>
  </DraggableElement>
);

export default DraggableElement;
