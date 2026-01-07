'use client';

import { Eye, Edit3 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PhotobookStatusBadgeProps {
  isPublished: boolean;
}

/**
 * フォトブック公開ステータスバッジの共通コンポーネント
 */
export function PhotobookStatusBadge({
  isPublished,
}: PhotobookStatusBadgeProps) {
  const t = useTranslations('photobooks');

  return (
    <div
      className={`flex items-center text-xs px-2 py-0.5 rounded ${
        isPublished
          ? 'text-success bg-success/10 border border-success/30'
          : 'text-warning bg-warning/10 border border-warning/30'
      }`}
    >
      {isPublished ? (
        <>
          <Eye className="h-3 w-3 mr-1" />
          <span>{t('published')}</span>
        </>
      ) : (
        <>
          <Edit3 className="h-3 w-3 mr-1" />
          <span>{t('draft')}</span>
        </>
      )}
    </div>
  );
}
