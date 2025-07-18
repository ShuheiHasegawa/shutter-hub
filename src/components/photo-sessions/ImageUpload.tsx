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
} from 'lucide-react';

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

      // ファイルサイズとタイプの検証
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
      ];

      for (const file of filesToUpload) {
        if (file.size > maxSize) {
          toast({
            title: t('imageUpload.error.fileTooLarge'),
            description: t('imageUpload.error.fileTooLargeDescription'),
            variant: 'destructive',
          });
          return;
        }

        if (!allowedTypes.includes(file.type)) {
          toast({
            title: t('imageUpload.error.invalidFileType'),
            description: t('imageUpload.error.invalidFileTypeDescription'),
            variant: 'destructive',
          });
          return;
        }
      }

      setUploading(true);

      try {
        // 実際のアップロード処理はここで実装
        // 今回はダミーURLを生成
        const newImageUrls = filesToUpload.map((file, index) => {
          return `https://example.com/images/${photoSessionId}/${Date.now()}_${index}.jpg`;
        });

        const updatedImages = [...images, ...newImageUrls];
        updateImages(updatedImages);

        toast({
          title: tCommon('success'),
          description: t('imageUpload.success.uploaded'),
        });
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

      toast({
        title: tCommon('success'),
        description: t('imageUpload.success.removed'),
      });
    },
    [images, t, tCommon, toast, updateImages]
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
      const newImages = [...images];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      updateImages(newImages);
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
                <Upload className="h-4 w-4 mr-2" />
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
        <div className="space-y-3">
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((url, index) => (
              <Card key={index} className="relative group">
                <CardContent className="p-2">
                  <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                    {/* 実際の実装では画像を表示 */}
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>

                    {/* メイン画像バッジ */}
                    {index === 0 && (
                      <Badge
                        variant="default"
                        className="absolute top-2 left-2 text-xs"
                      >
                        {t('imageUpload.main')}
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
                      {index < images.length - 1 && (
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
            ))}
          </div>

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
