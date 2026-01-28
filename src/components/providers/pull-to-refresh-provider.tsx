'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface PullToRefreshContextType {
  isRefreshing: boolean;
  pullProgress: number;
  triggerRefresh: () => Promise<void>;
  setDisabled: (disabled: boolean) => void;
}

const PullToRefreshContext = createContext<PullToRefreshContextType | null>(
  null
);

const PULL_THRESHOLD = 80; // ピクセル数でリフレッシュをトリガー
const RESISTANCE = 2.5; // プルするときの抵抗

export function PullToRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isDisabledByHook, setIsDisabledByHook] = useState(false);
  const touchStartY = useRef(0);
  const touchStartScrollTop = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // publicページ（ログイン不要なページ）でPull-to-Refreshを無効化
  const isPublicPage =
    pathname === '/ja' ||
    pathname === '/en' ||
    pathname?.startsWith('/ja/instant') ||
    pathname?.startsWith('/en/instant') ||
    pathname === '/' ||
    pathname?.match(/^\/(ja|en)\/?$/);

  // フックによる無効化も考慮
  const isDisabled = isPublicPage || isDisabledByHook;

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      // ルーターをリフレッシュして画面を再読み込み
      router.refresh();
      // UIの更新を待つ
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [isRefreshing, router]);

  const getScrollTop = useCallback(() => {
    if (typeof window === 'undefined') return 0;

    // メインコンテンツ要素を探す (AuthenticatedLayout用)
    const mainElement = document.querySelector('main');
    if (mainElement) {
      const styles = window.getComputedStyle(mainElement);
      if (styles.overflowY === 'auto' || styles.overflowY === 'scroll') {
        return mainElement.scrollTop;
      }
    }
    return window.scrollY || document.documentElement.scrollTop;
  }, []);

  const isAtTop = useCallback(() => {
    const scrollTop = getScrollTop();
    // スクロール位置が最上部（5px以内の誤差を許容）
    return scrollTop <= 5;
  }, [getScrollTop]);

  const isAtBottom = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const mainElement = document.querySelector('main');
    if (mainElement) {
      const styles = window.getComputedStyle(mainElement);
      if (styles.overflowY === 'auto' || styles.overflowY === 'scroll') {
        const { scrollTop, scrollHeight, clientHeight } = mainElement;
        // スクロール位置が最下部（5px以内の誤差を許容）
        return scrollTop + clientHeight >= scrollHeight - 5;
      }
    }

    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    return scrollTop + clientHeight >= scrollHeight - 5;
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      // 無効化されている場合はPull-to-Refreshを無効化
      if (isDisabled) return;

      // リフレッシュ中は無視
      if (isRefreshing) return;

      // スクロール位置を確認（ページ最上部のときのみ）
      const scrollTop = getScrollTop();
      touchStartScrollTop.current = scrollTop;

      // 最上部にいる場合のみPull-to-refreshを有効化
      // 最下部にいる場合は無効化（上スクロール時の干渉を防ぐ）
      if (isAtTop() && !isAtBottom()) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      } else {
        isPulling.current = false;
      }
    },
    [isRefreshing, getScrollTop, isAtTop, isAtBottom, isDisabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      // 無効化されている場合はPull-to-Refreshを無効化
      if (isDisabled) return;

      if (!isPulling.current || isRefreshing) return;

      const scrollTop = getScrollTop();
      const currentScrollTop = scrollTop;

      // スクロールが始まったらプルをキャンセル
      // または最下部にいる場合はプルをキャンセル（上スクロール時の干渉を防ぐ）
      if (currentScrollTop > 5 || isAtBottom()) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY.current;

      // 下方向へのタッチ（上方向へのスクロール）のみPull-to-refreshを有効化
      if (diff > 0 && currentScrollTop <= 5) {
        // 上方向へのスクロールを防止
        e.preventDefault();
        // 抵抗を適用
        const distance = Math.min(diff / RESISTANCE, PULL_THRESHOLD * 1.5);
        setPullDistance(distance);
      } else {
        // 上方向へのタッチ（下方向へのスクロール）の場合はプルをキャンセル
        isPulling.current = false;
        setPullDistance(0);
      }
    },
    [isRefreshing, getScrollTop, isAtBottom, isDisabled]
  );

  const handleTouchEnd = useCallback(() => {
    // 無効化されている場合はPull-to-Refreshを無効化
    if (isDisabled) return;

    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, triggerRefresh, isDisabled]);

  useEffect(() => {
    // 無効化されている場合はイベントリスナーを登録しない
    if (isDisabled) return;

    const options: AddEventListenerOptions = { passive: false };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, options);
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isDisabled]);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <PullToRefreshContext.Provider
      value={{
        isRefreshing,
        pullProgress,
        triggerRefresh,
        setDisabled: setIsDisabledByHook,
      }}
    >
      <div ref={containerRef} className="relative min-h-screen">
        {/* プルインジケーター（無効化されている場合は非表示） */}
        {!isDisabled && (
          <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out"
            style={{
              transform: `translateY(${pullDistance - 50}px)`,
              opacity: pullProgress,
            }}
          >
            <div
              className={`
              flex items-center justify-center w-10 h-10 rounded-full 
              bg-background border border-border shadow-lg
              ${isRefreshing ? 'animate-spin' : ''}
            `}
              style={{
                transform: isRefreshing
                  ? undefined
                  : `rotate(${pullProgress * 360}deg)`,
              }}
            >
              <svg
                className="w-5 h-5 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isRefreshing ? (
                  // ローディングスピナー
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                ) : (
                  // 矢印アイコン
                  <>
                    <path d="M12 3v15" />
                    <path d="m19 12-7 7-7-7" />
                  </>
                )}
              </svg>
            </div>
          </div>
        )}

        {/* メインコンテンツ */}
        <div
          className="transition-transform duration-200 ease-out"
          style={{
            transform:
              !isDisabled && pullDistance > 0
                ? `translateY(${pullDistance}px)`
                : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </PullToRefreshContext.Provider>
  );
}

export function usePullToRefresh() {
  const context = useContext(PullToRefreshContext);
  if (!context) {
    throw new Error(
      'usePullToRefresh must be used within a PullToRefreshProvider'
    );
  }
  return context;
}

/**
 * Pull-to-Refreshを無効化するフック
 * ページコンポーネント内で呼び出すとそのページではPull-to-Refreshが無効になる
 */
export function usePullToRefreshDisabled() {
  const context = useContext(PullToRefreshContext);

  useEffect(() => {
    if (!context) return;

    context.setDisabled(true);
    return () => {
      context.setDisabled(false);
    };
  }, [context]);
}
