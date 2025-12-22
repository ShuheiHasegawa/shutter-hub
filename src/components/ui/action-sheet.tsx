'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useBottomNavigationStore } from '@/stores/bottom-navigation-store';

export interface ActionButton {
  id: string;
  label: string;
  variant?:
    | 'default'
    | 'primary'
    | 'accent'
    | 'neutral'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'cta'
    | 'action'
    | 'navigation';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
}

interface ActionSheetProps {
  trigger: ReactNode;
  title?: string;
  description?: string;
  actions: ActionButton[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  maxColumns?: 1 | 2 | 3;
  className?: string;
  contentClassName?: string;
}

/**
 * 共通アクションシートコンポーネント
 *
 * Shadcn/uiのBottomシートを使用して、等間隔の列表示でアクションボタンを表示する
 * プロフィール編集、撮影会詳細などの画面で共通利用可能
 */
export function ActionSheet({
  trigger,
  title,
  description,
  actions,
  open,
  onOpenChange,
  maxColumns = 2,
  className,
  contentClassName,
}: ActionSheetProps) {
  const isBottomNavVisible = useBottomNavigationStore(state => state.isVisible);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className={cn(
          'max-h-[80vh] rounded-t-[10px] bg-background border-border',
          // ボトムナビゲーション表示時のみpb-safeを適用
          isBottomNavVisible ? 'pb-safe' : 'pb-4',
          contentClassName
        )}
      >
        {(title || description) && (
          <SheetHeader className="text-center pb-4">
            {title && (
              <SheetTitle className="text-lg font-semibold text-foreground">
                {title}
              </SheetTitle>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-2">
                {description}
              </p>
            )}
          </SheetHeader>
        )}

        <div
          className={cn(
            'grid gap-3',
            // ボトムナビゲーション表示時のみpb-safeを適用
            isBottomNavVisible ? 'pb-safe' : 'pb-4',
            maxColumns === 1 && 'grid-cols-1',
            maxColumns === 2 && 'grid-cols-2',
            maxColumns === 3 && 'grid-cols-3',
            className
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
                'w-full h-12 text-base font-medium transition-colors',
                action.className
              )}
            >
              {action.loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-current">処理中...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {action.icon}
                  <span className="text-current">{action.label}</span>
                </div>
              )}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
