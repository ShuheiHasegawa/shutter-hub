'use client';

import React from 'react';
import {
  MapPinIcon,
  UsersIcon,
  CurrencyYenIcon,
  StarIcon,
  TruckIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { StudioWithStats } from '@/types/database';
import { FormattedPrice } from '@/components/ui/formatted-display';
import { FavoriteHeartButton } from '@/components/ui/favorite-heart-button';

interface StudioMobileListCardProps {
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

export function StudioMobileListCard({
  studio,
  onSelect,
  isSelected = false,
  showSelection = false,
  favoriteState,
  onFavoriteToggle,
}: StudioMobileListCardProps) {
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

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarIconSolid key={i} className="w-3 h-3 text-yellow-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <StarIcon className="w-3 h-3 text-theme-text-muted" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <StarIconSolid className="w-3 h-3 text-yellow-400" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <StarIcon key={i} className="w-3 h-3 text-theme-text-muted" />
        );
      }
    }

    return stars;
  };

  return (
    <div
      className={`block bg-white dark:bg-gray-900 rounded-lg shadow-sm hover:shadow-md transition-all p-4 border border-gray-200 dark:border-gray-800 active-overlay cursor-pointer ${
        isSelected ? 'ring-2 ring-theme-primary' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
            {studio.name}
          </h3>
          {studio.prefecture && (
            <div className="mb-1">
              <Badge className="bg-theme-primary text-xs">
                {tPrefecture(studio.prefecture)}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 ml-2">
          {showSelection ? (
            <div
              className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
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
              variant="ghost"
              iconOnly
              initialState={
                favoriteState
                  ? {
                      isFavorited: favoriteState.isFavorited,
                      favoriteCount: favoriteState.favoriteCount,
                      isAuthenticated: favoriteState.isAuthenticated,
                    }
                  : {
                      isFavorited: false,
                      favoriteCount: 0,
                      isAuthenticated: false,
                    }
              }
              onToggle={onFavoriteToggle}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300 mb-3">
        <div className="flex items-center gap-1">
          <MapPinIcon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{studio.address}</span>
        </div>
        <div className="flex items-center gap-1">
          <UsersIcon className="w-4 h-4 flex-shrink-0" />
          <span>{t('maxCapacity', { count: studio.max_capacity || '-' })}</span>
        </div>
        <div className="flex items-center gap-1">
          <CurrencyYenIcon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            {studio.hourly_rate_min && studio.hourly_rate_max ? (
              <>
                <FormattedPrice
                  value={studio.hourly_rate_min}
                  format="simple"
                />{' '}
                -{' '}
                <FormattedPrice
                  value={studio.hourly_rate_max}
                  format="simple"
                />
              </>
            ) : studio.hourly_rate_min ? (
              <>
                <FormattedPrice
                  value={studio.hourly_rate_min}
                  format="simple"
                />
                ～
              </>
            ) : (
              t('priceNegotiable')
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {studio.evaluation_count > 0 ? (
            <>
              <div className="flex">{renderStars(studio.average_rating)}</div>
              <span className="text-xs">
                {studio.average_rating.toFixed(1)} ({studio.evaluation_count})
              </span>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">-</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
          {studio.parking_available && (
            <div className="flex items-center gap-1">
              <TruckIcon className="w-4 h-4 flex-shrink-0" />
              <span className="sr-only">{t('parking')}</span>
            </div>
          )}
          {studio.wifi_available && (
            <div className="flex items-center gap-1">
              <WifiIcon className="w-4 h-4 flex-shrink-0" />
              <span className="sr-only">{t('wifi')}</span>
            </div>
          )}
          {!studio.parking_available && !studio.wifi_available && (
            <span className="text-gray-500 dark:text-gray-400">-</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{t('photoCount', { count: studio.photo_count })}</span>
          <span>{t('equipmentCount', { count: studio.equipment_count })}</span>
        </div>
      </div>
    </div>
  );
}
