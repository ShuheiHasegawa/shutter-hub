'use client';

import React from 'react';
import { Image, Type, Square, Circle, Triangle, Star } from 'lucide-react';
import NextImage from 'next/image';
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
        'select-none transition-opacity border-2 border-dashed rounded-lg p-4',
        'border-current/30 hover:border-blue-400 hover:bg-blue-500/10',
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
      <span className="text-sm font-medium">画像ボックス</span>
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
      <span className="text-sm font-medium">テキストボックス</span>
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
      <span className="text-sm font-medium">図形</span>
    </div>
  </DraggableElement>
);

// レイアウトテンプレート
export const DraggableLayoutTemplate: React.FC<{
  template: {
    id: string;
    name: string;
    description?: string;
    photoPositions?: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  };
  className?: string;
}> = ({ template, className }) => {
  // レイアウトプレビューを描画
  const renderLayoutPreview = () => {
    const positions = template.photoPositions || [];

    // 見開き用のアスペクト比を確認
    const isSpread =
      template.id.includes('spread') || template.id.includes('見開き');
    const previewWidth = isSpread ? 80 : 48;
    const previewHeight = 36;

    return (
      <div
        className="relative rounded border-2 border-dashed border-blue-400/50"
        style={{
          width: `${previewWidth}px`,
          height: `${previewHeight}px`,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        }}
      >
        {positions.map((pos, index) => (
          <div
            key={index}
            className="absolute bg-blue-500/30 border border-blue-500/60 rounded-sm"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: `${pos.width}%`,
              height: `${pos.height}%`,
            }}
          >
            {/* 画像アイコン */}
            <div className="w-full h-full flex items-center justify-center">
              <Image className="w-2 h-2 text-blue-500/80" />
            </div>
          </div>
        ))}
        {/* 見開きの場合は中央線を表示 */}
        {isSpread && (
          <div className="absolute left-1/2 top-0 w-px h-full bg-blue-400/40" />
        )}
      </div>
    );
  };

  return (
    <DraggableElement
      type="layout-template"
      data={template}
      className={className}
    >
      <div className="flex flex-col items-center space-y-2">
        {renderLayoutPreview()}
        <span className="text-xs font-medium">{template.name}</span>
      </div>
    </DraggableElement>
  );
};

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
        'hover:bg-current/5',
        isDragging ? 'opacity-50' : 'opacity-100'
      )}
      {...dragProps}
    >
      <div className="w-24 h-24 overflow-hidden rounded-md bg-current/10 flex items-center justify-center">
        <NextImage
          src={image.thumbnailSrc || image.src}
          alt={image.name}
          width={96}
          height={96}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* 画像名とサイズ */}
      <div className="text-center">
        <p className="text-xs font-medium truncate">{image.name}</p>
        <p className="text-xs opacity-60">
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
      <span className="text-sm font-medium">装飾</span>
    </div>
  </DraggableElement>
);

export default DraggableElement;
