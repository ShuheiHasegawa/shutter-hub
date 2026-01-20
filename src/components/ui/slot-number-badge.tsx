import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const slotNumberBadgeVariants = cva(
  'flex items-center justify-center surface-accent rounded-lg font-bold',
  {
    variants: {
      size: {
        small: 'w-8 h-8 text-lg',
        medium: 'w-12 h-12 text-2xl',
        large: 'w-16 h-16 text-3xl',
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  }
);

export interface SlotNumberBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof slotNumberBadgeVariants> {
  slotNumber: number;
}

/**
 * 枠番号を視覚的に強調表示するコンポーネント
 * 予約確認画面と同じデザイン言語を使用する
 */
function SlotNumberBadge({
  slotNumber,
  size,
  className,
  ...props
}: SlotNumberBadgeProps) {
  return (
    <div
      className={cn(slotNumberBadgeVariants({ size }), className)}
      {...props}
    >
      <span>{slotNumber}</span>
    </div>
  );
}

export { SlotNumberBadge, slotNumberBadgeVariants };
