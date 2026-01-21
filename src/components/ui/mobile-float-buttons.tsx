'use client';

import { ScrollToTopButton } from './scroll-to-top-button';
import { MobileFilterSheet } from './mobile-filter-sheet';

interface MobileFloatButtonsProps {
  // MobileFilterSheetのprops
  filterTitle: string;
  filterSubtitle?: string;
  filterChildren: React.ReactNode;
  onFilterReset: () => void;
  onFilterApply: () => void;
  filterResetLabel?: string;
  filterApplyLabel?: string;
  filterFloatButtonLabel?: string;
  // ScrollToTopButtonのprops
  scrollToTopLabel?: string;
  showScrollToTop?: boolean;
}

/**
 * モバイル用フロートボタン群コンポーネント
 * トップに戻るボタンとフィルターボタンをまとめて配置する
 */
export function MobileFloatButtons({
  filterTitle,
  filterSubtitle,
  filterChildren,
  onFilterReset,
  onFilterApply,
  filterResetLabel,
  filterApplyLabel,
  filterFloatButtonLabel,
  scrollToTopLabel,
  showScrollToTop = true,
}: MobileFloatButtonsProps) {
  return (
    <>
      {showScrollToTop && <ScrollToTopButton aria-label={scrollToTopLabel} />}
      <MobileFilterSheet
        title={filterTitle}
        subtitle={filterSubtitle}
        onReset={onFilterReset}
        onApply={onFilterApply}
        resetLabel={filterResetLabel}
        applyLabel={filterApplyLabel}
        floatButtonLabel={filterFloatButtonLabel}
      >
        {filterChildren}
      </MobileFilterSheet>
    </>
  );
}
