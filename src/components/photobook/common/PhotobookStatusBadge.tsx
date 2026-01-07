'use client';

import { Eye, Edit3 } from 'lucide-react';

interface PhotobookStatusBadgeProps {
  isPublished: boolean;
}

/**
 * フォトブック公開ステータスバッジの共通コンポーネント
 */
export function PhotobookStatusBadge({
  isPublished,
}: PhotobookStatusBadgeProps) {
  return (
    <div className="flex items-center text-xs text-success">
      {isPublished ? (
        <>
          <Eye className="h-3 w-3 mr-1" />
          <span>公開中</span>
        </>
      ) : (
        <>
          <Edit3 className="h-3 w-3 mr-1" />
          <span>下書き</span>
        </>
      )}
    </div>
  );
}
