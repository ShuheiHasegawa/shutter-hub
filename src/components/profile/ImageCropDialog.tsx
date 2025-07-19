'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Area, Point } from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import { RotateCcw, Crop, FileImage, X, Check } from 'lucide-react';

interface ImageCropDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
  originalFileName: string;
}

export function ImageCropDialog({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  originalFileName,
}: ImageCropDialogProps) {
  const { toast } = useToast();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    const { width, height } = pixelCrop;
    canvas.width = width;
    canvas.height = height;

    // 円形にクロップするため、円形のマスクを作成
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, 2 * Math.PI);
    ctx.clip();

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      width,
      height
    );

    return new Promise(resolve => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          }
        },
        'image/jpeg',
        0.9
      );
    });
  };

  const handleCropAndCompress = async () => {
    if (!croppedAreaPixels) {
      toast({
        title: 'エラー',
        description: 'トリミング範囲が設定されていません',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      logger.debug('画像トリミング開始', {
        crop: croppedAreaPixels,
        zoom,
        originalFileName,
      });

      // トリミング実行
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      // File オブジェクトに変換
      const croppedFile = new File([croppedBlob], originalFileName, {
        type: 'image/jpeg',
      });

      logger.debug('トリミング完了、圧縮開始', {
        originalSize: croppedFile.size,
        fileName: croppedFile.name,
      });

      // 画像圧縮オプション
      const compressionOptions = {
        maxSizeMB: 0.5, // 最大500KB
        maxWidthOrHeight: 400, // プロフィール画像用の適切なサイズ
        useWebWorker: true,
        quality: 0.8, // 品質80%
      };

      // 画像圧縮実行
      const compressedFile = await imageCompression(
        croppedFile,
        compressionOptions
      );

      logger.info('画像トリミング・圧縮完了', {
        originalSize: croppedFile.size,
        compressedSize: compressedFile.size,
        compressionRatio:
          (
            ((croppedFile.size - compressedFile.size) / croppedFile.size) *
            100
          ).toFixed(1) + '%',
        fileName: compressedFile.name,
      });

      toast({
        title: '成功',
        description: `画像を最適化しました（${Math.round(compressedFile.size / 1024)}KB）`,
      });

      onCropComplete(compressedFile);
      onClose();
    } catch (error) {
      logger.error('画像処理エラー', error);
      toast({
        title: 'エラー',
        description: '画像の処理に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5" />
            プロフィール画像をトリミング
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* トリミング領域 */}
          <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1} // 正方形
              cropShape="round" // 円形クロップ
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteCallback}
              onZoomChange={setZoom}
            />
          </div>

          {/* ズームコントロール */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">ズーム</Label>
            <Slider
              value={[zoom]}
              onValueChange={(value: number[]) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1x</span>
              <span>3x</span>
            </div>
          </div>

          {/* 機能説明 */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Crop className="h-4 w-4 text-primary" />
              <span>円形にトリミングされます</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileImage className="h-4 w-4 text-primary" />
              <span>最適なサイズに圧縮されます（最大500KB）</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset} size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            リセット
          </Button>
          <Button variant="outline" onClick={onClose} size="sm">
            <X className="h-4 w-4 mr-2" />
            キャンセル
          </Button>
          <Button
            onClick={handleCropAndCompress}
            disabled={isProcessing}
            size="sm"
          >
            {isProcessing ? (
              <>
                <FileImage className="h-4 w-4 mr-2 animate-spin" />
                処理中...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                適用
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
