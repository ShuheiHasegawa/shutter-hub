'use client';

import React, { useState, useEffect } from 'react';
import Image, { type ImageProps } from 'next/image';
import { Image as ImageIcon, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  /** 画像URL */
  src?: string | null;
  /** alt属性 */
  alt: string;
  /** フォールバックアイコン（デフォルト: Image） */
  fallbackIcon?: LucideIcon;
  /** フォールバック時のアイコンサイズ（デフォルト: 'md'） */
  fallbackIconSize?: 'sm' | 'md' | 'lg' | 'xl';
  /** フォールバック時のグラデーション方向（デフォルト: 'br'） */
  fallbackGradient?: 'br' | 'bl' | 'tr' | 'tl' | 'r' | 'l' | 't' | 'b';
  /** カスタムクラス名 */
  className?: string;
}

/**
 * 統一的な画像フォールバックコンポーネント
 * 画像がない場合またはエラー時にアイコン + グラデーション背景を表示
 */
export function EmptyImage({
  src,
  alt,
  fallbackIcon: FallbackIcon = ImageIcon,
  fallbackIconSize = 'md',
  fallbackGradient = 'br',
  fill,
  width,
  height,
  className,
  ...props
}: EmptyImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // srcが変更された場合、状態をリセット
  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      setHasError(false);
    } else {
      setIsLoading(true);
      setHasError(false);
    }
  }, [src]);

  // 画像がない場合またはエラー時はフォールバックを表示
  const showFallback = !src || hasError;

  // アイコンサイズのマッピング
  const iconSizeMap = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  // グラデーション方向のマッピング
  const gradientMap = {
    br: 'bg-gradient-to-br',
    bl: 'bg-gradient-to-bl',
    tr: 'bg-gradient-to-tr',
    tl: 'bg-gradient-to-tl',
    r: 'bg-gradient-to-r',
    l: 'bg-gradient-to-l',
    t: 'bg-gradient-to-t',
    b: 'bg-gradient-to-b',
  };

  // フォールバック表示
  if (showFallback) {
    const containerClasses = cn(
      'relative flex items-center justify-center',
      fill ? 'absolute inset-0' : '',
      'bg-gradient-to-br from-theme-primary/10 to-theme-accent/10 dark:from-theme-primary/20 dark:to-theme-accent/20',
      gradientMap[fallbackGradient],
      className
    );

    const iconClasses = cn(
      iconSizeMap[fallbackIconSize],
      'text-theme-text-muted opacity-40'
    );

    if (fill) {
      return (
        <div className={containerClasses}>
          <FallbackIcon className={iconClasses} aria-hidden="true" />
          <span className="sr-only">{alt}</span>
        </div>
      );
    }

    return (
      <div
        className={containerClasses}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        <FallbackIcon className={iconClasses} aria-hidden="true" />
      </div>
    );
  }

  // 画像がある場合は通常のImageコンポーネントを表示
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      className={cn(
        'transition-opacity duration-300',
        isLoading && 'opacity-0',
        !isLoading && 'opacity-100',
        className
      )}
      onLoad={() => setIsLoading(false)}
      onError={() => {
        setIsLoading(false);
        setHasError(true);
      }}
      {...props}
    />
  );
}
