'use client';

import { useState, useEffect } from 'react';
import { StudioCard } from './StudioCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getStudiosAction } from '@/app/actions/studio';
import { StudioWithStats, StudioSearchFilters } from '@/types/database';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface StudiosListProps {
  filters?: StudioSearchFilters;
  onStudioSelect?: (studio: StudioWithStats) => void;
  selectedStudioIds?: string[];
  showSelection?: boolean;
  limit?: number;
}

export function StudiosList({
  filters = {},
  onStudioSelect,
  selectedStudioIds = [],
  showSelection = false,
  limit = 20,
}: StudiosListProps) {
  const [studios, setStudios] = useState<StudioWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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
        if (append) {
          setStudios(prev => [...prev, ...result.studios!]);
        } else {
          setStudios(result.studios);
        }

        const totalItems = result.totalCount || result.studios.length;
        const currentItems = append
          ? studios.length + result.studios.length
          : result.studios.length;
        setHasMore(currentItems < totalItems);
      } else {
        setError(result.error || 'スタジオの取得に失敗しました');
      }
    } catch {
      setError('スタジオの取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // フィルターが変更されたら再取得
  useEffect(() => {
    setCurrentPage(1);
    fetchStudios(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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

  if (studios.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          条件に一致するスタジオが見つかりません
        </p>
        <p className="text-gray-400 text-sm mt-2">
          検索条件を変更してお試しください
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* スタジオ一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studios.map(studio => (
          <StudioCard
            key={studio.id}
            studio={studio}
            onSelect={onStudioSelect}
            isSelected={isSelected(studio.id)}
            showSelection={showSelection}
          />
        ))}
      </div>

      {/* もっと読み込む */}
      {hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loading}>
            {loading ? '読み込み中...' : 'もっと見る'}
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
