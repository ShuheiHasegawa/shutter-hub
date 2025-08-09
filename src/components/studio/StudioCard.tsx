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
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { StudioWithStats } from '@/types/database';

interface StudioCardProps {
  studio: StudioWithStats;
  onSelect?: (studio: StudioWithStats) => void;
  isSelected?: boolean;
  showSelection?: boolean;
}

export function StudioCard({
  studio,
  onSelect,
  isSelected = false,
  showSelection = false,
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
            <StarIcon className="w-4 h-4 text-gray-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <StarIconSolid className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
        );
      } else {
        stars.push(<StarIcon key={i} className="w-4 h-4 text-gray-300" />);
      }
    }

    return stars;
  };

  return (
    <Card
      className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={handleClick}
    >
      <CardHeader className="p-0">
        {/* メイン画像 */}
        <div className="aspect-video relative bg-gray-100 rounded-t-lg overflow-hidden">
          {studio.featuredPhotos && studio.featuredPhotos.length > 0 ? (
            <Image
              src={studio.featuredPhotos[0].image_url}
              alt={studio.featuredPhotos[0].alt_text || studio.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <BuildingOfficeIcon className="w-16 h-16 text-gray-400" />
            </div>
          )}

          {/* バッジ */}
          <div className="absolute top-2 left-2 flex gap-2">
            {studio.verification_status === 'verified' && (
              <Badge className="bg-green-500 text-white text-xs">
                認証済み
              </Badge>
            )}
            {studio.average_rating > 4.5 && (
              <Badge className="bg-yellow-500 text-white text-xs">高評価</Badge>
            )}
          </div>

          {/* 選択チェックボックス */}
          {showSelection && (
            <div className="absolute top-2 right-2">
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  isSelected
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-gray-300'
                }`}
              >
                {isSelected && '✓'}
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <CardTitle className="text-lg font-semibold mb-2 line-clamp-2">
          {studio.name}
        </CardTitle>

        {/* 基本情報 */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPinIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{studio.address}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <UsersIcon className="w-4 h-4 flex-shrink-0" />
            <span>最大{studio.max_capacity || '-'}名</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CurrencyYenIcon className="w-4 h-4 flex-shrink-0" />
            <span>{formatPriceRange()}</span>
          </div>
        </div>

        {/* 評価 */}
        {studio.evaluation_count > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex">{renderStars(studio.average_rating)}</div>
            <span className="text-sm text-gray-600">
              {studio.average_rating.toFixed(1)} ({studio.evaluation_count}件)
            </span>
          </div>
        )}

        {/* 設備アイコン */}
        <div className="flex items-center gap-3 mb-4">
          {studio.parking_available && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <TruckIcon className="w-4 h-4" />
              <span>駐車場</span>
            </div>
          )}
          {studio.wifi_available && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <WifiIcon className="w-4 h-4" />
              <span>Wi-Fi</span>
            </div>
          )}
        </div>

        {/* 統計情報 */}
        <div className="flex justify-between text-xs text-gray-500 border-t pt-2">
          <span>写真 {studio.photo_count}枚</span>
          <span>機材 {studio.equipment_count}点</span>
        </div>
      </CardContent>
    </Card>
  );
}
