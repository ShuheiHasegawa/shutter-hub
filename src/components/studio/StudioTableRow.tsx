'use client';

import React from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { EmptyImage } from '@/components/ui/empty-image';
import { Building2 } from 'lucide-react';
import { StudioWithStats } from '@/types/database';
import { FavoriteHeartButton } from '@/components/ui/favorite-heart-button';
import { FormattedPrice } from '@/components/ui/formatted-display';
import { StarRating } from '@/components/ui/star-rating';
import { Badge } from '@/components/ui/badge';
import { getDefaultFavoriteState } from '@/lib/utils/favorite';
import { getStudioImageUrl, getStudioImageAlt } from '@/lib/utils/studio';

interface StudioTableRowProps {
  studio: StudioWithStats;
  onSelect?: (studio: StudioWithStats) => void;
  isSelected?: boolean;
  showSelection?: boolean;
  favoriteState?: {
    isFavorited: boolean;
    favoriteCount: number;
    isAuthenticated: boolean;
  };
  onFavoriteToggle?: (isFavorited: boolean, favoriteCount: number) => void;
}

export function StudioTableRow({
  studio,
  onSelect,
  isSelected = false,
  showSelection = false,
  favoriteState,
  onFavoriteToggle,
}: StudioTableRowProps) {
  const router = useRouter();
  const t = useTranslations('studio.card');
  const tPrefecture = useTranslations('prefecture');

  const handleClick = () => {
    if (onSelect) {
      onSelect(studio);
    } else {
      router.push(`/studios/${studio.id}`);
    }
  };

  return (
    <tr
      data-testid={`studio-table-row-${studio.id}`}
      className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
        onSelect ? 'cursor-pointer' : ''
      } ${isSelected ? 'bg-theme-primary/10' : ''}`}
      onClick={handleClick}
    >
      {/* スタジオ名 */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 relative">
            <EmptyImage
              src={getStudioImageUrl(studio)}
              alt={getStudioImageAlt(studio)}
              fallbackIcon={Building2}
              fallbackIconSize="sm"
              fill
              className="object-cover object-center"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
              {studio.name}
            </div>
          </div>
        </div>
      </td>

      {/* 住所 */}
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1 max-w-[200px]">
          {studio.prefecture && (
            <Badge className="bg-theme-primary text-xs w-fit">
              {tPrefecture(studio.prefecture)}
            </Badge>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
            <MapPinIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{studio.address}</span>
          </div>
        </div>
      </td>

      {/* 料金 */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-white">
          {studio.hourly_rate_min && studio.hourly_rate_max ? (
            <>
              <FormattedPrice value={studio.hourly_rate_min} format="simple" />{' '}
              -{' '}
              <FormattedPrice value={studio.hourly_rate_max} format="simple" />
            </>
          ) : studio.hourly_rate_min ? (
            <>
              <FormattedPrice value={studio.hourly_rate_min} format="simple" />{' '}
              ～
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">
              {t('priceNegotiable')}
            </span>
          )}
        </div>
      </td>

      {/* 評価 */}
      <td className="px-6 py-4 whitespace-nowrap">
        {studio.evaluation_count > 0 ? (
          <div className="flex items-center gap-2">
            <StarRating rating={studio.average_rating} size="md" />
            <div className="text-sm text-gray-900 dark:text-white">
              {studio.average_rating.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ({studio.evaluation_count})
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
        )}
      </td>

      {/* アクション */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        {showSelection ? (
          <div
            className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto ${
              isSelected
                ? 'bg-theme-primary border-theme-primary'
                : 'bg-theme-background border-theme-neutral/40'
            }`}
          >
            {isSelected && '✓'}
          </div>
        ) : (
          <FavoriteHeartButton
            favoriteType="studio"
            favoriteId={studio.id}
            size="sm"
            position="inline"
            variant="outline"
            iconOnly
            initialState={getDefaultFavoriteState(favoriteState)}
            onToggle={onFavoriteToggle}
          />
        )}
      </td>
    </tr>
  );
}
