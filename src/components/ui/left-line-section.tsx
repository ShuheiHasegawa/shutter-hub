import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface LeftLineSectionProps {
  children: ReactNode;
  className?: string;
  title?: string;
  titleClassName?: string;
}

/**
 * NavLinkのvariant="sideline"のdivバージョン
 * 左側にコンテンツの高さに合わせたグラデーション線を表示するコンテナ
 */
export function LeftLineSection({
  children,
  className,
  title,
  titleClassName,
}: LeftLineSectionProps) {
  return (
    <div
      className={cn(
        'relative px-4 py-3 rounded-lg transition-colors',
        'before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5',
        'before:bg-brand-primary',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        className
      )}
    >
      {title && (
        <h3
          className={cn(
            'text-base font-semibold mb-3 text-gray-900 dark:text-gray-100',
            titleClassName
          )}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

/**
 * アイコン付きのLeftLineSection
 */
interface LeftLineSectionWithIconProps extends LeftLineSectionProps {
  icon?: ReactNode;
  iconClassName?: string;
}

export function LeftLineSectionWithIcon({
  children,
  className,
  title,
  titleClassName,
  icon,
  iconClassName,
}: LeftLineSectionWithIconProps) {
  return (
    <LeftLineSection className={className} titleClassName={titleClassName}>
      {title && (
        <h3
          className={cn(
            'text-base font-semibold mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2',
            titleClassName
          )}
        >
          {icon && (
            <span className={cn('flex-shrink-0', iconClassName)}>{icon}</span>
          )}
          {title}
        </h3>
      )}
      <div className="space-y-3">{children}</div>
    </LeftLineSection>
  );
}

/**
 * カラーバリアント付きのLeftLineSection
 */
interface ColoredLeftLineSectionProps extends LeftLineSectionProps {
  variant?: 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'red';
  icon?: ReactNode;
}

const variantStyles = {
  default: {
    line: 'before:bg-brand-primary',
    hover: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
    icon: 'text-brand-primary',
  },
  blue: {
    line: 'before:bg-blue-500',
    hover: 'hover:bg-blue-50 dark:hover:bg-blue-950/20',
    icon: 'text-blue-600',
  },
  green: {
    line: 'before:bg-green-500',
    hover: 'hover:bg-green-50 dark:hover:bg-green-950/20',
    icon: 'text-green-600',
  },
  purple: {
    line: 'before:bg-purple-500',
    hover: 'hover:bg-purple-50 dark:hover:bg-purple-950/20',
    icon: 'text-purple-600',
  },
  orange: {
    line: 'before:bg-orange-500',
    hover: 'hover:bg-orange-50 dark:hover:bg-orange-950/20',
    icon: 'text-orange-600',
  },
  red: {
    line: 'before:bg-red-500',
    hover: 'hover:bg-red-50 dark:hover:bg-red-950/20',
    icon: 'text-red-600',
  },
};

export function ColoredLeftLineSection({
  children,
  className,
  title,
  titleClassName,
  variant = 'default',
  icon,
}: ColoredLeftLineSectionProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'relative px-4 py-3 rounded-lg transition-colors',
        'before:absolute before:left-1 before:top-1 before:bottom-1 before:w-0.5',
        styles.line,
        styles.hover,
        className
      )}
    >
      {title && (
        <h3
          className={cn(
            'text-base font-semibold mb-3 flex items-center gap-2',
            titleClassName
          )}
        >
          {icon && (
            <span className={cn('h-4 w-4 flex-shrink-0', styles.icon)}>
              {icon}
            </span>
          )}
          {title}
        </h3>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
}
