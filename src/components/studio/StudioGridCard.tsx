'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPinIcon,
  UsersIcon,
  CurrencyYenIcon,
  TruckIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';
import { Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { EmptyImage } from '@/components/ui/empty-image';
import { StudioWithStats } from '@/types/database';
import { CardFavoriteButton } from '@/components/ui/favorite-heart-button';
import { FormattedPrice } from '@/components/ui/formatted-display';
import { StarRating } from '@/components/ui/star-rating';
import { getDefaultFavoriteState } from '@/lib/utils/favorite';
import { getStudioImageUrl, getStudioImageAlt } from '@/lib/utils/studio';

interface StudioGridCardProps {
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

export function StudioGridCard({
  studio,
  onSelect,
  isSelected = false,
  showSelection = false,
  favoriteState,
  onFavoriteToggle,
}: StudioGridCardProps) {
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
    <Card
      data-testid={`studio-grid-card-${studio.id}`}
      className={`overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 ${
        isSelected ? 'ring-2 ring-theme-primary' : ''
      }`}
      onClick={handleClick}
    >
      <CardHeader className="p-0">
        {/* メイン画像 */}
        <div className="relative h-40 md:h-48 w-full overflow-hidden">
          <EmptyImage
            src={getStudioImageUrl(studio)}
            alt={getStudioImageAlt(studio)}
            fallbackIcon={Building2}
            fallbackIconSize="lg"
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />

          {/* バッジ */}
          <div className="absolute top-2 md:top-4 left-2 md:left-4 flex gap-2 flex-wrap">
            {studio.prefecture && (
              <Badge className="bg-theme-primary text-xs">
                {tPrefecture(studio.prefecture)}
              </Badge>
            )}
            {studio.average_rating > 4.5 && studio.evaluation_count > 0 && (
              <Badge className="bg-theme-accent text-xs">
                {t('highRating')}
              </Badge>
            )}
          </div>

          {/* 選択チェックボックスまたはお気に入りボタン */}
          {showSelection ? (
            <div className="absolute top-2 right-2 z-20">
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  isSelected
                    ? 'bg-theme-primary border-theme-primary'
                    : 'bg-theme-background border-theme-neutral/40'
                }`}
              >
                {isSelected && '✓'}
              </div>
            </div>
          ) : (
            <CardFavoriteButton
              favoriteType="studio"
              favoriteId={studio.id}
              size="sm"
              initialState={getDefaultFavoriteState(favoriteState)}
              onToggle={onFavoriteToggle}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 md:p-4 lg:p-5">
        {/* タイトル */}
        <h3 className="text-sm md:text-base lg:text-lg font-semibold md:font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 min-h-[2.5rem]">
          {studio.name}
        </h3>

        {/* 基本情報 */}
        <div className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-3">
          <div className="flex items-center gap-1">
            <MapPinIcon className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
            <span className="truncate">{studio.address}</span>
          </div>

          <div className="flex items-center gap-1">
            <UsersIcon className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
            <span>
              {t('maxCapacity', { count: studio.max_capacity || '-' })}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <CurrencyYenIcon className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
            <span>
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

        {/* 評価 */}
        {studio.evaluation_count > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <StarRating rating={studio.average_rating} size="sm" />
            <span className="text-xs md:text-sm">
              {studio.average_rating.toFixed(1)}{' '}
              {t('reviewCount', { count: studio.evaluation_count })}
            </span>
          </div>
        )}

        {/* 設備アイコン */}
        <div className="flex items-center gap-3 mb-3 md:mb-4">
          {studio.parking_available && (
            <div className="flex items-center gap-1 text-xs">
              <TruckIcon className="w-3 h-3 md:w-4 md:h-4" />
              <span>{t('parking')}</span>
            </div>
          )}
          {studio.wifi_available && (
            <div className="flex items-center gap-1 text-xs">
              <WifiIcon className="w-3 h-3 md:w-4 md:h-4" />
              <span>{t('wifi')}</span>
            </div>
          )}
        </div>

        {/* フッター: 統計情報 */}
        <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-gray-100 md:border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t('photoCount', { count: studio.photo_count })}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t('equipmentCount', { count: studio.equipment_count })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
