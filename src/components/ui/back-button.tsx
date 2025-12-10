'use client';

import { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface BackButtonProps {
  href?: ComponentProps<typeof Link>['href'];
  onClick?: () => void;
  variant?:
    | 'default'
    | 'ghost'
    | 'outline'
    | 'secondary'
    | 'destructive'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  ariaLabel?: string; // カスタムaria-labelを指定可能
  useHistoryBack?: boolean; // trueの場合、hrefが指定されていてもrouter.back()を使用
}

export function BackButton({
  href,
  onClick,
  variant = 'ghost',
  size = 'default',
  className,
  ariaLabel,
  useHistoryBack = false,
}: BackButtonProps) {
  const t = useTranslations('common');
  const router = useRouter();

  // デフォルトのaria-labelは多言語化された「戻る」を使用
  const defaultAriaLabel = t('back');
  const finalAriaLabel = ariaLabel || defaultAriaLabel;

  // onClickが指定された場合は通常のButtonとして動作
  if (onClick) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn('gap-2', className)}
        onClick={onClick}
        aria-label={finalAriaLabel}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">{finalAriaLabel}</span>
      </Button>
    );
  }

  // useHistoryBackがtrueまたはhrefが指定されていない場合はrouter.back()を使用
  if (useHistoryBack || !href) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn('gap-2', className)}
        onClick={() => router.back()}
        aria-label={finalAriaLabel}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">{finalAriaLabel}</span>
      </Button>
    );
  }

  // hrefが指定された場合はLinkとして動作
  return (
    <Button
      variant={variant}
      size={size}
      className={cn('gap-2', className)}
      asChild
      aria-label={finalAriaLabel}
    >
      <Link href={href}>
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">{finalAriaLabel}</span>
      </Link>
    </Button>
  );
}

// アイコンのみのバージョン（よりコンパクト）
export function BackButtonIcon({
  href,
  onClick,
  variant = 'ghost',
  className,
  ariaLabel,
  useHistoryBack = false,
}: Omit<BackButtonProps, 'size'>) {
  const t = useTranslations('common');
  const router = useRouter();

  const defaultAriaLabel = t('back');
  const finalAriaLabel = ariaLabel || defaultAriaLabel;

  // onClickが指定された場合は通常のButtonとして動作
  if (onClick) {
    return (
      <Button
        variant={variant}
        size="icon"
        className={cn(className)}
        onClick={onClick}
        aria-label={finalAriaLabel}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">{finalAriaLabel}</span>
      </Button>
    );
  }

  // useHistoryBackがtrueまたはhrefが指定されていない場合はrouter.back()を使用
  if (useHistoryBack || !href) {
    return (
      <Button
        variant={variant}
        size="icon"
        className={cn(className)}
        onClick={() => router.back()}
        aria-label={finalAriaLabel}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">{finalAriaLabel}</span>
      </Button>
    );
  }

  // hrefが指定された場合はLinkとして動作
  return (
    <Button
      variant={variant}
      size="icon"
      className={cn(className)}
      asChild
      aria-label={finalAriaLabel}
    >
      <Link href={href}>
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">{finalAriaLabel}</span>
      </Link>
    </Button>
  );
}
