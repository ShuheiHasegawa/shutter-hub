'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';

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
  autoHide?: boolean; // 自動表示制御を有効化
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
  autoHide = false, // デフォルトfalse（既存動作維持）
}: ActionBarProps) {
  const [isVisible, setIsVisible] = useState(true);

  // autoHide有効時：Sentinel要素の可視状態を監視
  useEffect(() => {
    if (!autoHide) return;

    let observer: IntersectionObserver | null = null;
    let pollTimer: number | null = null;

    const startObserve = (el: Element) => {
      observer = new IntersectionObserver(
        ([entry]) => {
          logger.debug('ActionBar: sentinel visible?', {
            isIntersecting: entry.isIntersecting,
            ratio: entry.intersectionRatio,
          });
          // Sentinelが見えている = ActionBar非表示
          // Sentinelが隠れている = ActionBar表示
          setIsVisible(!entry.isIntersecting);
        },
        {
          root: null,
          threshold: 0.05, // 5%でも検知
          rootMargin: '0px 0px -96px 0px', // 下部オフセット（モバイルバー考慮）
        }
      );
      observer.observe(el);
      logger.debug('ActionBar: sentinel observed');
    };

    const pollForSentinel = () => {
      const el = document.querySelector('[data-action-bar-sentinel="true"]');
      if (el) {
        if (pollTimer) window.clearInterval(pollTimer);
        startObserve(el);
      }
    };

    // 初回即時チェック + 500ms間隔で最大5回まで再試行
    pollForSentinel();
    let tries = 0;
    if (!observer) {
      pollTimer = window.setInterval(() => {
        if (tries++ > 5) {
          if (pollTimer) window.clearInterval(pollTimer);
          logger.debug('ActionBar: sentinel not found after retries');
          return;
        }
        pollForSentinel();
      }, 500);
    }

    return () => {
      if (observer) observer.disconnect();
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [autoHide]);

  // autoHide有効時はopacityとpointer-eventsで制御（フェード効果のため）
  const backgroundClasses = {
    default: 'surface-neutral/95 backdrop-blur-sm border-theme-neutral/20',
    blur: 'surface-neutral/90 backdrop-blur-md border-theme-neutral/20',
    solid: 'surface-neutral border-theme-neutral/20',
  };

  return (
    <div
      className={cn(
        'border-t transition-all duration-300 ease-in-out',
        autoHide && !isVisible && 'opacity-0 pointer-events-none',
        autoHide && isVisible && 'opacity-100 pointer-events-auto',
        sticky && 'fixed right-0 z-40',
        sticky && 'left-0 md:left-64',
        sticky && 'w-full md:w-[calc(100%-16rem)]', // サイドバー幅（16rem = 256px）を考慮
        sticky && 'bottom-16 md:bottom-0', // スマホでは下部ナビゲーション分（64px）のマージン、デスクトップでは通常のbottom-0
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
                size={action.size || 'default'}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={cn(
                  'text-base font-medium w-full transition-colors',
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
 * ActionBar用Sentinelコンポーネント
 * ページ下部の操作ボタンエリアをマークする
 * ActionBarはこの要素の可視状態を監視して自動表示制御する
 *
 * @example
 * <ActionBarSentinel>
 *   <Button onClick={handleSave}>保存</Button>
 * </ActionBarSentinel>
 */
export function ActionBarSentinel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-action-bar-sentinel="true" className={cn('w-full', className)}>
      {children}
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
