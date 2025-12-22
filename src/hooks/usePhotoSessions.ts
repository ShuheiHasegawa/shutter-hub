import useSWR from 'swr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { executeParallelQueries } from '@/lib/supabase/query-wrapper';
import type { PhotoSession } from '@/types/database';

export type PhotoSessionSortBy =
  | 'start_time'
  | 'end_time'
  | 'price'
  | 'popularity'
  | 'created_at';

export interface PhotoSessionSearchParams {
  keyword?: string | null;
  location?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  dateFrom?: string | null; // ISO (YYYY-MM-DD or full ISO)
  dateTo?: string | null; // ISO (YYYY-MM-DD)
  participantsMin?: number | null;
  participantsMax?: number | null;
  bookingTypes?: string[]; // ['first_come', 'lottery', ...]
  onlyAvailable?: boolean;
  organizerId?: string | null; // プロフィール配下一覧など
  sortBy?: PhotoSessionSortBy;
  sortOrder?: 'asc' | 'desc';
  page?: number; // 0-based
  pageSize?: number; // default 20
}

interface UsePhotoSessionsResult {
  sessions: PhotoSession[] | undefined;
  totalCount: number | undefined;
  isLoading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
}

function normalizeKeyword(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/%/g, '');
}

function buildBaseQuery(
  supabase: SupabaseClient,
  params: PhotoSessionSearchParams
) {
  // ベース選択 + organizerの最低限のプロフィール情報
  let query = supabase.from('photo_sessions').select(
    `*,
    organizer:profiles!photo_sessions_organizer_id_fkey(
      id,display_name,email,avatar_url
    )`
  );

  // organizer絞り込み or 公開済み + 未来のみ + 自分開催分除外
  if (params.organizerId) {
    query = query.eq('organizer_id', params.organizerId);
  } else {
    query = query.eq('is_published', true);
    // 現在以降
    query = query.gte('start_time', new Date().toISOString());
  }

  // キーワード
  const keyword = normalizeKeyword(params.keyword);
  if (keyword) {
    query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`);
  }

  // 場所
  if (params.location) {
    query = query.ilike('location', `%${params.location}%`);
  }

  // 料金
  if (typeof params.priceMin === 'number') {
    query = query.gte('price_per_person', params.priceMin);
  }
  if (typeof params.priceMax === 'number') {
    query = query.lte('price_per_person', params.priceMax);
  }

  // 日付
  if (params.dateFrom) {
    query = query.gte('start_time', params.dateFrom);
  }
  if (params.dateTo) {
    const endInclusive = params.dateTo.includes('T')
      ? params.dateTo
      : `${params.dateTo}T23:59:59`;
    query = query.lte('start_time', endInclusive);
  }

  // 参加者数
  if (typeof params.participantsMin === 'number') {
    query = query.gte('max_participants', params.participantsMin);
  }
  if (typeof params.participantsMax === 'number') {
    query = query.lte('max_participants', params.participantsMax);
  }

  // 予約方式
  if (params.bookingTypes && params.bookingTypes.length > 0) {
    query = query.in('booking_type', params.bookingTypes);
  }

  // 空きあり
  if (params.onlyAvailable) {
    // PostgRESTでは列同士の比較フィルタは不可のため
    // サーバー側フィルタは行わず、クライアント側で絞り込む
    // （エラー回避のためここでは何もしない）
  }

  return query;
}

export function usePhotoSessions(
  rawParams: PhotoSessionSearchParams
): UsePhotoSessionsResult {
  const params: PhotoSessionSearchParams = {
    page: 0,
    pageSize: 20,
    sortBy: 'start_time',
    sortOrder: 'asc',
    bookingTypes: [],
    ...rawParams,
  };

  const swrKey = `photo-sessions:${JSON.stringify({
    keyword: params.keyword || null,
    location: params.location || null,
    priceMin: params.priceMin ?? null,
    priceMax: params.priceMax ?? null,
    dateFrom: params.dateFrom || null,
    dateTo: params.dateTo || null,
    participantsMin: params.participantsMin ?? null,
    participantsMax: params.participantsMax ?? null,
    bookingTypes: params.bookingTypes || [],
    onlyAvailable: !!params.onlyAvailable,
    organizerId: params.organizerId || null,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    page: params.page,
    pageSize: params.pageSize,
  })}`;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async () => {
      const page = params.page ?? 0;
      const pageSize = params.pageSize ?? 20;

      const queries = await executeParallelQueries({
        list: {
          operation: 'listPhotoSessions',
          queryBuilder: async (supabase: SupabaseClient) => {
            let q = buildBaseQuery(supabase, params);

            // 並び順
            const ascending = (params.sortOrder ?? 'asc') === 'asc';
            switch (params.sortBy) {
              case 'end_time':
                q = q.order('end_time', { ascending });
                break;
              case 'price':
                q = q.order('price_per_person', { ascending });
                break;
              case 'popularity':
                q = q.order('current_participants', { ascending: !ascending });
                break;
              case 'created_at':
                q = q.order('created_at', { ascending: !ascending });
                break;
              case 'start_time':
              default:
                q = q.order('start_time', { ascending });
                break;
            }

            // ページング
            const from = page * pageSize;
            const to = from + pageSize - 1;
            q = q.range(from, to);

            return q;
          },
          options: { detailed: false },
        },
      });

      const list = (queries.list as PhotoSession[]) || [];
      const totalCount = undefined;

      if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true') {
        logger.info('[usePhotoSessions] fetched', {
          page,
          pageSize,
          listSize: list.length,
          totalCount,
          params,
        });
      }

      return { list, totalCount: totalCount ?? undefined };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30_000, // 30秒: 詳細画面からの戻り時の不要なクエリ実行を抑制
      errorRetryCount: 2,
      revalidateIfStale: true, // 古いデータでも再検証（キャッシュからのデータも確実に反映）
    }
  );

  return {
    sessions: data?.list as PhotoSession[] | undefined,
    totalCount: data?.totalCount,
    isLoading,
    error,
    refresh: async () => {
      await mutate();
    },
  };
}
