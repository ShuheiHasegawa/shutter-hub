'use client';

import React from 'react';
import { SpreadLayout as SpreadLayoutType, Photo } from '@/types/photobook';
import PageLayout from './PageLayout';
import SinglePhoto from './SinglePhoto';
import { cn } from '@/lib/utils';

interface SpreadLayoutProps {
  spread: SpreadLayoutType;
  isEditable?: boolean;
  onPhotoClick?: (photo: Photo) => void;
  className?: string;
}

const SpreadLayout: React.FC<SpreadLayoutProps> = ({
  spread,
  isEditable = false,
  onPhotoClick,
  className = '',
}) => {
  // 見開きページ全体で1つのレイアウトを使用する場合
  if (spread.fullSpreadTemplate) {
    return (
      <div
        className={cn(
          'relative w-full h-full flex bg-white rounded-lg overflow-hidden',
          className
        )}
      >
        <div className="relative w-full h-full">
          {spread.photos.map((photo, index) => {
            const position = spread.fullSpreadTemplate?.photoPositions[index];
            if (!position) return null;

            return (
              <SinglePhoto
                key={`photo-${photo.id}-${index}`}
                photo={photo}
                position={position}
                isEditable={isEditable}
                onClick={onPhotoClick ? () => onPhotoClick(photo) : undefined}
                isPremium={spread.fullSpreadTemplate?.isPremium}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // 左右それぞれのページに別のレイアウトを使用する場合
  // 左ページの写真と右ページの写真を分ける
  const leftPhotos: Photo[] = [];
  const rightPhotos: Photo[] = [];

  // 写真を振り分ける
  const leftPhotoCount = spread.leftPageTemplate?.photoPositions.length || 0;

  spread.photos.forEach((photo, index) => {
    if (index < leftPhotoCount) {
      leftPhotos.push(photo);
    } else {
      rightPhotos.push(photo);
    }
  });

  return (
    <div
      className={cn(
        'relative w-full h-full flex bg-white rounded-lg overflow-hidden',
        className
      )}
    >
      {/* 左ページ */}
      <div className="w-1/2 h-full border-r border-gray-200">
        <PageLayout
          template={spread.leftPageTemplate}
          photos={leftPhotos}
          isEditable={isEditable}
          onPhotoClick={onPhotoClick}
        />
      </div>

      {/* 右ページ */}
      <div className="w-1/2 h-full border-l border-gray-200">
        <PageLayout
          template={spread.rightPageTemplate}
          photos={rightPhotos}
          isEditable={isEditable}
          onPhotoClick={onPhotoClick}
        />
      </div>

      {/* 中央の綴じ目 */}
      <div className="absolute left-1/2 top-0 w-0.5 h-full bg-gray-300 transform -translate-x-1/2 shadow-inner" />
    </div>
  );
};

export default SpreadLayout;
