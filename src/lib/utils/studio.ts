/**
 * スタジオ関連のユーティリティ関数
 */

import type { StudioWithStats } from '@/types/database';

/**
 * スタジオのメイン画像URLを取得する
 */
export function getStudioImageUrl(studio: StudioWithStats): string | undefined {
  return studio.featuredPhotos?.[0]?.image_url;
}

/**
 * スタジオのメイン画像のaltテキストを取得する
 */
export function getStudioImageAlt(studio: StudioWithStats): string {
  return studio.featuredPhotos?.[0]?.alt_text || studio.name;
}
