'use client';

import { useState, useEffect } from 'react';
import { PageTitleHeader } from './page-title-header';
import { StickyHeader } from './sticky-header';
import type { BackButtonProps } from './back-button';

interface PageTitleHeaderScrollAwareProps {
  /** デフォルトのタイトル */
  defaultTitle: string;
  /** スクロール後のタイトル */
  scrolledTitle: string;
  /** タイトル切り替えのスクロール閾値（px）*/
  scrollThreshold?: number;
  /** その他のPageTitleHeaderプロパティ */
  description?: string;
  icon?: React.ReactNode;
  backButton?: BackButtonProps;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * スクロール位置に応じてタイトルを動的に変更するPageTitleHeader
 *
 * 使用例:
 * ```tsx
 * <PageTitleHeaderScrollAware
 *   defaultTitle="スタジオ詳細"
 *   scrolledTitle={studio.name}
 *   scrollThreshold={150}
 *   backButton={{ href: '/studios', variant: 'ghost' }}
 *   actions={<Button>編集</Button>}
 * />
 * ```
 */
export function PageTitleHeaderScrollAware({
  defaultTitle,
  scrolledTitle,
  scrollThreshold = 80,
  description,
  icon,
  backButton,
  actions,
  className,
}: PageTitleHeaderScrollAwareProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(defaultTitle);

  useEffect(() => {
    // メインコンテンツのスクロールコンテナを取得
    const scrollContainer = document.querySelector('main');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollY = scrollContainer.scrollTop;
      const shouldShowScrolledTitle = scrollY > scrollThreshold;

      if (shouldShowScrolledTitle !== isScrolled) {
        setIsScrolled(shouldShowScrolledTitle);
        setCurrentTitle(shouldShowScrolledTitle ? scrolledTitle : defaultTitle);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isScrolled, scrollThreshold, defaultTitle, scrolledTitle]);

  return (
    <StickyHeader>
      <PageTitleHeader
        title={currentTitle}
        description={!isScrolled ? description : undefined}
        icon={icon}
        backButton={backButton}
        actions={actions}
        className={className}
      />
    </StickyHeader>
  );
}
