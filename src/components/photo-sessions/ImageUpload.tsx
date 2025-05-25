'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  uploadPhotoSessionImage,
  deletePhotoSessionImage,
  updatePhotoSessionImages,
  validateImageFile,
  getThumbnailUrl,
  type UploadResult,
} from '@/lib/storage/photo-session-images';

interface ImageUploadProps {
  photoSessionId: string;
  initialImages?: string[];
  maxImages?: number;
  onImagesChange?: (imageUrls: string[]) => void;
  disabled?: boolean;
}

export function ImageUpload({
  photoSessionId,
  initialImages = [],
  maxImages = 5,
  onImagesChange,
  disabled = false,
}: ImageUploadProps) {
  const t = useTranslations('photoSessions.imageUpload');
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // 最大枚数チェック
    if (images.length + files.length > maxImages) {
      toast.error(t('maxImagesExceeded', { max: maxImages }));
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = files.map(async (file, index) => {
        // バリデーション
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          return null;
        }

        const result = await uploadPhotoSessionImage(file, photoSessionId);

        // プログレス更新
        setUploadProgress(((index + 1) / files.length) * 100);

        return result;
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results
        .filter(
          (result): result is UploadResult => result !== null && result.success
        )
        .map(result => result.url!)
        .filter(Boolean);

      if (successfulUploads.length > 0) {
        const newImages = [...images, ...successfulUploads];
        setImages(newImages);

        // データベースを更新
        await updatePhotoSessionImages(photoSessionId, newImages);

        onImagesChange?.(newImages);
        toast.success(t('uploadSuccess', { count: successfulUploads.length }));
      }

      // 失敗した場合のエラー表示
      const failedCount = results.filter(
        result => result && !result.success
      ).length;
      if (failedCount > 0) {
        toast.error(t('uploadPartialFailure', { failed: failedCount }));
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('uploadError'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageDelete = async (imageUrl: string, index: number) => {
    try {
      const result = await deletePhotoSessionImage(imageUrl);

      if (result.success) {
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages);

        // データベースを更新
        await updatePhotoSessionImages(photoSessionId, newImages);

        onImagesChange?.(newImages);
        toast.success(t('deleteSuccess'));
      } else {
        toast.error(result.error || t('deleteError'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('deleteError'));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* アップロードボタン */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleUploadClick}
          disabled={disabled || uploading || images.length >= maxImages}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? t('uploading') : t('selectImages')}
        </Button>

        <Badge variant="secondary">
          {images.length} / {maxImages}
        </Badge>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* アップロード進行状況 */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{t('uploadProgress')}</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {/* 画像一覧 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <Card key={imageUrl} className="relative group">
              <CardContent className="p-2">
                <div className="relative aspect-square">
                  <img
                    src={getThumbnailUrl(imageUrl, 200, 200)}
                    alt={t('imageAlt', { index: index + 1 })}
                    className="w-full h-full object-cover rounded-md"
                  />

                  {/* メイン画像バッジ */}
                  {index === 0 && (
                    <Badge
                      className="absolute top-2 left-2 text-xs"
                      variant="default"
                    >
                      {t('mainImage')}
                    </Badge>
                  )}

                  {/* 削除ボタン */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleImageDelete(imageUrl, index)}
                    disabled={disabled || uploading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 空状態 */}
      {images.length === 0 && !uploading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              {t('noImages')}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleUploadClick}
              disabled={disabled}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {t('selectImages')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ヘルプテキスト */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>{t('supportedFormats')}</p>
        <p>{t('maxFileSize')}</p>
        <p>{t('firstImageIsMain')}</p>
      </div>
    </div>
  );
}
