'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { PhotoSessionCard } from './PhotoSessionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, MapPin, Loader2 } from 'lucide-react';
import type { PhotoSessionWithOrganizer } from '@/types/database';
import type { User } from '@supabase/supabase-js';

const ITEMS_PER_PAGE = 20;

interface SearchFilters {
  keyword?: string;
  location?: string;
  priceMin?: string;
  priceMax?: string;
  dateFrom?: string;
  dateTo?: string;
  participantsMin?: string;
  participantsMax?: string;
  bookingTypes: string[];
  onlyAvailable?: boolean;
}

interface PhotoSessionListProps {
  showCreateButton?: boolean;
  organizerId?: string;
  title?: string;
  filters?: SearchFilters;
}

export function PhotoSessionList({
  showCreateButton = false,
  organizerId,
  title,
  filters,
}: PhotoSessionListProps) {
  const router = useRouter();
  const t = useTranslations('photoSessions');
  const [sessions, setSessions] = useState<PhotoSessionWithOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // 検索フィルター（ローカル状態）
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState<'start_time' | 'price' | 'created_at'>(
    'start_time'
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 無限スクロール用のref
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const appliedFiltersRef = useRef<SearchFilters>({
    keyword: '',
    location: '',
    bookingTypes: [],
  });

  const loadSessions = useCallback(
    async (reset = false, searchFilters?: SearchFilters) => {
      // 既にローディング中の場合は重複呼び出しを防ぐ
      if (isLoadingRef.current) return;

      isLoadingRef.current = true;

      if (reset) {
        setLoading(true);
        setPage(0);
      } else {
        setLoadingMore(true);
      }

      try {
        const supabase = createClient();
        const currentPage = reset ? 0 : page;

        // 直接認証状態を取得
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (reset) {
          setCurrentUser(authUser);
        }

        let query = supabase.from('photo_sessions').select(`
          *,
          organizer:profiles!photo_sessions_organizer_id_fkey(
            id,
            display_name,
            email,
            avatar_url
          )
        `);

        // フィルター条件を適用
        if (organizerId) {
          query = query.eq('organizer_id', organizerId);
        } else {
          query = query.eq('is_published', true);
          if (authUser?.id) {
            query = query.neq('organizer_id', authUser.id);
          }
        }

        // 検索フィルターの適用（サイドバーフィルターまたは適用済みフィルター）
        const activeFilters = searchFilters || appliedFiltersRef.current;

        if (activeFilters.keyword) {
          query = query.or(
            `title.ilike.%${activeFilters.keyword}%,description.ilike.%${activeFilters.keyword}%`
          );
        }

        if (activeFilters.location) {
          query = query.ilike('location', `%${activeFilters.location}%`);
        }

        // 外部フィルター（サイドバーから）
        if (filters) {
          if (filters.priceMin) {
            query = query.gte('price_per_person', parseInt(filters.priceMin));
          }
          if (filters.priceMax) {
            query = query.lte('price_per_person', parseInt(filters.priceMax));
          }
          if (filters.dateFrom) {
            query = query.gte('start_time', filters.dateFrom);
          }
          if (filters.dateTo) {
            query = query.lte('start_time', filters.dateTo + 'T23:59:59');
          }
          if (filters.participantsMin) {
            query = query.gte(
              'max_participants',
              parseInt(filters.participantsMin)
            );
          }
          if (filters.participantsMax) {
            query = query.lte(
              'max_participants',
              parseInt(filters.participantsMax)
            );
          }
          if (filters.bookingTypes.length > 0) {
            query = query.in('booking_type', filters.bookingTypes);
          }
          if (filters.onlyAvailable) {
            query = query.filter(
              'current_participants',
              'lt',
              'max_participants'
            );
          }
        }

        // ソート条件を適用
        switch (sortBy) {
          case 'start_time':
            query = query.order('start_time', { ascending: true });
            break;
          case 'price':
            query = query.order('price_per_person', { ascending: true });
            break;
          case 'created_at':
            query = query.order('created_at', { ascending: false });
            break;
        }

        // ページネーション
        query = query.range(
          currentPage * ITEMS_PER_PAGE,
          (currentPage + 1) * ITEMS_PER_PAGE - 1
        );

        const { data, error } = await query;

        if (error) {
          console.error('撮影会一覧取得エラー:', error);
          return;
        }

        const newSessions = data || [];

        if (reset) {
          setSessions(newSessions);
        } else {
          // 重複防止：既存のIDと重複しないもののみ追加
          setSessions(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const uniqueNewSessions = newSessions.filter(
              s => !existingIds.has(s.id)
            );
            return [...prev, ...uniqueNewSessions];
          });
        }

        // 次のページがあるかチェック
        setHasMore(newSessions.length === ITEMS_PER_PAGE);

        if (!reset) {
          setPage(prev => prev + 1);
        }
      } catch (error) {
        console.error('撮影会一覧取得エラー:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isLoadingRef.current = false;
      }
    },
    [organizerId, sortBy, filters, page]
  );

  // 検索実行（明示的な検索ボタン用）
  const handleSearch = useCallback(() => {
    const newFilters: SearchFilters = {
      keyword: searchQuery.trim(),
      location: locationFilter.trim(),
      bookingTypes: [],
    };

    appliedFiltersRef.current = newFilters;
    setSessions([]);
    setPage(0);
    setHasMore(true);
    loadSessions(true, newFilters);
  }, [searchQuery, locationFilter, loadSessions]);

  // Enter キーでの検索
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 外部フィルター変更時の処理
  useEffect(() => {
    if (filters !== undefined) {
      setSessions([]);
      setPage(0);
      setHasMore(true);
      loadSessions(true);
    }
  }, [filters, loadSessions]);

  // ソート変更時の処理
  useEffect(() => {
    setSessions([]);
    setPage(0);
    setHasMore(true);
    loadSessions(true, appliedFiltersRef.current);
  }, [sortBy, loadSessions]);

  // 初回ロード
  useEffect(() => {
    loadSessions(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 無限スクロール用のIntersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const target = entries[0];
        if (
          target.isIntersecting &&
          hasMore &&
          !loading &&
          !loadingMore &&
          !isLoadingRef.current
        ) {
          loadSessions(false, appliedFiltersRef.current);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loading, loadingMore, loadSessions]);

  const handleViewDetails = (sessionId: string) => {
    router.push(`/photo-sessions/${sessionId}`);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (appliedFiltersRef.current.keyword) count++;
    if (appliedFiltersRef.current.location) count++;
    if (filters) {
      if (filters.priceMin || filters.priceMax) count++;
      if (filters.dateFrom || filters.dateTo) count++;
      if (filters.participantsMin || filters.participantsMax) count++;
      if (filters.bookingTypes.length > 0) count++;
      if (filters.onlyAvailable) count++;
    }
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title || t('list.title')}</h1>
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {activeFiltersCount}個のフィルターが適用中
              </span>
              <Badge variant="secondary" className="text-xs">
                {sessions.length}件
              </Badge>
            </div>
          )}
        </div>
        {showCreateButton && (
          <Button
            onClick={() => router.push('/photo-sessions/create')}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('actions.create')}
          </Button>
        )}
      </div>

      {/* 検索フィルター */}
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* キーワード検索 */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="撮影会タイトルで検索..."
                className="pl-10"
              />
            </div>
          </div>

          {/* 場所検索 */}
          <div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="場所で検索..."
                className="pl-10"
              />
            </div>
          </div>

          {/* 検索ボタン */}
          <div>
            <Button
              onClick={handleSearch}
              className="w-full gap-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              検索
            </Button>
          </div>
        </div>

        {/* ソート */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">並び順:</span>
          <Select
            value={sortBy}
            onValueChange={(value: typeof sortBy) => setSortBy(value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="start_time">開催日時順</SelectItem>
              <SelectItem value="price">料金順</SelectItem>
              <SelectItem value="created_at">作成日順</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 撮影会一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">読み込み中...</span>
        </div>
      ) : sessions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map(session => (
              <PhotoSessionCard
                key={session.id}
                session={session}
                onViewDetails={() => handleViewDetails(session.id)}
                isOwner={currentUser?.id === session.organizer_id}
                layoutMode="card"
              />
            ))}
          </div>

          {/* 無限スクロール用のローディング表示 */}
          <div
            ref={loadMoreRef}
            className="flex items-center justify-center py-8"
          >
            {loadingMore ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-muted-foreground">
                  さらに読み込み中...
                </span>
              </div>
            ) : hasMore ? (
              <div className="text-muted-foreground text-sm">
                スクロールして続きを読み込む
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                すべての撮影会を表示しました
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            条件に合う撮影会が見つかりませんでした
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setLocationFilter('');
              appliedFiltersRef.current = {
                keyword: '',
                location: '',
                bookingTypes: [],
              };
              setSessions([]);
              setPage(0);
              setHasMore(true);
              loadSessions(true, {
                keyword: '',
                location: '',
                bookingTypes: [],
              });
            }}
          >
            フィルターをリセット
          </Button>
        </div>
      )}
    </div>
  );
}
