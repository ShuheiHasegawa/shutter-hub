'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Camera, Star, Navigation } from 'lucide-react';
import type { LocationData, NearbyPhotographer } from '@/types/instant-photo';

// Leafletコンポーネントをdynamic importでSSR無効化
const DynamicMapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const DynamicTileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const DynamicMarker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);
const DynamicPopup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);
const DynamicCircle = dynamic(
  () => import('react-leaflet').then(mod => mod.Circle),
  { ssr: false }
);

// Leaflet typesとIconをdynamic import
let LeafletIcon: any; // eslint-disable-line @typescript-eslint/no-explicit-any

if (typeof window !== 'undefined') {
  import('leaflet').then(L => {
    LeafletIcon = L.Icon;
  });
  // CSS importもクライアントサイドのみ
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  import('leaflet/dist/leaflet.css' as any).catch(() => {
    // CSS読み込みエラーは無視
  });
}

interface InstantPhotoMapProps {
  userLocation: LocationData;
  photographers: NearbyPhotographer[];
  selectedPhotographer?: NearbyPhotographer | null;
  onPhotographerSelect?: (photographer: NearbyPhotographer) => void;
  showRadius?: boolean;
  radiusMeters?: number;
  className?: string;
}

// カスタムアイコンの定義
const createCustomIcon = (
  type: 'user' | 'photographer' | 'selected',
  isOnline?: boolean
) => {
  if (typeof window === 'undefined' || !LeafletIcon) return null;

  const iconSize: [number, number] = type === 'user' ? [32, 32] : [28, 28];

  let iconUrl = '';
  if (type === 'user') {
    iconUrl =
      'data:image/svg+xml;base64,' +
      btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3B82F6">
        <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
      </svg>
    `);
  } else if (type === 'selected') {
    iconUrl =
      'data:image/svg+xml;base64,' +
      btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10B981">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#10B981" stroke="#FFFFFF" stroke-width="1"/>
      </svg>
    `);
  } else {
    const color = isOnline ? '#F59E0B' : '#6B7280';
    iconUrl =
      'data:image/svg+xml;base64,' +
      btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${color}" stroke="#FFFFFF" stroke-width="1"/>
      </svg>
    `);
  }

  return new LeafletIcon({
    iconUrl,
    iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1]],
    popupAnchor: [0, -iconSize[1]],
  });
};

export function InstantPhotoMap({
  userLocation,
  photographers,
  selectedPhotographer,
  onPhotographerSelect,
  showRadius = true,
  radiusMeters = 1000,
  className = '',
}: InstantPhotoMapProps) {
  const [isClient, setIsClient] = useState(false);

  // SSR対応
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div
        className={`h-96 bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">地図を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <DynamicMapContainer
        center={[userLocation.latitude, userLocation.longitude]}
        zoom={14}
        className="h-96 w-full rounded-lg z-0"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <DynamicTileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ユーザーの現在地 */}
        <DynamicMarker
          position={[userLocation.latitude, userLocation.longitude]}
          icon={createCustomIcon('user')}
        >
          <DynamicPopup>
            <div className="text-center p-2">
              <MapPin className="h-4 w-4 text-blue-600 mx-auto mb-1" />
              <p className="font-medium">あなたの現在地</p>
              {userLocation.address && (
                <p className="text-xs text-gray-600 mt-1">
                  {userLocation.address}
                </p>
              )}
            </div>
          </DynamicPopup>
        </DynamicMarker>

        {/* 検索範囲の円 */}
        {showRadius && (
          <DynamicCircle
            center={[userLocation.latitude, userLocation.longitude]}
            radius={radiusMeters}
            pathOptions={{
              color: '#3B82F6',
              fillColor: '#3B82F6',
              fillOpacity: 0.1,
              weight: 2,
            }}
          />
        )}

        {/* カメラマンのマーカー */}
        {photographers.map(photographer => (
          <DynamicMarker
            key={photographer.photographer_id}
            position={[photographer.latitude, photographer.longitude]}
            icon={createCustomIcon(
              selectedPhotographer?.photographer_id ===
                photographer.photographer_id
                ? 'selected'
                : 'photographer',
              photographer.is_available ?? false
            )}
            eventHandlers={{
              click: () => {
                onPhotographerSelect?.(photographer);
              },
            }}
          >
            <DynamicPopup>
              <PhotographerPopup
                photographer={photographer}
                onSelect={() => onPhotographerSelect?.(photographer)}
              />
            </DynamicPopup>
          </DynamicMarker>
        ))}
      </DynamicMapContainer>

      {/* 地図の凡例 */}
      <Card className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-gray-800 font-medium">あなたの位置</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-gray-800 font-medium">
                利用可能なカメラマン
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-gray-800 font-medium">
                オフラインのカメラマン
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <span className="text-gray-800 font-medium">
                選択中のカメラマン
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// カメラマン情報のポップアップコンポーネント
function PhotographerPopup({
  photographer,
  onSelect,
}: {
  photographer: NearbyPhotographer;
  onSelect: () => void;
}) {
  return (
    <div className="w-64 p-2">
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={photographer.avatar_url} />
          <AvatarFallback>
            <Camera className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate text-gray-900">
              {photographer.display_name || 'カメラマン'}
            </h4>
            {photographer.is_available && (
              <Badge variant="secondary" className="text-xs">
                オンライン
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-700">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-current text-yellow-500" />
              <span>{photographer.rating?.toFixed(1) || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              <span>{photographer.distance_meters}m</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs">⏱️</span>
              <span>{Math.round(photographer.response_time_avg / 60)}分</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="text-xs">
          <span className="font-medium text-gray-800">料金: </span>
          <span className="text-green-600 font-semibold">
            ¥{photographer.instant_rate?.toLocaleString() || 'N/A'}
          </span>
        </div>

        {photographer.specialties && photographer.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {photographer.specialties.slice(0, 3).map((specialty, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {specialty}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Button
        size="sm"
        className="w-full"
        onClick={onSelect}
        disabled={!photographer.is_available}
      >
        {photographer.is_available ? 'このカメラマンを選択' : 'オフライン'}
      </Button>
    </div>
  );
}
