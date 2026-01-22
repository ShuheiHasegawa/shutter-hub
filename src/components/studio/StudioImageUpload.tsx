'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Upload,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  uploadStudioImage,
  uploadTempStudioImage,
  deleteTempStudioImage,
  validateImageFile,
} from '@/lib/storage/studio-images';
import {
  createStudioPhotoAction,
  deleteStudioPhotoAction,
} from '@/app/actions/studio';
import { toast } from 'sonner';
import { EmptyImage } from '@/components/ui/empty-image';
import { Building2 } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';
import { StudioPhoto } from '@/types/database';

interface StudioImageUploadProps {
  // モード識別
  mode: 'create' | 'edit';

  // 作成モード用（mode: 'create'）
  tempId?: string;
  initialImageUrls?: string[];
  onImageUrlsChange?: (urls: string[]) => void;

  // 編集モード用（mode: 'edit'）
  studioId?: string;
  initialPhotos?: StudioPhoto[];
  onPhotosChange?: (photos: StudioPhoto[]) => void;

  // 共通プロパティ
  maxImages?: number;
  className?: string;
  disabled?: boolean;
}

export function StudioImageUpload({
  mode,
  tempId,
  initialImageUrls = [],
  onImageUrlsChange,
  studioId,
  initialPhotos = [],
  onPhotosChange,
  maxImages = 10,
  className,
  disabled = false,
}: StudioImageUploadProps) {
  const t = useTranslations('studio');

  // 作成モード用の状態
  const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls);

  // 編集モード用の状態
  const [photos, setPhotos] = useState<StudioPhoto[]>(initialPhotos);

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初期値の同期
  useEffect(() => {
    if (mode === 'create') {
      setImageUrls(initialImageUrls);
    } else {
      setPhotos(initialPhotos);
    }
  }, [mode, initialImageUrls, initialPhotos]);

  const updateImageUrls = useCallback(
    (newUrls: string[]) => {
      setImageUrls(newUrls);
      onImageUrlsChange?.(newUrls);
    },
    [onImageUrlsChange]
  );

  // 作成モード用のアップロード処理
  const handleCreateModeUpload = useCallback(
    async (files: File[]) => {
      if (!tempId) return;

      const uploadPromises = files.map(async file => {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          return null;
        }

        const result = await uploadTempStudioImage(file, tempId);
        if (!result.success || !result.url) {
          toast.error(result.error || 'アップロードに失敗しました');
          return null;
        }

        return result.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const successfulUrls = uploadedUrls.filter(
        (url): url is string => url !== null
      );

      if (successfulUrls.length > 0) {
        const newUrls = [...imageUrls, ...successfulUrls];
        updateImageUrls(newUrls);
        toast.success(
          t('imageUpload.success.uploaded', {
            count: successfulUrls.length,
          }) || `${successfulUrls.length}枚の画像をアップロードしました`
        );
      }
    },
    [tempId, imageUrls, t, updateImageUrls]
  );

  // 編集モード用のアップロード処理
  const handleEditModeUpload = useCallback(
    async (files: File[]) => {
      if (!studioId) return;

      const uploadPromises = files.map(async file => {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          return null;
        }

        // 既存スタジオへアップロード
        const result = await uploadStudioImage(file, studioId);
        if (!result.success || !result.url) {
          toast.error(result.error || 'アップロードに失敗しました');
          return null;
        }

        // データベースレコードを作成
        const createResult = await createStudioPhotoAction(
          studioId,
          result.url,
          {
            display_order: photos.length + 1,
          }
        );

        if (!createResult.success || !createResult.photo) {
          toast.error(createResult.error || '画像の保存に失敗しました');
          return null;
        }

        return createResult.photo;
      });

      const uploadedPhotos = await Promise.all(uploadPromises);
      const successfulPhotos = uploadedPhotos.filter(
        (photo): photo is StudioPhoto => photo !== null
      );

      if (successfulPhotos.length > 0) {
        const newPhotos = [...photos, ...successfulPhotos];
        setPhotos(newPhotos);
        onPhotosChange?.(newPhotos);
        toast.success(
          `${successfulPhotos.length}枚の画像をアップロードしました`
        );
      }
    },
    [studioId, photos, onPhotosChange]
  );

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const currentCount = mode === 'create' ? imageUrls.length : photos.length;
      const remainingSlots = maxImages - currentCount;
      if (remainingSlots <= 0) {
        toast.error(
          t('imageUpload.error.maxImagesReached', { max: maxImages }) ||
            `最大${maxImages}枚までアップロードできます`
        );
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      setUploading(true);

      try {
        if (mode === 'create') {
          // 作成モード: 一時アップロード
          await handleCreateModeUpload(filesToUpload);
        } else {
          // 編集モード: 即座にデータベースへ保存
          await handleEditModeUpload(filesToUpload);
        }
      } catch (error) {
        logger.error('アップロードエラー:', error);
        toast.error(
          t('imageUpload.error.uploadFailed') ||
            '予期しないエラーが発生しました'
        );
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [
      mode,
      imageUrls,
      photos,
      maxImages,
      t,
      handleCreateModeUpload,
      handleEditModeUpload,
    ]
  );

  const handleRemoveImage = useCallback(
    async (index: number, photoId?: string) => {
      if (mode === 'create') {
        // 作成モード: URL配列から削除
        const urlToRemove = imageUrls[index];
        const newUrls = imageUrls.filter((_, i) => i !== index);
        updateImageUrls(newUrls);

        try {
          await deleteTempStudioImage(urlToRemove);
        } catch (error) {
          logger.error('削除エラー:', error);
          // 削除失敗でもUIからは削除済みなので、エラーは無視
        }
      } else {
        // 編集モード: データベースから削除
        if (!photoId) return;

        const result = await deleteStudioPhotoAction(photoId);
        if (result.success) {
          const newPhotos = photos.filter(photo => photo.id !== photoId);
          setPhotos(newPhotos);
          onPhotosChange?.(newPhotos);
        } else {
          toast.error(result.error || '画像の削除に失敗しました');
          return;
        }
      }

      toast.success(t('imageUpload.success.removed') || '画像を削除しました');
    },
    [mode, imageUrls, photos, t, updateImageUrls, onPhotosChange]
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

  const moveImage = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (mode !== 'create') return; // 作成モードのみ
      const newUrls = [...imageUrls];
      const [movedUrl] = newUrls.splice(fromIndex, 1);
      newUrls.splice(toIndex, 0, movedUrl);
      updateImageUrls(newUrls);
    },
    [mode, imageUrls, updateImageUrls]
  );

  // 現在の画像数とリストを取得
  const currentCount = mode === 'create' ? imageUrls.length : photos.length;
  const canAddMore = currentCount < maxImages;

  return (
    <div className={cn('space-y-4', className)}>
      {/* アップロードエリア */}
      <Card
        className={cn(
          'transition-all duration-200',
          dragOver ? 'border-primary bg-primary/5' : 'border-dashed border-2',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          canAddMore ? '' : 'hidden'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="rounded-full bg-primary/10 p-4">
              {uploading ? (
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              ) : (
                <Upload className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {t('imageUpload.title') || '画像をアップロード'}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('imageUpload.description') ||
                  'JPEG、PNG、WebP形式（最大10MB）'}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentCount}/{maxImages}枚
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading
                ? t('imageUpload.uploading') || 'アップロード中...'
                : t('imageUpload.selectFiles') || 'ファイルを選択'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || uploading}
      />

      {/* アップロード済み画像一覧 */}
      {currentCount > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              {t('imageUpload.preview') || 'プレビュー'} ({currentCount}/
              {maxImages})
            </h4>
            {currentCount > 0 && (
              <Badge variant="outline">
                {currentCount === 1 &&
                  (t('imageUpload.mainImage') || 'メイン画像')}
                {currentCount > 1 &&
                  (t('imageUpload.firstIsMain') || '最初の画像がメイン')}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mode === 'create'
              ? imageUrls.map((url, index) => (
                  <Card key={`${url}-${index}`} className="relative group">
                    <CardContent className="p-2">
                      <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                        <EmptyImage
                          src={url}
                          alt={`スタジオ画像 ${index + 1}`}
                          fallbackIcon={Building2}
                          fallbackIconSize="lg"
                          fill
                          className="object-cover"
                        />

                        {/* メイン画像バッジ */}
                        {index === 0 && (
                          <Badge
                            variant="default"
                            className="absolute top-2 left-2 text-xs"
                          >
                            {t('imageUpload.main') || 'メイン'}
                          </Badge>
                        )}

                        {/* 削除ボタン */}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                          disabled={disabled}
                        >
                          <X className="h-3 w-3" />
                        </Button>

                        {/* 順序変更ボタン */}
                        <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-6 w-6 p-0 text-xs"
                              onClick={() => moveImage(index, index - 1)}
                              disabled={disabled}
                            >
                              ←
                            </Button>
                          )}
                          {index < imageUrls.length - 1 && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-6 w-6 p-0 text-xs"
                              onClick={() => moveImage(index, index + 1)}
                              disabled={disabled}
                            >
                              →
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-center mt-2 text-muted-foreground">
                        {index + 1}
                      </p>
                    </CardContent>
                  </Card>
                ))
              : photos.map((photo, index) => (
                  <Card key={photo.id} className="relative group">
                    <CardContent className="p-2">
                      <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                        <EmptyImage
                          src={photo.image_url || undefined}
                          alt={photo.alt_text || `スタジオ画像 ${index + 1}`}
                          fallbackIcon={Building2}
                          fallbackIconSize="lg"
                          fill
                          className="object-cover"
                        />

                        {/* メイン画像バッジ */}
                        {photo.display_order === 1 && (
                          <Badge
                            variant="default"
                            className="absolute top-2 left-2 text-xs"
                          >
                            {t('imageUpload.main') || 'メイン'}
                          </Badge>
                        )}

                        {/* 削除ボタン */}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index, photo.id)}
                          disabled={disabled}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <p className="text-xs text-center mt-2 text-muted-foreground">
                        {index + 1}
                      </p>
                    </CardContent>
                  </Card>
                ))}
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">
                {t('imageUpload.tips.title') || 'ヒント'}
              </p>
              <ul className="space-y-1 text-xs">
                <li>
                  •{' '}
                  {t('imageUpload.tips.firstImageMain') ||
                    '最初の画像がメイン画像として表示されます'}
                </li>
                <li>
                  •{' '}
                  {t('imageUpload.tips.dragToReorder') ||
                    '矢印ボタンで画像の順序を変更できます'}
                </li>
                <li>
                  •{' '}
                  {t('imageUpload.tips.highQuality') ||
                    '高画質の画像をアップロードすることを推奨します'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 空状態 */}
      {currentCount === 0 && !canAddMore && (
        <Card className="border-dashed border-2">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <p className="text-sm">
                {t('imageUpload.empty') || '画像がアップロードされていません'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
