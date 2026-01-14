'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useBottomNavigationStore } from '@/stores/bottom-navigation-store';

interface MobileFilterSheetProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onReset: () => void;
  onApply: () => void;
  resetLabel?: string;
  applyLabel?: string;
  floatButtonLabel?: string;
  className?: string;
}

/**
 * モバイル用フィルターシートコンポーネント
 * 画面右下にフロートボタンを表示し、タップで下からスライドインするフィルターカードを表示する
 */
export function MobileFilterSheet({
  title,
  subtitle,
  children,
  onReset,
  onApply,
  resetLabel,
  applyLabel,
  floatButtonLabel,
  className,
}: MobileFilterSheetProps) {
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const isVisible = useBottomNavigationStore(state => state.isVisible);

  const handleApply = () => {
    onApply();
    setIsOpen(false);
  };

  const handleReset = () => {
    onReset();
  };

  return (
    <>
      {/* フロートボタン */}
      <button
        onClick={() => setIsOpen(true)}
        data-testid="mobile-filter-button"
        className={cn(
          'fixed right-6 w-12 h-12 bg-surface-neutral text-surface-primary-foreground rounded-full shadow-2xl hover:scale-110 z-50 flex flex-col items-center justify-center',
          'transition-transform duration-300 ease-in-out',
          isVisible ? 'translate-y-0' : 'translate-y-full',
          className
        )}
        aria-label={floatButtonLabel || t('filter')}
        style={{
          bottom: '5rem',
          transform: isVisible
            ? 'translateY(0)'
            : 'translateY(calc(100% + 5rem))',
        }}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>

      {/* ボトムシート */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] p-0 flex flex-col overflow-hidden border-none"
          style={{ borderRadius: '24px 24px 0 0' }}
        >
          {/* ヘッダー部分 */}
          <SheetHeader>
            <SheetTitle className="px-4 pt-4 text-xl font-bold text-left">
              {title}
            </SheetTitle>
            {subtitle && (
              <SheetDescription className="px-4 text-sm mt-1 text-surface-primary-foreground/80 text-left">
                {subtitle}
              </SheetDescription>
            )}
          </SheetHeader>

          <Separator />

          {/* フィルターコンテンツ部分 */}
          <div className="flex-1 overflow-y-auto px-4 space-y-6">
            {children}
          </div>

          {/* フッター部分 */}
          <div className="sticky bottom-0 bg-background border-t border-border p-4 flex gap-3">
            <Button
              onClick={handleReset}
              data-testid="mobile-filter-reset"
              variant="outline"
              className="flex-1 py-3 rounded-full font-semibold whitespace-nowrap"
            >
              {resetLabel || t('clear')}
            </Button>
            <Button
              onClick={handleApply}
              data-testid="mobile-filter-apply"
              variant="neutral"
              className="flex-1 py-3 rounded-full font-semibold whitespace-nowrap"
            >
              {applyLabel || t('search')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
