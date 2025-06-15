'use client';

import Photobook from '@/components/photobook/Photobook';
import { samplePhotobook } from '@/constants/samplePhotobookData';
import { Photo } from '@/types/photobook';

export default function PhotobookPage() {
  const handlePhotoClick = (photo: Photo) => {
    console.log('Photo clicked:', photo);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Photobook
        photobook={samplePhotobook}
        isEditable={false}
        onPhotoClick={handlePhotoClick}
      />
    </div>
  );
}
