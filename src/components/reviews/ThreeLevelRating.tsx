'use client';

import { useState } from 'react';
import { ThumbsUp, Minus, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RatingLevel = 'good' | 'normal' | 'bad' | null;

interface ThreeLevelRatingProps {
  value: RatingLevel;
  onChange: (value: RatingLevel) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 3段階評価コンポーネント（良い、普通、悪い）
 * メルカリ風のUIを実装
 */
export function ThreeLevelRating({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  size = 'md',
}: ThreeLevelRatingProps) {
  const [hoveredValue, setHoveredValue] = useState<RatingLevel>(null);

  const sizeClasses = {
    sm: {
      button: 'px-3 py-2 text-sm',
      icon: 'h-4 w-4',
      gap: 'gap-2',
    },
    md: {
      button: 'px-4 py-3 text-base',
      icon: 'h-5 w-5',
      gap: 'gap-3',
    },
    lg: {
      button: 'px-6 py-4 text-lg',
      icon: 'h-6 w-6',
      gap: 'gap-4',
    },
  };

  const currentSize = sizeClasses[size];

  const options: Array<{
    value: RatingLevel;
    label: string;
    icon: React.ReactNode;
    colorClasses: {
      selected: string;
      hover: string;
      border: string;
    };
  }> = [
    {
      value: 'good',
      label: '良い',
      icon: <ThumbsUp className={currentSize.icon} />,
      colorClasses: {
        selected:
          'bg-primary/10 border-primary border-[3px] text-primary dark:bg-primary/20 dark:border-primary dark:text-primary shadow-md ring-2 ring-primary/20 dark:ring-primary/30',
        hover:
          'hover:bg-primary/5 hover:border-primary/50 hover:text-primary/80 dark:hover:bg-primary/10 dark:hover:border-primary/70',
        border: 'border-border',
      },
    },
    {
      value: 'normal',
      label: '普通',
      icon: <Minus className={currentSize.icon} />,
      colorClasses: {
        selected:
          'bg-primary/10 border-primary border-[3px] text-primary dark:bg-primary/20 dark:border-primary dark:text-primary shadow-md ring-2 ring-primary/20 dark:ring-primary/30',
        hover:
          'hover:bg-primary/5 hover:border-primary/50 hover:text-primary/80 dark:hover:bg-primary/10 dark:hover:border-primary/70',
        border: 'border-border',
      },
    },
    {
      value: 'bad',
      label: '悪い',
      icon: <ThumbsDown className={currentSize.icon} />,
      colorClasses: {
        selected:
          'bg-primary/10 border-primary border-[3px] text-primary dark:bg-primary/20 dark:border-primary dark:text-primary shadow-md ring-2 ring-primary/20 dark:ring-primary/30',
        hover:
          'hover:bg-primary/5 hover:border-primary/50 hover:text-primary/80 dark:hover:bg-primary/10 dark:hover:border-primary/70',
        border: 'border-border',
      },
    },
  ];

  const handleClick = (optionValue: RatingLevel) => {
    if (disabled) return;
    // 同じ値をクリックした場合は選択解除
    if (value === optionValue) {
      onChange(null);
    } else {
      onChange(optionValue);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={cn('flex', currentSize.gap)}>
        {options.map(option => {
          const isSelected = value === option.value;
          const isHovered = hoveredValue === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleClick(option.value)}
              onMouseEnter={() => !disabled && setHoveredValue(option.value)}
              onMouseLeave={() => setHoveredValue(null)}
              disabled={disabled}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200',
                currentSize.button,
                disabled && 'opacity-50 cursor-not-allowed',
                isSelected
                  ? option.colorClasses.selected
                  : cn(
                      'border-2',
                      option.colorClasses.border,
                      'bg-background text-muted-foreground',
                      !disabled && option.colorClasses.hover
                    ),
                isHovered && !isSelected && !disabled && 'scale-105'
              )}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
