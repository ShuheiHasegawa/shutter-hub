'use client';

import { ReactNode } from 'react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

// 型安全性のためのHref型
type Href = Parameters<typeof Link>[0]['href'];

interface NavLinkProps {
  href: Href;
  children: ReactNode;
  className?: string;
  variant?: 'underline' | 'sideline';
  isActive?: boolean;
}

export function NavLink({
  href,
  children,
  className,
  variant = 'underline',
  isActive = false,
}: NavLinkProps) {
  const baseClasses =
    'relative inline-flex items-center gap-2 text-sm font-medium transition-all duration-300';

  const variantClasses = {
    // アンダーライン型
    underline: cn(
      'text-muted-foreground hover:text-foreground px-4 py-2',
      'after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5',
      'after:bg-brand-primary',
      'after:transform after:scale-x-0 after:origin-left after:transition-transform after:duration-300 after:ease-out',
      'hover:after:scale-x-100',
      // アクティブ状態
      isActive && 'text-foreground after:scale-x-100'
    ),

    // サイドライン型（短い左線・中央寄せ）
    sideline: cn(
      'text-muted-foreground hover:text-foreground px-4 py-1 rounded-lg',
      'before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-4',
      'before:bg-brand-primary',
      'before:transform before:scale-y-0 before:origin-center before:transition-transform before:duration-300 before:ease-out before:rounded-full',
      'hover:before:scale-y-100 hover:bg-muted/30',
      // アクティブ状態
      isActive && 'text-foreground before:scale-y-100 bg-muted/30'
    ),
  };

  return (
    <Link
      href={href}
      className={cn(baseClasses, variantClasses[variant], className)}
    >
      {children}
    </Link>
  );
}
