'use client';

import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * 星評価を表示するコンポーネント
 * 0.5刻みの評価に対応し、半星を表示する
 */
export function StarRating({
  rating,
  size = 'sm',
  className = '',
}: StarRatingProps) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  // サイズに応じたクラス名を決定
  const iconSizeClass = size === 'md' ? 'w-4 h-4' : 'w-3 h-3 md:w-4 md:h-4'; // smの場合はレスポンシブ

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <StarIconSolid
          key={i}
          className={`${iconSizeClass} text-yellow-400 ${className}`}
        />
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <div key={i} className="relative">
          <StarIcon
            className={`${iconSizeClass} text-theme-text-muted ${className}`}
          />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <StarIconSolid
              className={`${iconSizeClass} text-yellow-400 ${className}`}
            />
          </div>
        </div>
      );
    } else {
      stars.push(
        <StarIcon
          key={i}
          className={`${iconSizeClass} text-theme-text-muted ${className}`}
        />
      );
    }
  }

  return <div className="flex">{stars}</div>;
}
