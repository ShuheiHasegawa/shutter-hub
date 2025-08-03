'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/utils/logger';

// PhotobookEditorを動的インポートして水和エラーを回避
const PhotobookEditor = dynamic(
  () => import('@/components/photobook/editor/PhotobookEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">エディターを読み込み中...</p>
        </div>
      </div>
    ),
  }
);

interface PhotobookEditPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default function PhotobookEditPage({ params }: PhotobookEditPageProps) {
  const [photobookId, setPhotobookId] = useState<string>('');

  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        setPhotobookId(id);
        logger.debug('フォトブック編集ページを初期化:', id);
      } catch (error) {
        logger.error('フォトブック編集ページの初期化エラー:', error);
      }
    };

    resolveParams();
  }, [params]);

  return <PhotobookEditor projectId={photobookId} />;
}
