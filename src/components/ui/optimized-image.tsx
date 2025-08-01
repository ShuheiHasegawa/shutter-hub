/**
 * 最適化されたNext.js Imageコンポーネント
 * フォトブック対応・レスポンシブ・パフォーマンス重視
 */

'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  getOptimizedImageUrl,
  generateSizesAttribute,
} from '@/lib/image-optimization';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  category?: 'profile' | 'photoSession' | 'photobook' | 'social';
  quality?: 'web' | 'print' | 'thumbnail';
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fill?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  showErrorState?: boolean;
  showLoadingState?: boolean;
  errorFallback?: React.ReactNode;
}

/**
 * 最適化画像コンポーネント
 */
export function OptimizedImage({
  src,
  alt,
  category = 'photoSession',
  quality = 'web',
  className,
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  fill = false,
  sizes,
  width,
  height,
  objectFit = 'cover',
  loading = 'lazy',
  onLoad,
  onError,
  showErrorState = true,
  showLoadingState = true,
  errorFallback,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // 最適化されたURL生成（エラー時は元のsrcを使用）
  let optimizedSrc: string;
  try {
    optimizedSrc = getOptimizedImageUrl(src, quality, category);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Image optimization failed, using original URL:', error);
    optimizedSrc = src;
  }

  // sizes属性生成（カスタムまたは自動生成）
  const sizesAttr = sizes || generateSizesAttribute(category);

  // デフォルトのblurDataURL生成
  const defaultBlurDataURL = blurDataURL || generateBlurDataURL();

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // エラー状態の表示
  if (hasError && showErrorState) {
    if (errorFallback) {
      return <>{errorFallback}</>;
    }

    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-800',
          !fill && 'min-h-[200px]',
          fill && 'absolute inset-0',
          className
        )}
      >
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <AlertCircle className="w-8 h-8" />
          <span className="text-sm">画像を読み込めませんでした</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', !fill && 'inline-block', className)}>
      {/* ローディング状態 */}
      {isLoading && showLoadingState && (
        <div className={cn('absolute inset-0 z-10', !fill && 'w-full h-full')}>
          <Skeleton className="w-full h-full" />
        </div>
      )}

      <Image
        src={optimizedSrc}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        priority={priority}
        loading={priority ? 'eager' : loading}
        placeholder={placeholder}
        blurDataURL={placeholder === 'blur' ? defaultBlurDataURL : undefined}
        sizes={sizesAttr}
        className={cn(
          'transition-opacity duration-300',
          isLoading && 'opacity-0',
          !isLoading && 'opacity-100',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          objectFit === 'scale-down' && 'object-scale-down'
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
}

/**
 * フォトブック専用高画質画像コンポーネント
 */
export function PhotobookImage({
  src,
  alt,
  showPrintQuality = false,
  ...props
}: OptimizedImageProps & {
  showPrintQuality?: boolean;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      category="photobook"
      quality={showPrintQuality ? 'print' : 'web'}
      priority={showPrintQuality}
      placeholder="blur"
      {...props}
    />
  );
}

/**
 * プロフィール画像コンポーネント
 */
export function ProfileImage({
  src,
  alt,
  size = 'medium',
  ...props
}: OptimizedImageProps & {
  size?: 'small' | 'medium' | 'large';
}) {
  const sizeMap = {
    small: { width: 40, height: 40 },
    medium: { width: 80, height: 80 },
    large: { width: 120, height: 120 },
  };

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      category="profile"
      quality="web"
      width={sizeMap[size].width}
      height={sizeMap[size].height}
      objectFit="cover"
      className="rounded-full"
      {...props}
    />
  );
}

/**
 * 撮影会画像ギャラリー用コンポーネント
 */
export function GalleryImage({
  src,
  alt,
  aspectRatio = 'square',
  ...props
}: OptimizedImageProps & {
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'auto';
}) {
  const aspectRatioClasses = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
    auto: '',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        aspectRatioClasses[aspectRatio]
      )}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        category="photoSession"
        quality="web"
        fill
        objectFit="cover"
        loading="lazy"
        {...props}
      />
    </div>
  );
}

/**
 * ソーシャル投稿用画像コンポーネント
 */
export function SocialImage({ src, alt, ...props }: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      category="social"
      quality="web"
      objectFit="cover"
      loading="lazy"
      className="rounded-lg"
      {...props}
    />
  );
}

/**
 * デフォルトのblurDataURL生成
 */
function generateBlurDataURL(): string {
  return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
}

/**
 * 画像プリロード関数
 */
export function preloadImage(
  src: string, 
  category?: 'profile' | 'photoSession' | 'photobook' | 'social'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const optimizedSrc = category
      ? getOptimizedImageUrl(src, 'web', category)
      : src;

    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload: ${optimizedSrc}`));
    img.src = optimizedSrc;
  });
}

export default OptimizedImage;
