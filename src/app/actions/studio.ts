'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import Logger from '@/lib/logger';
import {
  Studio,
  StudioPhoto,
  StudioEquipment,
  StudioEvaluation,
  StudioWithStats,
  StudioSearchFilters,
} from '@/types/database';
import { DEFAULT_STUDIO_SEARCH } from '@/constants/studio';

// =============================================================================
// スタジオ一覧・検索
// =============================================================================

/**
 * スタジオ一覧を取得する
 */
export async function getStudiosAction(
  filters: StudioSearchFilters = {}
): Promise<{
  success: boolean;
  studios?: StudioWithStats[];
  totalCount?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('studios')
      .select(
        `
        *,
        studio_photos!inner(
          id,
          image_url,
          image_filename,
          alt_text,
          caption,
          category,
          photo_type,
          display_order
        )
      `
      )
      .eq('verification_status', 'verified')
      .order('created_at', { ascending: false });

    // フィルタリング
    if (filters.query) {
      query = query.or(
        `name.ilike.%${filters.query}%,address.ilike.%${filters.query}%`
      );
    }

    if (filters.prefecture && filters.prefecture !== 'all') {
      query = query.eq('prefecture', filters.prefecture);
    }

    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    if (filters.min_capacity) {
      query = query.gte('max_capacity', filters.min_capacity);
    }

    if (filters.max_capacity) {
      query = query.lte('max_capacity', filters.max_capacity);
    }

    if (filters.min_hourly_rate) {
      query = query.gte('hourly_rate_min', filters.min_hourly_rate);
    }

    if (filters.max_hourly_rate) {
      query = query.lte('hourly_rate_max', filters.max_hourly_rate);
    }

    if (filters.parking_available !== undefined) {
      query = query.eq('parking_available', filters.parking_available);
    }

    if (filters.wifi_available !== undefined) {
      query = query.eq('wifi_available', filters.wifi_available);
    }

    // ソート
    if (filters.sort_by) {
      const ascending = filters.sort_order === 'asc';
      query = query.order(filters.sort_by, { ascending });
    }

    // ページネーション
    const limit = filters.limit || DEFAULT_STUDIO_SEARCH.limit;
    if (filters.page && limit) {
      const offset = (filters.page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      Logger.error('スタジオ一覧取得エラー:', error);
      return { success: false, error: 'スタジオ一覧の取得に失敗しました' };
    }

    // StudioWithStats形式に変換
    const studios: StudioWithStats[] = (data || []).map(
      (studio: Studio & { studio_photos: StudioPhoto[] }) => {
        const photos = studio.studio_photos || [];
        const featuredPhotos = photos
          .filter((photo: StudioPhoto) => photo.display_order <= 3)
          .sort(
            (a: StudioPhoto, b: StudioPhoto) =>
              a.display_order - b.display_order
          )
          .map((photo: StudioPhoto) => ({
            ...photo,
            photo_url: photo.image_url, // 後方互換性
            is_featured: photo.display_order === 1, // 後方互換性
          }));

        return {
          ...studio,
          featuredPhotos,
          equipment_count: 0, // TODO: 実際のカウント
          photo_count: photos.length,
          evaluation_count: 0, // TODO: 実際のカウント
          average_rating: 0, // TODO: 実際の平均
        };
      }
    );

    return {
      success: true,
      studios,
      totalCount: count || studios.length,
    };
  } catch (error) {
    Logger.error('スタジオ一覧取得失敗:', error);
    return {
      success: false,
      error: 'スタジオ一覧の取得中にエラーが発生しました',
    };
  }
}

/**
 * スタジオ詳細を取得する
 */
export async function getStudioDetailAction(studioId: string): Promise<{
  success: boolean;
  studio?: StudioWithStats;
  equipment?: StudioEquipment[];
  photos?: StudioPhoto[];
  evaluations?: StudioEvaluation[];
  averageRatings?: {
    overall: number;
    accessibility: number;
    cleanliness: number;
    staff_support: number;
    cost_performance: number;
    byRole: {
      model: number;
      photographer: number;
      organizer: number;
    };
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // 並行して関連データを取得
    const [
      { data: studio, error: studioError },
      { data: equipment },
      { data: photos },
      { data: evaluations },
    ] = await Promise.all([
      supabase
        .from('studios')
        .select('*')
        .eq('id', studioId)
        .eq('verification_status', 'verified')
        .single(),

      supabase
        .from('studio_equipment')
        .select('*')
        .eq('studio_id', studioId)
        .order('category', { ascending: true }),

      supabase
        .from('studio_photos')
        .select('*')
        .eq('studio_id', studioId)
        .order('display_order', { ascending: true }),

      supabase
        .from('studio_evaluations')
        .select('*')
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (studioError || !studio) {
      Logger.error('スタジオ詳細取得エラー:', studioError);
      return { success: false, error: 'スタジオが見つかりません' };
    }

    // 評価の統計計算
    const evalData = evaluations || [];
    const overallRatings = evalData
      .map((e: StudioEvaluation) => e.overall_rating)
      .filter((r: number) => r > 0);
    const accessibilityRatings = evalData
      .map((e: StudioEvaluation) => e.accessibility_rating)
      .filter((r: number | undefined): r is number => r !== undefined && r > 0);
    const cleanlinessRatings = evalData
      .map((e: StudioEvaluation) => e.cleanliness_rating)
      .filter((r: number | undefined): r is number => r !== undefined && r > 0);
    const staffSupportRatings = evalData
      .map((e: StudioEvaluation) => e.staff_support_rating)
      .filter((r: number | undefined): r is number => r !== undefined && r > 0);
    const costPerformanceRatings = evalData
      .map((e: StudioEvaluation) => e.cost_performance_rating)
      .filter((r: number | undefined): r is number => r !== undefined && r > 0);

    const calculateAverage = (ratings: number[]) =>
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    const averageRatings = {
      overall: calculateAverage(overallRatings),
      accessibility: calculateAverage(accessibilityRatings),
      cleanliness: calculateAverage(cleanlinessRatings),
      staff_support: calculateAverage(staffSupportRatings),
      cost_performance: calculateAverage(costPerformanceRatings),
      byRole: {
        model: calculateAverage(
          evalData
            .filter((e: StudioEvaluation) => e.user_role === 'model')
            .map((e: StudioEvaluation) => e.overall_rating)
        ),
        photographer: calculateAverage(
          evalData
            .filter((e: StudioEvaluation) => e.user_role === 'photographer')
            .map((e: StudioEvaluation) => e.overall_rating)
        ),
        organizer: calculateAverage(
          evalData
            .filter((e: StudioEvaluation) => e.user_role === 'organizer')
            .map((e: StudioEvaluation) => e.overall_rating)
        ),
      },
    };

    // StudioWithStats形式に変換
    const featuredPhotos = (photos || [])
      .filter(photo => photo.display_order <= 3)
      .sort((a, b) => a.display_order - b.display_order)
      .map(photo => ({
        ...photo,
        photo_url: photo.image_url, // 後方互換性
        is_featured: photo.display_order === 1, // 後方互換性
      }));

    const studioWithStats: StudioWithStats = {
      ...studio,
      featuredPhotos,
      equipment_count: equipment?.length || 0,
      photo_count: photos?.length || 0,
      evaluation_count: evalData.length,
      average_rating: averageRatings.overall,
    };

    // 後方互換性のための変換
    const processedPhotos = (photos || []).map(photo => ({
      ...photo,
      photo_url: photo.image_url,
      is_featured: photo.display_order === 1,
    }));

    return {
      success: true,
      studio: studioWithStats,
      equipment: equipment || [],
      photos: processedPhotos,
      evaluations: evalData,
      averageRatings,
    };
  } catch (error) {
    Logger.error('スタジオ詳細取得失敗:', error);
    return {
      success: false,
      error: 'スタジオ詳細の取得中にエラーが発生しました',
    };
  }
}

// =============================================================================
// スタジオ作成・更新・削除
// =============================================================================

/**
 * スタジオを作成する
 */
export async function createStudioAction(formData: Partial<Studio>): Promise<{
  success: boolean;
  studio?: Studio;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 正規化データの準備
    if (!formData.name || !formData.address) {
      return { success: false, error: 'スタジオ名と住所は必須です' };
    }

    const normalizedName = formData.name.toLowerCase().trim();
    const normalizedAddress = formData.address.toLowerCase().trim();
    const locationHash = `${normalizedName}_${normalizedAddress}`.replace(
      /\s+/g,
      '_'
    );

    const studioData = {
      ...formData,
      normalized_name: normalizedName,
      normalized_address: normalizedAddress,
      location_hash: locationHash,
      verification_status: 'pending' as const,
      created_by: user.id,
    };

    const { data: studio, error } = await supabase
      .from('studios')
      .insert(studioData)
      .select()
      .single();

    if (error) {
      Logger.error('スタジオ作成エラー:', error);
      return { success: false, error: 'スタジオの作成に失敗しました' };
    }

    revalidatePath('/studios');
    Logger.info('スタジオ作成成功:', { studioId: studio.id, userId: user.id });

    return { success: true, studio };
  } catch (error) {
    Logger.error('スタジオ作成失敗:', error);
    return {
      success: false,
      error: 'スタジオ作成中にエラーが発生しました',
    };
  }
}

/**
 * スタジオを更新する
 */
export async function updateStudioAction(
  studioId: string,
  formData: Partial<Studio>
): Promise<{
  success: boolean;
  studio?: Studio;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 既存スタジオの確認
    const { data: existingStudio, error: fetchError } = await supabase
      .from('studios')
      .select('*')
      .eq('id', studioId)
      .single();

    if (fetchError || !existingStudio) {
      return { success: false, error: 'スタジオが見つかりません' };
    }

    // 更新データの準備
    const updateData: Partial<Studio> = { ...formData };

    if (formData.name) {
      updateData.normalized_name = formData.name.toLowerCase().trim();
    }

    if (formData.address) {
      updateData.normalized_address = formData.address.toLowerCase().trim();
    }

    if (formData.name || formData.address) {
      const name = formData.name || existingStudio.name;
      const address = formData.address || existingStudio.address;
      updateData.location_hash =
        `${name.toLowerCase().trim()}_${address.toLowerCase().trim()}`.replace(
          /\s+/g,
          '_'
        );
    }

    const { data: studio, error } = await supabase
      .from('studios')
      .update(updateData)
      .eq('id', studioId)
      .select()
      .single();

    if (error) {
      Logger.error('スタジオ更新エラー:', error);
      return { success: false, error: 'スタジオの更新に失敗しました' };
    }

    revalidatePath('/studios');
    revalidatePath(`/studios/${studioId}`);
    Logger.info('スタジオ更新成功:', { studioId, userId: user.id });

    return { success: true, studio };
  } catch (error) {
    Logger.error('スタジオ更新失敗:', error);
    return {
      success: false,
      error: 'スタジオ更新中にエラーが発生しました',
    };
  }
}

/**
 * スタジオを削除する（ソフトデリート）
 */
export async function deleteStudioAction(studioId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // 管理者権限チェック（実装予定）
    // TODO: ユーザーの権限確認

    const { error } = await supabase
      .from('studios')
      .update({ verification_status: 'rejected' })
      .eq('id', studioId);

    if (error) {
      Logger.error('スタジオ削除エラー:', error);
      return { success: false, error: 'スタジオの削除に失敗しました' };
    }

    revalidatePath('/studios');
    Logger.info('スタジオ削除成功:', { studioId, userId: user.id });

    return { success: true };
  } catch (error) {
    Logger.error('スタジオ削除失敗:', error);
    return {
      success: false,
      error: 'スタジオ削除中にエラーが発生しました',
    };
  }
}

// =============================================================================
// 検索・フィルタリング
// =============================================================================

/**
 * スタジオを検索する
 */
export async function searchStudiosAction(
  filters: StudioSearchFilters
): Promise<{
  success: boolean;
  studios?: StudioWithStats[];
  totalCount?: number;
  error?: string;
}> {
  return getStudiosAction(filters);
}
