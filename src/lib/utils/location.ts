/**
 * 位置情報関連のユーティリティ関数
 */

import { PREFECTURES } from '@/constants/japan';

/**
 * 住所から都道府県を抽出する
 * @param address 住所文字列
 * @returns 都道府県名（見つからない場合はnull）
 */
export function extractPrefecture(
  address: string | null | undefined
): string | null {
  if (!address) return null;

  // 都道府県リストから一致するものを検索
  for (const prefecture of PREFECTURES) {
    if (address.includes(prefecture)) {
      return prefecture;
    }
  }

  return null;
}

/**
 * 2点間の距離を計算する（ハーバーサイン公式）
 * @param lat1 地点1の緯度
 * @param lng1 地点1の経度
 * @param lat2 地点2の緯度
 * @param lng2 地点2の経度
 * @returns 距離（メートル）
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

/**
 * 度をラジアンに変換する
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
