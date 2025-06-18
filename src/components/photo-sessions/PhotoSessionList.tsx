'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusIcon, SearchIcon, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { PhotoSessionWithOrganizer, BookingType } from '@/types/database';
import { useTranslations } from 'next-intl';
import type { User } from '@supabase/supabase-js';

interface FilterState {
  keyword: string;
  location: string;
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
  bookingTypes: BookingType[];
  participantsMin: string;
  participantsMax: string;
  onlyAvailable: boolean;
}

interface PhotoSessionListProps {
  showCreateButton?: boolean;
  organizerId?: string;
  title?: string;
  filters?: FilterState;
  searchTrigger?: number; // 検索トリガー用の数値
}

const ITEMS_PER_PAGE = 20;

export function PhotoSessionList({
  showCreateButton = false,
  organizerId,
  title,
  filters,
  searchTrigger = 0,
}: PhotoSessionListProps) {
  const router = useRouter();
  const t = useTranslations('photoSessions');
  const [sessions, setSessions] = useState<PhotoSessionWithOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState<'start_time' | 'price' | 'created_at'>(
    'start_time'
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // フィルター変更検知用のref
  const prevFiltersRef = useRef<string>('');
  const isLoadingRef = useRef(false); // API呼び出し制御用

  const loadSessions = useCallback(
    async (reset = false) => {
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
          // 特定の主催者の撮影会を表示（プロフィールページなど）
          query = query.eq('organizer_id', organizerId);
        } else {
          // 一般的な撮影会一覧では公開済みのもののみ表示
          query = query.eq('is_published', true);

          // 自分が開催者の撮影会は除外（ログイン時のみ）
          if (authUser?.id) {
            query = query.neq('organizer_id', authUser.id);
          }
        }

        // サイドバーフィルターを優先、なければ従来のフィルターを使用
        const keyword = filters?.keyword || searchQuery;
        const location = filters?.location || locationFilter;

        if (keyword) {
          query = query.or(
            `title.ilike.%${keyword}%,description.ilike.%${keyword}%`
          );
        }

        if (location) {
          query = query.ilike('location', `%${location}%`);
        }

        // 追加のフィルター条件（サイドバーから）
        if (filters) {
          // 料金フィルター
          if (filters.priceMin) {
            query = query.gte('price_per_person', parseInt(filters.priceMin));
          }
          if (filters.priceMax) {
            query = query.lte('price_per_person', parseInt(filters.priceMax));
          }

          // 日時フィルター
          if (filters.dateFrom) {
            query = query.gte('start_time', filters.dateFrom);
          }
          if (filters.dateTo) {
            query = query.lte('start_time', filters.dateTo + 'T23:59:59');
          }

          // 参加者数フィルター
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

          // 予約方式フィルター
          if (filters.bookingTypes.length > 0) {
            query = query.in('booking_type', filters.bookingTypes);
          }

          // 空きありフィルター
          if (filters.onlyAvailable) {
            // 現在の参加者数が最大参加者数未満のもののみ
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
    [organizerId, searchQuery, locationFilter, sortBy, filters, page]
  );

  // 明示的な検索実行関数
  const handleSearch = useCallback(() => {
    setSessions([]);
    setPage(0);
    setHasMore(true);
    loadSessions(true);
  }, [loadSessions]);

  // フィルター変更時の処理（完全に検索ボタン押下式）
  useEffect(() => {
    const currentFilters = JSON.stringify({
      organizerId,
      sortBy,
      // filtersは除外 - サイドバーフィルターも手動検索のみ
    });

    // organizerIdまたはソート条件変更時のみ即座に実行
    if (currentFilters !== prevFiltersRef.current) {
      prevFiltersRef.current = currentFilters;

      // organizerIdやソート条件変更時のみ即座に実行
      setSessions([]);
      setPage(0);
      setHasMore(true);
      loadSessions(true);
    }
  }, [organizerId, sortBy, loadSessions]);

  // 初回ロード（依存関係を最小限に）
  useEffect(() => {
    if (prevFiltersRef.current === '') {
      loadSessions(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 検索トリガー変更時の処理
  useEffect(() => {
    if (searchTrigger > 0) {
      handleSearch();
    }
  }, [searchTrigger, handleSearch]);

  // クリーンアップ処理（現在は不要）
  // useEffect(() => {
  //   return () => {
  //     // デバウンス機能削除により不要
  //   };
  // }, []);

  const handleViewDetails = (sessionId: string) => {
    router.push(`/photo-sessions/${sessionId}`);
  };

  const handleEdit = (sessionId: string) => {
    // 権限チェック
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !currentUser || currentUser.id !== session.organizer_id) {
      console.error('編集権限がありません');
      // TODO: トースト通知で権限エラーを表示
      return;
    }

    // 編集ページに遷移（現在は未実装）
    console.log('編集機能は開発中です');
    // router.push(`/photo-sessions/${sessionId}/edit`);
  };

  const handleCreate = () => {
    router.push('/photo-sessions/create');
  };

  // さらに読み込む
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadSessions(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="flex p-6">
                <div className="w-48 h-32 bg-gray-200 rounded-lg mr-6"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="flex gap-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="w-32 space-y-2">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{title || t('list.title')}</h2>
        {showCreateButton && (
          <Button onClick={handleCreate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('createSession')}
          </Button>
        )}
      </div>

      {/* 検索・フィルター（サイドバーがない場合のみ表示） */}
      {!filters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('list.searchFilter')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 検索入力フィールド */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('list.keywordPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    className="pl-10"
                  />
                </div>

                <Input
                  placeholder={t('list.locationPlaceholder')}
                  value={locationFilter}
                  onChange={e => setLocationFilter(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />

                <Select
                  value={sortBy}
                  onValueChange={(
                    value: 'start_time' | 'price' | 'created_at'
                  ) => setSortBy(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('list.sortBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start_time">
                      {t('list.sortByStartTime')}
                    </SelectItem>
                    <SelectItem value="price">
                      {t('list.sortByPrice')}
                    </SelectItem>
                    <SelectItem value="created_at">
                      {t('list.sortByCreatedAt')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 検索・リセットボタン */}
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-8"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      検索中...
                    </>
                  ) : (
                    <>
                      <SearchIcon className="h-4 w-4 mr-2" />
                      検索
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setLocationFilter('');
                    setSortBy('start_time');
                  }}
                  disabled={loading}
                >
                  {t('list.reset')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 撮影会一覧 */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery || locationFilter
                ? t('list.noResults')
                : t('list.noSessions')}
            </p>
            {showCreateButton && !searchQuery && !locationFilter && (
              <Button onClick={handleCreate}>
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('list.createFirst')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 md:space-y-4 pb-8">
          {sessions.map(session => (
            <PhotoSessionCard
              key={session.id}
              session={session}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              isOwner={currentUser?.id === session.organizer_id}
              showActions={true}
              layoutMode="card"
            />
          ))}
        </div>
      )}

      {/* ページネーション */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                {t('list.loading')}
              </>
            ) : (
              t('list.loadMore')
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
