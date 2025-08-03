'use client';

import React from 'react';
import { useDrag } from 'react-dnd';
import { Image, Type, Square, Circle, Triangle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DragItem } from '@/types/photobook-editor';

// ============================================
// 基本ドラッグ要素コンポーネント
// ============================================

interface DraggableElementProps {
  type: DragItem['type'];
  data?: unknown;
  children: React.ReactNode;
  className?: string;
  preview?: React.ReactNode;
}

const DraggableElement: React.FC<DraggableElementProps> = ({
  type,
  data,
  children,
  className,
  preview,
}) => {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type,
    item: { type, id: `${type}-${Date.now()}`, data },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // カスタムプレビューの設定
  React.useEffect(() => {
    if (preview) {
      const previewElement = document.createElement('div');
      previewElement.innerHTML = preview as string;
      dragPreview(previewElement);
    }
  }, [dragPreview, preview]);

  return (
    <div
      ref={drag}
      className={cn(
        'cursor-grab border-2 border-dashed border-gray-300 rounded-lg p-4 transition-all duration-200',
        'hover:border-blue-400 hover:bg-blue-50',
        'active:cursor-grabbing',
        isDragging && 'opacity-50 transform scale-95',
        className
      )}
    >
      {children}
    </div>
  );
};

// ============================================
// 個別ドラッグ要素
// ============================================

export const DraggableImageBox: React.FC<{ className?: string }> = ({
  className,
}) => (
  <DraggableElement type="image-box" className={className}>
    <div className="flex flex-col items-center space-y-2">
      <Image className="h-8 w-8 text-gray-600" aria-label="画像アイコン" />
      <span className="text-sm font-medium text-gray-700">画像ボックス</span>
      <span className="text-xs text-gray-500">ドラッグしてページに配置</span>
    </div>
  </DraggableElement>
);

export const DraggableTextBox: React.FC<{ className?: string }> = ({
  className,
}) => (
  <DraggableElement type="text-box" className={className}>
    <div className="flex flex-col items-center space-y-2">
      <Type className="h-8 w-8 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">
        テキストボックス
      </span>
      <span className="text-xs text-gray-500">ドラッグしてテキストを追加</span>
    </div>
  </DraggableElement>
);

export const DraggableShapeBox: React.FC<{
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'star';
  className?: string;
}> = ({ shapeType, className }) => {
  const shapeIcons = {
    rectangle: Square,
    circle: Circle,
    triangle: Triangle,
    star: Star,
  };

  const shapeNames = {
    rectangle: '四角形',
    circle: '円',
    triangle: '三角形',
    star: '星',
  };

  const Icon = shapeIcons[shapeType];

  return (
    <DraggableElement
      type="shape-box"
      data={{ shapeType }}
      className={className}
    >
      <div className="flex flex-col items-center space-y-2">
        <Icon className="h-8 w-8 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {shapeNames[shapeType]}
        </span>
        <span className="text-xs text-gray-500">ドラッグして図形を追加</span>
      </div>
    </DraggableElement>
  );
};

// ============================================
// レイアウトテンプレート要素
// ============================================

interface LayoutTemplateProps {
  template: {
    id: string;
    name: string;
    description: string;
    photoPositions: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number;
    }>;
  };
  className?: string;
}

export const DraggableLayoutTemplate: React.FC<LayoutTemplateProps> = ({
  template,
  className,
}) => (
  <DraggableElement
    type="layout-template"
    data={template}
    className={className}
  >
    <div className="flex flex-col space-y-3">
      {/* テンプレートプレビュー */}
      <div className="relative w-full h-20 bg-gray-100 rounded border">
        {template.photoPositions.slice(0, 4).map((position, index) => (
          <div
            key={index}
            className="absolute border border-gray-400 bg-gray-200"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              width: `${position.width}%`,
              height: `${position.height}%`,
              transform: position.rotation
                ? `rotate(${position.rotation}deg)`
                : undefined,
            }}
          />
        ))}
        {template.photoPositions.length > 4 && (
          <div className="absolute bottom-1 right-1 text-xs text-gray-500 bg-white px-1 rounded">
            +{template.photoPositions.length - 4}
          </div>
        )}
      </div>

      {/* テンプレート情報 */}
      <div className="text-center">
        <h4 className="text-sm font-medium text-gray-700">{template.name}</h4>
        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
      </div>
    </div>
  </DraggableElement>
);

// ============================================
// アップロード済み画像要素
// ============================================

interface UploadedImageProps {
  image: {
    id: string;
    name: string;
    src: string;
    thumbnailSrc?: string;
  };
  className?: string;
}

export const DraggableUploadedImage: React.FC<UploadedImageProps> = ({
  image,
  className,
}) => (
  <DraggableElement
    type="uploaded-image"
    data={image}
    className={cn('p-2', className)}
  >
    <div className="flex flex-col space-y-2">
      {/* 画像サムネイル */}
      <div className="relative w-full h-20 bg-gray-100 rounded overflow-hidden">
        <img
          src={image.thumbnailSrc || image.src}
          alt={image.name || 'アップロード画像'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* 画像名 */}
      <div className="text-center">
        <p className="text-xs font-medium text-gray-700 truncate">
          {image.name}
        </p>
      </div>
    </div>
  </DraggableElement>
);

// ============================================
// カスタムドラッグプレビュー
// ============================================

export const CustomDragPreview: React.FC<{
  type: string;
  children: React.ReactNode;
}> = ({ type, children }) => {
  return (
    <div className="bg-white border-2 border-blue-400 rounded-lg shadow-lg p-2 opacity-90">
      <div className="text-xs text-blue-600 font-medium mb-1">{type}</div>
      {children}
    </div>
  );
};

// ============================================
// ドラッグヘルパー
// ============================================

export const useDragState = () => {
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    const handleDragStart = () => setIsDragging(true);
    const handleDragEnd = () => setIsDragging(false);

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  return isDragging;
};
