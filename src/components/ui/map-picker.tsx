'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// デフォルトアイコンの設定（Leafletの問題回避）
const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapPickerProps {
  address?: string;
  onAddressChange?: (address: string) => void;
  onCoordinatesChange?: (lat: number, lng: number) => void;
  prefecture?: string;
  city?: string;
  className?: string;
  height?: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

// 地図クリックイベントハンドラー
function LocationMarker({
  position,
  onPositionChange,
}: {
  position: Coordinates | null;
  onPositionChange: (coords: Coordinates) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={defaultIcon} />
  );
}

// 地図中心移動コンポーネント
function ChangeMapView({ coords }: { coords: Coordinates }) {
  const map = useMap();

  useEffect(() => {
    map.setView(coords, 15);
  }, [coords, map]);

  return null;
}

// ジオコーディング関数（住所→座標）
async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        address + ', Japan'
      )}&format=json&limit=1&addressdetails=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Geocoding error:', error);
    return null;
  }
}

// 逆ジオコーディング関数（座標→住所）
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=ja`
    );
    const data = await response.json();

    if (data && data.display_name) {
      // 日本の住所形式に整形
      const address = data.address;
      if (address) {
        const parts = [];
        if (address.prefecture || address.state) {
          parts.push(address.prefecture || address.state);
        }
        if (address.city || address.town || address.village) {
          parts.push(address.city || address.town || address.village);
        }
        if (address.suburb || address.neighbourhood) {
          parts.push(address.suburb || address.neighbourhood);
        }
        if (address.house_number && address.road) {
          parts.push(`${address.road}${address.house_number}`);
        } else if (address.road) {
          parts.push(address.road);
        }

        return parts.length > 0 ? parts.join('') : data.display_name;
      }
      return data.display_name;
    }
    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export function MapPicker({
  address = '',
  onAddressChange,
  onCoordinatesChange,
  prefecture = '',
  city = '',
  className = '',
  height = '400px',
}: MapPickerProps) {
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [localAddress, setLocalAddress] = useState(address);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 日本の中心部をデフォルト位置とする（東京駅周辺）
  const defaultCenter: Coordinates = { lat: 35.6762, lng: 139.6503 };

  // 初期化時に既存の住所から座標を取得
  useEffect(() => {
    if (address) {
      setLocalAddress(address);
      handleAddressSearch(address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // 住所検索機能
  const handleAddressSearch = async (searchAddress?: string) => {
    const targetAddress = searchAddress || localAddress;
    if (!targetAddress.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // 都道府県と市区町村を組み合わせて検索精度を向上
      const fullAddress =
        prefecture && city
          ? `${prefecture}${city}${targetAddress}`
          : targetAddress;

      const coords = await geocodeAddress(fullAddress);
      if (coords) {
        setPosition(coords);
        onCoordinatesChange?.(coords.lat, coords.lng);
      } else {
        setError('住所が見つかりませんでした。別の表記で試してください。');
      }
    } catch {
      setError('住所の検索に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // ピンクリック時の住所取得
  const handlePositionChange = useCallback(
    async (coords: Coordinates) => {
      setPosition(coords);
      setIsLoading(true);
      setError(null);

      try {
        const addressResult = await reverseGeocode(coords.lat, coords.lng);
        if (addressResult) {
          setLocalAddress(addressResult);
          onAddressChange?.(addressResult);
        }
        onCoordinatesChange?.(coords.lat, coords.lng);
      } catch {
        setError('住所の取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    },
    [onAddressChange, onCoordinatesChange]
  );

  const handleAddressInputChange = (value: string) => {
    setLocalAddress(value);
    onAddressChange?.(value);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 住所入力フィールド */}
      <div className="space-y-2">
        <Label htmlFor="map-address">住所</Label>
        <div className="flex gap-2">
          <Input
            id="map-address"
            value={localAddress}
            onChange={e => handleAddressInputChange(e.target.value)}
            placeholder="住所を入力してください"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddressSearch();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddressSearch()}
            disabled={isLoading}
            className="flex-shrink-0"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 地図 */}
      <div className="relative">
        <div className="rounded-lg overflow-hidden border border-theme-neutral/20">
          <MapContainer
            center={position || defaultCenter}
            zoom={position ? 15 : 10}
            style={{ height, width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker
              position={position}
              onPositionChange={handlePositionChange}
            />
            {position && <ChangeMapView coords={position} />}
          </MapContainer>
        </div>

        {/* ローディング表示 */}
        {isLoading && (
          <div className="absolute inset-0 bg-theme-background/50 flex items-center justify-center rounded-lg">
            <div className="bg-theme-background p-3 rounded-lg shadow-lg flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-primary"></div>
              <span className="text-sm">位置を取得中...</span>
            </div>
          </div>
        )}

        {/* 使用方法の説明 */}
        <div className="mt-2 text-sm text-theme-text-muted flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>
            地図をクリックしてピンを配置するか、住所を入力して検索してください
          </span>
        </div>
      </div>

      {/* 座標表示（デバッグ用） */}
      {position && (
        <div className="text-xs text-theme-text-muted">
          座標: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
}
