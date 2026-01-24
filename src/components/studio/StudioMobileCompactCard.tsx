'use client';

import React from 'react';
import { MapPinIcon, UsersIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { StudioWithStats } from '@/types/database';
import { FormattedPrice } from '@/components/ui/formatted-display';
import { FavoriteHeartButton } from '@/components/ui/favorite-heart-button';
import { EmptyImage } from '@/components/ui/empty-image';
import { Building2 } from 'lucide-react';
import { getDefaultFavoriteState } from '@/lib/utils/favorite';
import { getStudioImageUrl, getStudioImageAlt } from '@/lib/utils/studio';

interface StudioMobileCompactCardProps {
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

export function StudioMobileCompactCard({
  studio,
  onSelect,
  isSelected = false,
  showSelection = false,
  favoriteState,
  onFavoriteToggle,
}: StudioMobileCompactCardProps) {
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
    <div
      className={`flex gap-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-800 cursor-pointer ${
        isSelected ? 'ring-2 ring-theme-primary' : ''
      }`}
      onClick={handleClick}
    >
      {/* 画像セクション */}
      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
        <EmptyImage
          src={getStudioImageUrl(studio)}
          alt={getStudioImageAlt(studio)}
          fallbackIcon={Building2}
          fallbackIconSize="sm"
          fill
          className="object-cover"
        />
        {/* 都道府県バッジ */}
        {studio.prefecture && (
          <div className="absolute top-1 left-1">
            <Badge className="bg-theme-primary text-xs">
              {tPrefecture(studio.prefecture)}
            </Badge>
          </div>
        )}
      </div>

      {/* コンテンツセクション */}
      <div className="flex-1 min-w-0 py-2">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
          {studio.name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 mb-1">
          <MapPinIcon className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{studio.address}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 mb-2">
          <UsersIcon className="w-3 h-3 flex-shrink-0" />
          <span>{t('maxCapacity', { count: studio.max_capacity || '-' })}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-primary font-bold text-sm">
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
      </div>

      {/* 選択チェックボックスまたはお気に入りボタン */}
      <div className="flex-shrink-0">
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
            initialState={getDefaultFavoriteState(favoriteState)}
            onToggle={onFavoriteToggle}
          />
        )}
      </div>
    </div>
  );
}
