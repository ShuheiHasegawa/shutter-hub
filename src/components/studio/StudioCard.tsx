'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { EmptyImage } from '@/components/ui/empty-image';
import { StudioWithStats } from '@/types/database';
import { CardFavoriteButton } from '@/components/ui/favorite-heart-button';
import { FormattedPrice } from '@/components/ui/formatted-display';

interface StudioCardProps {
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

export function StudioCard({
  studio,
  onSelect,
  isSelected = false,
  showSelection = false,
  favoriteState,
  onFavoriteToggle,
}: StudioCardProps) {
  const router = useRouter();

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
      return `${diffDays}日前に更新`;
    } else if (diffHours > 0) {
      return `${diffHours}時間前に更新`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}分前に更新`;
    } else {
      return 'たった今更新';
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
      className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${
        isSelected ? 'ring-2 ring-theme-primary' : ''
      }`}
      onClick={handleClick}
    >
      <CardHeader className="p-0">
        {/* メイン画像 */}
        <div className="aspect-video relative bg-theme-neutral/10 rounded-t-lg overflow-hidden">
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* バッジ */}
          <div className="absolute top-2 left-2 flex gap-2 flex-wrap">
            {studio.prefecture && (
              <Badge className="bg-theme-primary text-xs">
                {studio.prefecture}
              </Badge>
            )}
            {studio.average_rating > 4.5 && studio.evaluation_count > 0 && (
              <Badge className="bg-theme-accent text-xs">高評価</Badge>
            )}
            {studio.is_hidden && (
              <Badge variant="destructive" className="text-xs">
                非表示
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
      </CardHeader>

      <CardContent className="p-4">
        <CardTitle className="text-lg font-semibold mb-2 line-clamp-2">
          {studio.name}
        </CardTitle>

        {/* 基本情報 */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPinIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{studio.address}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <UsersIcon className="w-4 h-4 flex-shrink-0" />
            <span>最大{studio.max_capacity || '-'}名</span>
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
                '料金応相談'
              )}
            </span>
          </div>
        </div>

        {/* 評価 */}
        {studio.evaluation_count > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex">{renderStars(studio.average_rating)}</div>
            <span className="text-sm">
              {studio.average_rating.toFixed(1)} ({studio.evaluation_count}件)
            </span>
          </div>
        )}

        {/* 設備アイコン */}
        <div className="flex items-center gap-3 mb-4">
          {studio.parking_available && (
            <div className="flex items-center gap-1 text-xs">
              <TruckIcon className="w-4 h-4" />
              <span>駐車場</span>
            </div>
          )}
          {studio.wifi_available && (
            <div className="flex items-center gap-1 text-xs">
              <WifiIcon className="w-4 h-4" />
              <span>Wi-Fi</span>
            </div>
          )}
        </div>

        {/* 統計情報 */}
        <div className="space-y-1 border-t border-theme-neutral/20 pt-4">
          <div className="flex justify-between text-xs">
            <span>写真 {studio.photo_count}枚</span>
            <span>機材 {studio.equipment_count}点</span>
          </div>
          {studio.updated_at && (
            <div className="text-xs text-theme-text-muted">
              {formatUpdateTime(studio.updated_at)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
