'use client';

import React from 'react';
import PhotobookEditor from '@/components/photobook/editor/PhotobookEditor';

export default function PhotobookCreatePage() {
  // 新規プロジェクトの場合はprojectIdを渡さない
  return <PhotobookEditor />;
}
