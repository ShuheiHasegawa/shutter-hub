/**
 * 📚 Button Component - 用途別バリアント使用ガイド
 *
 * 🎯 用途別バリアント（操作の重要度で使い分け）:
 *
 * ✅ CTA（最重要操作）- ページ内1つまで推奨
 *   <Button variant="cta">撮影会を作成</Button>
 *   <Button variant="cta">今すぐ予約</Button>
 *
 * ✅ Action（重要操作）- ページ内2-3つまで推奨
 *   <Button variant="action">次へ</Button>
 *   <Button variant="action">送信</Button>
 *   <Button variant="action">検索</Button>
 *
 * ✅ Navigation（通常操作）- 制限なし
 *   <Button variant="navigation">戻る</Button>
 *   <Button variant="navigation">キャンセル</Button>
 *   <Button variant="navigation">編集</Button>
 *
 * 🎨 テーマ対応バリアント:
 *   <Button variant="primary">プライマリ</Button>
 *   <Button variant="accent">アクセント</Button>
 *   <Button variant="neutral">ニュートラル</Button>
 *
 * 🔧 Shadcn/ui標準バリアント:
 *   <Button variant="destructive">削除</Button>
 *   <Button variant="outline">アウトライン</Button>
 *   <Button variant="secondary">セカンダリ</Button>
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // 🎨 統合バリアント（テーマ対応・推奨）
        default: 'surface-primary hover:brightness-110 hover:scale-[1.02]',
        primary: 'surface-primary hover:brightness-110 hover:scale-[1.02]',
        accent: 'surface-accent hover:brightness-110 hover:scale-[1.02]',
        neutral: 'surface-neutral hover:brightness-110 hover:scale-[1.02]',

        // 🎯 用途別バリアント（操作の重要度で使い分け）
        cta: 'surface-cta hover:brightness-110 hover:scale-[1.02] font-semibold shadow-lg', // 最重要操作（ページ内1つまで）- 主要アクション
        action: 'surface-action hover:brightness-110 hover:scale-[1.02]', // 重要操作（2-3つまで）- サブアクション
        navigation: 'surface-navigation hover:brightness-105', // 通常操作（制限なし）- 移動・戻る

        // 🔧 Shadcn/ui標準バリアント（既存システム維持）
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',

        // 🎨 ブランド色バリアント（固定色・機能別）
        'brand-success':
          'bg-brand-success text-white hover:bg-brand-success/90 shadow-sm',
        'brand-warning':
          'bg-brand-warning text-black hover:bg-brand-warning/90 shadow-sm',
        'brand-error':
          'bg-brand-error text-white hover:bg-brand-error/90 shadow-sm',
        'brand-info':
          'bg-brand-info text-white hover:bg-brand-info/90 shadow-sm',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
