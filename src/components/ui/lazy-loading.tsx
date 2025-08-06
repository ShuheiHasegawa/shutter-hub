/**
 * 遅延読み込み・Intersection Observer コンポーネント
 * パフォーマンス最適化のための高度な遅延読み込み
 */

'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Logger from '@/lib/logger';

export interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  fallback?: ReactNode;
  className?: string;
  onIntersect?: () => void;
  onLoad?: () => void;
  delay?: number;
}

/**
 * 汎用遅延読み込みコンポーネント
 */
export function LazyLoad({
  children,
  threshold = 0.1,
  rootMargin = '50px',
  once = true,
  fallback,
  className,
  onIntersect,
  onLoad,
  delay = 0,
}: {
  children: ReactNode;
} & LazyLoadOptions) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (delay > 0) {
              setTimeout(() => {
                setIsIntersecting(true);
                onIntersect?.();
              }, delay);
            } else {
              setIsIntersecting(true);
              onIntersect?.();
            }

            if (once) {
              observer.unobserve(element);
            }
          } else if (!once) {
            setIsIntersecting(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, once, onIntersect, delay]);

  useEffect(() => {
    if (isIntersecting && !isLoaded) {
      const timer = setTimeout(() => {
        setIsLoaded(true);
        onLoad?.();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isIntersecting, isLoaded, onLoad]);

  return (
    <div ref={elementRef} className={cn('relative', className)}>
      {isIntersecting ? (
        <div
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        >
          {children}
        </div>
      ) : (
        fallback || <LazyLoadSkeleton />
      )}
    </div>
  );
}

/**
 * 画像専用遅延読み込みコンポーネント
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  onLoad,
  onError,
  ...options
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
} & LazyLoadOptions) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleImageError = () => {
    setImageError(true);
    onError?.();
    Logger.warning('LazyImage load error', {
      component: 'lazy-loading',
      action: 'image-load-error',
      src,
    });
  };

  return (
    <LazyLoad
      {...options}
      className={className}
      fallback={
        <Skeleton
          className={cn('w-full', height ? `h-[${height}px]` : 'h-48')}
        />
      }
    >
      <div className="relative">
        {!imageLoaded && !imageError && (
          <Skeleton
            className={cn(
              'absolute inset-0 z-10',
              height ? `h-[${height}px]` : 'h-48'
            )}
          />
        )}

        {imageError ? (
          <div
            className={cn(
              'flex items-center justify-center bg-gray-100 text-gray-500',
              height ? `h-[${height}px]` : 'h-48'
            )}
          >
            <span>画像を読み込めませんでした</span>
          </div>
        ) : (
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={cn(
              'transition-opacity duration-300',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        )}
      </div>
    </LazyLoad>
  );
}

/**
 * ギャラリー用遅延読み込みコンポーネント
 */
export function LazyGalleryGrid<T = unknown>({
  items,
  renderItem,
  columns = 3,
  gap = 4,
  className,
  onItemLoad,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
  onItemLoad?: (index: number) => void;
}) {
  const [_loadedItems, _setLoadedItems] = useState<Set<number>>(new Set());

  const handleItemLoad = (index: number) => {
    _setLoadedItems(prev => new Set(prev).add(index));
    onItemLoad?.(index);
  };

  return (
    <div
      className={cn('grid', `grid-cols-${columns}`, `gap-${gap}`, className)}
    >
      {items.map((item, index) => (
        <LazyLoad
          key={index}
          threshold={0.1}
          rootMargin="100px"
          once={true}
          onLoad={() => handleItemLoad(index)}
          fallback={<Skeleton className="aspect-square w-full" />}
        >
          {renderItem(item, index)}
        </LazyLoad>
      ))}
    </div>
  );
}

/**
 * 無限スクロール用コンポーネント
 */
export function InfiniteScroll({
  hasMore,
  loadMore,
  loading,
  children,
  threshold = 0.1,
  rootMargin = '100px',
}: {
  hasMore: boolean;
  loadMore: () => void;
  loading: boolean;
  children: ReactNode;
  threshold?: number;
  rootMargin?: string;
}) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasMore, loading, loadMore, threshold, rootMargin]);

  return (
    <>
      {children}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="h-8" />
          )}
        </div>
      )}
    </>
  );
}

/**
 * デフォルトのスケルトンコンポーネント
 */
function LazyLoadSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

/**
 * Progressive Loading Hook
 */
export function useProgressiveLoading<T>(
  items: T[],
  batchSize: number = 10,
  delay: number = 100
) {
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex >= items.length) return;

    const timer = setTimeout(() => {
      const nextBatch = items.slice(currentIndex, currentIndex + batchSize);

      setVisibleItems(prev => [...prev, ...nextBatch]);
      setCurrentIndex(prev => prev + batchSize);
    }, delay);

    return () => clearTimeout(timer);
  }, [items, currentIndex, batchSize, delay]);

  const reset = () => {
    setVisibleItems([]);
    setCurrentIndex(0);
  };

  return {
    visibleItems,
    hasMore: currentIndex < items.length,
    reset,
  };
}

const lazyLoadingComponents = {
  LazyLoad,
  LazyImage,
  LazyGalleryGrid,
  InfiniteScroll,
  useProgressiveLoading,
};

export default lazyLoadingComponents;
