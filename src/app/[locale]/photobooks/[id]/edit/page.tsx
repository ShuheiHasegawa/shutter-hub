'use client';

import React, { useEffect, useState } from 'react';
import { logger } from '@/lib/utils/logger';
import PhotobookEditor from '@/components/photobook/editor/PhotobookEditor';

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
