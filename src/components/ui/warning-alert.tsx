'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WarningAlertProps {
  title?: string;
  description: string;
  className?: string;
}

/**
 * 警告・エラー表示用のアラートコンポーネント
 * アンバー（黄色）の背景色で警告メッセージを表示する
 */
export function WarningAlert({
  title,
  description,
  className,
}: WarningAlertProps) {
  return (
    <Alert
      className={cn(
        'max-w-md border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50',
        className
      )}
    >
      <AlertTriangleIcon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
