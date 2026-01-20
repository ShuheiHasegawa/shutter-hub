'use client';

import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBottomNavigationStore } from '@/stores/bottom-navigation-store';

interface ScrollToTopButtonProps {
  className?: string;
  'aria-label'?: string;
}

/**
 * モバイル用トップに戻るボタンコンポーネント
 * 画面右下にフロートボタンを表示し、タップでページトップへスムーズスクロールする
 */
export function ScrollToTopButton({
  className,
  'aria-label': ariaLabel = 'ページトップに戻る',
}: ScrollToTopButtonProps) {
  const isVisible = useBottomNavigationStore(state => state.isVisible);

  const scrollToTop = () => {
    // スクロール可能なコンテナを探す
    const selectors = ['main', '.overflow-y-auto', '[data-scroll-container]'];

    let scrollContainer: Element | null = null;
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const style = getComputedStyle(element);
        const hasScroll =
          style.overflowY === 'auto' ||
          style.overflowY === 'scroll' ||
          element.scrollHeight > element.clientHeight;

        if (hasScroll || selector === 'main') {
          scrollContainer = element;
          break;
        }
      }
    }

    // スクロールコンテナが見つかった場合はそれをスクロール、なければwindowをスクロール
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <button
      onClick={scrollToTop}
      data-testid="scroll-to-top-button"
      className={cn(
        'fixed right-6 w-12 h-12 bg-surface-neutral text-surface-primary-foreground rounded-full shadow-2xl hover:scale-110 z-50 flex items-center justify-center',
        'transition-transform duration-300 ease-in-out',
        className
      )}
      aria-label={ariaLabel}
      style={{
        bottom: '9rem', // フィルターボタンの上（5rem + 4rem）
        transform: isVisible
          ? 'translateY(0)'
          : 'translateY(calc(100% + 9rem))',
      }}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
