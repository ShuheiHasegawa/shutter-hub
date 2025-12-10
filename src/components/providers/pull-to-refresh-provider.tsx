'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { useRouter } from 'next/navigation';

interface PullToRefreshContextType {
  isRefreshing: boolean;
  pullProgress: number;
  triggerRefresh: () => Promise<void>;
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const touchStartScrollTop = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      // リフレッシュ中は無視
      if (isRefreshing) return;

      // スクロール位置を確認（ページ最上部のときのみ）
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      touchStartScrollTop.current = scrollTop;

      if (scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    },
    [isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      // スクロールが始まったらプルをキャンセル
      if (scrollTop > 0) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY.current;

      if (diff > 0) {
        // 上方向へのスクロールを防止
        e.preventDefault();
        // 抵抗を適用
        const distance = Math.min(diff / RESISTANCE, PULL_THRESHOLD * 1.5);
        setPullDistance(distance);
      } else {
        setPullDistance(0);
      }
    },
    [isRefreshing]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, triggerRefresh]);

  useEffect(() => {
    const options: AddEventListenerOptions = { passive: false };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, options);
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <PullToRefreshContext.Provider
      value={{ isRefreshing, pullProgress, triggerRefresh }}
    >
      <div ref={containerRef} className="relative min-h-screen">
        {/* プルインジケーター */}
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

        {/* メインコンテンツ */}
        <div
          className="transition-transform duration-200 ease-out"
          style={{
            transform:
              pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
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
