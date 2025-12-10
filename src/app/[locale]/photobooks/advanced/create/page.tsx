'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// アドバンスドPhotobookEditorを動的インポートして水和エラーを回避
const AdvancedPhotobookEditor = dynamic(
  () => import('@/components/photobook/advanced/editor/PhotobookEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-2"></div>
          <p className="text-gray-600">アドバンスドエディターを読み込み中...</p>
        </div>
      </div>
    ),
  }
);

export default function AdvancedPhotobookCreatePage() {
  // 新規プロジェクトの場合はprojectIdを渡さない
  return <AdvancedPhotobookEditor />;
}
