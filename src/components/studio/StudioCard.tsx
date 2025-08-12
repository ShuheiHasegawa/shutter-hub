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
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { StudioWithStats } from '@/types/database';
import { CardFavoriteButton } from '@/components/ui/favorite-heart-button';

interface StudioCardProps {
  studio: StudioWithStats;
  onSelect?: (studio: StudioWithStats) => void;
  isSelected?: boolean;
  showSelection?: boolean;
  favoriteState?: {
    isFavorited: boolean;
    favoriteCount: number;
  };
}

export function StudioCard({
  studio,
  onSelect,
  isSelected = false,
  showSelection = false,
  favoriteState,
}: StudioCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onSelect) {
      onSelect(studio);
    } else {
      router.push(`/studios/${studio.id}`);
    }
  };

  const formatPriceRange = () => {
    if (studio.hourly_rate_min && studio.hourly_rate_max) {
      return `¥${studio.hourly_rate_min.toLocaleString()} - ¥${studio.hourly_rate_max.toLocaleString()}`;
    } else if (studio.hourly_rate_min) {
      return `¥${studio.hourly_rate_min.toLocaleString()}～`;
    }
    return '料金応相談';
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
          <Image
            src={
              studio.featuredPhotos && studio.featuredPhotos.length > 0
                ? studio.featuredPhotos[0].image_url
                : '/images/no-image.png'
            }
            alt={
              studio.featuredPhotos && studio.featuredPhotos.length > 0
                ? studio.featuredPhotos[0].alt_text || studio.name
                : 'No Image'
            }
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* バッジ */}
          <div className="absolute top-2 left-2 flex gap-2">
            {studio.verification_status === 'verified' && (
              <Badge className="bg-theme-primary text-theme-primary-foreground text-xs">
                認証済み
              </Badge>
            )}
            {studio.average_rating > 4.5 && (
              <Badge className="bg-theme-accent text-theme-accent-foreground text-xs">
                高評価
              </Badge>
            )}
          </div>

          {/* 選択チェックボックスまたはお気に入りボタン */}
          {showSelection ? (
            <div className="absolute top-2 right-2">
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  isSelected
                    ? 'bg-theme-primary border-theme-primary text-theme-primary-foreground'
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
                      isAuthenticated: true,
                    }
                  : undefined
              }
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
          <div className="flex items-center gap-2 text-sm text-theme-text-secondary">
            <MapPinIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{studio.address}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-theme-text-secondary">
            <UsersIcon className="w-4 h-4 flex-shrink-0" />
            <span>最大{studio.max_capacity || '-'}名</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-theme-text-secondary">
            <CurrencyYenIcon className="w-4 h-4 flex-shrink-0" />
            <span>{formatPriceRange()}</span>
          </div>
        </div>

        {/* 評価 */}
        {studio.evaluation_count > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex">{renderStars(studio.average_rating)}</div>
            <span className="text-sm text-theme-text-secondary">
              {studio.average_rating.toFixed(1)} ({studio.evaluation_count}件)
            </span>
          </div>
        )}

        {/* 設備アイコン */}
        <div className="flex items-center gap-3 mb-4">
          {studio.parking_available && (
            <div className="flex items-center gap-1 text-xs text-theme-text-muted">
              <TruckIcon className="w-4 h-4" />
              <span>駐車場</span>
            </div>
          )}
          {studio.wifi_available && (
            <div className="flex items-center gap-1 text-xs text-theme-text-muted">
              <WifiIcon className="w-4 h-4" />
              <span>Wi-Fi</span>
            </div>
          )}
        </div>

        {/* 統計情報 */}
        <div className="flex justify-between text-xs text-theme-text-muted border-t border-theme-neutral/20 pt-2">
          <span>写真 {studio.photo_count}枚</span>
          <span>機材 {studio.equipment_count}点</span>
        </div>
      </CardContent>
    </Card>
  );
}
