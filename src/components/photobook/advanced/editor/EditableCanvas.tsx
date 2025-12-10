'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from 'react';
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
  offsetX?: number; // 右ページ用のX座標オフセット
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
  offsetX = 0,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (element.data.type === 'image') {
      if (element.data.src && element.data.src.trim() !== '') {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => setImage(img);
        img.onerror = () => setImage(null);
        img.src = element.data.src;
      } else {
        setImage(null);
      }
    }
  }, [element.data]);

  const handleDragEnd = useCallback(
    (e: any) => {
      const node = e.target;
      // offsetXを引いてから%計算（右ページの座標を正しく保存するため）
      const x = ((node.x() - offsetX) / stageSize.width) * 100;
      const y = (node.y() / stageSize.height) * 100;

      onUpdate(element.id, {
        transform: {
          ...element.transform,
          x,
          y,
        },
      });
    },
    [element.id, element.transform, onUpdate, stageSize, offsetX]
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

  // ボックスの座標とサイズを計算（右ページの場合はoffsetXを加算）
  const boxX = (element.transform.x / 100) * stageSize.width + offsetX;
  const boxY = (element.transform.y / 100) * stageSize.height;
  const boxWidth = (element.transform.width / 100) * stageSize.width;
  const boxHeight = (element.transform.height / 100) * stageSize.height;

  // 画像がない場合はフォールバック表示（Rect + アイコン表示用のテキスト）
  // 空のプレースホルダーでもドラッグ・選択できるようにする
  if (!image) {
    return (
      <React.Fragment>
        {/* ドラッグ可能な背景矩形 */}
        <Rect
          x={boxX}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          fill="rgba(107, 80, 145, 0.1)"
          stroke={isSelected ? '#007bff' : 'rgba(107, 80, 145, 0.5)'}
          strokeWidth={isSelected ? 2 : 2}
          opacity={element.style.opacity}
          draggable={!element.style.locked}
          listening={true}
          onClick={(e: any) => {
            e.cancelBubble = true;
            onSelect(element.id, e.evt.ctrlKey || e.evt.metaKey);
          }}
          onDragEnd={handleDragEnd}
        />
        {/* アイコンテキスト（クリック対象外） */}
        <KonvaText
          x={boxX + boxWidth / 2 - Math.min(boxWidth, boxHeight) * 0.15}
          y={boxY + boxHeight / 2 - Math.min(boxWidth, boxHeight) * 0.15}
          text="📷"
          fontSize={Math.min(boxWidth, boxHeight) * 0.3}
          fill="rgba(107, 80, 145, 0.4)"
          align="center"
          listening={false}
        />
      </React.Fragment>
    );
  }

  // 画像がある場合：アスペクト比を保持して中央クロップ
  const imageAspect = image.width / image.height;
  const boxAspect = boxWidth / boxHeight;

  let cropX = 0;
  let cropY = 0;
  let cropWidth = image.width;
  let cropHeight = image.height;

  if (imageAspect > boxAspect) {
    // 画像が横長 → 左右をクロップ
    cropWidth = image.height * boxAspect;
    cropX = (image.width - cropWidth) / 2;
  } else if (imageAspect < boxAspect) {
    // 画像が縦長 → 上下をクロップ
    cropHeight = image.width / boxAspect;
    cropY = (image.height - cropHeight) / 2;
  }

  return (
    <KonvaImage
      image={image}
      x={boxX}
      y={boxY}
      width={boxWidth}
      height={boxHeight}
      crop={{
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      }}
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
  offsetX = 0,
}) => {
  const textRef = useRef<any>(null);

  const handleDragEnd = useCallback(
    (e: any) => {
      const node = e.target;
      // offsetXを引いてから%計算（右ページの座標を正しく保存するため）
      const x = ((node.x() - offsetX) / stageSize.width) * 100;
      const y = (node.y() / stageSize.height) * 100;

      onUpdate(element.id, {
        transform: {
          ...element.transform,
          x,
          y,
        },
      });
    },
    [element.id, element.transform, onUpdate, stageSize, offsetX]
  );

  if (element.data.type !== 'text') return null;

  // 右ページの場合はoffsetXを加算
  const x = (element.transform.x / 100) * stageSize.width + offsetX;
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

  const lines: React.ReactNode[] = [];

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
  const _stageRef = useRef<any>(null);
  const _layerRef = useRef<any>(null);
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
    removeElement,
    duplicateElement,
    currentProject,
  } = usePhotobookEditorStore();

  const activePage = useActivePage();

  // 見開き判定
  // 1ページ目: 単独（表紙）
  // 2,3 / 4,5 / ... : 見開き
  // 最終ページが奇数の場合（表紙除く）: 単独
  const spreadInfo = useMemo(() => {
    if (!currentProject || !activePage) {
      return { isSpread: false, leftPage: null, rightPage: null };
    }

    const pages = currentProject.pages;
    const totalPages = pages.length;
    const activeIndex = pages.findIndex(p => p.id === activePage.id);

    // 表紙（0番目）は単独
    if (activeIndex === 0) {
      return {
        isSpread: false,
        leftPage: activePage,
        rightPage: null,
        isCover: true,
      };
    }

    // 奇数インデックス（2ページ目、4ページ目...）は見開きの左側
    if (activeIndex % 2 === 1) {
      const rightPage = pages[activeIndex + 1] || null;
      // 次のページがある場合は見開き
      if (rightPage && activeIndex + 1 < totalPages) {
        return {
          isSpread: true,
          leftPage: activePage,
          rightPage,
          isCover: false,
        };
      }
      // 次のページがない場合は単独（最終ページ）
      return {
        isSpread: false,
        leftPage: activePage,
        rightPage: null,
        isCover: false,
      };
    }

    // 偶数インデックス（3ページ目、5ページ目...）は見開きの右側
    // → 左ページをアクティブとして扱う
    const leftPage = pages[activeIndex - 1];
    return { isSpread: true, leftPage, rightPage: activePage, isCover: false };
  }, [currentProject, activePage]);

  // 選択中の要素を削除
  const handleDeleteSelected = useCallback(() => {
    const selectedIds = [...editorState.selectedElements];
    selectedIds.forEach(elementId => {
      removeElement(elementId);
    });
    clearSelection();
  }, [editorState.selectedElements, removeElement, clearSelection]);

  // 選択中の要素を複製
  const handleDuplicateSelected = useCallback(() => {
    const selectedIds = [...editorState.selectedElements];
    selectedIds.forEach(elementId => {
      duplicateElement(elementId);
    });
  }, [editorState.selectedElements, duplicateElement]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フィールドにフォーカスがある場合は無視
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Delete または Backspace で削除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editorState.selectedElements.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }

      // Ctrl/Cmd + D で複製
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (editorState.selectedElements.length > 0) {
          e.preventDefault();
          handleDuplicateSelected();
        }
      }

      // Escape で選択解除
      if (e.key === 'Escape') {
        clearSelection();
      }

      // Ctrl/Cmd + A で全選択
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && activePage) {
        e.preventDefault();
        const allElementIds = activePage.elements.map(el => el.id);
        allElementIds.forEach((id, index) => {
          selectElement(id, index > 0);
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editorState.selectedElements,
    handleDeleteSelected,
    handleDuplicateSelected,
    clearSelection,
    selectElement,
    activePage,
  ]);

  // ネイティブドロップ領域の設定
  const { isOver, canDrop, dropProps } = useNativeDrop(
    ['layout-template', 'image-box', 'text-box', 'uploaded-image'],
    (item: DragItem, dropEvent?: React.MouseEvent) => {
      try {
        debugLogger.dnd.drop(item);

        if (!activePage || !isKonvaReady) {
          debugLogger.dnd.dropError(new Error('Not ready'), {
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
              src: '',
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
        } else if (
          item.type === 'uploaded-image' &&
          activePage &&
          item.data &&
          typeof item.data === 'object' &&
          item.data !== null &&
          'src' in item.data
        ) {
          // 画像アップロード時：ドロップ位置の画像ボックスを検出
          let targetImageBox: PageElement | null = null;

          if (dropEvent) {
            // ステージの位置計算は近似値を使用
            const rect = (dropEvent.target as Element).getBoundingClientRect();
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

          if (targetImageBox && targetImageBox.data.type === 'image') {
            // 既存の画像ボックスに画像を適用（サイズは変更しない）
            updateElement(targetImageBox.id, {
              data: {
                ...targetImageBox.data,
                src: (item.data as any).src,
                alt: (item.data as any).name || '画像',
              },
            });

            debugLogger.dnd.drop({
              ...item,
              message: `画像「${(item.data as any).name}」を既存の画像ボックスに配置`,
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
                src: (item.data as any).src,
                alt: (item.data as any).name || '画像',
              },
            };
            addElement(activePage.id, newElement);

            debugLogger.dnd.drop({
              ...item,
              message: `画像「${(item.data as any).name}」を新しい画像ボックスとして配置`,
            });
          }
        } else if (item.type === 'layout-template' && activePage && item.data) {
          // テンプレートドロップ時：既存画像を新レイアウトに再配置
          const template = item.data as any;
          if (
            template.photoPositions &&
            Array.isArray(template.photoPositions)
          ) {
            // 見開きテンプレートかどうかを判定
            const isSpreadTemplate =
              template.id?.includes('spread') ||
              template.name?.includes('見開き');

            // 見開きテンプレートの場合、左ページに全幅要素を配置
            // 座標は見開き全体の割合（0-100%）として解釈
            if (
              isSpreadTemplate &&
              spreadInfo.isSpread &&
              spreadInfo.leftPage
            ) {
              // 既存の画像要素を両ページから削除
              const leftPageImages = spreadInfo.leftPage.elements.filter(
                el => el.type === 'image'
              );
              const rightPageImages =
                spreadInfo.rightPage?.elements.filter(
                  el => el.type === 'image'
                ) || [];

              leftPageImages.forEach(el => removeElement(el.id));
              rightPageImages.forEach(el => removeElement(el.id));

              // 見開きテンプレートの座標を変換して左ページに配置
              // photoPositionsの座標は見開き全体（2ページ分）の割合
              // 左ページには0-50%の部分、右ページには50-100%の部分を配置
              template.photoPositions.forEach(
                (position: any, index: number) => {
                  // 要素が左半分にある場合
                  if (position.x < 50) {
                    const newElement: Omit<PageElement, 'id'> = {
                      type: 'image',
                      transform: {
                        // 左ページの座標に変換（2倍してフルスケール）
                        x: position.x * 2,
                        y: position.y,
                        width: Math.min(
                          position.width * 2,
                          100 - position.x * 2
                        ),
                        height: position.height,
                      },
                      style: { opacity: 1, zIndex: index, visible: true },
                      data: {
                        type: 'image',
                        src: '',
                        alt: `見開き画像${index + 1}`,
                      },
                    };
                    addElement(spreadInfo.leftPage!.id, newElement);
                  }

                  // 要素が右半分にある場合
                  if (
                    position.x + position.width > 50 &&
                    spreadInfo.rightPage
                  ) {
                    const rightX = Math.max(0, (position.x - 50) * 2);
                    const newElement: Omit<PageElement, 'id'> = {
                      type: 'image',
                      transform: {
                        x: rightX,
                        y: position.y,
                        width: Math.min(
                          (position.x + position.width - 50) * 2,
                          100 - rightX
                        ),
                        height: position.height,
                      },
                      style: { opacity: 1, zIndex: index, visible: true },
                      data: {
                        type: 'image',
                        src: '',
                        alt: `見開き画像${index + 1}`,
                      },
                    };
                    addElement(spreadInfo.rightPage.id, newElement);
                  }
                }
              );

              debugLogger.dnd.drop({
                ...item,
                message: `見開きテンプレート「${template.name}」を両ページに適用`,
              });
            } else {
              // 通常のテンプレート処理（単一ページ）
              // 見開き表示の場合は、ドロップ位置に基づいて左右どちらのページに適用するか決定
              let targetPage = activePage;
              let targetPageId = activePage.id;

              if (spreadInfo.isSpread && dropEvent) {
                // ドロップ位置を取得してキャンバスの中央より左か右かを判定
                const canvasRect = (
                  dropEvent.currentTarget as HTMLElement
                )?.getBoundingClientRect();
                if (canvasRect) {
                  const dropX = dropEvent.clientX - canvasRect.left;
                  const canvasCenter = canvasRect.width / 2;

                  if (dropX > canvasCenter && spreadInfo.rightPage) {
                    // 右半分にドロップ → 右ページに適用
                    targetPage = spreadInfo.rightPage;
                    targetPageId = spreadInfo.rightPage.id;
                  } else if (spreadInfo.leftPage) {
                    // 左半分にドロップ → 左ページに適用
                    targetPage = spreadInfo.leftPage;
                    targetPageId = spreadInfo.leftPage.id;
                  }
                }
              }

              const existingImages = targetPage.elements.filter(
                element => element.type === 'image'
              );

              const templatePositionCount = template.photoPositions.length;

              existingImages.forEach((element, index) => {
                if (index < templatePositionCount) {
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

              if (existingImages.length > templatePositionCount) {
                const excessImages = existingImages.slice(
                  templatePositionCount
                );
                excessImages.forEach(element => {
                  removeElement(element.id);
                });
              }

              const additionalBoxesNeeded = Math.max(
                0,
                templatePositionCount - existingImages.length
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
                    zIndex: targetPage.elements.length + i,
                    visible: true,
                  },
                  data: {
                    type: 'image',
                    src: '',
                    alt: `テンプレート画像${positionIndex + 1}`,
                  },
                };
                addElement(targetPageId, newElement);
              }

              const removedCount = Math.max(
                0,
                existingImages.length - templatePositionCount
              );
              const pageLabel =
                targetPage === spreadInfo.rightPage
                  ? '（右ページ）'
                  : targetPage === spreadInfo.leftPage
                    ? '（左ページ）'
                    : '';
              debugLogger.dnd.drop({
                ...item,
                message: `テンプレート「${template.name}」を適用${pageLabel}: ${Math.min(existingImages.length, templatePositionCount)}個の画像を再配置、${additionalBoxesNeeded}個の画像ボックスを新規追加、${removedCount}個を削除`,
              });
            }
          }
        }
      } catch (error) {
        debugLogger.dnd.dropError(error as Error, { item, stageSize });
      }
    }
  );

  // キャンバスサイズの自動調整（アスペクト比と見開きに対応）
  useEffect(() => {
    const handleResize = () => {
      // アスペクト比に基づいて単一ページのサイズを計算
      const aspectRatio = currentProject?.settings.aspectRatio || 'portrait';
      const baseHeight = 500; // 基準高さ

      let singlePageWidth: number;
      let pageHeight: number;

      switch (aspectRatio) {
        case 'portrait':
          // 縦長: 210×297mm → 約 0.707 の幅/高さ比
          singlePageWidth = Math.round(baseHeight * 0.707);
          pageHeight = baseHeight;
          break;
        case 'landscape':
          // 横長: 297×210mm → 約 1.414 の幅/高さ比
          singlePageWidth = Math.round(baseHeight * 1.414);
          pageHeight = baseHeight;
          break;
        case 'square':
          // 正方形: 1:1
          singlePageWidth = baseHeight;
          pageHeight = baseHeight;
          break;
        default:
          singlePageWidth = 354; // fallback
          pageHeight = 500;
      }

      // 見開きの場合は2ページ分の幅
      const width = spreadInfo.isSpread ? singlePageWidth * 2 : singlePageWidth;

      setStageSize({
        width,
        height: pageHeight,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [spreadInfo.isSpread, currentProject?.settings.aspectRatio]);

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
      {...dropProps}
      style={{
        backgroundColor: '#e5e7eb', // Photoshopライクなグレー背景
        border: isOver && canDrop ? '2px dashed #007bff' : 'none',
        ...dropProps.style,
      }}
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
      <div className="w-full h-full flex items-center justify-center p-8 overflow-auto">
        <div
          className="relative shadow-xl transition-transform duration-200"
          style={{
            backgroundColor: activePage.layout.backgroundColor || '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            width: `${stageSize.width}px`,
            height: `${stageSize.height}px`,
            transform: `scale(${editorState.zoomLevel})`,
            transformOrigin: 'center center',
          }}
        >
          {/* KonvaのStageは準備完了時のみレンダリング */}
          <div style={{ display: isKonvaReady ? 'block' : 'none' }}>
            <Stage
              ref={_stageRef}
              width={stageSize.width}
              height={stageSize.height}
              onClick={handleStageClick}
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
              <Layer>
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

                    {/* 左ページの要素（見開きの場合は左半分、単独の場合は全体） */}
                    {spreadInfo.leftPage &&
                      spreadInfo.leftPage.elements
                        .filter(element => element.style.visible !== false)
                        .sort(
                          (a, b) =>
                            (a.style.zIndex || 0) - (b.style.zIndex || 0)
                        )
                        .map(element => {
                          try {
                            const isSelected =
                              editorState.selectedElements.includes(element.id);

                            // 単独ページの場合は通常のサイズ、見開きの場合は半分のサイズ
                            const pageWidth = spreadInfo.isSpread
                              ? stageSize.width / 2
                              : stageSize.width;
                            const elementStageSize = {
                              width: pageWidth,
                              height: stageSize.height,
                            };

                            if (element.type === 'image') {
                              return (
                                <KonvaImageElement
                                  key={element.id}
                                  element={element}
                                  isSelected={isSelected}
                                  onSelect={handleElementSelect}
                                  onUpdate={handleElementUpdate}
                                  stageSize={elementStageSize}
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
                                  stageSize={elementStageSize}
                                />
                              );
                            }

                            return null;
                          } catch (error) {
                            debugLogger.konva.renderError(error as Error, {
                              elementId: element.id,
                              page: 'left',
                            });
                            return null;
                          }
                        })}

                    {/* 右ページの要素（見開きの場合のみ） */}
                    {spreadInfo.isSpread &&
                      spreadInfo.rightPage &&
                      spreadInfo.rightPage.elements
                        .filter(element => element.style.visible !== false)
                        .sort(
                          (a, b) =>
                            (a.style.zIndex || 0) - (b.style.zIndex || 0)
                        )
                        .map(element => {
                          try {
                            const isSelected =
                              editorState.selectedElements.includes(element.id);

                            // 右ページは右半分に配置
                            const pageWidth = stageSize.width / 2;
                            const elementStageSize = {
                              width: pageWidth,
                              height: stageSize.height,
                            };
                            const offsetX = pageWidth;

                            if (element.type === 'image') {
                              return (
                                <KonvaImageElement
                                  key={element.id}
                                  element={{
                                    ...element,
                                    transform: {
                                      ...element.transform,
                                      // x位置にオフセットを追加（%計算後）
                                    },
                                  }}
                                  isSelected={isSelected}
                                  onSelect={handleElementSelect}
                                  onUpdate={handleElementUpdate}
                                  stageSize={elementStageSize}
                                  offsetX={offsetX}
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
                                  stageSize={elementStageSize}
                                  offsetX={offsetX}
                                />
                              );
                            }

                            return null;
                          } catch (error) {
                            debugLogger.konva.renderError(error as Error, {
                              elementId: element.id,
                              page: 'right',
                            });
                            return null;
                          }
                        })}

                    {/* 見開きの中央線（綴じ目） */}
                    {spreadInfo.isSpread && (
                      <Rect
                        x={stageSize.width / 2 - 1}
                        y={0}
                        width={2}
                        height={stageSize.height}
                        fill="#d1d5db"
                        listening={false}
                      />
                    )}
                  </>
                )}
              </Layer>
            </Stage>
          </div>

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

      {/* 選択時の操作ツールバー */}
      {editorState.selectedElements.length > 0 && (
        <div className="absolute top-4 right-4 surface-primary rounded-lg shadow-lg border p-2 flex items-center gap-2">
          <span className="text-xs opacity-70 px-2">
            {editorState.selectedElements.length}個選択中
          </span>
          <div className="w-px h-6 opacity-20 bg-current" />
          <button
            onClick={handleDuplicateSelected}
            className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="複製 (Ctrl+D)"
          >
            <svg
              className="w-4 h-4 opacity-70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
          <button
            onClick={handleDeleteSelected}
            className="p-2 rounded hover:bg-red-500/20 transition-colors text-red-500"
            title="削除 (Delete)"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      )}

      {/* ズームレベル表示 */}
      <div className="absolute bottom-2 right-2 surface-primary px-2 py-1 rounded shadow text-sm">
        {Math.round(editorState.zoomLevel * 100)}%
      </div>

      {/* キーボードショートカットのヒント */}
      <div className="absolute bottom-2 left-2 surface-primary px-3 py-2 rounded shadow text-xs opacity-70">
        <div className="flex gap-4">
          <span>Delete: 削除</span>
          <span>Ctrl+D: 複製</span>
          <span>Ctrl+A: 全選択</span>
          <span>Esc: 選択解除</span>
        </div>
      </div>
    </div>
  );
};

export default EditableCanvas;
