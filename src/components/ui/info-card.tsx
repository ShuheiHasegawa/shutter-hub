import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InfoCardProps {
  title: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'secondary' | 'warning';
  children: React.ReactNode;
  className?: string;
}

export function InfoCard({
  title,
  icon: Icon,
  variant = 'default',
  children,
  className = '',
}: InfoCardProps) {
  const variantStyles = {
    default: {
      header: 'surface-neutral',
      iconBg: 'surface-primary',
    },
    primary: {
      header: 'surface-primary',
      iconBg: 'surface-accent',
    },
    secondary: {
      header: 'bg-secondary/20',
      iconBg: 'bg-secondary',
    },
    warning: {
      header: 'bg-warning/10',
      iconBg: 'bg-warning/20',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={`surface-neutral rounded-2xl overflow-hidden border ${className}`}
    >
      <div className={`${styles.header} px-6 py-4 border-b`}>
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 flex items-center justify-center ${styles.iconBg} rounded-lg`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold">{title}</h2>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

interface InfoCardItemProps {
  label: string;
  value: string | React.ReactNode;
  icon?: LucideIcon;
  subValue?: string;
  className?: string;
}

export function InfoCardItem({
  label,
  value,
  icon: Icon,
  subValue,
  className = '',
}: InfoCardItemProps) {
  return (
    <div className={className}>
      <div className="text-xs sm:text-sm opacity-70 mb-1 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </div>
      <div className="font-medium text-sm sm:text-base">{value}</div>
      {subValue && (
        <div className="text-xs sm:text-sm opacity-70 mt-1">{subValue}</div>
      )}
    </div>
  );
}
