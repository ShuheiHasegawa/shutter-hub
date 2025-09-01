'use client';

import { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
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
}

export function BackButton({
  href,
  onClick,
  variant = 'ghost',
  size = 'default',
  className,
  ariaLabel,
}: BackButtonProps) {
  const t = useTranslations('common');

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

  // hrefが指定された場合はLinkとして動作
  if (href) {
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

  // hrefもonClickも指定されていない場合はエラー
  throw new Error(
    'BackButton: href または onClick のいずれかを指定してください'
  );
}

// アイコンのみのバージョン（よりコンパクト）
export function BackButtonIcon({
  href,
  onClick,
  variant = 'ghost',
  className,
  ariaLabel,
}: Omit<BackButtonProps, 'size'>) {
  const t = useTranslations('common');

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

  // hrefが指定された場合はLinkとして動作
  if (href) {
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

  // hrefもonClickも指定されていない場合はエラー
  throw new Error(
    'BackButtonIcon: href または onClick のいずれかを指定してください'
  );
}
