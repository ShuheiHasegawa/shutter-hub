'use client';

import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const toggleVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
        outline:
          'border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ToggleProps
  extends React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>,
    VariantProps<typeof toggleVariants> {}

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  ToggleProps
>(({ className, variant, size, pressed, style, ...props }, ref) => {
  const [isPressed, setIsPressed] = React.useState(pressed);

  // pressedプロップの変更を監視
  React.useEffect(() => {
    setIsPressed(pressed);
  }, [pressed]);

  // pressedがtrueの場合、デザインシステムのsurface-accentカラーをインラインスタイルで適用
  const activeStyle = isPressed
    ? {
        backgroundColor: 'hsl(var(--surface-accent))',
        color: 'hsl(var(--surface-accent-text))',
        borderColor: 'hsl(var(--surface-accent))',
        ...style,
      }
    : style;

  return (
    <TogglePrimitive.Root
      ref={ref}
      pressed={pressed}
      style={activeStyle}
      className={cn(
        toggleVariants({ variant, size }),
        // 選択時のスタイル（data-[state=on]セレクタでデザインシステムのsurface-accentカラーを適用）
        'data-[state=on]:bg-surface-accent data-[state=on]:text-surface-accent-text data-[state=on]:border-surface-accent data-[state=on]:shadow-md data-[state=on]:hover:bg-surface-accent/90',
        className
      )}
      {...props}
    />
  );
});

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
