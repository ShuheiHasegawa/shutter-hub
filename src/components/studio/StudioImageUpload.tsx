'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  uploadStudioImage,
  validateImageFile,
} from '@/lib/storage/studio-images';
import {
  createStudioPhotoAction,
  deleteStudioPhotoAction,
} from '@/app/actions/studio';
import { toast } from 'sonner';
import { StudioPhoto } from '@/types/database';
import Image from 'next/image';
import { logger } from '@/lib/utils/logger';

interface StudioImageUploadProps {
  studioId: string;
  initialPhotos?: StudioPhoto[];
  maxImages?: number;
  className?: string;
  disabled?: boolean;
  onPhotosChange?: (photos: StudioPhoto[]) => void;
}

export function StudioImageUpload({
  studioId,
  initialPhotos = [],
  maxImages = 10,
  className,
  disabled = false,
  onPhotosChange,
}: StudioImageUploadProps) {
  const [photos, setPhotos] = useState<StudioPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初期写真が変更されたときに状態を更新
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - photos.length;
    if (remainingSlots <= 0) {
      toast.error(`最大${maxImages}枚までアップロードできます`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async file => {
        // ファイルバリデーション
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          return null;
        }

        // アップロード実行
        const result = await uploadStudioImage(file, studioId);
        if (!result.success || !result.url) {
          toast.error(result.error || 'アップロードに失敗しました');
          return null;
        }

        // スタジオ画像レコードを作成
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
    } catch (error) {
      logger.error('アップロードエラー:', error);
      toast.error('予期しないエラーが発生しました');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (photoId: string) => {
    try {
      const result = await deleteStudioPhotoAction(photoId);

      if (result.success) {
        const newPhotos = photos.filter(photo => photo.id !== photoId);
        setPhotos(newPhotos);
        onPhotosChange?.(newPhotos);
        toast.success('画像を削除しました');
      } else {
        toast.error(result.error || '画像の削除に失敗しました');
      }
    } catch (error) {
      logger.error('削除エラー:', error);
      toast.error('予期しないエラーが発生しました');
    }
  };

  const canAddMore = photos.length < maxImages;

  return (
    <div className={cn('space-y-4', className)}>
      {/* アップロードボタン */}
      {canAddMore && (
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
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
                <p className="text-sm font-medium">画像をアップロード</p>
                <p className="text-xs text-muted-foreground">
                  JPEG、PNG、WebP形式（最大10MB）
                </p>
                <p className="text-xs text-muted-foreground">
                  {photos.length}/{maxImages}枚
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'アップロード中...' : 'ファイルを選択'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={e => handleFileSelect(e.target.files)}
        disabled={disabled || uploading}
      />

      {/* アップロード済み画像一覧 */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <Card key={photo.id} className="relative group overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-square relative">
                  <Image
                    src={photo.image_url || '/images/no-image.png'}
                    alt={photo.alt_text || `スタジオ画像 ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveImage(photo.id)}
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {photo.display_order === 1 && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        メイン
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 空状態 */}
      {photos.length === 0 && !canAddMore && (
        <Card className="border-dashed border-2">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <p className="text-sm">画像がアップロードされていません</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
