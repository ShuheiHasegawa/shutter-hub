'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ActionBarButton {
  id: string;
  label: string;
  variant?: // 🎨 統合バリアント（テーマ対応・推奨）
  | 'default'
    | 'primary'
    | 'accent'
    | 'neutral'
    // 🎯 用途別バリアント（操作の重要度で使い分け）
    | 'cta'
    | 'action'
    | 'navigation'
    // 🔧 Shadcn/ui標準バリアント（既存システム維持）
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    // 🎨 ブランド色バリアント（固定色・機能別）
    | 'brand-success'
    | 'brand-warning'
    | 'brand-error'
    | 'brand-info';
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
 * main要素内の下部に固定表示されるアクションボタンバー
 * サイドバーを避けて表示される
 * Button.tsx の統合カラーシステムに対応（テーマ切り替え可能）
 *
 * @example
 * // 統合カラーシステム使用例
 * const actions = [
 *   { id: 'save', label: '保存', variant: 'primary', onClick: handleSave },
 *   { id: 'cancel', label: 'キャンセル', variant: 'neutral', onClick: handleCancel },
 *   { id: 'delete', label: '削除', variant: 'destructive', onClick: handleDelete },
 *   { id: 'success', label: '完了', variant: 'brand-success', onClick: handleComplete },
 * ];
 */
export function ActionBar({
  actions,
  className,
  sticky = true,
  maxColumns = 2,
  background = 'blur',
}: ActionBarProps) {
  const backgroundClasses = {
    default: 'surface-neutral/95 backdrop-blur-sm border-theme-neutral/20',
    blur: 'surface-neutral/90 backdrop-blur-md border-theme-neutral/20',
    solid: 'surface-neutral border-theme-neutral/20',
  };

  return (
    <div
      className={cn(
        'border-t',
        sticky && 'fixed bottom-0 right-0 z-40',
        sticky && 'left-0 md:left-64',
        sticky && 'w-full md:w-[calc(100%-16rem)]', // サイドバー幅（16rem = 256px）を考慮
        !sticky && 'w-full',
        backgroundClasses[background],
        className
      )}
    >
      <div className="w-full px-4 py-3">
        <div className="flex justify-center items-center">
          <div
            className={cn(
              'grid gap-3 justify-items-center',
              maxColumns === 1 && 'grid-cols-1 w-full max-w-xs',
              maxColumns === 2 && 'grid-cols-2 w-full max-w-sm',
              maxColumns === 3 && 'grid-cols-3 w-full max-w-md',
              maxColumns === 4 && 'grid-cols-4 w-full max-w-lg'
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
                  'h-12 text-base font-medium w-full transition-colors',
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
