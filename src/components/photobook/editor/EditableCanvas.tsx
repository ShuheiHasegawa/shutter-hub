'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  usePhotobookEditorStore,
  useActivePage,
} from '@/stores/photobook-editor-store';
import type { PageElement } from '@/types/photobook-editor';
import { debugLogger } from '@/lib/utils/debug-logger';
import { Stage, Layer, Rect, KonvaImage, KonvaText } from './KonvaComponents';
import { useNativeDrop, type DragItem } from './NativeDndProvider';

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
  const layerRef = useRef<any>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isKonvaReady, setIsKonvaReady] = useState(false);

  // コンポーネントのライフサイクルログ
  useEffect(() => {
    debugLogger.editor.mount('EditableCanvas');
    return () => {
      debugLogger.editor.unmount('EditableCanvas');
    };
  }, []);

  // Konvaの遅延初期化（動的インポート完了を待つ）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isKonvaReady) {
        debugLogger.konva.stageInit();
        // 短時間後に再評価
        setIsKonvaReady(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isKonvaReady]);

  // Store状態
  const {
    editorState,
    selectElement,
    clearSelection,
    updateElement,
    addElement,
  } = usePhotobookEditorStore();

  const activePage = useActivePage();

  // ネイティブドロップ領域の設定
  const { isOver, canDrop, dropProps } = useNativeDrop(
    ['layout-template', 'image-box', 'text-box', 'uploaded-image'],
    (item: DragItem, dropEvent?: React.MouseEvent) => {
      try {
        debugLogger.dnd.drop(item);

        if (
          !stageRef.current ||
          !layerRef.current ||
          !activePage ||
          !isKonvaReady
        ) {
          debugLogger.dnd.dropError(new Error('Invalid refs or not ready'), {
            stageRef: !!stageRef.current,
            layerRef: !!layerRef.current,
            activePage: !!activePage,
            isKonvaReady,
          });
          return;
        }

        // デフォルト位置（中央付近）
        const x = 30 + Math.random() * 40; // 30-70%の範囲
        const y = 30 + Math.random() * 40; // 30-70%の範囲

        // ドロップされたアイテムに応じて要素を作成
        if (item.type === 'image-box' && activePage) {
          const newElement: Omit<PageElement, 'id'> = {
            type: 'image',
            transform: { x, y, width: 20, height: 20 },
            style: {
              opacity: 1,
              zIndex: activePage.elements.length,
              visible: true,
            },
            data: {
              type: 'image',
              src: '/images/no-image.png',
              alt: '画像プレースホルダー',
            },
          };
          addElement(activePage.id, newElement);
        } else if (item.type === 'text-box' && activePage) {
          const newElement: Omit<PageElement, 'id'> = {
            type: 'text',
            transform: { x, y, width: 40, height: 10 },
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
          // 画像アップロード時：ドロップ位置の画像ボックスを検出
          let targetImageBox: PageElement | null = null;

          if (dropEvent && stageRef.current) {
            const stage = stageRef.current;
            const rect = stage.container().getBoundingClientRect();
            const pointerPosition = {
              x: dropEvent.clientX - rect.left,
              y: dropEvent.clientY - rect.top,
            };

            // ページ要素から直接画像ボックスを検出
            const relativeX = (pointerPosition.x / stageSize.width) * 100;
            const relativeY = (pointerPosition.y / stageSize.height) * 100;

            debugLogger.dnd.drop({
              ...item,
              message: `ドロップ位置: ${relativeX.toFixed(1)}%, ${relativeY.toFixed(1)}%`,
            });

            // 画像要素の中でドロップ位置に重なるものを検索
            for (const element of activePage.elements) {
              if (element.type === 'image') {
                const { x, y, width, height } = element.transform;

                if (
                  relativeX >= x &&
                  relativeX <= x + width &&
                  relativeY >= y &&
                  relativeY <= y + height
                ) {
                  targetImageBox = element;
                  debugLogger.dnd.drop({
                    ...item,
                    message: `画像ボックス「${element.id}」を検出 (${x}%, ${y}%, ${width}%, ${height}%)`,
                  });
                  break;
                }
              }
            }
          }

          if (targetImageBox) {
            // 既存の画像ボックスに画像を適用（サイズは変更しない）
            updateElement(targetImageBox.id, {
              data: {
                ...targetImageBox.data,
                src: item.data.src,
                alt: item.data.name || '画像',
              },
            });

            debugLogger.dnd.drop({
              ...item,
              message: `画像「${item.data.name}」を既存の画像ボックスに配置`,
            });
          } else {
            // 新しい画像要素を作成
            const newElement: Omit<PageElement, 'id'> = {
              type: 'image',
              transform: { x, y, width: 30, height: 30 },
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

            debugLogger.dnd.drop({
              ...item,
              message: `画像「${item.data.name}」を新しい画像ボックスとして配置`,
            });
          }
        } else if (item.type === 'layout-template' && activePage && item.data) {
          // テンプレートドロップ時：既存画像を新レイアウトに再配置
          const template = item.data;
          if (
            template.photoPositions &&
            Array.isArray(template.photoPositions)
          ) {
            // 既存の画像要素を取得
            const existingImages = activePage.elements.filter(
              element => element.type === 'image'
            );

            // 既存の画像を新しいテンプレート位置に再配置
            existingImages.forEach((element, index) => {
              if (index < template.photoPositions.length) {
                const position = template.photoPositions[index];
                updateElement(element.id, {
                  transform: {
                    ...element.transform,
                    x: position.x,
                    y: position.y,
                    width: position.width,
                    height: position.height,
                  },
                });
              }
            });

            // 不足分の画像ボックスを新規追加
            const additionalBoxesNeeded = Math.max(
              0,
              template.photoPositions.length - existingImages.length
            );

            for (let i = 0; i < additionalBoxesNeeded; i++) {
              const positionIndex = existingImages.length + i;
              const position = template.photoPositions[positionIndex];

              const newElement: Omit<PageElement, 'id'> = {
                type: 'image',
                transform: {
                  x: position.x,
                  y: position.y,
                  width: position.width,
                  height: position.height,
                },
                style: {
                  opacity: 1,
                  zIndex: activePage.elements.length + i,
                  visible: true,
                },
                data: {
                  type: 'image',
                  src: '/images/no-image.png',
                  alt: `テンプレート画像${positionIndex + 1}`,
                },
              };
              addElement(activePage.id, newElement);
            }

            debugLogger.dnd.drop({
              ...item,
              message: `テンプレート「${template.name}」を適用: ${existingImages.length}個の画像を再配置、${additionalBoxesNeeded}個の画像ボックスを新規追加`,
            });
          }
        }
      } catch (error) {
        debugLogger.dnd.dropError(error as Error, { item, stageSize });
      }
    }
  );

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
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor: '#e5e7eb', // Photoshopライクなグレー背景
        border: isOver && canDrop ? '2px dashed #007bff' : 'none',
      }}
      {...dropProps}
    >
      {/* Konva読み込み中の安全な表示 */}
      {!isKonvaReady && (
        <div
          className="w-full h-full flex items-center justify-center bg-gray-50"
          style={{ minHeight: '400px' }}
        >
          <div className="text-gray-500 text-sm">
            エディターを初期化しています...
          </div>
        </div>
      )}

      {/* ページキャンバス - Photoshopライクなデザイン */}
      <div className="w-full h-full flex items-center justify-center p-8">
        <div
          className="relative shadow-xl"
          style={{
            backgroundColor: activePage.layout.backgroundColor || '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            width: `${stageSize.width}px`,
            height: `${stageSize.height}px`,
          }}
        >
          {/* KonvaのStageは準備完了時のみレンダリング */}
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onClick={handleStageClick}
            scaleX={editorState.zoomLevel}
            scaleY={editorState.zoomLevel}
            style={{ display: isKonvaReady ? 'block' : 'none' }}
            onContentLoad={() => {
              debugLogger.konva.stageReady({
                stageSize,
                zoomLevel: editorState.zoomLevel,
              });
              setIsKonvaReady(true);
            }}
            onError={error => {
              debugLogger.konva.renderError(error, { stageSize });
              setIsKonvaReady(false);
            }}
          >
            <Layer ref={layerRef}>
              {/* Konvaの準備ができていない場合は基本要素のみ表示 */}
              {!isKonvaReady ? (
                <Rect
                  x={0}
                  y={0}
                  width={stageSize.width}
                  height={stageSize.height}
                  fill="transparent"
                  listening={false}
                />
              ) : (
                <>
                  {/* グリッド表示 */}
                  {editorState.showGrid && (
                    <GridLayer
                      width={stageSize.width}
                      height={stageSize.height}
                      gridSize={20}
                      visible={true}
                    />
                  )}

                  {/* ページ要素の描画 */}
                  {activePage &&
                    activePage.elements
                      .filter(element => element.style.visible !== false)
                      .sort(
                        (a, b) => (a.style.zIndex || 0) - (b.style.zIndex || 0)
                      )
                      .map(element => {
                        try {
                          const isSelected =
                            editorState.selectedElements.includes(element.id);

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
                        } catch (error) {
                          debugLogger.konva.renderError(error, {
                            elementId: element.id,
                          });
                          return null;
                        }
                      })}
                </>
              )}
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
        </div>
      </div>

      {/* ズームレベル表示 */}
      <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded shadow text-sm">
        {Math.round(editorState.zoomLevel * 100)}%
      </div>
    </div>
  );
};

export default EditableCanvas;
