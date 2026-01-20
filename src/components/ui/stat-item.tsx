'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StatItemProps {
  label: string;
  value: string | ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

/**
 * 統計情報を表示するコンポーネント
 * 左側に太いボーダー（4px）を表示し、ラベルと値を縦に配置する
 */
export function StatItem({
  label,
  value,
  variant = 'default',
  className,
}: StatItemProps) {
  const borderColors = {
    default: 'border-gray-900 dark:border-gray-400',
    primary: 'border-brand-primary',
    success: 'border-success',
    warning: 'border-warning',
    error: 'border-error',
  };

  return (
    <div className={cn('border-l-4 pl-4', borderColors[variant], className)}>
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}
