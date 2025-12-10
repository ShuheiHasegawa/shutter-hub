'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { PhotobookImage } from '@/types/quick-photobook';
import {
  removePhotobookImage,
  reorderPhotobookImages,
} from '@/app/actions/quick-photobook-images';
import { PhotobookPageLimitDisplay } from '../common/PhotobookPlanGate';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

/**
 * 画像カードコンポーネント（ソート可能）
 */
interface SortableImageCardProps {
  image: PhotobookImage;
  index: number;
  onRemove: (imageId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isRemoving: boolean;
}

function SortableImageCard({
  image,
  index,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isRemoving,
}: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const orientationLabels = {
    portrait: '縦長',
    landscape: '横長',
    square: '正方形',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'transition-shadow cursor-grab',
        isDragging && 'shadow-lg ring-2 ring-blue-500 cursor-grabbing'
      )}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* 画像プレビュー */}
          <div className="relative w-20 h-20 flex-shrink-0">
            <Image
              src={image.image_url}
              alt={`ページ ${image.page_number}`}
              width={80}
              height={80}
              className="w-full h-full object-cover rounded-lg"
            />
            <Badge
              variant="secondary"
              className="absolute -top-2 -left-2 text-xs"
            >
              {image.page_number}
            </Badge>
          </div>

          {/* 画像情報 */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate mb-1">
              {image.original_filename || `ページ ${image.page_number}`}
            </h4>
            <div className="flex items-center gap-2 text-xs mb-2">
              <Badge variant="outline" className="text-xs">
                {orientationLabels[image.orientation]}
              </Badge>
              {image.image_width && image.image_height && (
                <span>
                  {image.image_width}×{image.image_height}
                </span>
              )}
            </div>

            {/* モバイル用ボタン */}
            <div className="flex gap-1 md:hidden">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMoveUp(index)}
                disabled={!canMoveUp}
                className="h-7 w-7 p-0"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMoveDown(index)}
                disabled={!canMoveDown}
                className="h-7 w-7 p-0"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRemove(image.id)}
                disabled={isRemoving}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
              >
                {isRemoving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* デスクトップ用ボタン */}
          <div className="hidden md:flex flex-col gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMoveUp(index)}
              disabled={!canMoveUp}
              className="h-8 w-8 p-0"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMoveDown(index)}
              disabled={!canMoveDown}
              className="h-8 w-8 p-0"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRemove(image.id)}
              disabled={isRemoving}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 画像アップロードエリア
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
        isDisabled && 'border-gray-300 bg-gray-50 cursor-not-allowed',
        !isDisabled && !isDragActive && 'border-gray-300 hover:border-gray-400'
      )}
    >
      <input {...getInputProps()} />

      {isUploading ? (
        <div className="space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm">アップロード中...</p>
        </div>
      ) : isDisabled ? (
        <div className="space-y-2">
          <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
          <p className="text-sm">
            ページ数の上限に達しています ({currentPages}/{maxPages})
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
 * クイックフォトブック画像管理メインコンポーネント
 */
interface QuickPhotobookImageManagerProps {
  photobookId: string;
  userId: string;
  images: PhotobookImage[];
  maxPages: number;
  onImagesChange: () => void;
}

export function QuickPhotobookImageManager({
  photobookId,
  userId,
  images,
  maxPages,
  onImagesChange,
}: QuickPhotobookImageManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 画像アップロード処理
  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setIsUploading(true);
      setError(null);

      try {
        let successCount = 0;
        let failureCount = 0;

        for (const file of files) {
          try {
            // 画像メタデータ取得
            const img = new window.Image();
            const imageUrl = URL.createObjectURL(file);

            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = imageUrl;
            });

            // Base64変換
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;

            ctx?.drawImage(img, 0, 0);
            const base64Data = canvas.toDataURL(file.type || 'image/jpeg', 0.9);

            URL.revokeObjectURL(imageUrl);

            // Supabase Storageにアップロード
            const { uploadPhotobookImageFromBase64 } = await import(
              '@/app/actions/quick-photobook-upload'
            );

            const result = await uploadPhotobookImageFromBase64(
              photobookId,
              userId,
              {
                base64Data,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                width: img.width,
                height: img.height,
              }
            );

            if (result.success) {
              successCount++;
            } else {
              failureCount++;
              logger.error(
                `Failed to upload ${file.name}:`,
                result.error?.message
              );
            }
          } catch (fileError) {
            failureCount++;
            logger.error(`Error processing ${file.name}:`, fileError);
          }
        }

        if (successCount > 0) {
          toast.success(
            `${successCount}枚の画像を追加しました${failureCount > 0 ? `（${failureCount}枚失敗）` : ''}`
          );
          onImagesChange();
        } else {
          throw new Error('すべての画像のアップロードに失敗しました');
        }
      } catch (error) {
        logger.error('Upload error:', error);
        setError(
          error instanceof Error
            ? error.message
            : '画像のアップロードに失敗しました'
        );
        toast.error('画像のアップロードに失敗しました');
      } finally {
        setIsUploading(false);
      }
    },
    [photobookId, userId, onImagesChange]
  );

  // 順番変更の共通処理（最初に定義）
  const handleReorder = async (newImages: PhotobookImage[]) => {
    const reorderedImages = newImages.map((img, index) => ({
      id: img.id,
      page_number: index + 1,
    }));

    try {
      const result = await reorderPhotobookImages(
        photobookId,
        userId,
        reorderedImages
      );

      if (result.success) {
        onImagesChange();
      } else {
        throw new Error(result.error?.message || '順番の変更に失敗しました');
      }
    } catch (error) {
      logger.error('Reorder error:', error);
      toast.error('順番の変更に失敗しました');
    }
  };

  // 画像削除処理
  const handleRemove = useCallback(
    async (imageId: string) => {
      setRemovingImageId(imageId);

      try {
        const result = await removePhotobookImage(imageId, photobookId, userId);

        if (result.success) {
          toast.success('画像を削除しました');
          onImagesChange();
        } else {
          throw new Error(result.error?.message || '画像の削除に失敗しました');
        }
      } catch (error) {
        logger.error('Remove error:', error);
        toast.error('画像の削除に失敗しました');
      } finally {
        setRemovingImageId(null);
      }
    },
    [photobookId, userId, onImagesChange]
  );

  // 画像順番移動（ボタン操作）
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;

    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [
      newImages[index],
      newImages[index - 1],
    ];

    handleReorder(newImages);
  };

  const handleMoveDown = (index: number) => {
    if (index >= images.length - 1) return;

    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [
      newImages[index + 1],
      newImages[index],
    ];

    handleReorder(newImages);
  };

  // センサー設定（ドラッグ&ドロップ用）
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ&ドロップでの順番変更
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = images.findIndex(img => img.id === active.id);
      const newIndex = images.findIndex(img => img.id === over?.id);

      const newImages = arrayMove(images, oldIndex, newIndex);
      handleReorder(newImages);
    }
  };

  return (
    <div className="space-y-6">
      {/* プラン制限表示 */}
      <PhotobookPageLimitDisplay
        currentPages={images.length}
        maxPages={maxPages}
        planName="現在のプラン"
      />

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* アップロードエリア */}
      <UploadArea
        onUpload={handleUpload}
        isUploading={isUploading}
        maxPages={maxPages}
        currentPages={images.length}
      />

      {/* 画像一覧 */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              ページ一覧 ({images.length}/{maxPages})
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="hidden md:flex"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              更新
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map(img => img.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {images.map((image, index) => (
                  <SortableImageCard
                    key={image.id}
                    image={image}
                    index={index}
                    onRemove={handleRemove}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    canMoveUp={index > 0}
                    canMoveDown={index < images.length - 1}
                    isRemoving={removingImageId === image.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* 空状態 */}
      {images.length === 0 && !isUploading && (
        <Card className="border-dashed border-2 border-gray-300">
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
