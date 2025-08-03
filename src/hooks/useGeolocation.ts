import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import type {
  LocationData,
  GeolocationPosition,
  GeolocationError,
} from '@/types/instant-photo';

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean; // 継続的な位置情報監視
  immediate?: boolean; // 即座に取得を開始するか
}

interface UseGeolocationReturn {
  location: LocationData | null;
  error: GeolocationError | null;
  isLoading: boolean;
  isSupported: boolean;
  refetch: () => void;
  clearLocation: () => void;
}

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
    watch = false,
    immediate = true,
  } = options;

  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // クライアントサイドでのGeolocation API対応チェック
  useEffect(() => {
    setIsSupported(
      typeof navigator !== 'undefined' && 'geolocation' in navigator
    );
  }, []);

  // 位置情報を取得する関数
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        reject({
          code: 0,
          message: 'Geolocation is not supported by this browser.',
        } as GeolocationError);
        return;
      }

      const positionOptions: PositionOptions = {
        enableHighAccuracy,
        timeout,
        maximumAge,
      };

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
          } as GeolocationPosition);
        },
        err => {
          let detailedMessage = err.message;

          // エラーコードに応じてより分かりやすいメッセージを提供
          switch (err.code) {
            case 1: // PERMISSION_DENIED
              detailedMessage =
                'ユーザーが位置情報の使用を拒否しました。ブラウザの設定で位置情報を許可してください。';
              break;
            case 2: // POSITION_UNAVAILABLE
              // iOS Safari特有のkCLErrorLocationUnknownエラーを検出
              if (
                err.message.includes('kCLErrorLocationUnknown') ||
                err.message.includes('CoreLocationProvider') ||
                err.message.includes('CoreLocation framework')
              ) {
                detailedMessage =
                  'iOS設定で位置情報サービスが無効になっているか、Safari の位置情報アクセスが制限されています。「設定 > プライバシーとセキュリティ > 位置情報サービス」で Safari を有効にしてください。';
              } else {
                detailedMessage =
                  '位置情報を取得できませんでした。GPS設定を確認するか、屋外で再試行してください。';
              }
              break;
            case 3: // TIMEOUT
              detailedMessage = `位置情報の取得がタイムアウトしました（${timeout}ms）。もう一度お試しください。`;
              break;
            default:
              detailedMessage = `位置情報の取得に失敗しました: ${err.message}`;
          }

          reject({
            code: err.code,
            message: detailedMessage,
          } as GeolocationError);
        },
        positionOptions
      );
    });
  };

  // 位置情報をLocationData形式に変換
  const convertToLocationData = (
    position: GeolocationPosition
  ): LocationData => {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp),
    };
  };

  // 位置情報を取得
  const fetchLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const position = await getCurrentPosition();
      const locationData = convertToLocationData(position);

      // 逆ジオコーディング（住所取得）を試行
      try {
        const address = await reverseGeocode(
          locationData.latitude,
          locationData.longitude
        );
        locationData.address = address;
      } catch (geocodeError) {
        logger.warn('Reverse geocoding failed:', geocodeError);
        // 逆ジオコーディングの失敗は致命的ではないので継続
      }

      setLocation(locationData);
    } catch (err) {
      setError(err as GeolocationError);
    } finally {
      setIsLoading(false);
    }
  };

  // 継続的な位置情報監視を開始
  const startWatching = () => {
    if (!isSupported || watchId !== null) return;

    const id = navigator.geolocation.watchPosition(
      position => {
        const locationData = convertToLocationData({
          coords: position.coords,
          timestamp: position.timestamp,
        } as GeolocationPosition);

        setLocation(locationData);
        setError(null);
      },
      err => {
        setError({
          code: err.code,
          message: err.message,
        } as GeolocationError);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );

    setWatchId(id);
  };

  // 監視を停止
  const stopWatching = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  // 位置情報をクリア
  const clearLocation = () => {
    setLocation(null);
    setError(null);
    stopWatching();
  };

  // refetch関数
  const refetch = () => {
    fetchLocation();
  };

  useEffect(() => {
    // クライアントサイドかつGeolocationがサポートされている場合のみ実行
    if (!isSupported || !immediate) return;

    if (watch) {
      startWatching();
    } else {
      fetchLocation();
    }

    return () => {
      stopWatching();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, immediate, watch, enableHighAccuracy, timeout, maximumAge]);

  return {
    location,
    error,
    isLoading,
    isSupported,
    refetch,
    clearLocation,
  };
}

// 逆ジオコーディング関数（住所取得）
async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    // OpenStreetMap Nominatim API使用（無料）
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=ja`
    );

    if (!response.ok) {
      throw new Error('Geocoding API request failed');
    }

    const data = await response.json();

    if (data && data.display_name) {
      return data.display_name;
    }

    throw new Error('No address found');
  } catch (error) {
    logger.error('Reverse geocoding error:', error);
    throw error;
  }
}

// 観光地情報を取得する関数（将来的に実装）
export async function getNearbyLandmarks(
  latitude: number,
  longitude: number,
  radius: number = 1000
): Promise<string[]> {
  try {
    // 将来的にはGoogle Places APIや観光地APIを使用
    // 現在はモックデータを返す
    const mockLandmarks = [
      '東京タワー',
      '浅草寺',
      '渋谷スクランブル交差点',
      '新宿御苑',
      '上野動物園',
    ];

    // 簡単な距離チェック（東京都心部の場合）
    // radius パラメーターは将来的にGooglePlaces APIで使用予定
    if (
      latitude >= 35.6 &&
      latitude <= 35.8 &&
      longitude >= 139.6 &&
      longitude <= 139.8
    ) {
      // radiusに基づいて結果を調整（将来の実装）
      const maxResults = radius > 2000 ? mockLandmarks.length : 2;
      return mockLandmarks.slice(0, maxResults); // radius に基づいた結果数
    }

    return [];
  } catch (error) {
    logger.error('Landmark search error:', error);
    return [];
  }
}

// 位置情報の精度をチェック
export function checkLocationAccuracy(location: LocationData): {
  accuracy: 'high' | 'medium' | 'low';
  message: string;
} {
  if (!location.accuracy) {
    return {
      accuracy: 'low',
      message: '位置情報の精度が不明です',
    };
  }

  if (location.accuracy <= 10) {
    return {
      accuracy: 'high',
      message: '位置情報の精度は高精度です',
    };
  } else if (location.accuracy <= 100) {
    return {
      accuracy: 'medium',
      message: '位置情報の精度は中程度です',
    };
  } else {
    return {
      accuracy: 'low',
      message: '位置情報の精度が低いです。屋外で再試行してください',
    };
  }
}

// 距離を計算する関数（Haversine公式）
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 地球の半径（km）
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // メートル単位で返す
}
