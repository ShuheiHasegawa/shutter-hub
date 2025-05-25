import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type {
  PhotoSessionWithOrganizer,
  CreatePhotoSessionData,
  UpdatePhotoSessionData,
} from '@/types/database';

// クライアントサイド用の関数
export async function createPhotoSession(data: CreatePhotoSessionData) {
  const supabase = createClient();

  const { data: session, error } = await supabase
    .from('photo_sessions')
    .insert({
      ...data,
      current_participants: 0,
    })
    .select()
    .single();

  return { data: session, error };
}

export async function updatePhotoSession(
  id: string,
  data: UpdatePhotoSessionData
) {
  const supabase = createClient();

  const { data: session, error } = await supabase
    .from('photo_sessions')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  return { data: session, error };
}

export async function deletePhotoSession(id: string) {
  const supabase = createClient();

  const { error } = await supabase.from('photo_sessions').delete().eq('id', id);

  return { error };
}

export async function getPhotoSession(id: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('photo_sessions')
    .select(
      `
      *,
      organizer:profiles(*)
    `
    )
    .eq('id', id)
    .single();

  return { data: data as PhotoSessionWithOrganizer | null, error };
}

export async function getPhotoSessions(options?: {
  published?: boolean;
  organizerId?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = createClient();

  let query = supabase
    .from('photo_sessions')
    .select(
      `
      *,
      organizer:profiles(*)
    `
    )
    .order('start_time', { ascending: true });

  if (options?.published !== undefined) {
    query = query.eq('is_published', options.published);
  }

  if (options?.organizerId) {
    query = query.eq('organizer_id', options.organizerId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 10) - 1
    );
  }

  const { data, error } = await query;

  return { data: data as PhotoSessionWithOrganizer[] | null, error };
}

export async function searchPhotoSessions(searchParams: {
  keyword?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  participantsMin?: number;
  participantsMax?: number;
  bookingTypes?: string[];
  onlyAvailable?: boolean;
  sortBy?:
    | 'start_time'
    | 'price_per_person'
    | 'created_at'
    | 'max_participants';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}) {
  const supabase = createClient();

  let query = supabase
    .from('photo_sessions')
    .select(
      `
      *,
      organizer:profiles(*),
      images:photo_session_images(*),
      _count:bookings(count)
    `
    )
    .eq('is_published', true);

  // キーワード検索
  if (searchParams.keyword) {
    query = query.or(
      `title.ilike.%${searchParams.keyword}%,description.ilike.%${searchParams.keyword}%`
    );
  }

  // 場所検索
  if (searchParams.location) {
    query = query.or(
      `location.ilike.%${searchParams.location}%,detailed_address.ilike.%${searchParams.location}%`
    );
  }

  // 日付範囲
  if (searchParams.dateFrom) {
    query = query.gte('start_time', searchParams.dateFrom);
  }

  if (searchParams.dateTo) {
    query = query.lte('start_time', searchParams.dateTo);
  }

  // 価格範囲
  if (searchParams.priceMin !== undefined) {
    query = query.gte('price_per_person', searchParams.priceMin);
  }

  if (searchParams.priceMax !== undefined) {
    query = query.lte('price_per_person', searchParams.priceMax);
  }

  // 参加者数範囲
  if (searchParams.participantsMin !== undefined) {
    query = query.gte('max_participants', searchParams.participantsMin);
  }

  if (searchParams.participantsMax !== undefined) {
    query = query.lte('max_participants', searchParams.participantsMax);
  }

  // 予約方式フィルター
  if (searchParams.bookingTypes && searchParams.bookingTypes.length > 0) {
    query = query.in('booking_type', searchParams.bookingTypes);
  }

  // 空きありフィルター（現在の参加者数が最大参加者数未満）
  if (searchParams.onlyAvailable) {
    // Supabaseでは直接カラム比較ができないため、フィルターを後で適用
    // 一旦全データを取得してからフィルタリングする必要がある
  }

  // ソート
  const sortBy = searchParams.sortBy || 'start_time';
  const sortOrder = searchParams.sortOrder === 'desc' ? false : true;
  query = query.order(sortBy, { ascending: sortOrder });

  // ページネーション
  if (searchParams.limit) {
    query = query.limit(searchParams.limit);
  }

  if (searchParams.offset) {
    query = query.range(
      searchParams.offset,
      searchParams.offset + (searchParams.limit || 10) - 1
    );
  }

  const { data, error } = await query;

  return { data: data as PhotoSessionWithOrganizer[] | null, error };
}

// サーバーサイド用の関数
export async function getPhotoSessionServer(id: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('photo_sessions')
    .select(
      `
      *,
      organizer:profiles(*)
    `
    )
    .eq('id', id)
    .single();

  return { data: data as PhotoSessionWithOrganizer | null, error };
}

export async function getPhotoSessionsServer(options?: {
  published?: boolean;
  organizerId?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerClient();

  let query = supabase
    .from('photo_sessions')
    .select(
      `
      *,
      organizer:profiles(*)
    `
    )
    .order('start_time', { ascending: true });

  if (options?.published !== undefined) {
    query = query.eq('is_published', options.published);
  }

  if (options?.organizerId) {
    query = query.eq('organizer_id', options.organizerId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 10) - 1
    );
  }

  const { data, error } = await query;

  return { data: data as PhotoSessionWithOrganizer[] | null, error };
}

// 撮影会の参加可能性チェック
export async function canJoinPhotoSession(sessionId: string, userId: string) {
  const supabase = createClient();

  // 撮影会情報を取得
  const { data: session, error: sessionError } = await supabase
    .from('photo_sessions')
    .select('max_participants, current_participants, start_time, is_published')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return { canJoin: false, reason: 'セッションが見つかりません' };
  }

  // 公開されているかチェック
  if (!session.is_published) {
    return { canJoin: false, reason: 'この撮影会は公開されていません' };
  }

  // 開始時間をチェック
  const now = new Date();
  const startTime = new Date(session.start_time);
  if (startTime <= now) {
    return { canJoin: false, reason: 'この撮影会は既に開始されています' };
  }

  // 定員チェック
  if (session.current_participants >= session.max_participants) {
    return { canJoin: false, reason: '定員に達しています' };
  }

  // 既に予約済みかチェック
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('id')
    .eq('photo_session_id', sessionId)
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .single();

  if (existingBooking) {
    return { canJoin: false, reason: '既に予約済みです' };
  }

  return { canJoin: true, reason: null };
}

// 撮影会の統計情報を取得
export async function getPhotoSessionStats(sessionId: string) {
  const supabase = createClient();

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('status')
    .eq('photo_session_id', sessionId);

  if (error) {
    return { stats: null, error };
  }

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  return { stats, error: null };
}
