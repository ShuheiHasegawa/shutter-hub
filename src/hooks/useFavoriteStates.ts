'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { getBulkFavoriteStatusAction } from '@/app/actions/favorites';
import { logger } from '@/lib/utils/logger';
import { useAuth } from '@/hooks/useAuth';

export interface FavoriteItem {
  type: 'studio' | 'photo_session';
  id: string;
}

export interface FavoriteState {
  isFavorited: boolean;
  favoriteCount: number;
}

export interface UseFavoriteStatesOptions {
  enabled?: boolean; // フック無効化オプション
  revalidateOnFocus?: boolean; // フォーカス時の再検証（デフォルト: false）
  dedupingInterval?: number; // 重複排除間隔（デフォルト: 10000ms）
}

export function useFavoriteStates(
  items: FavoriteItem[],
  options: UseFavoriteStatesOptions = {}
) {
  const { user } = useAuth();
  const {
    enabled = true,
    revalidateOnFocus = false,
    dedupingInterval = 10000,
  } = options;

  // itemsが変わるたびにキーを再生成しないよう、安定したキーを作成
  const swrKey = useMemo(() => {
    if (!enabled || items.length === 0 || !user) return null;

    // type別にソートしてからidでソート（キーの安定性確保）
    const sortedItems = [...items].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.id.localeCompare(b.id);
    });

    return ['favorite-states', JSON.stringify(sortedItems)];
  }, [enabled, items, user]);

  const {
    data,
    error,
    isValidating,
    mutate: mutateLocal,
  } = useSWR(
    swrKey,
    async () => {
      if (!items || items.length === 0) {
        return { favoriteStates: {}, isAuthenticated: false };
      }

      logger.debug('[useFavoriteStates] バルク取得開始', {
        itemsCount: items.length,
        items: items.slice(0, 5), // 最初の5件のみログ
      });

      const result = await getBulkFavoriteStatusAction(items);

      if (!result.success) {
        logger.warn('[useFavoriteStates] バルク取得失敗', {
          error: result.error,
          isAuthenticated: result.isAuthenticated,
        });

        // 失敗時は空の状態を返す（個別取得を防ぐため）
        const emptyStates: Record<string, FavoriteState> = {};
        items.forEach(item => {
          emptyStates[`${item.type}_${item.id}`] = {
            isFavorited: false,
            favoriteCount: 0,
          };
        });

        return {
          favoriteStates: emptyStates,
          isAuthenticated: result.isAuthenticated ?? false,
        };
      }

      logger.debug('[useFavoriteStates] バルク取得成功', {
        statesCount: Object.keys(result.favoriteStates).length,
        isAuthenticated: result.isAuthenticated,
      });

      return {
        favoriteStates: result.favoriteStates,
        isAuthenticated: result.isAuthenticated ?? true,
      };
    },
    {
      revalidateOnFocus,
      dedupingInterval,
      keepPreviousData: true, // ページ遷移時も前のデータを保持
      revalidateOnReconnect: false, // 再接続時の自動再検証なし
      shouldRetryOnError: false, // エラー時のリトライなし（個別取得を防ぐため）
    }
  );

  // お気に入り状態を更新するヘルパー関数（楽観的更新）
  const updateFavoriteState = (
    itemType: 'studio' | 'photo_session',
    itemId: string,
    isFavorited: boolean,
    favoriteCount: number
  ) => {
    if (!data) return;

    const key = `${itemType}_${itemId}`;
    const newStates = {
      ...data.favoriteStates,
      [key]: { isFavorited, favoriteCount },
    };

    // ローカルキャッシュを即座更新
    mutateLocal({ ...data, favoriteStates: newStates }, { revalidate: false });

    logger.debug('[useFavoriteStates] 楽観的更新実行', {
      key,
      isFavorited,
      favoriteCount,
    });
  };

  return {
    favoriteStates: (data?.favoriteStates || {}) as Record<
      string,
      FavoriteState
    >,
    isAuthenticated: data?.isAuthenticated ?? null,
    isLoading: !error && !data && !!user, // 未認証時はローディングなし
    isValidating,
    error,
    updateFavoriteState,
    ready: !!data, // データ準備完了フラグ
  };
}
