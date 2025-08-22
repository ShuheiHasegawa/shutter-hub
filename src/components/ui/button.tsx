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
      size: 'default',
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
