'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPinIcon,
  UsersIcon,
  CurrencyYenIcon,
  StarIcon,
  TruckIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { EmptyImage } from '@/components/ui/empty-image';
import { StudioWithStats } from '@/types/database';
import { CardFavoriteButton } from '@/components/ui/favorite-heart-button';
import { FormattedPrice } from '@/components/ui/formatted-display';

interface StudioHorizontalCardProps {
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

export function StudioHorizontalCard({
  studio,
  onSelect,
  isSelected = false,
  showSelection = false,
  favoriteState,
  onFavoriteToggle,
}: StudioHorizontalCardProps) {
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

  const formatUpdateTime = (updatedAt: string) => {
    const updated = new Date(updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - updated.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return t('updatedDaysAgo', { days: diffDays });
    } else if (diffHours > 0) {
      return t('updatedHoursAgo', { hours: diffHours });
    } else if (diffMinutes > 0) {
      return t('updatedMinutesAgo', { minutes: diffMinutes });
    } else {
      return t('updatedJustNow');
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarIconSolid key={i} className="w-4 h-4 text-yellow-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <StarIcon className="w-4 h-4 text-theme-text-muted" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <StarIconSolid className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <StarIcon key={i} className="w-4 h-4 text-theme-text-muted" />
        );
      }
    }

    return stars;
  };

  return (
    <Card
      data-testid={`studio-horizontal-card-${studio.id}`}
      className={`overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 ${
        isSelected ? 'ring-2 ring-theme-primary' : ''
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        {/* Desktop Layout */}
        <div className="hidden md:flex">
          {/* 画像エリア */}
          <div className="relative w-64 lg:w-80 flex-shrink-0 h-48 lg:h-56 overflow-hidden">
            <EmptyImage
              src={
                studio.featuredPhotos && studio.featuredPhotos.length > 0
                  ? studio.featuredPhotos[0].image_url
                  : undefined
              }
              alt={
                studio.featuredPhotos && studio.featuredPhotos.length > 0
                  ? studio.featuredPhotos[0].alt_text || studio.name
                  : studio.name
              }
              fallbackIcon={Building2}
              fallbackIconSize="lg"
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 256px, 320px"
            />

            {/* バッジ */}
            <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
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
              {studio.is_hidden && (
                <Badge variant="destructive" className="text-xs">
                  {t('hidden')}
                </Badge>
              )}
            </div>

            {/* 選択チェックボックスまたはお気に入りボタン */}
            {showSelection ? (
              <div className="absolute top-3 right-3 z-20">
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
                size="md"
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

          {/* コンテンツエリア */}
          <div className="flex-1 p-4 lg:p-6 flex flex-col">
            {/* タイトル */}
            <h3 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
              {studio.name}
            </h3>

            {/* 基本情報 */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{studio.address}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <UsersIcon className="w-4 h-4 flex-shrink-0" />
                <span>
                  {t('maxCapacity', { count: studio.max_capacity || '-' })}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <CurrencyYenIcon className="w-4 h-4 flex-shrink-0" />
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
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">{renderStars(studio.average_rating)}</div>
                <span className="text-sm">
                  {studio.average_rating.toFixed(1)}{' '}
                  {t('reviewCount', { count: studio.evaluation_count })}
                </span>
              </div>
            )}

            {/* 設備アイコン */}
            <div className="flex items-center gap-3 mb-4">
              {studio.parking_available && (
                <div className="flex items-center gap-1 text-xs">
                  <TruckIcon className="w-4 h-4" />
                  <span>{t('parking')}</span>
                </div>
              )}
              {studio.wifi_available && (
                <div className="flex items-center gap-1 text-xs">
                  <WifiIcon className="w-4 h-4" />
                  <span>{t('wifi')}</span>
                </div>
              )}
            </div>

            {/* 統計情報 */}
            <div className="mt-auto pt-4 border-t border-theme-neutral/20">
              <div className="flex justify-between text-xs">
                <span>{t('photoCount', { count: studio.photo_count })}</span>
                <span>
                  {t('equipmentCount', { count: studio.equipment_count })}
                </span>
              </div>
              {studio.updated_at && (
                <div className="text-xs text-theme-text-muted mt-1">
                  {formatUpdateTime(studio.updated_at)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* 画像エリア */}
          <div className="relative w-full h-48 overflow-hidden">
            <EmptyImage
              src={
                studio.featuredPhotos && studio.featuredPhotos.length > 0
                  ? studio.featuredPhotos[0].image_url
                  : undefined
              }
              alt={
                studio.featuredPhotos && studio.featuredPhotos.length > 0
                  ? studio.featuredPhotos[0].alt_text || studio.name
                  : studio.name
              }
              fallbackIcon={Building2}
              fallbackIconSize="lg"
              fill
              className="object-cover object-center"
              sizes="100vw"
            />

            {/* バッジ */}
            <div className="absolute top-2 left-2 flex gap-2 flex-wrap">
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

          {/* コンテンツエリア */}
          <div className="p-4">
            {/* タイトル */}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
              {studio.name}
            </h3>

            {/* 基本情報 */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{studio.address}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <UsersIcon className="w-4 h-4 flex-shrink-0" />
                <span>
                  {t('maxCapacity', { count: studio.max_capacity || '-' })}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <CurrencyYenIcon className="w-4 h-4 flex-shrink-0" />
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
                <div className="flex">{renderStars(studio.average_rating)}</div>
                <span className="text-xs">
                  {studio.average_rating.toFixed(1)}{' '}
                  {t('reviewCount', { count: studio.evaluation_count })}
                </span>
              </div>
            )}

            {/* 設備アイコン */}
            <div className="flex items-center gap-3 mb-3">
              {studio.parking_available && (
                <div className="flex items-center gap-1 text-xs">
                  <TruckIcon className="w-4 h-4" />
                  <span>{t('parking')}</span>
                </div>
              )}
              {studio.wifi_available && (
                <div className="flex items-center gap-1 text-xs">
                  <WifiIcon className="w-4 h-4" />
                  <span>{t('wifi')}</span>
                </div>
              )}
            </div>

            {/* 統計情報 */}
            <div className="pt-3 border-t border-theme-neutral/20">
              <div className="flex justify-between text-xs">
                <span>{t('photoCount', { count: studio.photo_count })}</span>
                <span>
                  {t('equipmentCount', { count: studio.equipment_count })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
