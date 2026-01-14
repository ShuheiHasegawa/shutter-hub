'use client';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VariantProps } from 'class-variance-authority';
import { useRouter } from 'next/navigation';

interface ClickableTextProps {
  /**
   * 表示するテキスト
   */
  children: React.ReactNode;
  /**
   * クリック時の遷移先URL（内部リンク）
   */
  href?: string;
  /**
   * クリック時のコールバック関数（hrefより優先）
   */
  onClick?: () => void;
  /**
   * Buttonコンポーネントのバリアント（デザイン指定）
   * @default 'navigation'
   */
  variant?: VariantProps<typeof buttonVariants>['variant'];
  /**
   * サイズ
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * 追加のクラス名
   */
  className?: string;
  /**
   * 外部リンクかどうか
   * @default false
   */
  external?: boolean;
}

const sizeClasses = {
  sm: {
    text: 'text-sm',
    padding: 'px-3 py-2',
  },
  md: {
    text: 'text-base',
    padding: 'px-4 py-4',
  },
  lg: {
    text: 'text-lg',
    padding: 'px-5 py-5',
  },
};

/**
 * クリック可能なテキストコンポーネント
 *
 * Buttonコンポーネントと同じデザインシステムを使用し、
 * テキストのみを表示する汎用的なクリック可能な要素です。
 *
 * @example
 * ```tsx
 * // 基本的な使用例
 * <ClickableText href="/studios/123">スタジオ名</ClickableText>
 *
 * // バリアント指定
 * <ClickableText href="/profile/123" variant="primary">ユーザー名</ClickableText>
 *
 * // コールバック使用
 * <ClickableText onClick={() => handleClick()}>クリック</ClickableText>
 * ```
 */
export function ClickableText({
  children,
  href,
  onClick,
  variant = 'navigation',
  size = 'md',
  className,
  external = false,
}: ClickableTextProps) {
  const router = useRouter();

  const currentSize = sizeClasses[size];

  // Buttonコンポーネントのバリアントスタイルを取得（variantのみ適用）
  const buttonVariantClasses = buttonVariants({ variant, size: undefined });

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (href) {
      if (external) {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        router.push(href);
      }
    }
  };

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-all duration-200',
        'cursor-pointer',
        'hover:shadow-md',
        'active-overlay',
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'focus-visible:ring-offset-2',
        currentSize.text,
        currentSize.padding,
        // Buttonコンポーネントのバリアントスタイルを適用
        buttonVariantClasses,
        className
      )}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
