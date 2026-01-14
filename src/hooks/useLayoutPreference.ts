'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import type { LayoutType } from '@/components/ui/layout-toggle';

const DEFAULT_LAYOUT: LayoutType = 'card';

export function useLayoutPreference(
  storageKey: string = 'photo-session-layout'
) {
  const [layout, setLayout] = useState<LayoutType>(DEFAULT_LAYOUT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && ['card', 'grid', 'table'].includes(saved)) {
        setLayout(saved as LayoutType);
      }
    } catch (error) {
      // ローカルストレージへのアクセスが失敗した場合（プライベートモードなど）
      logger.warn('Failed to load layout preference from localStorage', {
        error,
        hook: 'useLayoutPreference',
        storageKey,
      });
    }
  }, [storageKey]);

  const updateLayout = (newLayout: LayoutType) => {
    setLayout(newLayout);
    if (mounted) {
      try {
        localStorage.setItem(storageKey, newLayout);
      } catch (error) {
        // ローカルストレージへの保存が失敗した場合
        logger.warn('Failed to save layout preference to localStorage', {
          error,
          hook: 'useLayoutPreference',
          storageKey,
        });
      }
    }
  };

  return { layout, updateLayout, mounted };
}
