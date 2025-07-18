'use client';

import { useState, useRef } from 'react';
import { logger } from '@/lib/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  uploadPhotoSessionImage,
  validateImageFile,
} from '@/lib/supabase/storage';
import { toast } from 'sonner';

interface ImageUploadProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  className,
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - value.length;
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
        const result = await uploadPhotoSessionImage(file);
        if (!result.success) {
          toast.error(result.error || 'アップロードに失敗しました');
          return null;
        }

        return result.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const successfulUploads = uploadedUrls.filter(
        (url): url is string => url !== null
      );

      if (successfulUploads.length > 0) {
        onChange([...value, ...successfulUploads]);
        toast.success(
          `${successfulUploads.length}枚の画像をアップロードしました`
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

  const handleRemoveImage = (indexToRemove: number) => {
    const newUrls = value.filter((_, index) => index !== indexToRemove);
    onChange(newUrls);
  };

  const canAddMore = value.length < maxImages;

  return (
    <div className={cn('space-y-4', className)}>
      {/* アップロードボタン */}
      {canAddMore && (
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">画像をアップロード</p>
                <p className="text-xs text-muted-foreground">
                  JPEG、PNG、WebP形式（最大5MB）
                </p>
                <p className="text-xs text-muted-foreground">
                  {value.length}/{maxImages}枚
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
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={e => handleFileSelect(e.target.files)}
        disabled={disabled || uploading}
      />

      {/* アップロード済み画像一覧 */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {value.map((url, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-square relative">
                  <img
                    src={url}
                    alt={`アップロード画像 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveImage(index)}
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {index === 0 && (
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
      {value.length === 0 && !canAddMore && (
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
