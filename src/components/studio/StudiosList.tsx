'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { StudioGridCard } from './StudioGridCard';
import { StudioHorizontalCard } from './StudioHorizontalCard';
import { StudioTableRow } from './StudioTableRow';
import { StudioMobileCompactCard } from './StudioMobileCompactCard';
import { StudioMobileListCard } from './StudioMobileListCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getStudiosAction } from '@/app/actions/studio';
import { StudioWithStats, StudioSearchFilters } from '@/types/database';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useFavoriteStates } from '@/hooks/useFavoriteStates';
import type { LayoutType } from '@/components/ui/layout-toggle';

interface StudiosListProps {
  filters?: StudioSearchFilters;
  onStudioSelect?: (studio: StudioWithStats) => void;
  selectedStudioIds?: string[];
  showSelection?: boolean;
  limit?: number;
  triggerSearch?: boolean; // 検索実行フラグ
  layout?: LayoutType; // レイアウトタイプ
}

export function StudiosList({
  filters = {},
  onStudioSelect,
  selectedStudioIds = [],
  showSelection = false,
  limit = 20,
  triggerSearch = false,
  layout = 'grid',
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
    if (layout === 'table') {
      return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    スタジオ名
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    住所
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    最大収容人数
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    料金
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    評価
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    設備
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    統計情報
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {/* アクション列 */}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <Skeleton className="h-12 w-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-6 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (layout === 'card') {
      return (
        <div className="space-y-3 md:space-y-4 px-4 md:px-0">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ))}
        </div>
      );
    }

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

  const renderStudio = (studio: StudioWithStats) => {
    const favoriteState =
      favoriteStatesReady && favoriteIsAuthenticated !== false
        ? favoriteStates[`studio_${studio.id}`]
        : undefined;

    const commonProps = {
      studio,
      onSelect: onStudioSelect,
      isSelected: isSelected(studio.id),
      showSelection,
      favoriteState: favoriteState
        ? {
            isFavorited: favoriteState.isFavorited,
            favoriteCount: favoriteState.favoriteCount,
            isAuthenticated: favoriteIsAuthenticated ?? false,
          }
        : undefined,
      onFavoriteToggle: (isFavorited: boolean, favoriteCount: number) =>
        handleFavoriteToggle(studio.id, isFavorited, favoriteCount),
    };

    switch (layout) {
      case 'card':
        return <StudioHorizontalCard key={studio.id} {...commonProps} />;
      case 'grid':
        return <StudioGridCard key={studio.id} {...commonProps} />;
      case 'table':
        return <StudioTableRow key={studio.id} {...commonProps} />;
      default:
        return <StudioGridCard key={studio.id} {...commonProps} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* スタジオ一覧 */}
      {layout === 'table' ? (
        <>
          {/* PC版: テーブル */}
          <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mx-4 md:mx-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      スタジオ名
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      住所
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      最大収容人数
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      料金
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      評価
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      設備
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      統計情報
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {/* アクション列 */}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {studios.map(studio => renderStudio(studio))}
                </tbody>
              </table>
            </div>
          </div>

          {/* モバイル版: リストカード（情報密度の高い表示） */}
          <div className="md:hidden space-y-4">
            {studios.map(studio => {
              const favoriteState =
                favoriteStatesReady && favoriteIsAuthenticated !== false
                  ? favoriteStates[`studio_${studio.id}`]
                  : undefined;
              return (
                <StudioMobileListCard
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
        </>
      ) : layout === 'card' ? (
        <>
          {/* PC版: 横長カード */}
          <div className="hidden md:block space-y-3 md:space-y-4 px-4 md:px-0">
            {studios.map(studio => renderStudio(studio))}
          </div>

          {/* モバイル版: コンパクト横並びカード */}
          <div className="md:hidden space-y-3">
            {studios.map(studio => {
              const favoriteState =
                favoriteStatesReady && favoriteIsAuthenticated !== false
                  ? favoriteStates[`studio_${studio.id}`]
                  : undefined;
              return (
                <StudioMobileCompactCard
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
        </>
      ) : (
        <>
          {/* PC版: グリッドカード */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
            {studios.map(studio => renderStudio(studio))}
          </div>
          {/* モバイル版: 2列グリッド */}
          <div className="md:hidden grid grid-cols-2 gap-3">
            {studios.map(studio => {
              const favoriteState =
                favoriteStatesReady && favoriteIsAuthenticated !== false
                  ? favoriteStates[`studio_${studio.id}`]
                  : undefined;
              return (
                <StudioGridCard
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
        </>
      )}

      {/* もっと読み込む */}
      {hasMore && (
        <div className="text-center">
          <Button
            data-testid="studio-load-more"
            variant="outline"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? t('loading') : t('loadMore')}
          </Button>
        </div>
      )}

      {/* 読み込み中インジケーター */}
      {loading && studios.length > 0 && (
        <>
          {layout === 'table' ? (
            <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4">
                          <Skeleton className="h-12 w-full" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-6 w-6 mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : layout === 'card' ? (
            <div className="hidden md:block space-y-3 md:space-y-4 px-4 md:px-0">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
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
        </>
      )}
    </div>
  );
}
