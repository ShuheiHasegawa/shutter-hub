/**
 * お気に入り機能のユーティリティ関数
 */

export interface FavoriteState {
  isFavorited: boolean;
  favoriteCount: number;
  isAuthenticated: boolean;
}

/**
 * お気に入りの初期状態を取得する
 * favoriteStateが提供されている場合はそのまま返し、未提供の場合はデフォルト値を返す
 */
export function getDefaultFavoriteState(
  favoriteState?: FavoriteState
): FavoriteState {
  return (
    favoriteState ?? {
      isFavorited: false,
      favoriteCount: 0,
      isAuthenticated: false,
    }
  );
}
