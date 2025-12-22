'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Camera,
  Calendar,
  MessageCircle,
  Hash,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import { logger } from '@/lib/utils/logger';
import { useBottomNavigationStore } from '@/stores/bottom-navigation-store';

export function BottomNavigation() {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const isVisible = useBottomNavigationStore(state => state.isVisible);
  const setIsVisible = useBottomNavigationStore(state => state.setIsVisible);
  const lastScrollY = useRef(0);
  const scrollThreshold = 10; // スクロール検知の閾値（px）

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let timeoutId: NodeJS.Timeout | undefined;
    let scrollContainerRef: Element | null = null;

    // DOMが構築されるまで待つ関数
    const setupScrollListener = () => {
      logger.debug('[BottomNavigation] setupScrollListener called', {
        component: 'BottomNavigation',
        function: 'setupScrollListener',
      });

      // 前のリスナーを削除
      if (cleanup) {
        logger.debug('[BottomNavigation] Removing previous listener', {
          component: 'BottomNavigation',
          function: 'setupScrollListener',
        });
        cleanup();
        cleanup = undefined;
      }

      // 複数のセレクターを試す
      const selectors = [
        'main.overflow-y-auto',
        'main[class*="overflow"]',
        'main',
      ];

      let scrollContainer: Element | null = null;
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          // スクロール可能かチェック（overflow-y-autoまたはscrollHeight > clientHeight）
          const style = getComputedStyle(element);
          const hasScroll =
            style.overflowY === 'auto' ||
            style.overflowY === 'scroll' ||
            element.scrollHeight > element.clientHeight;

          logger.debug('[BottomNavigation] Checking scroll container', {
            component: 'BottomNavigation',
            selector,
            overflowY: style.overflowY,
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
            hasScroll,
          });

          // main要素の場合は、スクロール可能かに関わらず使用
          if (hasScroll || selector === 'main') {
            scrollContainer = element;
            scrollContainerRef = element;
            logger.info('[BottomNavigation] Scroll container found', {
              component: 'BottomNavigation',
              selector,
              tagName: element.tagName,
            });
            break;
          }
        }
      }

      if (!scrollContainer) {
        logger.warn(
          '[BottomNavigation] Scroll container not found, using window',
          {
            component: 'BottomNavigation',
            function: 'setupScrollListener',
          }
        );
        // フォールバック: windowのスクロールを監視
        const handleWindowScroll = () => {
          const currentScrollY = window.scrollY;
          const scrollDifference = currentScrollY - lastScrollY.current;

          logger.debug('[BottomNavigation] Window scroll event', {
            component: 'BottomNavigation',
            currentScrollY,
            scrollDifference,
            threshold: scrollThreshold,
            isVisible: currentScrollY < 100,
          });

          if (Math.abs(scrollDifference) > scrollThreshold) {
            if (scrollDifference > 0) {
              setIsVisible(false);
            } else {
              setIsVisible(true);
            }
            lastScrollY.current = currentScrollY;
          }

          if (currentScrollY < 100) {
            setIsVisible(true);
          }
        };

        window.addEventListener('scroll', handleWindowScroll, {
          passive: true,
        });
        cleanup = () =>
          window.removeEventListener('scroll', handleWindowScroll);
        logger.info('[BottomNavigation] Window scroll listener added', {
          component: 'BottomNavigation',
        });
        return;
      }

      // メインコンテナのスクロールを監視
      const handleScroll = () => {
        if (!scrollContainerRef) return;

        const currentScrollY = scrollContainerRef.scrollTop;
        const scrollDifference = currentScrollY - lastScrollY.current;

        logger.debug('[BottomNavigation] Container scroll event', {
          component: 'BottomNavigation',
          currentScrollY,
          scrollDifference,
          threshold: scrollThreshold,
          isVisible: currentScrollY < 100,
        });

        // スクロール量が閾値を超えた場合のみ処理
        if (Math.abs(scrollDifference) > scrollThreshold) {
          const shouldShow = scrollDifference < 0;
          const currentVisible = useBottomNavigationStore.getState().isVisible;
          if (currentVisible !== shouldShow) {
            logger.debug(
              `[BottomNavigation] State changed: ${currentVisible ? 'visible' : 'hidden'} -> ${shouldShow ? 'visible' : 'hidden'}`,
              {
                component: 'BottomNavigation',
                scrollDifference,
                currentScrollY,
              }
            );
          }
          setIsVisible(shouldShow);
          lastScrollY.current = currentScrollY;
        }

        // ページトップ付近では常に表示
        if (currentScrollY < 100) {
          const currentVisible = useBottomNavigationStore.getState().isVisible;
          if (!currentVisible) {
            logger.debug(
              '[BottomNavigation] State changed: hidden -> visible (near top)',
              {
                component: 'BottomNavigation',
                currentScrollY,
              }
            );
          }
          setIsVisible(true);
        }
      };

      scrollContainer.addEventListener('scroll', handleScroll, {
        passive: true,
      });
      cleanup = () => {
        if (scrollContainerRef) {
          scrollContainerRef.removeEventListener('scroll', handleScroll);
        }
      };
      logger.info('[BottomNavigation] Container scroll listener added', {
        component: 'BottomNavigation',
        tagName: scrollContainer.tagName,
        className: scrollContainer.className,
      });
    };

    // DOM構築を待つ（複数の方法を試す）
    if (typeof window !== 'undefined') {
      logger.debug('[BottomNavigation] useEffect running', {
        component: 'BottomNavigation',
        readyState: document.readyState,
      });

      // 即座に試行（DOMが既に構築されている場合）
      setupScrollListener();

      // DOM構築を待つ
      const handleLoad = () => {
        logger.debug('[BottomNavigation] Load event fired', {
          component: 'BottomNavigation',
        });
        setupScrollListener();
      };

      window.addEventListener('load', handleLoad, { once: true });

      // 念のため、少し遅延も入れる
      timeoutId = setTimeout(() => {
        logger.debug('[BottomNavigation] Timeout fired, retrying setup', {
          component: 'BottomNavigation',
        });
        setupScrollListener();
      }, 300);

      return () => {
        logger.debug('[BottomNavigation] Cleanup called', {
          component: 'BottomNavigation',
        });
        window.removeEventListener('load', handleLoad);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (cleanup) {
          cleanup();
        }
        scrollContainerRef = null;
      };
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, [scrollThreshold, setIsVisible]);

  const navigationItems = [
    {
      icon: LayoutDashboard,
      label: t('dashboard'),
      href: '/dashboard',
      key: 'dashboard',
    },
    {
      icon: Camera,
      label: t('photoSessions'),
      href: '/photo-sessions',
      key: 'photoSessions',
    },
    {
      icon: Calendar,
      label: t('bookings'),
      href: '/bookings',
      key: 'bookings',
    },
    {
      icon: MessageCircle,
      label: t('messages'),
      href: '/messages',
      key: 'messages',
    },
    {
      icon: Hash,
      label: t('timeline'),
      href: '/timeline',
      key: 'timeline',
    },
  ];

  // 状態変更をログに記録
  useEffect(() => {
    logger.debug('[BottomNavigation] Visibility state changed', {
      component: 'BottomNavigation',
      isVisible,
      className: isVisible ? 'translate-y-0' : 'translate-y-full',
    });
  }, [isVisible]);

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden',
        'transition-transform duration-300 ease-in-out',
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
      style={{
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
      }}
    >
      <div className="grid grid-cols-5 h-16">
        {navigationItems.map(item => {
          const Icon = item.icon;
          // ロケールプレフィックスを考慮したパスマッチング
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + '/') ||
            (item.href !== '/' && pathname.endsWith(item.href));

          return (
            <Link
              key={item.key}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              href={item.href as any}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 transition-colors min-w-0',
                isActive
                  ? 'text-shutter-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isActive && 'text-shutter-primary'
                )}
              />
              <span className="text-[10px] font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
