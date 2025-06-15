'use client';

import React from 'react';
import { LayoutTemplate, Photo } from '@/types/photobook';
import SinglePhoto from './SinglePhoto';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface PageLayoutProps {
  template?: LayoutTemplate;
  photos: Photo[];
  isEditable?: boolean;
  onPhotoClick?: (photo: Photo) => void;
  className?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  template,
  photos,
  isEditable = false,
  onPhotoClick,
  className = '',
}) => {
  const t = useTranslations('photobook');

  if (!template) {
    return (
      <div
        className={cn(
          'relative w-full h-full bg-gray-100 rounded flex items-center justify-center',
          className
        )}
      >
        <div className="text-center text-gray-400">{t('noLayoutSet')}</div>
      </div>
    );
  }

  // テンプレートの各位置に対応する写真を配置
  return (
    <div
      className={cn(
        'relative w-full h-full bg-white rounded overflow-hidden',
        className
      )}
    >
      {template.photoPositions.map((position, index) => {
        const photo = photos[index];

        if (!photo) {
          // 写真がない場合はプレースホルダーを表示
          return (
            <div
              key={`placeholder-${index}`}
              className="absolute bg-gray-200 rounded flex justify-center items-center text-gray-400 text-sm"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                width: `${position.width}%`,
                height: `${position.height}%`,
              }}
            >
              {t('addPhoto')}
            </div>
          );
        }

        return (
          <SinglePhoto
            key={`photo-${photo.id}-${index}`}
            photo={photo}
            position={position}
            isEditable={isEditable}
            onClick={onPhotoClick ? () => onPhotoClick(photo) : undefined}
            isPremium={template.isPremium}
          />
        );
      })}
    </div>
  );
};

export default PageLayout;
