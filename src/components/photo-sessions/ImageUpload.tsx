'use client';

import { useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  uploadPhotoSessionImage,
  validateImageFile,
} from '@/lib/storage/photo-session-images';
import { EmptyImage } from '@/components/ui/empty-image';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
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
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

/**
 * ドラッグ可能な画像カードコンポーネント
 */
interface SortableImageCardProps {
  url: string;
  index: number;
  totalImages: number;
  onRemove: (index: number) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  disabled?: boolean;
  isMain?: boolean;
  t: (key: string) => string;
}

function SortableImageCard({
  url,
  index,
  totalImages,
  onRemove,
  onMoveLeft,
  onMoveRight,
  disabled = false,
  isMain = false,
  t,
}: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `image-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      className={cn(
        'group relative transition-all duration-200 select-none',
        isDragging && 'opacity-50 scale-105 z-10'
      )}
      style={{
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
      }}
    >
      <div
        ref={setNodeRef}
        style={style}
        className="w-28 sm:w-32 flex-shrink-0 snap-center text-right"
      >
        <Card className="relative overflow-visible shadow-md hover:shadow-lg transition-shadow select-none">
          {/* 削除ボタン - 常時表示（スマホ対応） */}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-6 right-0 left-auto h-6 w-6 p-0 z-20 rounded-full"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(index);
            }}
            onPointerDown={e => {
              e.stopPropagation();
            }}
            onMouseDown={e => {
              e.stopPropagation();
            }}
            onTouchStart={e => {
              e.stopPropagation();
            }}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>

          <CardContent className="p-2">
            <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
              <EmptyImage
                src={url}
                alt={`撮影会画像 ${index + 1}`}
                fallbackIcon={ImageIcon}
                fallbackIconSize="lg"
                fill
                className="object-cover"
              />

              {/* メイン画像バッジ */}
              {isMain && (
                <Badge
                  variant="default"
                  className="absolute top-1 left-1 text-xs"
                >
                  {t('imageUpload.main')}
                </Badge>
              )}
            </div>

            {/* 画像下部中央のコントロールエリア */}
            <div className="flex items-center justify-center gap-1 mt-2">
              {/* 左移動ボタン */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={cn(
                  'h-8 w-8 p-0',
                  index === 0 && 'invisible pointer-events-none'
                )}
                onClick={e => {
                  e.stopPropagation();
                  onMoveLeft();
                }}
                disabled={disabled || index === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* ドラッグハンドル */}
              <div
                {...attributes}
                {...listeners}
                className={cn(
                  'cursor-grab active:cursor-grabbing hover:bg-muted transition-colors flex items-center justify-center p-2 rounded touch-none select-none',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
                style={{
                  touchAction: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                }}
                title="ドラッグして並び替え"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* 右移動ボタン */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={cn(
                  'h-8 w-8 p-0',
                  index === totalImages - 1 && 'invisible pointer-events-none'
                )}
                onClick={e => {
                  e.stopPropagation();
                  onMoveRight();
                }}
                disabled={disabled || index === totalImages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-center mt-1 text-muted-foreground">
              {index + 1}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ImageUploadProps {
  photoSessionId: string;
  initialImages?: string[];
  onImagesChange: (urls: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageUpload({
  photoSessionId,
  initialImages = [],
  onImagesChange,
  maxImages = 5,
  disabled = false,
}: ImageUploadProps) {
  const t = useTranslations('photoSessions');
  const tCommon = useTranslations('common');
  const { toast } = useToast();

  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // PC/スマホ両対応のセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動でドラッグ開始（スマホ対応）
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 150ms長押しでドラッグ開始（テキスト選択との競合を防止）
        tolerance: 5, // 5px以内の移動は許容
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateImages = useCallback(
    (newImages: string[]) => {
      setImages(newImages);
      onImagesChange(newImages);
    },
    [onImagesChange]
  );

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) {
        toast({
          title: t('imageUpload.error.maxImagesReached'),
          description: t('imageUpload.error.maxImagesReachedDescription', {
            max: maxImages,
          }),
          variant: 'destructive',
        });
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);

      setUploading(true);

      try {
        const uploadPromises = filesToUpload.map(async file => {
          // ファイルバリデーション
          const validation = validateImageFile(file);
          if (!validation.valid) {
            toast({
              title: t('imageUpload.error.invalidFileType'),
              description: validation.error,
              variant: 'destructive',
            });
            return null;
          }

          // アップロード実行
          const result = await uploadPhotoSessionImage(file, photoSessionId);
          if (!result.success || !result.url) {
            toast({
              title: t('imageUpload.error.uploadFailed'),
              description: result.error || 'アップロードに失敗しました',
              variant: 'destructive',
            });
            return null;
          }

          return result.url;
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        const successfulUrls = uploadedUrls.filter(
          (url): url is string => url !== null
        );

        if (successfulUrls.length > 0) {
          const updatedImages = [...images, ...successfulUrls];
          updateImages(updatedImages);

          toast({
            title: tCommon('success'),
            description: t('imageUpload.success.uploaded', {
              count: successfulUrls.length,
            }),
          });
        }
      } catch (error) {
        logger.error('画像アップロードエラー:', error);
        toast({
          title: t('imageUpload.error.uploadFailed'),
          description: t('imageUpload.error.uploadFailedDescription'),
          variant: 'destructive',
        });
      } finally {
        setUploading(false);
      }
    },
    [images, maxImages, photoSessionId, t, tCommon, toast, updateImages]
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      const newImages = images.filter((_, i) => i !== index);
      updateImages(newImages);
    },
    [images, updateImages]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      if (disabled || uploading) return;

      const files = e.dataTransfer.files;
      handleFileSelect(files);
    },
    [disabled, uploading, handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files);
    },
    [handleFileSelect]
  );

  // 画像の並び替え関数
  const moveImage = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= images.length) return;
      const newImages = [...images];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      updateImages(newImages);
    },
    [images, updateImages]
  );

  // ドラッグ開始時の処理
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setDraggedItemId(String(active.id));
  }, []);

  // ドラッグ終了時の処理
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setDraggedItemId(null);

      if (active.id !== over?.id && over?.id) {
        // IDからインデックスを抽出
        const oldIndex = parseInt(String(active.id).replace('image-', ''), 10);
        const newIndex = parseInt(String(over.id).replace('image-', ''), 10);

        if (!isNaN(oldIndex) && !isNaN(newIndex)) {
          const reordered = arrayMove(images, oldIndex, newIndex);
          updateImages(reordered);
        }
      }
    },
    [images, updateImages]
  );

  return (
    <div className="space-y-4">
      {/* アップロードエリア */}
      <Card
        className={`transition-all duration-200 ${
          dragOver ? 'border-primary bg-primary/5' : 'border-dashed'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
            </div>

            <h3 className="text-lg font-medium mb-2">
              {t('imageUpload.title')}
            </h3>

            <p className="text-sm text-muted-foreground mb-4">
              {t('imageUpload.description')}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={disabled || uploading || images.length >= maxImages}
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                <Upload className="h-4 w-4" />
                {uploading
                  ? t('imageUpload.uploading')
                  : t('imageUpload.selectFiles')}
              </Button>

              <span className="text-xs text-muted-foreground">
                {t('imageUpload.orDragAndDrop')}
              </span>
            </div>

            <input
              id="image-upload"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleInputChange}
              disabled={disabled || uploading}
            />

            <div className="mt-4 text-xs text-muted-foreground space-y-1">
              <p>{t('imageUpload.maxSize')}: 10MB</p>
              <p>{t('imageUpload.supportedFormats')}: JPEG, PNG, WebP, GIF</p>
              <p>
                {t('imageUpload.maxImages')}: {maxImages}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 画像プレビュー */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              {t('imageUpload.preview')} ({images.length}/{maxImages})
            </h4>
            {images.length > 0 && (
              <Badge variant="outline">
                {images.length === 1 && t('imageUpload.mainImage')}
                {images.length > 1 && t('imageUpload.firstIsMain')}
              </Badge>
            )}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map((_, i) => `image-${i}`)}
              strategy={rectSortingStrategy}
            >
              <div
                className="flex gap-3 overflow-x-auto pt-3 pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-muted"
                style={{
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  userSelect: 'none',
                }}
              >
                {images.map((url, index) => (
                  <SortableImageCard
                    key={`image-${index}`}
                    url={url}
                    index={index}
                    totalImages={images.length}
                    onRemove={handleRemoveImage}
                    onMoveLeft={() => moveImage(index, index - 1)}
                    onMoveRight={() => moveImage(index, index + 1)}
                    disabled={disabled}
                    isMain={index === 0}
                    t={t}
                  />
                ))}
              </div>
            </SortableContext>

            {/* ドラッグ中のプレビュー */}
            <DragOverlay>
              {draggedItemId
                ? (() => {
                    const draggedIndex = parseInt(
                      draggedItemId.replace('image-', ''),
                      10
                    );
                    const draggedUrl = !isNaN(draggedIndex)
                      ? images[draggedIndex]
                      : null;
                    return draggedUrl ? (
                      <div className="opacity-90 shadow-2xl bg-white rounded-lg border-2 border-primary">
                        <Card className="overflow-hidden">
                          <CardContent className="p-2">
                            <div className="aspect-square relative rounded-lg overflow-hidden bg-muted w-28 sm:w-32">
                              <EmptyImage
                                src={draggedUrl}
                                alt="ドラッグ中の画像"
                                fallbackIcon={ImageIcon}
                                fallbackIconSize="lg"
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex items-center justify-center mt-2 p-2">
                              <GripVertical className="h-4 w-4 text-gray-400" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : null;
                  })()
                : null}
            </DragOverlay>
          </DndContext>

          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">{t('imageUpload.tips.title')}</p>
              <ul className="space-y-1 text-xs">
                <li>• {t('imageUpload.tips.firstImageMain')}</li>
                <li>• {t('imageUpload.tips.dragToReorder')}</li>
                <li>• {t('imageUpload.tips.highQuality')}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
