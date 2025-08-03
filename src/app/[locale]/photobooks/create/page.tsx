'use client';

import React from 'react';
import dynamic from 'next/dynamic';

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

export default function PhotobookCreatePage() {
  // 新規プロジェクトの場合はprojectIdを渡さない
  return <PhotobookEditor />;
}
