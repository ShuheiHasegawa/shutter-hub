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
import { PhotoSessionGridCard } from './PhotoSessionGridCard';
import { PhotoSessionTableRow } from './PhotoSessionTableRow';
import { PhotoSessionMobileCompactCard } from './PhotoSessionMobileCompactCard';
import { PhotoSessionMobileListCard } from './PhotoSessionMobileListCard';
import { useLayoutPreference } from '@/hooks/useLayoutPreference';
import { getBulkFavoriteStatusAction } from '@/app/actions/favorites';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Loader2, Camera } from 'lucide-react';
import { usePhotoSessions } from '@/hooks/usePhotoSessions';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useSimpleProfile';
import type { PhotoSessionWithOrganizer, BookingType } from '@/types/database';
import { useTranslations } from 'next-intl';

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
  onFiltersChange?: (filters: FilterState) => void; // フィルター変更コールバック
  layout?: 'card' | 'grid' | 'table'; // レイアウトタイプ
  sortBy?: 'start_time' | 'price' | 'created_at' | 'popularity' | 'end_time'; // 並び順
  sortOrder?: 'asc' | 'desc'; // 並び順の方向
  onSortChange?: (
    sortBy: 'start_time' | 'price' | 'created_at' | 'popularity' | 'end_time',
    sortOrder: 'asc' | 'desc'
  ) => void; // 並び順変更コールバック
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
  onFiltersChange: _onFiltersChange,
  layout: layoutProp,
  sortBy: sortByProp,
  sortOrder: sortOrderProp,
  onSortChange: _onSortChange,
}: PhotoSessionListProps) {
  const router = useRouter();
  const t = useTranslations('photoSessions');
  // 親からlayoutが渡されていない場合は、独自に取得
  const { layout: layoutFromHook } = useLayoutPreference();
  const layout = layoutProp || layoutFromHook;
  const [sessions, setSessions] = useState<PhotoSessionWithOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // filtersプロパティから検索クエリと場所フィルターを取得
  const searchQuery = filters?.keyword || '';
  const locationFilter = filters?.location || '';
  // 親からsortBy/sortOrderが渡されていない場合は、デフォルト値を使用
  const sortBy = sortByProp || 'start_time';
  const sortOrder = sortOrderProp || 'asc';
  const { user: currentUser } = useAuth();
  const { profile } = useProfile();
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

  // SWRデータ反映
  useEffect(() => {
    // キャッシュからデータが返ってきた場合も反映する
    if (swrLoading) {
      // ローディング中は何もしない
      return;
    }

    // エラーチェック
    if (swrError) {
      logger.error('撮影会一覧取得エラー:', swrError);
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
      return;
    }

    // データが存在しない場合
    if (!swrSessions) {
      return;
    }

    try {
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
        isLoadingRef: isLoadingRef.current,
        swrLoading,
        swrError: !!swrError,
        キャッシュヒット: !swrLoading && swrSessions !== undefined,
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
              newSessions.forEach(session => {
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
            newSessions.forEach(session => {
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
  }, [
    swrSessions,
    swrLoading,
    swrError,
    dataPage,
    appliedFilters?.onlyAvailable,
  ]);

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
    // コンポーネントマウント時にrefをリセット
    isLoadingRef.current = false;
    pendingResetRef.current = false;

    if (prevFiltersRef.current === '') {
      prevFiltersRef.current = 'initialized'; // 初期化済みマーク
      logger.info('[PhotoSessionList] 初回ロード開始', { organizerId });
      loadSessions(true);
    }

    // クリーンアップ: アンマウント時にrefをリセット
    return () => {
      prevFiltersRef.current = '';
      isLoadingRef.current = false;
      pendingResetRef.current = false;
    };
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
    const createUrl =
      profile?.user_type === 'organizer'
        ? '/photo-sessions/create/organizer'
        : '/photo-sessions/create';
    router.push(createUrl);
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
        {title && (
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
        )}
        <LoadingState variant="card" count={3} />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* スクロール可能なコンテンツエリア */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* 撮影会一覧 */}
        <div className="flex flex-col">
          {sessions.length === 0 && !loading ? (
            <EmptyState
              icon={Camera}
              title={
                searchQuery ||
                locationFilter ||
                filters?.keyword ||
                filters?.location
                  ? t('list.noResults')
                  : t('list.noSessions')
              }
              searchTerm={
                searchQuery ||
                locationFilter ||
                filters?.keyword ||
                filters?.location
                  ? searchQuery ||
                    locationFilter ||
                    filters?.keyword ||
                    filters?.location ||
                    undefined
                  : undefined
              }
              action={
                showCreateButton && !searchQuery && !locationFilter
                  ? {
                      label: t('list.createFirst'),
                      onClick: handleCreate,
                    }
                  : undefined
              }
            />
          ) : (
            <>
              {/* 横長カードレイアウト */}
              {layout === 'card' && (
                <>
                  {/* PC版: 横長カード */}
                  <div className="hidden md:block space-y-3 md:space-y-4 px-4 md:px-0">
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

                  {/* モバイル版: コンパクトカード */}
                  <div className="md:hidden space-y-4">
                    {sessions.map(session => {
                      const favoriteState =
                        favoriteStates[`photo_session_${session.id}`];
                      return (
                        <PhotoSessionMobileCompactCard
                          key={session.id}
                          session={session}
                          onViewDetails={handleViewDetails}
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
                </>
              )}

              {/* 3列グリッドレイアウト */}
              {layout === 'grid' && (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6 md:px-0">
                  {sessions.map(session => {
                    const favoriteState =
                      favoriteStates[`photo_session_${session.id}`];
                    return (
                      <PhotoSessionGridCard
                        key={session.id}
                        session={session}
                        onViewDetails={handleViewDetails}
                        onEdit={handleEdit}
                        isOwner={currentUser?.id === session.organizer_id}
                        showActions={true}
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

              {/* テーブルレイアウト */}
              {layout === 'table' && (
                <>
                  {/* PC版: テーブル */}
                  <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mx-4 md:mx-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('table.headers.sessionName')}
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('table.headers.dateTime')}
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('table.headers.location')}
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('table.headers.bookingStatus')}
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('table.headers.bookingType')}
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('table.headers.price')}
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {/* アクション列 */}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {sessions.map(session => (
                            <PhotoSessionTableRow
                              key={session.id}
                              session={session}
                              onViewDetails={handleViewDetails}
                              onEdit={handleEdit}
                              isOwner={currentUser?.id === session.organizer_id}
                              showActions={true}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* モバイル版: リストカード */}
                  <div className="md:hidden space-y-4">
                    {sessions.map(session => {
                      const favoriteState =
                        favoriteStates[`photo_session_${session.id}`];
                      return (
                        <PhotoSessionMobileListCard
                          key={session.id}
                          session={session}
                          onViewDetails={handleViewDetails}
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
                </>
              )}
            </>
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
              <p className="text-muted-foreground text-center mt-8">
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
