'use client';

import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  normalizeSearchKeyword,
  normalizeLocation,
  normalizeNumberString,
} from '@/lib/utils/input-normalizer';
import { useRouter } from 'next/navigation';
import { PhotoSessionCard } from './PhotoSessionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getBulkFavoriteStatusAction } from '@/app/actions/favorites';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlusIcon, SearchIcon, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { usePhotoSessions } from '@/hooks/usePhotoSessions';
import type { PhotoSessionWithOrganizer, BookingType } from '@/types/database';
import { useTranslations } from 'next-intl';
import type { User } from '@supabase/supabase-js';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
  sidebarOpen?: boolean; // サイドバーの開閉状態
  onToggleSidebar?: () => void; // サイドバートグル関数
}

const ITEMS_PER_PAGE = 20;

export function PhotoSessionList({
  showCreateButton = false,
  organizerId,
  title,
  filters,
  searchTrigger = 0,
  sidebarOpen: _sidebarOpen = false,
  onToggleSidebar: _onToggleSidebar,
}: PhotoSessionListProps) {
  const router = useRouter();
  const t = useTranslations('photoSessions');
  const [sessions, setSessions] = useState<PhotoSessionWithOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState<
    'start_time' | 'price' | 'created_at' | 'popularity' | 'end_time'
  >('start_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [favoriteStates, setFavoriteStates] = useState<
    Record<string, { isFavorited: boolean; favoriteCount: number }>
  >({});
  const [dataPage, setDataPage] = useState(0);
  // 確定済みフィルター（検索ボタン押下時のみ更新）
  const [appliedFilters, setAppliedFilters] = useState<FilterState | undefined>(
    filters
  );
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [appliedLocationFilter, setAppliedLocationFilter] = useState('');

  // 無限スクロール用のrefs
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // フィルター変更検知用のref
  const prevFiltersRef = useRef<string>('');
  const isLoadingRef = useRef(false); // API呼び出し制御用
  const pendingResetRef = useRef(false);

  // SWRパラメータ構築（確定済みフィルターのみ使用）
  const swrParams = {
    keyword:
      normalizeSearchKeyword(appliedFilters?.keyword || appliedSearchQuery) ||
      null,
    location:
      normalizeLocation(appliedFilters?.location || appliedLocationFilter) ||
      null,
    priceMin: appliedFilters?.priceMin
      ? Number(normalizeNumberString(appliedFilters.priceMin).numericValue)
      : null,
    priceMax: appliedFilters?.priceMax
      ? Number(normalizeNumberString(appliedFilters.priceMax).numericValue)
      : null,
    dateFrom: appliedFilters?.dateFrom || null,
    dateTo: appliedFilters?.dateTo || null,
    participantsMin: appliedFilters?.participantsMin
      ? Number(
          normalizeNumberString(appliedFilters.participantsMin).numericValue
        )
      : null,
    participantsMax: appliedFilters?.participantsMax
      ? Number(
          normalizeNumberString(appliedFilters.participantsMax).numericValue
        )
      : null,
    bookingTypes: (appliedFilters?.bookingTypes || []).map(b => String(b)),
    onlyAvailable: !!appliedFilters?.onlyAvailable,
    organizerId: organizerId || null,
    sortBy: sortBy,
    sortOrder: sortOrder,
    page: dataPage,
    pageSize: ITEMS_PER_PAGE + 1, // +1件でhasMore判定
  };

  // SWRフック使用
  const {
    sessions: swrSessions,
    isLoading: swrLoading,
    error: swrError,
  } = usePhotoSessions(swrParams);

  // マウント時に認証ユーザー取得（isOwner判定用）
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user ?? null);
    });
  }, []);

  // SWRデータ反映
  useEffect(() => {
    if (!isLoadingRef.current) return;
    if (swrLoading) return;

    try {
      if (swrError) {
        logger.error('撮影会一覧取得エラー:', swrError);
        return;
      }

      let fetched = (swrSessions || []) as PhotoSessionWithOrganizer[];
      // クライアント側で「空きあり」を絞り込む（サーバー側比較が不可のため）
      const onlyAvail = (appliedFilters?.onlyAvailable ?? false) || false;
      if (onlyAvail) {
        fetched = fetched.filter(
          s =>
            typeof s.max_participants === 'number' &&
            typeof s.current_participants === 'number' &&
            s.current_participants < s.max_participants
        );
      }
      const hasMoreData = fetched.length > ITEMS_PER_PAGE;
      const newSessions = hasMoreData
        ? fetched.slice(0, ITEMS_PER_PAGE)
        : fetched;

      logger.debug('[PhotoSessionList] SWRデータ反映', {
        取得件数: newSessions.length,
        ページ: dataPage,
        リセット: pendingResetRef.current,
      });

      if (pendingResetRef.current) {
        setSessions(newSessions);
      } else {
        setSessions(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const uniqueNewSessions = newSessions.filter(
            s => !existingIds.has(s.id)
          );
          return [...prev, ...uniqueNewSessions];
        });
      }

      // お気に入り状態を一括取得
      if (newSessions.length > 0) {
        const favoriteItems = newSessions.map(session => ({
          type: 'photo_session' as const,
          id: session.id,
        }));

        logger.debug('[PhotoSessionList] 一括お気に入り状態取得開始', {
          itemsCount: favoriteItems.length,
          sessionIds: favoriteItems.map(item => item.id),
        });

        getBulkFavoriteStatusAction(favoriteItems)
          .then(favoriteResult => {
            if (favoriteResult && favoriteResult.success) {
              logger.debug('[PhotoSessionList] 一括お気に入り状態取得成功', {
                statesCount: Object.keys(favoriteResult.favoriteStates).length,
                isPendingReset: pendingResetRef.current,
              });

              if (pendingResetRef.current) {
                setFavoriteStates(favoriteResult.favoriteStates);
              } else {
                setFavoriteStates(prev => ({
                  ...prev,
                  ...favoriteResult.favoriteStates,
                }));
              }
            } else {
              logger.warn(
                '[PhotoSessionList] お気に入り状態取得失敗:',
                favoriteResult
              );
              // 一括取得が失敗した場合でも、空のfavoriteStateを設定して個別の呼び出しを防ぐ
              const emptyStates: Record<
                string,
                { isFavorited: boolean; favoriteCount: number }
              > = {};
              sessions.forEach(session => {
                emptyStates[`photo_session_${session.id}`] = {
                  isFavorited: false,
                  favoriteCount: 0,
                };
              });
              if (pendingResetRef.current) {
                setFavoriteStates(emptyStates);
              } else {
                setFavoriteStates(prev => ({
                  ...prev,
                  ...emptyStates,
                }));
              }
            }
          })
          .catch(error => {
            logger.error('[PhotoSessionList] お気に入り状態取得エラー:', error);
            // エラー時も空のfavoriteStateを設定して個別の呼び出しを防ぐ
            const emptyStates: Record<
              string,
              { isFavorited: boolean; favoriteCount: number }
            > = {};
            sessions.forEach(session => {
              emptyStates[`photo_session_${session.id}`] = {
                isFavorited: false,
                favoriteCount: 0,
              };
            });
            if (pendingResetRef.current) {
              setFavoriteStates(emptyStates);
            } else {
              setFavoriteStates(prev => ({
                ...prev,
                ...emptyStates,
              }));
            }
          });
      }

      setHasMore(hasMoreData);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
      pendingResetRef.current = false;
    }
  }, [swrSessions, swrLoading, swrError, dataPage]);

  // loadSessions を通常の関数として定義（SWRトリガー用）
  const loadSessions = (reset = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    if (reset) {
      setLoading(true);
      setDataPage(0);
      pendingResetRef.current = true;
    } else {
      setLoadingMore(true);
      setDataPage(prev => prev + 1);
    }
  };

  // 明示的な検索実行関数（通常の関数として定義）
  const handleSearch = () => {
    logger.info('[PhotoSessionList] handleSearch実行開始', {
      searchQuery,
      locationFilter,
      sortBy,
      sortOrder,
      filters,
      appliedBefore: appliedFilters,
    });
    // 確定済みフィルターを更新（これによりSWRキーが変わってフェッチが走る）
    setAppliedFilters(filters);
    setAppliedSearchQuery(searchQuery);
    setAppliedLocationFilter(locationFilter);
    logger.info('[PhotoSessionList] 確定済みフィルター更新完了', {
      newAppliedFilters: filters,
      newAppliedSearchQuery: searchQuery,
      newAppliedLocationFilter: locationFilter,
    });
    setSessions([]);
    setHasMore(true);
    loadSessions(true);
  };

  // 初回ロードのみ（1回だけ実行）
  useEffect(() => {
    if (prevFiltersRef.current === '') {
      prevFiltersRef.current = 'initialized'; // 初期化済みマーク
      logger.info('[PhotoSessionList] 初回ロード開始', { organizerId });
      loadSessions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存関係なし - 1回のみ実行

  // 検索トリガー変更時の処理
  useEffect(() => {
    if (searchTrigger > 0) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTrigger]); // handleSearch は依存関係から除外

  // 無限スクロール用のIntersection Observer設定
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;

    logger.debug('[PhotoSessionList] IntersectionObserver setup', {
      trigger: !!trigger,
      hasMore,
      sessionsLength: sessions.length,
      loadingMore,
    });

    // hasMoreがfalseの場合は監視を停止
    if (!trigger || !hasMore) {
      logger.debug('[PhotoSessionList] IntersectionObserver監視停止', {
        trigger: !!trigger,
        hasMore,
      });
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      return;
    }

    // 既存のObserverがある場合は一度切断
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Intersection Observer を作成
    observerRef.current = new IntersectionObserver(
      entries => {
        const [entry] = entries;

        logger.debug('[PhotoSessionList] IntersectionObserver発火', {
          isIntersecting: entry.isIntersecting,
          hasMore,
          loadingMore,
          isLoadingRefCurrent: isLoadingRef.current,
          sessionsLength: sessions.length,
          intersectionRatio: entry.intersectionRatio,
        });

        // 要素が画面に入り、まだデータがあり、ローディング中でない場合
        if (
          entry.isIntersecting &&
          hasMore &&
          !loadingMore &&
          !isLoadingRef.current &&
          sessions.length > 0 // 初回ロード完了後のみ
        ) {
          logger.info(
            '[PhotoSessionList] 無限スクロール条件満たした - 追加ロード開始'
          );
          // 少し遅延を入れて連続呼び出しを防ぐ
          setTimeout(() => {
            if (hasMore && !isLoadingRef.current && !loadingMore) {
              logger.debug(
                '[PhotoSessionList] 遅延後の条件チェック通過 - loadSessions実行'
              );
              loadSessions(false); // 追加ロード
            } else {
              logger.debug('[PhotoSessionList] 遅延後の条件チェック失敗', {
                hasMore,
                isLoadingRefCurrent: isLoadingRef.current,
                loadingMore,
              });
            }
          }, 200); // 遅延を少し長くして安全性を向上
        }
      },
      {
        // 50px手前で発火（先読みを少し控えめに）
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    // 監視開始
    observerRef.current.observe(trigger);
    logger.debug('[PhotoSessionList] IntersectionObserver監視開始');

    // クリーンアップ
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, sessions.length]);

  // クリーンアップ処理
  useEffect(() => {
    return () => {
      // コンポーネントアンマウント時にObserverをクリーンアップ
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  const handleViewDetails = (sessionId: string) => {
    router.push(`/photo-sessions/${sessionId}`);
  };

  const handleEdit = (sessionId: string) => {
    // 権限チェック
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !currentUser || currentUser.id !== session.organizer_id) {
      logger.error('編集権限がありません');
      // TODO: トースト通知で権限エラーを表示
      return;
    }

    // 編集ページに遷移（現在は未実装）
    logger.debug('編集機能は開発中です');
    // router.push(`/photo-sessions/${sessionId}/edit`);
  };

  const handleCreate = () => {
    router.push('/photo-sessions/create');
  };

  // お気に入り状態変更のコールバック
  const handleFavoriteToggle = (
    sessionId: string,
    isFavorited: boolean,
    favoriteCount: number
  ) => {
    setFavoriteStates(prev => ({
      ...prev,
      [`photo_session_${sessionId}`]: {
        isFavorited,
        favoriteCount,
      },
    }));
  };

  // handleLoadMore関数は無限スクロールにより不要

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card
              key={i}
              className="animate-pulse-gentle"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${2.5 + i * 0.1}s`,
              }}
            >
              <div className="flex p-6">
                <div className="w-48 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mr-6"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  <div className="flex gap-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
                <div className="w-32 space-y-2">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </Card>
          ))}
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin-slow rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-muted-foreground">
              読み込み中...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ヘッダーコントロール - 固定 */}
      <div className="flex-shrink-0 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b flex justify-between items-center py-2">
        {/* 左側: 空きがある撮影会のみ（PC表示） */}
        <div className="hidden md:flex items-center gap-2 pl-4">
          <Checkbox
            id="only-available-header"
            checked={
              !!appliedFilters?.onlyAvailable || !!filters?.onlyAvailable
            }
            onCheckedChange={checked => {
              const next = checked === true;
              // ローカルの確定フィルタに即時反映して再検索する
              const newFilters = {
                ...(filters || {
                  keyword: '',
                  location: '',
                  priceMin: '',
                  priceMax: '',
                  dateFrom: '',
                  dateTo: '',
                  bookingTypes: [] as BookingType[],
                  participantsMin: '',
                  participantsMax: '',
                  onlyAvailable: false,
                }),
                onlyAvailable: next,
              } as FilterState;

              setAppliedFilters(newFilters);
              setAppliedSearchQuery(searchQuery);
              setAppliedLocationFilter(locationFilter);
              setSessions([]);
              setHasMore(true);
              loadSessions(true);
            }}
          />
          <Label
            htmlFor="only-available-header"
            className="text-sm font-normal cursor-pointer select-none"
          >
            {t('sidebar.onlyAvailable')}
          </Label>
        </div>

        {/* 右側: 並び順と撮影会作成ボタン */}
        <div className="flex items-center gap-2 justify-end flex-1">
          {/* 並び順 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              並び順:
            </span>
            <Select
              value={`${sortBy}_${sortOrder}`}
              onValueChange={value => {
                const [newSortBy, newSortOrder] = value.split('_') as [
                  (
                    | 'start_time'
                    | 'price'
                    | 'created_at'
                    | 'popularity'
                    | 'end_time'
                  ),
                  'asc' | 'desc',
                ];
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
            >
              <SelectTrigger className="w-[180px] sm:w-[200px]">
                <SelectValue placeholder="並び順" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start_time_asc">
                  開催日時順（早い順）
                </SelectItem>
                <SelectItem value="start_time_desc">
                  開催日時順（遅い順）
                </SelectItem>
                <SelectItem value="end_time_asc">
                  終了日時順（早い順）
                </SelectItem>
                <SelectItem value="end_time_desc">
                  終了日時順（遅い順）
                </SelectItem>
                <SelectItem value="price_asc">価格順（安い順）</SelectItem>
                <SelectItem value="price_desc">価格順（高い順）</SelectItem>
                <SelectItem value="popularity_desc">
                  人気順（高い順）
                </SelectItem>
                <SelectItem value="popularity_asc">人気順（低い順）</SelectItem>
                <SelectItem value="created_at_desc">
                  新着順（新しい順）
                </SelectItem>
                <SelectItem value="created_at_asc">新着順（古い順）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 撮影会を作成ボタン */}
          <Button asChild size="sm" variant="cta">
            <Link href="/photo-sessions/create">
              <Plus className="h-4 w-4 mr-2" />
              撮影会を作成
            </Link>
          </Button>
        </div>
      </div>

      {/* スクロール可能なコンテンツエリア */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* 検索・フィルター（サイドバーがない場合のみ表示） */}
        {!filters && (
          <Card className="m-4 flex-shrink-0">
            <CardHeader>
              <CardTitle className="text-lg">
                {t('list.searchFilter')}
              </CardTitle>
            </CardHeader>
            <Separator className="my-2" />
            <CardContent>
              <div className="space-y-4">
                {/* 検索入力フィールド */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('list.keywordPlaceholder')}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Input
                    placeholder={t('list.locationPlaceholder')}
                    value={locationFilter}
                    onChange={e => setLocationFilter(e.target.value)}
                  />
                </div>

                {/* 検索・リセットボタン */}
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-8"
                    variant="action"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin-slow h-4 w-4 mr-2" />
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
                      setSortOrder('asc');
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
        <div className="flex flex-col">
          {sessions.length === 0 && !loading ? (
            <Card className="flex-shrink-0">
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchQuery ||
                  locationFilter ||
                  filters?.keyword ||
                  filters?.location
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
            <div className="space-y-3 md:space-y-4">
              {sessions.map(session => {
                const favoriteState =
                  favoriteStates[`photo_session_${session.id}`];
                return (
                  <PhotoSessionCard
                    key={session.id}
                    session={session}
                    onViewDetails={handleViewDetails}
                    onEdit={handleEdit}
                    isOwner={currentUser?.id === session.organizer_id}
                    showActions={true}
                    layoutMode="card"
                    favoriteState={favoriteState}
                    onFavoriteToggle={(isFavorited, favoriteCount) =>
                      handleFavoriteToggle(
                        session.id,
                        isFavorited,
                        favoriteCount
                      )
                    }
                  />
                );
              })}
            </div>
          )}

          {/* 無限スクロール用のトリガー要素 */}
          <div className="flex justify-center pt-4 pb-24 md:pb-28 lg:pb-32 flex-shrink-0">
            {loadingMore && (
              <div className="flex items-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin-slow" />
                さらに読み込み中...
              </div>
            )}
            {!hasMore && sessions.length > 0 && (
              <p className="text-muted-foreground text-center">
                すべての撮影会を表示しました
              </p>
            )}
            {/* hasMoreがtrueの場合のみトリガー要素を表示 */}
            {hasMore && !loadingMore && sessions.length > 0 && (
              <div
                ref={loadMoreTriggerRef}
                className="flex justify-center min-h-[20px] w-full"
                style={{ minHeight: '20px' }}
              >
                <p className="text-muted-foreground text-center text-sm">
                  スクロールして続きを読み込む
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
