'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Photo, PhotoPosition } from '@/types/photobook';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SinglePhotoProps {
  photo: Photo;
  position: PhotoPosition;
  isEditable?: boolean;
  onClick?: () => void;
  isPremium?: boolean;
}

const SinglePhoto: React.FC<SinglePhotoProps> = ({
  photo,
  position,
  isEditable = false,
  onClick,
  isPremium = false,
}) => {
  const [scale, setScale] = useState(1);

  // スタイル計算
  const style = {
    position: 'absolute' as const,
    left: `${position.x}%`,
    top: `${position.y}%`,
    width: `${position.width}%`,
    height: `${position.height}%`,
    zIndex: position.zIndex || 1,
    transform: position.rotation
      ? `rotate(${position.rotation}deg)`
      : undefined,
  };

  // アニメーション設定
  const variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5 },
    },
    hover: {
      scale: isEditable ? 1.02 : 1,
      transition: { duration: 0.3 },
    },
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  return (
    <motion.div
      className={cn(
        'absolute overflow-hidden rounded cursor-pointer',
        isPremium ? 'shadow-lg' : 'shadow-md',
        isEditable && 'hover:shadow-xl transition-shadow duration-300'
      )}
      style={style}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={variants}
      onClick={onClick}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <Image
          src={photo.src}
          alt={photo.alt || ''}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />

        {/* プレビューマスク */}
        <Dialog>
          <DialogTrigger asChild>
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center justify-center px-4 py-2 bg-black/65 rounded-full text-white text-sm backdrop-blur-sm">
                <Maximize2 className="w-4 h-4 mr-2" />
                <span>{isPremium ? 'クリックで拡大' : '拡大'}</span>
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <div className="relative w-full h-full flex flex-col">
              <div className="flex-1 relative overflow-hidden">
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ transform: `scale(${scale})` }}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt || ''}
                    width={800}
                    height={600}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 p-4 bg-black/65 backdrop-blur-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  className="text-white hover:bg-white/10"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-white text-sm min-w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  className="text-white hover:bg-white/10"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {isPremium && (
          <Badge className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white z-10">
            Premium
          </Badge>
        )}
      </div>
    </motion.div>
  );
};

export default SinglePhoto;
