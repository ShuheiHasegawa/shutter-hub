'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ActionBarButton {
  id: string;
  label: string;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
}

interface ActionBarProps {
  actions: ActionBarButton[];
  className?: string;
  sticky?: boolean;
  maxColumns?: 1 | 2 | 3 | 4;
  background?: 'default' | 'blur' | 'solid';
}

/**
 * 固定フッター型アクションバーコンポーネント
 *
 * 画面下部に固定表示されるアクションボタンバー
 * 撮影会詳細ページの予約ボタンなどで使用
 */
export function ActionBar({
  actions,
  className,
  sticky = true,
  maxColumns = 2,
  background = 'blur',
}: ActionBarProps) {
  const backgroundClasses = {
    default: 'bg-background/80 backdrop-blur-sm',
    blur: 'bg-background/80 backdrop-blur-md',
    solid: 'bg-background',
  };

  return (
    <div
      className={cn(
        'w-full border-t',
        sticky && 'fixed bottom-0 left-0 right-0 z-40',
        backgroundClasses[background],
        className
      )}
    >
      <div className="container mx-auto px-4 py-3 max-w-4xl">
        <div
          className={cn(
            'grid gap-3',
            maxColumns === 1 && 'grid-cols-1',
            maxColumns === 2 && 'grid-cols-2',
            maxColumns === 3 && 'grid-cols-3',
            maxColumns === 4 && 'grid-cols-4'
          )}
        >
          {actions.map(action => (
            <Button
              key={action.id}
              variant={action.variant || 'default'}
              size={action.size || 'lg'}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className={cn(
                'w-full h-12 text-base font-medium',
                action.className
              )}
            >
              {action.loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>処理中...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {action.icon}
                  <span>{action.label}</span>
                </div>
              )}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * スペーサーコンポーネント
 * 固定フッターがある場合のコンテンツの下部余白用
 */
export function ActionBarSpacer({ className }: { className?: string }) {
  return <div className={cn('h-20', className)} />;
}
