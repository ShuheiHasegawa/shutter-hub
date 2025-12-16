'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StickyHeaderProps {
  /**
   * ヘッダー内に表示するコンテンツ
   */
  children: ReactNode;
  /**
   * 追加のCSSクラス名
   */
  className?: string;
  /**
   * z-indexの値（デフォルト: 30）
   */
  zIndex?: number;
  /**
   * 背景スタイルの種類
   * - blur: ぼかし効果付き背景（デフォルト）
   * - solid: 不透明な背景
   * - transparent: 透明な背景
   */
  background?: 'blur' | 'solid' | 'transparent';
  /**
   * 下部ボーダーの表示（デフォルト: true）
   */
  border?: boolean;
  /**
   * パディングのサイズ（デフォルト: 'md'）
   */
  padding?: 'sm' | 'md' | 'lg';
}

/**
 * スクロール時に上部に固定されるヘッダーコンポーネント
 *
 * 使用例:
 * ```tsx
 * <StickyHeader>
 *   <div className="flex justify-between items-center">
 *     <h2>タイトル</h2>
 *     <Button>アクション</Button>
 *   </div>
 * </StickyHeader>
 * ```
 */
export function StickyHeader({
  children,
  className,
  zIndex = 30,
  background = 'blur',
  border = true,
  padding = 'md',
}: StickyHeaderProps) {
  // 背景スタイルのクラス
  const backgroundClasses = {
    blur: 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
    solid: 'bg-background',
    transparent: 'bg-transparent',
  };

  // パディングのクラス
  const paddingClasses = {
    sm: 'py-1',
    md: 'py-2',
    lg: 'py-4',
  };

  return (
    <div
      className={cn(
        'flex-shrink-0 sticky top-0',
        backgroundClasses[background],
        border && 'border-b',
        paddingClasses[padding],
        className
      )}
      style={{ zIndex }}
    >
      {children}
    </div>
  );
}
