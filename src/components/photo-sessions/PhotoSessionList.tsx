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
import {
  PlusIcon,
  SearchIcon,
  Loader2,
  SidebarClose,
  SidebarOpen,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
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
  sidebarOpen = false,
  onToggleSidebar,
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
  const [sortBy, setSortBy] = useState<
    'start_time' | 'price' | 'created_at' | 'popularity' | 'end_time'
  >('start_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [favoriteStates, setFavoriteStates] = useState<
    Record<string, { isFavorited: boolean; favoriteCount: number }>
  >({});

  // 無限スクロール用のrefs
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // フィルター変更検知用のref
  const prevFiltersRef = useRef<string>('');
  const isLoadingRef = useRef(false); // API呼び出し制御用

  // loadSessions を通常の関数として定義（useCallbackなし）
  const loadSessions = async (reset = false) => {
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
      logger.debug('[PhotoSessionList] loadSessions開始', {
        reset,
        currentPage: reset ? 0 : page,
      });
      const supabase = createClient();
      const currentPage = reset ? 0 : page;

      // 直接認証状態を取得
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (reset) {
        setCurrentUser(authUser);
        logger.debug('[PhotoSessionList] ユーザー情報設定完了', {
          userId: authUser?.id,
        });
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

      logger.debug('[PhotoSessionList] 基本クエリ作成完了');

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

        // 過去の撮影会を除外：現在日時より後の撮影会のみ表示
        const now = new Date().toISOString();
        query = query.gte('start_time', now);
      }

      // サイドバーフィルターを優先、なければ従来のフィルターを使用
      const rawKeyword = filters?.keyword || searchQuery;
      const rawLocation = filters?.location || locationFilter;

      // 検索条件を正規化
      const keyword = normalizeSearchKeyword(rawKeyword);
      const location = normalizeLocation(rawLocation);

      logger.debug('[PhotoSessionList] 検索条件適用', {
        rawKeyword,
        keyword,
        rawLocation,
        location,
        hasFilters: !!filters,
      });

      if (keyword) {
        query = query.or(
          `title.ilike.%${keyword}%,description.ilike.%${keyword}%`
        );
        logger.debug('[PhotoSessionList] キーワード検索条件追加:', keyword);
      }

      if (location) {
        query = query.ilike('location', `%${location}%`);
        logger.debug('[PhotoSessionList] 場所検索条件追加:', location);
      }

      // 追加のフィルター条件（サイドバーから）
      if (filters) {
        logger.debug('[PhotoSessionList] 詳細フィルター適用開始', filters);

        // 料金フィルター（正規化処理適用）
        if (filters.priceMin) {
          const priceMinResult = normalizeNumberString(filters.priceMin);
          if (priceMinResult.isValid && priceMinResult.numericValue !== null) {
            query = query.gte('price_per_person', priceMinResult.numericValue);
            logger.debug('[PhotoSessionList] 最低料金フィルター:', {
              raw: filters.priceMin,
              normalized: priceMinResult.normalized,
              value: priceMinResult.numericValue,
            });
          } else {
            logger.warn('[PhotoSessionList] 無効な最低料金:', {
              raw: filters.priceMin,
              normalized: priceMinResult.normalized,
            });
          }
        }
        if (filters.priceMax) {
          const priceMaxResult = normalizeNumberString(filters.priceMax);
          if (priceMaxResult.isValid && priceMaxResult.numericValue !== null) {
            query = query.lte('price_per_person', priceMaxResult.numericValue);
            logger.debug('[PhotoSessionList] 最高料金フィルター:', {
              raw: filters.priceMax,
              normalized: priceMaxResult.normalized,
              value: priceMaxResult.numericValue,
            });
          } else {
            logger.warn('[PhotoSessionList] 無効な最高料金:', {
              raw: filters.priceMax,
              normalized: priceMaxResult.normalized,
            });
          }
        }

        // 日時フィルター
        if (filters.dateFrom) {
          query = query.gte('start_time', filters.dateFrom);
          logger.debug(
            '[PhotoSessionList] 開始日フィルター:',
            filters.dateFrom
          );
        }
        if (filters.dateTo) {
          const endDate = filters.dateTo + 'T23:59:59';
          query = query.lte('start_time', endDate);
          logger.debug('[PhotoSessionList] 終了日フィルター:', endDate);
        }

        // 参加者数フィルター（正規化処理適用）
        if (filters.participantsMin) {
          const participantsMinResult = normalizeNumberString(
            filters.participantsMin
          );
          if (
            participantsMinResult.isValid &&
            participantsMinResult.numericValue !== null
          ) {
            query = query.gte(
              'max_participants',
              participantsMinResult.numericValue
            );
            logger.debug('[PhotoSessionList] 最少参加者数フィルター:', {
              raw: filters.participantsMin,
              normalized: participantsMinResult.normalized,
              value: participantsMinResult.numericValue,
            });
          } else {
            logger.warn('[PhotoSessionList] 無効な最少参加者数:', {
              raw: filters.participantsMin,
              normalized: participantsMinResult.normalized,
            });
          }
        }
        if (filters.participantsMax) {
          const participantsMaxResult = normalizeNumberString(
            filters.participantsMax
          );
          if (
            participantsMaxResult.isValid &&
            participantsMaxResult.numericValue !== null
          ) {
            query = query.lte(
              'max_participants',
              participantsMaxResult.numericValue
            );
            logger.debug('[PhotoSessionList] 最多参加者数フィルター:', {
              raw: filters.participantsMax,
              normalized: participantsMaxResult.normalized,
              value: participantsMaxResult.numericValue,
            });
          } else {
            logger.warn('[PhotoSessionList] 無効な最多参加者数:', {
              raw: filters.participantsMax,
              normalized: participantsMaxResult.normalized,
            });
          }
        }

        // 予約方式フィルター
        if (filters.bookingTypes.length > 0) {
          query = query.in('booking_type', filters.bookingTypes);
          logger.debug(
            '[PhotoSessionList] 予約方式フィルター:',
            filters.bookingTypes
          );
        }

        // 空きありフィルター
        if (filters.onlyAvailable) {
          // 空きがある撮影会のみ表示
          // 満席でない条件：現在の参加者数 < 最大参加者数
          query = query.lt('current_participants', 'max_participants');
          logger.debug('[PhotoSessionList] 空きありフィルター適用（修正版）');
        }
      }

      // ソート条件を適用
      const ascending = sortOrder === 'asc';
      switch (sortBy) {
        case 'start_time':
          query = query.order('start_time', { ascending });
          break;
        case 'end_time':
          query = query.order('end_time', { ascending });
          break;
        case 'price':
          query = query.order('price_per_person', { ascending });
          break;
        case 'popularity':
          // 人気順は参加者数で判定（降順がデフォルト）
          query = query.order('current_participants', {
            ascending: !ascending,
          });
          break;
        case 'created_at':
          query = query.order('created_at', { ascending: !ascending });
          break;
      }

      // ページネーション
      const rangeStart = currentPage * ITEMS_PER_PAGE;
      const rangeEnd = (currentPage + 1) * ITEMS_PER_PAGE - 1;
      query = query.range(rangeStart, rangeEnd);

      logger.debug('[PhotoSessionList] クエリ実行直前', {
        rangeStart,
        rangeEnd,
        currentPage,
        ITEMS_PER_PAGE,
        sortBy,
        sortOrder,
      });

      const { data, error } = await query;

      if (error) {
        logger.error('[PhotoSessionList] 撮影会一覧取得エラー詳細:', {
          error,
          errorMessage: error?.message,
          errorCode: error?.code,
          errorDetails: error?.details,
          errorHint: error?.hint,
          filters: filters,
          searchQuery,
          locationFilter,
          currentPage,
          sortBy,
          sortOrder,
        });
        return;
      }

      const newSessions = data || [];
      logger.debug('[PhotoSessionList] データ取得完了', {
        取得件数: newSessions.length,
        ページ: currentPage,
        リセット: reset,
      });

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

      // お気に入り状態を一括取得
      if (newSessions.length > 0) {
        const favoriteItems = newSessions.map(session => ({
          type: 'photo_session' as const,
          id: session.id,
        }));

        try {
          const favoriteResult = await getBulkFavoriteStatusAction(
            favoriteItems
          ).catch(error => {
            logger.error(
              '[PhotoSessionList] getBulkFavoriteStatusAction Server Action Error:',
              error
            );
            return {
              success: false,
              error: 'Server Action呼び出しエラー',
              favoriteStates: {},
            };
          });

          // favoriteResultがundefinedでないことを確認
          if (favoriteResult && favoriteResult.success) {
            if (reset) {
              setFavoriteStates(favoriteResult.favoriteStates);
            } else {
              setFavoriteStates(prev => ({
                ...prev,
                ...favoriteResult.favoriteStates,
              }));
            }
          } else {
            logger.warn(
              '[PhotoSessionList] お気に入り状態取得失敗 - レスポンスが無効:',
              favoriteResult
            );
          }
        } catch (error) {
          logger.error('[PhotoSessionList] お気に入り状態取得エラー:', error);
        }
      }

      // 次のページがあるかチェック
      const hasMoreData = newSessions.length === ITEMS_PER_PAGE;
      setHasMore(hasMoreData);

      logger.debug('[PhotoSessionList] hasMore更新', {
        newSessionsLength: newSessions.length,
        ITEMS_PER_PAGE,
        hasMoreData,
        nextPage: reset ? 1 : page + 1,
      });

      if (!reset) {
        setPage(prev => prev + 1);
      }
    } catch (error) {
      logger.error('撮影会一覧取得エラー:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
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
    });
    setSessions([]);
    setPage(0);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, sessions.length]); // loadSessions の依存関係を削除

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
    <div>
      {/* ヘッダーコントロール */}
      <div className="flex justify-between items-center py-2">
        {/* 左側: フィルタートグルアイコン */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={sidebarOpen ? 'フィルターを閉じる' : 'フィルターを開く'}
          aria-label={sidebarOpen ? 'フィルターを閉じる' : 'フィルターを開く'}
        >
          {sidebarOpen ? (
            <SidebarClose className="h-5 w-5" />
          ) : (
            <SidebarOpen className="h-5 w-5" />
          )}
        </Button>

        {/* 右側: 並び順と撮影会作成ボタン */}
        <div className="flex items-center gap-2">
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

          {/* 撮影会作成ボタン */}
          <Button asChild size="sm" variant="cta">
            <Link href="/photo-sessions/create">
              <Plus className="h-4 w-4 mr-2" />
              撮影会を作成
            </Link>
          </Button>
        </div>
      </div>

      {/* 検索・フィルター（サイドバーがない場合のみ表示） */}
      {!filters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('list.searchFilter')}</CardTitle>
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
      {sessions.length === 0 && !loading ? (
        <Card>
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
        <div className="space-y-3 md:space-y-4 pb-8">
          {sessions.map(session => {
            const favoriteState = favoriteStates[`photo_session_${session.id}`];
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
                  handleFavoriteToggle(session.id, isFavorited, favoriteCount)
                }
              />
            );
          })}
        </div>
      )}

      {/* 無限スクロール用のトリガー要素 */}
      <div className="flex justify-center pb-8">
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
  );
}
