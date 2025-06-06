'use client';

import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Camera, Star, Navigation } from 'lucide-react';
import type { LocationData, NearbyPhotographer } from '@/types/instant-photo';

// Leaflet CSS import (dynamic import to avoid SSR issues)
import 'leaflet/dist/leaflet.css';

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

  return new Icon({
    iconUrl,
    iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1]],
    popupAnchor: [0, -iconSize[1]],
  });
};

// 地図の境界を自動調整するコンポーネント
function MapBounds({
  userLocation,
  photographers,
}: {
  userLocation: LocationData;
  photographers: NearbyPhotographer[];
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = new LatLngBounds([]);

    // ユーザー位置を追加
    bounds.extend([userLocation.latitude, userLocation.longitude]);

    // カメラマン位置を追加
    photographers.forEach(photographer => {
      bounds.extend([photographer.latitude, photographer.longitude]);
    });

    // 境界が有効な場合のみ調整
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 16,
      });
    }
  }, [map, userLocation, photographers]);

  return null;
}

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
      <MapContainer
        center={[userLocation.latitude, userLocation.longitude]}
        zoom={14}
        className="h-96 w-full rounded-lg z-0"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 地図境界の自動調整 */}
        <MapBounds userLocation={userLocation} photographers={photographers} />

        {/* ユーザーの現在地 */}
        <Marker
          position={[userLocation.latitude, userLocation.longitude]}
          icon={createCustomIcon('user')}
        >
          <Popup>
            <div className="text-center p-2">
              <MapPin className="h-4 w-4 text-blue-600 mx-auto mb-1" />
              <p className="font-medium">あなたの現在地</p>
              {userLocation.address && (
                <p className="text-xs text-gray-600 mt-1">
                  {userLocation.address}
                </p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* 検索範囲の円 */}
        {showRadius && (
          <Circle
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
          <Marker
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
            <Popup>
              <PhotographerPopup
                photographer={photographer}
                onSelect={() => onPhotographerSelect?.(photographer)}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

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
