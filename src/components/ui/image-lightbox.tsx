'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface ImageLightboxProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

/**
 * 画像を拡大表示するライトボックスコンポーネント
 * 背景クリックまたは×ボタンで閉じる
 */
export function ImageLightbox({
  imageUrl,
  isOpen,
  onClose,
  alt = '画像',
}: ImageLightboxProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={e => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="relative max-w-7xl max-h-screen w-full h-full flex items-center justify-center">
        <div className="relative w-full h-full">
          <Image
            src={imageUrl}
            alt={alt}
            fill
            className="object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white"
          onClick={e => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
