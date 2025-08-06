import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // 標準shadcn/uiバリアント（既存システム）
        default:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',

        // テーマ対応バリアント（新規追加）
        'theme-primary':
          'bg-theme-primary text-theme-primary-foreground shadow-sm hover:bg-theme-primary/90 hover:shadow-md transition-colors duration-150',
        'theme-secondary':
          'bg-theme-secondary text-theme-secondary-foreground shadow-sm hover:bg-theme-secondary/90 hover:shadow-md transition-colors duration-150',
        'theme-accent':
          'bg-theme-accent text-theme-accent-foreground shadow-sm hover:bg-theme-accent/90 hover:shadow-md transition-colors duration-150',
        'theme-neutral':
          'bg-theme-neutral text-theme-neutral-foreground shadow-sm hover:bg-theme-neutral/90 hover:shadow-md transition-colors duration-150',
        'theme-outline':
          'border border-theme-primary bg-transparent text-theme-text-primary hover:bg-theme-primary/5 hover:border-theme-primary transition-colors duration-150',
        'theme-ghost':
          'text-theme-text-primary hover:bg-theme-primary/5 hover:text-theme-primary transition-colors duration-150',
        'theme-link':
          'text-theme-primary underline-offset-4 hover:underline hover:text-theme-primary/80 transition-colors duration-150',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
      colorMode: {
        standard: '', // デフォルト（shadcn/ui色）
        theme: '', // テーマ色（自動でテーマバリアントを使用）
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      colorMode: 'standard',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * 自動的にテーマバリアントを選択するヘルパー関数
 */
const getThemeVariant = (
  variant: string | undefined,
  colorMode: string | undefined
): string => {
  if (colorMode !== 'theme') return variant || 'default';

  const themeMap: Record<string, string> = {
    default: 'theme-primary',
    primary: 'theme-primary',
    secondary: 'theme-secondary',
    accent: 'theme-accent',
    destructive: 'theme-accent', // テーマのアクセント色を使用
    outline: 'theme-outline',
    ghost: 'theme-ghost',
    link: 'theme-link',
  };

  return themeMap[variant || 'default'] || 'theme-primary';
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, colorMode, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const finalVariant = getThemeVariant(
      variant || 'default',
      colorMode || 'standard'
    );

    return (
      <Comp
        className={cn(
          buttonVariants({
            variant: finalVariant as ButtonProps['variant'],
            size,
            className,
          })
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
