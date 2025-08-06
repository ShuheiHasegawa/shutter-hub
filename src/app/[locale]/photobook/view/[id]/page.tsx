'use client';

import { use } from 'react';
import Photobook from '@/components/photobook/Photobook';
import { logger } from '@/lib/utils/logger';
import { samplePhotobook } from '@/constants/samplePhotobookData';
import { Photo } from '@/types/photobook';
import { notFound } from 'next/navigation';

interface PhotobookViewPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default function PhotobookViewPage({ params }: PhotobookViewPageProps) {
  const { id } = use(params);

  // 現在はサンプルフォトブックのIDのみサポート
  if (id !== samplePhotobook.id) {
    notFound();
  }

  const handlePhotoClick = (photo: Photo) => {
    logger.debug('Photo clicked:', photo);
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
