'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hover?: boolean; // hover効果のON/OFF
  }
>(({ className, hover = true, onClick, children, ...props }, ref) => {
  const [isActive, setIsActive] = React.useState(false);
  const deactivateTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleActivate = () => {
    if (onClick) {
      // 既存のタイマーをクリア（重複防止）
      if (deactivateTimerRef.current) {
        clearTimeout(deactivateTimerRef.current);
        deactivateTimerRef.current = null;
      }
      setIsActive(true);
    }
  };

  const handleDeactivate = () => {
    // 既存のタイマーをクリア
    if (deactivateTimerRef.current) {
      clearTimeout(deactivateTimerRef.current);
    }
    // 150ms後にオーバーレイを解除
    deactivateTimerRef.current = setTimeout(() => {
      setIsActive(false);
      deactivateTimerRef.current = null;
    }, 150);
  };

  // クリーンアップ
  React.useEffect(() => {
    return () => {
      if (deactivateTimerRef.current) {
        clearTimeout(deactivateTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        hover && 'hover:shadow-lg transition-shadow duration-300',
        onClick && 'cursor-pointer',
        'relative',
        onClick && 'active-overlay',
        onClick && isActive && 'active',
        className
      )}
      onClick={onClick}
      onMouseDown={handleActivate}
      onMouseUp={handleDeactivate}
      onMouseLeave={handleDeactivate}
      onTouchStart={handleActivate}
      onTouchEnd={handleDeactivate}
      onTouchCancel={handleDeactivate}
      {...props}
    >
      {children}
    </div>
  );
});
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-4', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-2 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-2 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
