'use client';

import { useTranslations } from 'next-intl';
import { LayoutToggle as BaseLayoutToggle } from '@/components/ui/layout-toggle';
import type { LayoutType } from '@/components/ui/layout-toggle';

interface LayoutToggleProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  className?: string;
}

export function LayoutToggle({
  currentLayout,
  onLayoutChange,
  className,
}: LayoutToggleProps) {
  const t = useTranslations('photoSessions');

  return (
    <BaseLayoutToggle
      currentLayout={currentLayout}
      onLayoutChange={onLayoutChange}
      className={className}
      labels={{
        card: t('layout.card'),
        grid: t('layout.grid'),
        table: t('layout.table'),
        toggle: t('layout.toggle'),
      }}
    />
  );
}
