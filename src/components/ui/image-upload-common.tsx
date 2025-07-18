'use client';

import { useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';

interface ImageUploadCommonProps {
  // 基本設定
  value?: string | string[];
  onChange: (value: string | string[]) => void;

  // 複数画像対応
  multiple?: boolean;
  maxImages?: number;

  // UI設定
  title?: string;
  description?: string;

  // 制限設定
  maxFileSize?: number; // MB
  acceptedTypes?: string[];
  disabled?: boolean;

  // 表示制御
  showSizeInfo?: boolean;
  showFormatInfo?: boolean;
  showMaxImagesInfo?: boolean;
  showTips?: boolean;
  showMainImageBadge?: boolean;
  showReorderButtons?: boolean;

  // カスタマイズ
  className?: string;
  uploadFunction?: (file: File) => Promise<string>;

  // ラベル・メッセージ
  labels?: {
    selectFiles?: string;
    uploading?: string;
    dragAndDrop?: string;
    main?: string;
    preview?: string;
    tips?: {
      title?: string;
      firstImageMain?: string;
      dragToReorder?: string;
      highQuality?: string;
    };
    errors?: {
      maxImagesReached?: string;
      fileTooLarge?: string;
      invalidFileType?: string;
      uploadFailed?: string;
    };
    success?: {
      uploaded?: string;
      removed?: string;
    };
  };
}

const defaultLabels = {
  selectFiles: '画像を選択',
  uploading: 'アップロード中...',
  dragAndDrop: 'またはドラッグ&ドロップ',
  main: 'メイン',
  preview: 'プレビュー',
  tips: {
    title: 'ヒント',
    firstImageMain: '最初の画像がメイン画像として表示されます',
    dragToReorder: 'ドラッグで順序を変更できます',
    highQuality: '高品質な画像を使用することをお勧めします',
  },
  errors: {
    maxImagesReached: '最大枚数に達しました',
    fileTooLarge: 'ファイルサイズが大きすぎます',
    invalidFileType: '対応していないファイル形式です',
    uploadFailed: 'アップロードに失敗しました',
  },
  success: {
    uploaded: '画像をアップロードしました',
    removed: '画像を削除しました',
  },
};

export function ImageUploadCommon({
  value,
  onChange,
  multiple = false,
  maxImages = 5,
  title,
  description,
  maxFileSize = 10,
  acceptedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ],
  disabled = false,
  showSizeInfo = true,
  showFormatInfo = true,
  showMaxImagesInfo = true,
  showTips = true,
  showMainImageBadge = true,
  showReorderButtons = true,
  className = '',
  uploadFunction,
  labels = {},
}: ImageUploadCommonProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const mergedLabels = { ...defaultLabels, ...labels };

  // 現在の画像URLsを取得
  const currentImages = multiple
    ? Array.isArray(value)
      ? value
      : value
        ? [value]
        : []
    : value
      ? [value as string]
      : [];

  const updateImages = useCallback(
    (newImages: string[]) => {
      if (multiple) {
        onChange(newImages);
      } else {
        onChange(newImages[0] || '');
      }
    },
    [multiple, onChange]
  );

  // デフォルトのアップロード関数（実際の実装では外部から渡す）
  const defaultUploadFunction = async (file: File): Promise<string> => {
    // ダミー実装
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(`https://example.com/images/${Date.now()}_${file.name}`);
      }, 1000);
    });
  };

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remainingSlots = multiple ? maxImages - currentImages.length : 1;
      if (remainingSlots <= 0) {
        alert(mergedLabels.errors.maxImagesReached);
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      const maxSizeBytes = maxFileSize * 1024 * 1024;

      // ファイル検証
      for (const file of filesToUpload) {
        if (file.size > maxSizeBytes) {
          alert(mergedLabels.errors.fileTooLarge);
          return;
        }

        if (!acceptedTypes.includes(file.type)) {
          alert(mergedLabels.errors.invalidFileType);
          return;
        }
      }

      setUploading(true);

      try {
        const uploadFunc = uploadFunction || defaultUploadFunction;
        const newImageUrls = await Promise.all(
          filesToUpload.map(file => uploadFunc(file))
        );

        const updatedImages = multiple
          ? [...currentImages, ...newImageUrls]
          : newImageUrls;

        updateImages(updatedImages);
      } catch (error) {
        logger.error('画像アップロードエラー:', error);
        alert(mergedLabels.errors.uploadFailed);
      } finally {
        setUploading(false);
      }
    },
    [
      currentImages,
      maxImages,
      maxFileSize,
      acceptedTypes,
      multiple,
      uploadFunction,
      mergedLabels,
      updateImages,
    ]
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      const newImages = currentImages.filter((_, i) => i !== index);
      updateImages(newImages);
    },
    [currentImages, updateImages]
  );

  const moveImage = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!multiple) return;

      const newImages = [...currentImages];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      updateImages(newImages);
    },
    [currentImages, multiple, updateImages]
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

  const canUpload = multiple
    ? currentImages.length < maxImages
    : currentImages.length === 0;

  return (
    <div className={`space-y-4 ${className}`}>
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

            {title && <h3 className="text-lg font-medium mb-2">{title}</h3>}

            {description && (
              <p className="text-sm text-muted-foreground mb-4">
                {description}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={disabled || uploading || !canUpload}
                onClick={() =>
                  document.getElementById('image-upload-input')?.click()
                }
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? mergedLabels.uploading : mergedLabels.selectFiles}
              </Button>

              <span className="text-xs text-muted-foreground">
                {mergedLabels.dragAndDrop}
              </span>
            </div>

            <input
              id="image-upload-input"
              type="file"
              multiple={multiple}
              accept={acceptedTypes.join(',')}
              className="hidden"
              onChange={handleInputChange}
              disabled={disabled || uploading}
            />

            {/* 注意書き */}
            {(showSizeInfo || showFormatInfo || showMaxImagesInfo) && (
              <div className="mt-4 text-xs text-muted-foreground space-y-1">
                {showSizeInfo && <p>最大ファイルサイズ: {maxFileSize}MB</p>}
                {showFormatInfo && <p>対応形式: JPEG, PNG, WebP, GIF</p>}
                {showMaxImagesInfo && multiple && (
                  <p>最大枚数: {maxImages}枚</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 画像プレビュー */}
      {currentImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              {mergedLabels.preview}{' '}
              {multiple && `(${currentImages.length}/${maxImages})`}
            </h4>
            {multiple && currentImages.length > 0 && showMainImageBadge && (
              <Badge variant="outline">
                {currentImages.length === 1
                  ? mergedLabels.main
                  : '最初がメイン'}
              </Badge>
            )}
          </div>

          <div
            className={`grid gap-4 ${
              multiple
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-1 max-w-xs mx-auto'
            }`}
          >
            {currentImages.map((url, index) => (
              <Card key={index} className="relative group">
                <CardContent className="p-2">
                  <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                    <img
                      src={url}
                      alt={`画像 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* メイン画像バッジ */}
                    {multiple && index === 0 && showMainImageBadge && (
                      <Badge
                        variant="default"
                        className="absolute top-2 left-2 text-xs"
                      >
                        {mergedLabels.main}
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
                    {multiple && showReorderButtons && (
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
                        {index < currentImages.length - 1 && (
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
                    )}
                  </div>

                  {multiple && (
                    <p className="text-xs text-center mt-2 text-muted-foreground">
                      {index + 1}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ヒント */}
          {showTips && multiple && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">{mergedLabels.tips.title}</p>
                <ul className="space-y-1 text-xs">
                  <li>• {mergedLabels.tips.firstImageMain}</li>
                  <li>• {mergedLabels.tips.dragToReorder}</li>
                  <li>• {mergedLabels.tips.highQuality}</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
