'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { arrayMove } from '@dnd-kit/sortable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  X,
  Loader2,
  ImageIcon,
  AlertCircle,
  Save,
  Star,
  RotateCcw,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';
import type {
  PhotobookImage,
  TempImage,
  UnifiedImage,
  ImageOrientation,
} from '@/types/quick-photobook';
import {
  removePhotobookImage,
  reorderPhotobookImages,
} from '@/app/actions/quick-photobook-images';

/**
 * 画像の向きを判定する
 */
function determineOrientation(width: number, height: number): ImageOrientation {
  const ratio = width / height;
  if (ratio > 1.2) {
    return 'landscape';
  } else if (ratio < 0.8) {
    return 'portrait';
  } else {
    return 'square';
  }
}

/**
 * 仮画像を統合画像に変換
 */
function tempToUnified(tempImage: TempImage): UnifiedImage {
  return {
    id: tempImage.id,
    type: 'temp',
    pageNumber: tempImage.pageNumber,
    orientation: tempImage.orientation,
    preview: tempImage.preview,
    status: tempImage.status,
    data: tempImage,
  };
}

/**
 * 確定画像を統合画像に変換
 */
function savedToUnified(savedImage: PhotobookImage): UnifiedImage {
  return {
    id: savedImage.id,
    type: 'saved',
    pageNumber: savedImage.page_number,
    orientation: savedImage.orientation,
    preview: savedImage.image_url,
    data: savedImage,
  };
}

/**
 * ドラッグ可能な画像カードコンポーネント
 */
interface DraggableImageCardProps {
  image: UnifiedImage;
  index: number;
  onRemove: (id: string) => void;
  isRemoving: boolean;
  isCover?: boolean;
  onSetCover?: (imageId: string) => void;
  isPendingDelete?: boolean;
  viewMode?: 'desktop' | 'mobile';
  maxPages: number;
}

function DraggableImageCard({
  image,
  index: _index,
  onRemove,
  isRemoving,
  isCover = false,
  onSetCover,
  isPendingDelete = false,
  viewMode = 'desktop',
  maxPages,
}: DraggableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  // ドラッグ状態のログ出力
  useEffect(() => {
    if (isDragging) {
      logger.info('🎯 カードドラッグ中', {
        imageId: image.id,
        pageNumber: image.pageNumber,
        viewMode,
        transform: CSS.Transform.toString(transform),
        timestamp: Date.now(),
      });
    }
  }, [isDragging, image.id, image.pageNumber, viewMode, transform]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition || 'transform 200ms ease',
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.5 : 1, // ドラッグ中は半透明
  };

  const isMobile = viewMode === 'mobile';

  return (
    <div
      className={cn(
        'group relative transition-all duration-200',
        isDragging && 'opacity-50 scale-105 z-10', // シンプルなドラッグ表示
        isPendingDelete && 'opacity-50 grayscale'
      )}
    >
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          'overflow-hidden shadow-md hover:shadow-lg transition-shadow',
          isMobile && 'shadow-sm' // モバイルでは控えめなシャドウ
        )}
      >
        {/* ヘッダー：ページ番号 + 表紙設定 + 削除 */}
        <div
          className={cn(
            'relative flex items-center justify-between px-2 transition-all',
            isMobile ? 'h-6' : 'h-8', // モバイルでは高さを縮小
            isCover
              ? 'bg-gradient-to-r from-yellow-400 to-amber-400 text-white shadow-md'
              : 'bg-gray-100/80 text-gray-500'
          )}
        >
          {/* ページ番号 */}
          <span className={cn(isMobile ? 'text-xs' : 'text-sm', 'font-medium')}>
            {image.pageNumber}/{maxPages}
          </span>

          {/* 表紙ステータス・設定ボタン */}
          <div className="flex items-center gap-1">
            {isCover ? (
              <div className="flex items-center gap-1">
                <Star
                  className={cn(
                    isMobile ? 'h-2 w-2' : 'h-3 w-3',
                    'fill-current'
                  )}
                />
                <span
                  className={cn(
                    isMobile ? 'text-[10px]' : 'text-xs',
                    'font-medium'
                  )}
                >
                  表紙
                </span>
              </div>
            ) : (
              onSetCover && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'hover:bg-white/20',
                    isMobile
                      ? 'h-4 w-auto px-1 text-[10px]'
                      : 'h-6 w-auto px-2 text-xs'
                  )}
                  onClick={e => {
                    e.stopPropagation();
                    onSetCover(image.id);
                  }}
                  title="表紙に設定"
                >
                  <Star
                    className={cn(isMobile ? 'h-2 w-2 mr-0.5' : 'h-3 w-3 mr-1')}
                  />
                  {isMobile ? '表紙' : '表紙に設定'}
                </Button>
              )
            )}
          </div>

          {/* 削除ボタン */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'hover:bg-red-100 hover:text-red-600',
              isMobile ? 'h-4 w-4 p-0' : 'h-6 w-6 p-0'
            )}
            onClick={e => {
              e.stopPropagation();
              onRemove(image.id);
            }}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <Loader2
                className={cn(isMobile ? 'h-2 w-2' : 'h-3 w-3', 'animate-spin')}
              />
            ) : (
              <X className={cn(isMobile ? 'h-2 w-2' : 'h-3 w-3')} />
            )}
          </Button>
        </div>

        {/* 削除予定表示 */}
        {isPendingDelete && (
          <div className="absolute top-10 left-2 z-10">
            <Badge variant="destructive" className="text-xs">
              削除予定
            </Badge>
          </div>
        )}

        {/* ステータス表示 */}
        {image.status && image.status !== 'uploaded' && (
          <div
            className={cn(
              'absolute z-10',
              isCover
                ? 'bottom-2 left-1/2 transform -translate-x-1/2'
                : 'top-2 left-1/2 transform -translate-x-1/2'
            )}
          >
            <Badge
              variant={image.status === 'error' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {image.status === 'pending' && '仮保存'}
              {image.status === 'uploading' && 'アップロード中'}
              {image.status === 'error' && 'エラー'}
            </Badge>
          </div>
        )}

        {/* 画像表示 */}
        <div
          className={cn(
            'bg-gray-100 overflow-hidden relative',
            isMobile ? 'aspect-[3/4]' : 'aspect-[3/4]'
          )}
        >
          <Image
            src={image.preview}
            alt={`ページ ${image.pageNumber}`}
            fill
            sizes={
              isMobile
                ? '120px'
                : '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw'
            }
            className="object-cover"
          />
        </div>

        {/* カードフッター：ドラッグエリア */}
        <CardContent
          {...attributes}
          {...listeners}
          className={cn(
            'cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors flex items-center justify-center',
            isMobile ? 'p-2' : 'p-3',
            'touch-none' // スマホでのドラッグを有効化
          )}
          style={{
            touchAction: 'none', // スマホでのタッチ操作を有効化
          }}
          title="ドラッグして並び替え"
        >
          <div className="flex items-center justify-center gap-2">
            {/* ドラッグアイコン */}
            <GripVertical
              className={cn(isMobile ? 'h-3 w-3' : 'h-4 w-4', 'text-gray-400')}
            />

            {/* 未保存表示（仮画像の場合のみ） */}
            {image.type === 'temp' && (
              <span
                className={cn(
                  isMobile ? 'text-[10px]' : 'text-xs',
                  'opacity-60'
                )}
              >
                未保存
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * アップロードエリアコンポーネント
 */
interface UploadAreaProps {
  onUpload: (files: File[]) => void;
  isUploading: boolean;
  maxPages: number;
  currentPages: number;
}

function UploadArea({
  onUpload,
  isUploading,
  maxPages,
  currentPages,
}: UploadAreaProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxFiles: maxPages - currentPages,
    onDrop: onUpload,
    disabled: isUploading || currentPages >= maxPages,
  });

  const isDisabled = currentPages >= maxPages;

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
        isDragActive && 'border-blue-500 bg-blue-50',
        isDisabled && 'border-orange-200 surface-neutral cursor-not-allowed',
        !isDisabled && !isDragActive && 'border-gray-300 hover:border-gray-400'
      )}
    >
      <input {...getInputProps()} />

      {isUploading ? (
        <div className="space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm">処理中...</p>
        </div>
      ) : isDisabled ? (
        <div className="space-y-2">
          <ImageIcon className="h-8 w-8 mx-auto brand-warning" />
          <p className="text-sm font-bold">
            ページ数の上限に達しています ({currentPages}/{maxPages})
          </p>
          <p className="text-xs">
            プランをアップグレードして、より多くのページを追加できます
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="h-8 w-8 mx-auto" />
          <p className="text-sm font-medium">
            {isDragActive
              ? 'ここにドロップしてください'
              : '画像をドラッグ＆ドロップ'}
          </p>
          <p className="text-xs">
            または <span className="text-blue-600">クリックして選択</span>
          </p>
          <p className="text-xs">
            残り {maxPages - currentPages} ページまで追加可能
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * 新しい画像マネージャーコンポーネント（仮アップロード対応）
 */
interface QuickPhotobookImageManagerV2Props {
  photobookId: string;
  userId: string;
  images: PhotobookImage[];
  maxPages: number;
  onImagesChange: () => void;
  onSaveDraftRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  coverImageId?: string;
  onCoverImageChange?: (imageId: string) => void;
  onOrderChange?: (reorderedImages: PhotobookImage[]) => void;
  onDeleteChange?: (pendingDeleteIds: string[]) => void;
}

export function QuickPhotobookImageManagerV2({
  photobookId,
  userId,
  images: initialSavedImages,
  maxPages,
  onImagesChange,
  onSaveDraftRef,
  coverImageId,
  onCoverImageChange,
  onOrderChange,
  onDeleteChange,
}: QuickPhotobookImageManagerV2Props) {
  const [tempImages, setTempImages] = useState<TempImage[]>([]);
  const [localSavedImages, setLocalSavedImages] =
    useState<PhotobookImage[]>(initialSavedImages);
  const [pendingDeleteImages, setPendingDeleteImages] = useState<string[]>([]); // 削除予定画像ID
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 外部からの画像データ更新を反映
  useEffect(() => {
    setLocalSavedImages(initialSavedImages);
  }, [initialSavedImages]);

  // 統合画像リスト（表示用・削除予定画像を除外）
  const unifiedImages: UnifiedImage[] = [
    ...localSavedImages
      .filter(img => !pendingDeleteImages.includes(img.id))
      .map(savedToUnified),
    ...tempImages.map(tempToUnified),
  ].sort((a, b) => a.pageNumber - b.pageNumber);

  // メモリクリーンアップ
  useEffect(() => {
    return () => {
      tempImages.forEach(img => {
        URL.revokeObjectURL(img.preview);
      });
    };
  }, [tempImages]);

  // 画像選択時の仮表示処理
  const handleImageSelect = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setIsProcessing(true);
      setError(null);

      try {
        const newTempImages: TempImage[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // 画像メタデータ取得
          const imageElement = document.createElement('img');
          const imageUrl = URL.createObjectURL(file);

          await new Promise((resolve, reject) => {
            imageElement.onload = resolve;
            imageElement.onerror = reject;
            imageElement.src = imageUrl;
          });

          URL.revokeObjectURL(imageUrl);

          // 仮画像オブジェクト作成
          const tempImage: TempImage = {
            id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
            file,
            preview: URL.createObjectURL(file),
            status: 'pending',
            pageNumber: unifiedImages.length + newTempImages.length + 1,
            orientation: determineOrientation(
              imageElement.width,
              imageElement.height
            ),
            metadata: {
              width: imageElement.width,
              height: imageElement.height,
              size: file.size,
            },
          };

          newTempImages.push(tempImage);
        }

        // 即座に仮表示
        setTempImages(prev => [...prev, ...newTempImages]);
        toast.success(
          `${newTempImages.length}枚の画像を追加しました（仮保存）`
        );
      } catch (error) {
        logger.error('Error processing images:', error);
        setError('画像の処理に失敗しました');
        toast.error('画像の処理に失敗しました');
      } finally {
        setIsProcessing(false);
      }
    },
    [unifiedImages.length]
  );

  // 仮画像削除
  const handleRemoveTempImage = useCallback((imageId: string) => {
    setTempImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
    toast.success('画像を削除しました');
  }, []);

  // 確定画像削除（仮削除）
  const handleRemoveSavedImage = useCallback(
    (imageId: string) => {
      // 削除予定リストに追加（DB削除は保存時）
      const newPendingDeletes = [...pendingDeleteImages, imageId];
      setPendingDeleteImages(newPendingDeletes);

      // 親に削除予定リストを通知
      if (onDeleteChange) {
        onDeleteChange(newPendingDeletes);
      }

      toast.success('画像を削除しました（仮削除）');
    },
    [pendingDeleteImages, onDeleteChange]
  );

  // 統合削除処理
  const handleRemove = useCallback(
    (imageId: string) => {
      const image = unifiedImages.find(img => img.id === imageId);
      if (!image) return;

      if (image.type === 'temp') {
        handleRemoveTempImage(imageId);
      } else {
        handleRemoveSavedImage(imageId);
      }
    },
    [unifiedImages, handleRemoveTempImage, handleRemoveSavedImage]
  );

  // ドラッグ&ドロップでの並び替え
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const draggedId = active.id;
      setDraggedItemId(draggedId as string);

      logger.info('🔄 ドラッグ開始', {
        draggedId,
        draggedImage: unifiedImages.find(img => img.id === draggedId),
        totalImages: unifiedImages.length,
        timestamp: Date.now(),
      });
    },
    [unifiedImages]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const draggedId = active.id;
      const overId = over?.id;

      logger.info('🔄 ドラッグ終了', {
        draggedId,
        overId,
        hasValidDrop: !!over?.id,
        isDifferentPosition: active.id !== over?.id,
        timestamp: Date.now(),
      });

      setDraggedItemId(null); // ドラッグ終了

      if (active.id !== over?.id && over?.id) {
        const oldIndex = unifiedImages.findIndex(img => img.id === active.id);
        const newIndex = unifiedImages.findIndex(img => img.id === over.id);

        logger.info('🔄 並び替え実行', {
          draggedId: active.id,
          overId: over.id,
          oldIndex,
          newIndex,
          oldImage: unifiedImages[oldIndex],
          newPosition: unifiedImages[newIndex],
        });

        if (oldIndex !== -1 && newIndex !== -1) {
          // arrayMoveを使用してより確実な並び替え
          const reorderedImages = arrayMove(unifiedImages, oldIndex, newIndex);

          logger.info('🔄 並び替え結果', {
            before: unifiedImages.map(img => ({
              id: img.id,
              page: img.pageNumber,
            })),
            after: reorderedImages.map((img, index) => ({
              id: img.id,
              page: index + 1,
            })),
          });

          // ページ番号を更新
          const updatedImages = reorderedImages.map((img, index) => ({
            ...img,
            pageNumber: index + 1,
          }));

          // 仮画像の状態更新
          const newTempImages = updatedImages
            .filter(img => img.type === 'temp')
            .map(img => ({
              ...(img.data as TempImage),
              pageNumber: img.pageNumber,
            }));

          // 確定画像の状態更新
          const newSavedImages = updatedImages
            .filter(img => img.type === 'saved')
            .map(img => ({
              ...(img.data as PhotobookImage),
              page_number: img.pageNumber,
            }));

          setTempImages(newTempImages);
          setLocalSavedImages(newSavedImages);

          // 親に順番変更を通知
          if (onOrderChange) {
            onOrderChange(newSavedImages);
          }

          toast.success('画像の順番を変更しました（仮保存）');
        } else {
          logger.error('🔄 並び替えエラー: インデックスが見つかりません', {
            oldIndex,
            newIndex,
            activeId: active.id,
            overId: over.id,
          });
        }
      } else {
        logger.info('🔄 並び替えスキップ', {
          reason: !over?.id ? '有効なドロップ先なし' : '同じ位置',
          activeId: active.id,
          overId: over?.id,
        });
      }
    },
    [unifiedImages, onOrderChange]
  );

  // 下書き保存処理
  const handleSaveDraft = useCallback(async () => {
    if (tempImages.length === 0 && pendingDeleteImages.length === 0) {
      toast.info('保存する変更がありません');
      return;
    }

    setIsProcessing(true);

    try {
      let successCount = 0;
      let failureCount = 0;

      // 仮画像を順次DB保存
      for (const tempImage of tempImages) {
        if (tempImage.status === 'pending') {
          try {
            // Base64変換
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const imageElement = document.createElement('img');

            await new Promise((resolve, reject) => {
              imageElement.onload = resolve;
              imageElement.onerror = reject;
              imageElement.src = tempImage.preview;
            });

            canvas.width = tempImage.metadata.width;
            canvas.height = tempImage.metadata.height;
            ctx?.drawImage(imageElement, 0, 0);

            const base64Data = canvas.toDataURL(
              tempImage.file.type || 'image/jpeg',
              0.9
            );

            // DB保存
            const { uploadPhotobookImageFromBase64 } = await import(
              '@/app/actions/quick-photobook-upload'
            );

            const result = await uploadPhotobookImageFromBase64(
              photobookId,
              userId,
              {
                base64Data,
                fileName: tempImage.file.name,
                fileSize: tempImage.file.size,
                mimeType: tempImage.file.type,
                width: tempImage.metadata.width,
                height: tempImage.metadata.height,
              }
            );

            if (result.success) {
              successCount++;
              tempImage.status = 'uploaded';
            } else {
              failureCount++;
              tempImage.status = 'error';
              tempImage.error = result.error?.message;
            }
          } catch (error) {
            failureCount++;
            tempImage.status = 'error';
            tempImage.error =
              error instanceof Error ? error.message : '不明なエラー';
          }
        }
      }

      if (successCount > 0) {
        toast.success(
          `${successCount}枚の画像を保存しました${failureCount > 0 ? `（${failureCount}枚失敗）` : ''}`
        );

        // 成功した仮画像を削除
        setTempImages(prev => prev.filter(img => img.status !== 'uploaded'));
      }

      // 削除予定画像の処理
      if (pendingDeleteImages.length > 0) {
        logger.info('削除予定画像の処理開始', {
          deleteCount: pendingDeleteImages.length,
        });

        for (const imageId of pendingDeleteImages) {
          try {
            const deleteResult = await removePhotobookImage(
              imageId,
              photobookId,
              userId
            );

            if (deleteResult.success) {
              logger.info('画像削除成功', { imageId });
            } else {
              logger.error('画像削除失敗', {
                imageId,
                error: deleteResult.error,
              });
            }
          } catch (error) {
            logger.error('画像削除エラー', { imageId, error });
          }
        }

        // 削除予定リストをクリア
        setPendingDeleteImages([]);
        if (onDeleteChange) {
          onDeleteChange([]);
        }

        toast.success(`${pendingDeleteImages.length}枚の画像を削除しました`);
      }

      // 新規画像または削除があった場合のメッセージ
      if (successCount > 0 || pendingDeleteImages.length > 0) {
        // 確定画像の順番もDBに反映（変更があった場合のみ）
        const hasOrderChange = localSavedImages.some(
          (img, index) => img.page_number !== index + 1
        );

        if (hasOrderChange) {
          try {
            const reorderedSavedImages = localSavedImages.map((img, index) => ({
              id: img.id,
              page_number: index + 1,
            }));

            const orderResult = await reorderPhotobookImages(
              photobookId,
              userId,
              reorderedSavedImages
            );

            if (orderResult.success) {
              toast.success('画像の順番を保存しました');
            }
          } catch (error) {
            logger.error('Error saving image order:', error);
          }
        }

        // DB状態を更新
        onImagesChange();
      } else if (failureCount > 0) {
        toast.error('画像の保存に失敗しました');
      }
    } catch (error) {
      logger.error('Save draft error:', error);
      toast.error('下書きの保存に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  }, [tempImages, localSavedImages, photobookId, userId, onImagesChange]);

  // リセット処理（仮操作を元に戻す）
  const handleReset = useCallback(() => {
    // 仮アップロード画像のメモリクリーンアップ
    tempImages.forEach(img => {
      URL.revokeObjectURL(img.preview);
    });

    // 仮操作をすべてリセット
    setTempImages([]);
    setPendingDeleteImages([]);
    setLocalSavedImages(initialSavedImages);
    setError(null);

    // 親コンポーネントにリセットを通知
    if (onDeleteChange) {
      onDeleteChange([]);
    }
    if (onOrderChange) {
      onOrderChange(initialSavedImages);
    }

    toast.success('変更を元に戻しました');
    logger.info('仮操作リセット完了', {
      tempImagesCleared: tempImages.length,
      pendingDeletesCleared: pendingDeleteImages.length,
    });
  }, [
    tempImages,
    pendingDeleteImages,
    initialSavedImages,
    onDeleteChange,
    onOrderChange,
  ]);

  // センサー設定（意図しないドラッグを防止）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動でドラッグ開始（スマホ対応）
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ状態管理
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // handleSaveDraft定義後に参照を設定
  useEffect(() => {
    if (onSaveDraftRef) {
      onSaveDraftRef.current = handleSaveDraft;
    }
  }, [handleSaveDraft, onSaveDraftRef]);

  return (
    <div
      className={cn(
        'space-y-6 relative',
        isProcessing && 'pointer-events-none'
      )}
    >
      {/* 保存処理中のオーバーレイ */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
          <div className="surface-primary p-6 rounded-lg shadow-lg flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="font-medium">保存中...</p>
            <p className="text-sm opacity-80">しばらくお待ちください</p>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* アップロードエリア */}
      <UploadArea
        onUpload={handleImageSelect}
        isUploading={isProcessing}
        maxPages={maxPages}
        currentPages={unifiedImages.length}
      />

      {/* 未保存変更の警告バー */}
      {(tempImages.length > 0 || pendingDeleteImages.length > 0) && (
        <div className="flex items-center justify-between p-4 surface-accent rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <div className="flex flex-col">
              <span className="font-medium">未保存の変更があります</span>
              <div className="text-sm opacity-80">
                {tempImages.length > 0 && `${tempImages.length}枚の新規画像`}
                {tempImages.length > 0 &&
                  pendingDeleteImages.length > 0 &&
                  ' • '}
                {pendingDeleteImages.length > 0 &&
                  `${pendingDeleteImages.length}枚の削除予定画像`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="neutral"
              onClick={handleReset}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              元に戻す
            </Button>
            <Button
              variant="cta"
              onClick={handleSaveDraft}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              下書き保存
            </Button>
          </div>
        </div>
      )}

      {/* 画像一覧（ブック風横並び） */}
      {unifiedImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              ページ一覧 ({unifiedImages.length}/{maxPages})
            </h3>
            <div className="flex items-center gap-2">
              {tempImages.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {tempImages.length}枚未保存
                </Badge>
              )}
            </div>
          </div>

          {/* レスポンシブ画像レイアウト */}
          <div
            className={cn(
              'surface-neutral rounded-lg p-6',
              isProcessing && 'opacity-50'
            )}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToHorizontalAxis]}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={unifiedImages.map(img => img.id)}
                strategy={horizontalListSortingStrategy}
              >
                {/* レスポンシブ: 単一レンダリング */}
                <div
                  className={cn(
                    'flex gap-4 overflow-x-auto pb-4',
                    draggedItemId && 'overflow-x-hidden', // ドラッグ中はスクロール無効
                    'md:gap-4 md:px-0', // PC: 大きなギャップ
                    'gap-3 px-2' // スマホ: 小さなギャップ
                  )}
                  style={{
                    scrollSnapType: draggedItemId ? 'none' : 'x mandatory',
                    scrollbarWidth: 'thin',
                  }}
                >
                  {unifiedImages.map((image, index) => (
                    <div
                      key={image.id}
                      className={cn(
                        'flex-shrink-0',
                        'md:w-48', // PC: 固定幅192px
                        'w-[calc((100vw-120px)/5)]' // スマホ: 5列表示
                      )}
                      style={{
                        minWidth: '80px',
                        maxWidth: '120px',
                        scrollSnapAlign: 'start',
                      }}
                    >
                      <DraggableImageCard
                        image={image}
                        index={index}
                        onRemove={handleRemove}
                        isRemoving={isProcessing}
                        isCover={coverImageId === image.id}
                        onSetCover={onCoverImageChange}
                        isPendingDelete={pendingDeleteImages.includes(image.id)}
                        viewMode="mobile" // 統一してモバイル表示
                        maxPages={maxPages}
                      />
                    </div>
                  ))}
                </div>

                {/* 操作ヒント */}
                <div className="text-center mt-2">
                  <p className="text-xs">
                    <span className="md:hidden">
                      📱 ドラッグボタン（≡）で並び替え
                    </span>
                    <span className="hidden md:inline">
                      🖱️ ドラッグボタン（≡）で並び替え
                    </span>
                  </p>
                </div>
              </SortableContext>

              {/* ドラッグオーバーレイ */}
              <DragOverlay>
                {draggedItemId ? (
                  <div className="opacity-90 shadow-2xl bg-white rounded-lg border-2 border-blue-500">
                    <DraggableImageCard
                      image={
                        unifiedImages.find(img => img.id === draggedItemId)!
                      }
                      index={0}
                      onRemove={() => {
                        logger.info(
                          '🎯 DragOverlay: 削除ボタンクリック（無効）'
                        );
                      }}
                      isRemoving={false}
                      isCover={coverImageId === draggedItemId}
                      viewMode="desktop"
                      maxPages={maxPages}
                    />
                  </div>
                ) : (
                  <div />
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      )}

      {/* 空状態 */}
      {unifiedImages.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">まだ画像がありません</h3>
            <p>
              上のエリアから画像をアップロードしてフォトブックを作成しましょう
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
