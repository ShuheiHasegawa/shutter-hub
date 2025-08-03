'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useDrop } from 'react-dnd';
import dynamic from 'next/dynamic';
import {
  usePhotobookEditorStore,
  useActivePage,
} from '@/stores/photobook-editor-store';
import type { DragItem, PageElement } from '@/types/photobook-editor';

// Konvaを動的インポートしてSSRエラーを回避
const Stage = dynamic(() => import('react-konva').then(mod => mod.Stage), {
  ssr: false,
});
const Layer = dynamic(() => import('react-konva').then(mod => mod.Layer), {
  ssr: false,
});
const Rect = dynamic(() => import('react-konva').then(mod => mod.Rect), {
  ssr: false,
});
const KonvaImage = dynamic(() => import('react-konva').then(mod => mod.Image), {
  ssr: false,
});
const KonvaText = dynamic(() => import('react-konva').then(mod => mod.Text), {
  ssr: false,
});

// ============================================
// 型定義
// ============================================

interface EditableCanvasProps {
  className?: string;
  onElementSelect?: (elementId: string, multiSelect?: boolean) => void;
  onElementUpdate?: (elementId: string, updates: Partial<PageElement>) => void;
}

interface KonvaElementProps {
  element: PageElement;
  isSelected: boolean;
  onSelect: (elementId: string, multiSelect?: boolean) => void;
  onUpdate: (elementId: string, updates: Partial<PageElement>) => void;
  stageSize: { width: number; height: number };
}

// ============================================
// 個別要素コンポーネント
// ============================================

const KonvaImageElement: React.FC<KonvaElementProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
  stageSize,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<unknown>(null);

  useEffect(() => {
    if (element.data.type === 'image') {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setImage(img);
      img.src = element.data.src;
    }
  }, [element.data]);

  const handleDragEnd = useCallback(
    (e: any) => {
      const node = e.target;
      const x = (node.x() / stageSize.width) * 100;
      const y = (node.y() / stageSize.height) * 100;

      onUpdate(element.id, {
        transform: {
          ...element.transform,
          x,
          y,
        },
      });
    },
    [element.id, element.transform, onUpdate, stageSize]
  );

  const handleTransformEnd = useCallback(
    (e: any) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // スケールをリセットして、実際のサイズを更新
      node.scaleX(1);
      node.scaleY(1);

      const width = ((node.width() * scaleX) / stageSize.width) * 100;
      const height = ((node.height() * scaleY) / stageSize.height) * 100;

      onUpdate(element.id, {
        transform: {
          ...element.transform,
          width,
          height,
        },
      });
    },
    [element.id, element.transform, onUpdate, stageSize]
  );

  if (!image) return null;

  const x = (element.transform.x / 100) * stageSize.width;
  const y = (element.transform.y / 100) * stageSize.height;
  const width = (element.transform.width / 100) * stageSize.width;
  const height = (element.transform.height / 100) * stageSize.height;

  return (
    <KonvaImage
      ref={imageRef}
      id={element.id}
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
      rotation={element.transform.rotation || 0}
      opacity={element.style.opacity || 1}
      draggable={!element.style.locked}
      onClick={e => {
        e.cancelBubble = true;
        onSelect(element.id, e.evt.ctrlKey || e.evt.metaKey);
      }}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      // 選択時のスタイル
      stroke={isSelected ? '#007bff' : undefined}
      strokeWidth={isSelected ? 2 : 0}
    />
  );
};

const KonvaTextElement: React.FC<KonvaElementProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
  stageSize,
}) => {
  const textRef = useRef<any>(null);

  const handleDragEnd = useCallback(
    (e: any) => {
      const node = e.target;
      const x = (node.x() / stageSize.width) * 100;
      const y = (node.y() / stageSize.height) * 100;

      onUpdate(element.id, {
        transform: {
          ...element.transform,
          x,
          y,
        },
      });
    },
    [element.id, element.transform, onUpdate, stageSize]
  );

  if (element.data.type !== 'text') return null;

  const x = (element.transform.x / 100) * stageSize.width;
  const y = (element.transform.y / 100) * stageSize.height;
  const width = (element.transform.width / 100) * stageSize.width;

  return (
    <KonvaText
      ref={textRef}
      id={element.id}
      text={element.data.content}
      x={x}
      y={y}
      width={width}
      fontSize={element.data.fontSize}
      fontFamily={element.data.fontFamily}
      fill={element.data.color}
      align={element.data.align || 'left'}
      rotation={element.transform.rotation || 0}
      opacity={element.style.opacity || 1}
      draggable={!element.style.locked}
      onClick={e => {
        e.cancelBubble = true;
        onSelect(element.id, e.evt.ctrlKey || e.evt.metaKey);
      }}
      onDragEnd={handleDragEnd}
      // 選択時のスタイル
      stroke={isSelected ? '#007bff' : undefined}
      strokeWidth={isSelected ? 1 : 0}
    />
  );
};

// ============================================
// グリッド表示コンポーネント
// ============================================

const GridLayer: React.FC<{
  width: number;
  height: number;
  gridSize: number;
  visible: boolean;
}> = ({ width, height, gridSize, visible }) => {
  if (!visible) return null;

  const lines: JSX.Element[] = [];

  // 縦線
  for (let i = 0; i <= width; i += gridSize) {
    lines.push(
      <Rect
        key={`v-${i}`}
        x={i}
        y={0}
        width={1}
        height={height}
        fill="#e0e0e0"
        listening={false}
      />
    );
  }

  // 横線
  for (let i = 0; i <= height; i += gridSize) {
    lines.push(
      <Rect
        key={`h-${i}`}
        x={0}
        y={i}
        width={width}
        height={1}
        fill="#e0e0e0"
        listening={false}
      />
    );
  }

  return <>{lines}</>;
};

// ============================================
// メインキャンバスコンポーネント
// ============================================

const EditableCanvas: React.FC<EditableCanvasProps> = ({
  className,
  onElementSelect,
  onElementUpdate,
}) => {
  const stageRef = useRef<any>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // Store状態
  const {
    editorState,
    selectElement,
    clearSelection,
    updateElement,
    addElement,
  } = usePhotobookEditorStore();

  const activePage = useActivePage();

  // ドロップ領域の設定
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['layout-template', 'image-box', 'text-box', 'uploaded-image'],
    drop: (item: DragItem, monitor) => {
      const dropPosition = monitor.getClientOffset();
      if (!dropPosition || !stageRef.current) return;

      const stage = stageRef.current;
      const stageBox = stage.container().getBoundingClientRect();

      const x = ((dropPosition.x - stageBox.left) / stageSize.width) * 100;
      const y = ((dropPosition.y - stageBox.top) / stageSize.height) * 100;

      // ドロップされたアイテムに応じて要素を作成
      if (item.type === 'image-box' && activePage) {
        const newElement: Omit<PageElement, 'id'> = {
          type: 'image',
          transform: {
            x: Math.max(0, Math.min(80, x)),
            y: Math.max(0, Math.min(80, y)),
            width: 20,
            height: 20,
          },
          style: {
            opacity: 1,
            zIndex: activePage.elements.length,
            visible: true,
          },
          data: {
            type: 'image',
            src: '/images/no-image.png', // プレースホルダー画像
            alt: '画像プレースホルダー',
          },
        };

        addElement(activePage.id, newElement);
      } else if (item.type === 'text-box' && activePage) {
        const newElement: Omit<PageElement, 'id'> = {
          type: 'text',
          transform: {
            x: Math.max(0, Math.min(60, x)),
            y: Math.max(0, Math.min(90, y)),
            width: 40,
            height: 10,
          },
          style: {
            opacity: 1,
            zIndex: activePage.elements.length,
            visible: true,
          },
          data: {
            type: 'text',
            content: 'テキストを入力',
            fontSize: 16,
            fontFamily: 'Arial',
            color: '#000000',
            align: 'left',
          },
        };

        addElement(activePage.id, newElement);
      } else if (item.type === 'uploaded-image' && activePage && item.data) {
        const newElement: Omit<PageElement, 'id'> = {
          type: 'image',
          transform: {
            x: Math.max(0, Math.min(70, x)),
            y: Math.max(0, Math.min(70, y)),
            width: 30,
            height: 30,
          },
          style: {
            opacity: 1,
            zIndex: activePage.elements.length,
            visible: true,
          },
          data: {
            type: 'image',
            src: item.data.src,
            alt: item.data.name || '画像',
          },
        };

        addElement(activePage.id, newElement);
      }

      return { dropEffect: 'copy' };
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // キャンバスサイズの自動調整
  useEffect(() => {
    const handleResize = () => {
      const container = stageRef.current?.container()?.parentElement;
      if (container) {
        const { width, height } = container.getBoundingClientRect();
        setStageSize({
          width: width - 20, // パディング分を除く
          height: height - 20,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 要素選択のハンドラー
  const handleElementSelect = useCallback(
    (elementId: string, multiSelect = false) => {
      selectElement(elementId, multiSelect);
      onElementSelect?.(elementId, multiSelect);
    },
    [selectElement, onElementSelect]
  );

  // 要素更新のハンドラー
  const handleElementUpdate = useCallback(
    (elementId: string, updates: Partial<PageElement>) => {
      updateElement(elementId, updates);
      onElementUpdate?.(elementId, updates);
    },
    [updateElement, onElementUpdate]
  );

  // 背景クリックで選択解除
  const handleStageClick = useCallback(
    (e: any) => {
      // クリックされたのがStage自体の場合のみ選択解除
      if (e.target === e.target.getStage()) {
        clearSelection();
      }
    },
    [clearSelection]
  );

  if (!activePage) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-500">ページが選択されていません</p>
      </div>
    );
  }

  return (
    <div
      ref={drop}
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor: activePage.layout.backgroundColor || '#ffffff',
        border: isOver && canDrop ? '2px dashed #007bff' : '1px solid #e0e0e0',
      }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onClick={handleStageClick}
        scaleX={editorState.zoomLevel}
        scaleY={editorState.zoomLevel}
      >
        <Layer>
          {/* グリッド表示 */}
          <GridLayer
            width={stageSize.width}
            height={stageSize.height}
            gridSize={20}
            visible={editorState.showGrid}
          />

          {/* ページ要素の描画 */}
          {activePage.elements
            .filter(element => element.style.visible !== false)
            .sort((a, b) => (a.style.zIndex || 0) - (b.style.zIndex || 0))
            .map(element => {
              const isSelected = editorState.selectedElements.includes(
                element.id
              );

              if (element.type === 'image') {
                return (
                  <KonvaImageElement
                    key={element.id}
                    element={element}
                    isSelected={isSelected}
                    onSelect={handleElementSelect}
                    onUpdate={handleElementUpdate}
                    stageSize={stageSize}
                  />
                );
              } else if (element.type === 'text') {
                return (
                  <KonvaTextElement
                    key={element.id}
                    element={element}
                    isSelected={isSelected}
                    onSelect={handleElementSelect}
                    onUpdate={handleElementUpdate}
                    stageSize={stageSize}
                  />
                );
              }

              return null;
            })}
        </Layer>
      </Stage>

      {/* ドロップ時のオーバーレイ */}
      {isOver && canDrop && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 flex items-center justify-center">
          <div className="bg-white px-4 py-2 rounded-lg shadow-lg">
            <p className="text-blue-600 font-medium">
              ここにドロップしてください
            </p>
          </div>
        </div>
      )}

      {/* ズームレベル表示 */}
      <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded shadow text-sm">
        {Math.round(editorState.zoomLevel * 100)}%
      </div>
    </div>
  );
};

export default EditableCanvas;
