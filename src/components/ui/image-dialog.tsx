'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ImageDialogProps {
  images: string | string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  alt?: string | string[];
  size?: 'default' | 'large' | 'fullscreen';
}

/**
 * 画像を拡大表示するダイアログコンポーネント
 * 単一画像・複数画像の両方に対応し、ナビゲーション機能を提供する
 */
export function ImageDialog({
  images,
  open,
  onOpenChange,
  currentIndex: controlledIndex,
  onIndexChange,
  alt,
  size = 'default',
}: ImageDialogProps) {
  const imageArray = Array.isArray(images) ? images : [images];
  const altArray = Array.isArray(alt) ? alt : alt ? [alt] : ['画像'];
  const isMultiple = imageArray.length > 1;

  const [internalIndex, setInternalIndex] = useState(0);
  const currentIndex = controlledIndex ?? internalIndex;
  const currentImage = imageArray[currentIndex];
  const currentAlt = altArray[currentIndex] || altArray[0] || '画像';

  useEffect(() => {
    if (open && controlledIndex !== undefined) {
      setInternalIndex(controlledIndex);
    }
  }, [open, controlledIndex]);

  const handlePrevious = () => {
    const newIndex =
      currentIndex > 0 ? currentIndex - 1 : imageArray.length - 1;
    if (onIndexChange) {
      onIndexChange(newIndex);
    } else {
      setInternalIndex(newIndex);
    }
  };

  const handleNext = () => {
    const newIndex =
      currentIndex < imageArray.length - 1 ? currentIndex + 1 : 0;
    if (onIndexChange) {
      onIndexChange(newIndex);
    } else {
      setInternalIndex(newIndex);
    }
  };

  const sizeClasses = {
    default: 'max-w-4xl max-h-[90vh]',
    large: 'max-w-6xl max-h-[90vh]',
    fullscreen: 'max-w-7xl max-h-[95vh] w-[95vw]',
  };

  if (!currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('p-0', sizeClasses[size])}>
        <DialogHeader className="sr-only">
          <DialogTitle>画像拡大表示</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-full flex flex-col">
          <div className="flex-1 relative overflow-hidden bg-black min-h-[70vh]">
            <div className="w-full h-full flex items-center justify-center p-4">
              <Image
                src={currentImage}
                alt={currentAlt}
                fill
                className="object-contain"
              />
            </div>

            {/* 前後の画像へのナビゲーション */}
            {isMultiple && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-white/20 z-10"
                  onClick={handlePrevious}
                  aria-label="前の画像"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-white/20 z-10"
                  onClick={handleNext}
                  aria-label="次の画像"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-black/50 text-white">
                    {currentIndex + 1} / {imageArray.length}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
