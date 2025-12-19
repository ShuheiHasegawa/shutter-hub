'use client';

import React from 'react';
import { LayoutGrid, Grid3x3, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export type LayoutType = 'card' | 'grid' | 'table';

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

  const layouts: Array<{
    type: LayoutType;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    ariaLabel: string;
  }> = [
    {
      type: 'card',
      icon: LayoutGrid,
      label: t('layout.card'),
      ariaLabel: t('layout.card'),
    },
    {
      type: 'grid',
      icon: Grid3x3,
      label: t('layout.grid'),
      ariaLabel: t('layout.grid'),
    },
    {
      type: 'table',
      icon: Table,
      label: t('layout.table'),
      ariaLabel: t('layout.table'),
    },
  ];

  return (
    <div
      className={cn(
        'flex items-center gap-1 border rounded-lg p-1 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
        className
      )}
      role="group"
      aria-label={t('layout.toggle')}
    >
      {layouts.map(layout => {
        const Icon = layout.icon;
        const isActive = currentLayout === layout.type;

        return (
          <Button
            key={layout.type}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onLayoutChange(layout.type)}
            className={cn(
              'h-8 px-3 transition-all duration-200',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            )}
            aria-label={layout.ariaLabel}
            aria-pressed={isActive}
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">{layout.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
