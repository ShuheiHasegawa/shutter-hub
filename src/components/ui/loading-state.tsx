'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  /** バリアント（デフォルト: 'spinner'） */
  variant?: 'spinner' | 'skeleton' | 'card';
  /** カスタムメッセージ（多言語化キーまたは直接テキスト） */
  message?: string;
  /** スケルトンの数（skeleton/cardバリアントの場合、デフォルト: 3） */
  count?: number;
  /** カスタムクラス名 */
  className?: string;
  /** フルスクリーン表示（デフォルト: false） */
  fullScreen?: boolean;
}

/**
 * 統一的なローディング状態表示コンポーネント
 * データ読み込み中に使用する
 */
export function LoadingState({
  variant = 'spinner',
  message,
  count = 3,
  className,
  fullScreen = false,
}: LoadingStateProps) {
  const t = useTranslations('common.loading');

  // スピナーバリアント
  if (variant === 'spinner') {
    const content = (
      <div
        className={cn(
          'flex items-center justify-center',
          fullScreen ? 'min-h-screen' : 'py-8',
          className
        )}
      >
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            {message || t('default')}
          </p>
        </div>
      </div>
    );

    return content;
  }

  // スケルトンバリアント（リスト用）
  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ))}
      </div>
    );
  }

  // カードバリアント
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
