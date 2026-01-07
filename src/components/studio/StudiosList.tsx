'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { StudioCard } from './StudioCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getStudiosAction } from '@/app/actions/studio';
import { StudioWithStats, StudioSearchFilters } from '@/types/database';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useFavoriteStates } from '@/hooks/useFavoriteStates';

interface StudiosListProps {
  filters?: StudioSearchFilters;
  onStudioSelect?: (studio: StudioWithStats) => void;
  selectedStudioIds?: string[];
  showSelection?: boolean;
  limit?: number;
  triggerSearch?: boolean; // 検索実行フラグ
}

export function StudiosList({
  filters = {},
  onStudioSelect,
  selectedStudioIds = [],
  showSelection = false,
  limit = 20,
  triggerSearch = false,
}: StudiosListProps) {
  const t = useTranslations('studio.list');
  const [studios, setStudios] = useState<StudioWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // お気に入り状態を一括取得（SWRキャッシュ経由）
  const favoriteItems = useMemo(
    () => studios.map(s => ({ type: 'studio' as const, id: s.id })),
    [studios]
  );
  const {
    favoriteStates,
    isAuthenticated: favoriteIsAuthenticated,
    ready: favoriteStatesReady,
    updateFavoriteState,
  } = useFavoriteStates(favoriteItems, {
    enabled: studios.length > 0,
  });

  const fetchStudios = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true);
      setError(null);

      const searchFilters = {
        ...filters,
        page,
        limit,
      };

      const result = await getStudiosAction(searchFilters);

      if (result.success && result.studios) {
        const newStudios = result.studios;

        if (append) {
          setStudios(prev => [...prev, ...newStudios]);
        } else {
          setStudios(newStudios);
        }

        // お気に入り状態はuseFavoriteStatesフックで自動取得されるため、ここでは削除

        const totalItems = result.totalCount || result.studios.length;
        const currentItems = append
          ? studios.length + result.studios.length
          : result.studios.length;
        setHasMore(currentItems < totalItems);
      } else {
        setError(result.error || t('fetchError'));
      }
    } catch {
      setError(t('fetchErrorUnexpected'));
    } finally {
      setLoading(false);
    }
  };

  // 検索実行フラグがtrueの時のみ取得
  useEffect(() => {
    if (triggerSearch) {
      setCurrentPage(1);
      fetchStudios(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSearch, filters]);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchStudios(nextPage, true);
  };

  const isSelected = (studioId: string) => {
    return selectedStudioIds.includes(studioId);
  };

  if (loading && studios.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (studios.length === 0 && !loading) {
    return (
      <EmptyState
        title={triggerSearch ? t('emptyTitle') : t('emptyTitleInitial')}
        description={
          triggerSearch ? t('emptyDescription') : t('emptyDescriptionInitial')
        }
        variant={triggerSearch ? 'search' : 'default'}
        wrapped={false}
      />
    );
  }

  // お気に入り状態変更のコールバック
  const handleFavoriteToggle = (
    studioId: string,
    isFavorited: boolean,
    favoriteCount: number
  ) => {
    updateFavoriteState('studio', studioId, isFavorited, favoriteCount);
  };

  return (
    <div className="space-y-6">
      {/* スタジオ一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studios.map(studio => {
          const favoriteState =
            favoriteStatesReady && favoriteIsAuthenticated !== false
              ? favoriteStates[`studio_${studio.id}`]
              : undefined;
          return (
            <StudioCard
              key={studio.id}
              studio={studio}
              onSelect={onStudioSelect}
              isSelected={isSelected(studio.id)}
              showSelection={showSelection}
              favoriteState={
                favoriteState
                  ? {
                      isFavorited: favoriteState.isFavorited,
                      favoriteCount: favoriteState.favoriteCount,
                      isAuthenticated: favoriteIsAuthenticated ?? false,
                    }
                  : undefined
              }
              onFavoriteToggle={(isFavorited, favoriteCount) =>
                handleFavoriteToggle(studio.id, isFavorited, favoriteCount)
              }
            />
          );
        })}
      </div>

      {/* もっと読み込む */}
      {hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loading}>
            {loading ? t('loading') : t('loadMore')}
          </Button>
        </div>
      )}

      {/* 読み込み中インジケーター */}
      {loading && studios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
