'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import Logger from '@/lib/logger';
import { requireAuthForAction } from '@/lib/auth/server-actions';
import {
  Studio,
  StudioPhoto,
  StudioEquipment,
  StudioEvaluation,
  StudioWithStats,
  StudioSearchFilters,
  StudioEditHistory,
} from '@/types/database';
import { DEFAULT_STUDIO_SEARCH } from '@/constants/studio';
import { normalizePrefecture } from '@/lib/utils/prefecture';

// =============================================================================
// スタジオ一覧・検索
// =============================================================================

/**
 * フィルタリングを適用するヘルパー関数
 *
 * 注意: Supabaseクエリビルダーの型（PostgrestFilterBuilder）は非常に複雑で、
 * 簡略化した型定義では対応できないため、any型を使用しています。
 * この関数は以下のメソッドをサポートします:
 * - eq, gte, lte: フィルタリング
 * - or: OR条件
 * - in: IN条件
 * - order: ソート（呼び出し側で使用）
 * - range: ページネーション（呼び出し側で使用）
 */
function applyStudioFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: StudioSearchFilters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
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

  return query;
}

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
    Logger.info('getStudiosAction called', { filters });
    const supabase = await createClient();

    let query = supabase
      .from('studios')
      .select(
        `
        *,
        studio_photos(
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
      .in('verification_status', ['verified', 'pending']);

    // フィルタリング
    query = applyStudioFilters(query, filters);

    // ソート（デフォルトはcreated_at desc）
    if (filters.sort_by) {
      const ascending = filters.sort_order === 'asc';
      query = query.order(filters.sort_by, { ascending });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // ページネーション適用前に総件数を取得
    // リレーションを含むクエリではcountが取得できないため、シンプルなクエリで総件数を取得
    let countQuery = supabase
      .from('studios')
      .select('*', { count: 'exact', head: true })
      .in('verification_status', ['verified', 'pending']);

    // フィルタリング（総件数取得用）
    countQuery = applyStudioFilters(countQuery, filters);

    const { count: totalCount } = await countQuery;

    // ページネーション
    const limit = filters.limit || DEFAULT_STUDIO_SEARCH.limit;
    if (filters.page && limit) {
      const offset = (filters.page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    Logger.info('Database query result', {
      dataCount: data?.length || 0,
      totalCount: totalCount,
      error: error?.message,
    });

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
          prefecture: normalizePrefecture(studio.prefecture) || '',
          featuredPhotos,
          equipment_count: 0, // TODO: 実際のカウント
          photo_count: photos.length,
          evaluation_count: 0, // TODO: 実際のカウント
          average_rating: 0, // TODO: 実際の平均
        };
      }
    );

    Logger.info('getStudiosAction success', {
      studiosCount: studios.length,
      totalCount: totalCount || 0,
    });

    return {
      success: true,
      studios,
      totalCount: totalCount || 0,
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
 * スタジオ選択用の軽量な一覧を取得する（id, nameのみ）
 */
export async function getStudioListForSelectAction(query?: string): Promise<{
  success: boolean;
  studios?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    Logger.info('getStudioListForSelectAction called', { query });
    const supabase = await createClient();

    let supabaseQuery = supabase
      .from('studios')
      .select('id, name')
      .eq('verification_status', 'verified')
      .order('name', { ascending: true })
      .limit(100);

    // 検索クエリがある場合はフィルタリング
    if (query && query.trim()) {
      supabaseQuery = supabaseQuery.ilike('name', `%${query.trim()}%`);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      Logger.error('スタジオ選択用一覧取得エラー:', error);
      return {
        success: false,
        error: 'スタジオ一覧の取得に失敗しました',
      };
    }

    Logger.info('getStudioListForSelectAction success', {
      studiosCount: data?.length || 0,
    });

    return {
      success: true,
      studios: data || [],
    };
  } catch (error) {
    Logger.error('スタジオ選択用一覧取得失敗:', error);
    return {
      success: false,
      error: 'スタジオ一覧の取得中にエラーが発生しました',
    };
  }
}

/**
 * スタジオIDから詳細情報を取得する（自動入力用）
 */
export async function getStudioForAutoFillAction(studioId: string): Promise<{
  success: boolean;
  studio?: {
    id: string;
    name: string;
    address: string;
    prefecture?: string;
    city?: string;
    access_info?: string;
  };
  error?: string;
}> {
  try {
    Logger.info('getStudioForAutoFillAction called', { studioId });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('studios')
      .select('id, name, address, prefecture, city, access_info')
      .eq('id', studioId)
      .eq('verification_status', 'verified')
      .single();

    if (error) {
      Logger.error('スタジオ詳細取得エラー:', error);
      return {
        success: false,
        error: 'スタジオ情報の取得に失敗しました',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'スタジオが見つかりませんでした',
      };
    }

    Logger.info('getStudioForAutoFillAction success');

    return {
      success: true,
      studio: {
        id: data.id,
        name: data.name,
        address: data.address,
        prefecture: normalizePrefecture(data.prefecture) || undefined,
        city: data.city,
        access_info: data.access_info || undefined,
      },
    };
  } catch (error) {
    Logger.error('スタジオ詳細取得失敗:', error);
    return {
      success: false,
      error: 'スタジオ情報の取得中にエラーが発生しました',
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
        .in('verification_status', ['verified', 'pending'])
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
      prefecture: normalizePrefecture(studio.prefecture),
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
export async function createStudioAction(
  formData: Partial<Studio> & { image_urls?: string[] }
): Promise<{
  success: boolean;
  studio?: Studio;
  error?: string;
}> {
  try {
    // ユーザー認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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

    // image_urlsを分離（studioDataには含めない）
    const { image_urls, ...studioFormData } = formData;

    const studioData = {
      ...studioFormData,
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

    // 画像URLが提供されている場合、studio_photosレコードを作成
    if (image_urls && image_urls.length > 0) {
      try {
        const photoPromises = image_urls.map((imageUrl, index) =>
          createStudioPhotoAction(studio.id, imageUrl, {
            display_order: index + 1,
          })
        );

        const photoResults = await Promise.all(photoPromises);
        const failedPhotos = photoResults.filter(result => !result.success);

        if (failedPhotos.length > 0) {
          Logger.warning('一部の画像の保存に失敗:', {
            studioId: studio.id,
            failedCount: failedPhotos.length,
            errors: failedPhotos.map(r => r.error),
          });
          // 画像の保存失敗は警告として記録するが、スタジオ作成は成功として扱う
        } else {
          Logger.info('スタジオ画像の保存成功:', {
            studioId: studio.id,
            imageCount: image_urls.length,
          });
        }
      } catch (photoError) {
        Logger.error('スタジオ画像保存エラー:', photoError);
        // 画像の保存失敗は警告として記録するが、スタジオ作成は成功として扱う
      }
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
    // ユーザー認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // 既存スタジオの確認
    Logger.info('スタジオ存在確認開始:', { studioId });

    const { data: existingStudio, error: fetchError } = await supabase
      .from('studios')
      .select('*')
      .eq('id', studioId)
      .single();

    Logger.info('スタジオ存在確認結果:', {
      studioId,
      found: !!existingStudio,
      error: fetchError || null,
    });

    if (fetchError || !existingStudio) {
      Logger.error('スタジオが見つからない:', {
        studioId,
        fetchError,
        hasExistingStudio: !!existingStudio,
      });
      return { success: false, error: 'スタジオが見つかりません' };
    }

    // 更新データの準備
    const updateData: Partial<Studio> = { ...formData };

    if (formData.name) {
      updateData.normalized_name = formData.name.toLowerCase().trim();
    }

    if (formData.address || formData.prefecture || formData.city) {
      const prefecture = formData.prefecture || existingStudio.prefecture;
      const city = formData.city || existingStudio.city;
      const address = formData.address || existingStudio.address;

      // 重複除去: 住所が既に都道府県・市区町村を含んでいる場合を考慮
      let normalizedAddress = '';
      if (prefecture && !address.startsWith(prefecture)) {
        normalizedAddress += prefecture;
      }
      if (city && !address.includes(city)) {
        normalizedAddress += city;
      }
      normalizedAddress += address;

      updateData.normalized_address = normalizedAddress.toLowerCase().trim();

      Logger.info('正規化住所生成:', {
        prefecture,
        city,
        address,
        normalizedAddress: updateData.normalized_address,
      });
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

    // 更新前のログ
    Logger.info('スタジオ更新開始:', {
      studioId,
      updateDataKeys: Object.keys(updateData),
      updateData,
    });

    // スタジオ更新
    const {
      data: studios,
      error,
      count,
    } = await supabase
      .from('studios')
      .update(updateData)
      .eq('id', studioId)
      .select();

    // 詳細ログ
    Logger.info('スタジオ更新結果:', {
      success: !error,
      studioId,
      rowCount: count,
      hasData: !!studios?.[0],
      dataLength: studios?.length || 0,
      error: error || null,
    });

    if (error) {
      Logger.error('スタジオ更新エラー詳細:', {
        error,
        studioId,
        updateData,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
      });
      return { success: false, error: 'スタジオの更新に失敗しました' };
    }

    // 更新後のデータ取得（RLSポリシーで取得できない場合は既存データとマージ）
    let studio = studios?.[0];
    if (!studio) {
      // 更新は成功したが、.select()でデータが取得できない場合（RLSポリシーの可能性）
      // 既存データと更新データをマージして返す
      Logger.warning(
        'スタジオ更新：.select()でデータが取得できませんでした（RLSポリシーの可能性）',
        {
          studioId,
          updateData,
          resultCount: studios?.length || 0,
        }
      );

      // 更新後のデータを再取得を試みる（verification_statusフィルターなし）
      Logger.info('スタジオ更新：再取得を試みます', { studioId });
      const { data: refreshedStudio, error: refreshError } = await supabase
        .from('studios')
        .select('*')
        .eq('id', studioId)
        .single();

      Logger.info('スタジオ更新：再取得結果', {
        studioId,
        hasData: !!refreshedStudio,
        error: refreshError?.message || null,
        hourlyRateMax: refreshedStudio?.hourly_rate_max,
      });

      if (refreshError || !refreshedStudio) {
        // 再取得も失敗した場合は、既存データと更新データをマージ
        Logger.warning(
          'スタジオ更新：再取得も失敗。既存データと更新データをマージします',
          {
            studioId,
            refreshError: refreshError?.message,
            refreshErrorCode: refreshError?.code,
            refreshErrorDetails: refreshError?.details,
          }
        );
        studio = { ...existingStudio, ...updateData } as Studio;
        Logger.info('スタジオ更新：マージ後のデータ', {
          studioId,
          hourlyRateMax: studio.hourly_rate_max,
        });
      } else {
        studio = refreshedStudio as Studio;
        Logger.info('スタジオ更新：再取得成功', {
          studioId,
          hourlyRateMax: studio.hourly_rate_max,
        });
      }
    } else {
      // .select()でデータが取得できた場合でも、最新データを再取得して確実にする
      const { data: latestStudio, error: latestError } = await supabase
        .from('studios')
        .select('*')
        .eq('id', studioId)
        .single();

      if (latestStudio) {
        studio = latestStudio as Studio;
      } else if (latestError) {
        // 再取得が失敗した場合は、取得できたデータと更新データをマージ
        Logger.warning(
          'スタジオ更新：最新データの再取得に失敗。取得データと更新データをマージします',
          {
            studioId,
            latestError: latestError.message,
          }
        );
        studio = { ...studios[0], ...updateData } as Studio;
      }
    }

    // 履歴保存
    try {
      // profilesテーブルから現在のユーザーのIDを取得（edited_byはprofiles(id)を参照）
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      const editorId = profile?.id || user.id; // フォールバックとしてuser.idを使用

      Logger.info('履歴保存開始:', {
        studioId,
        editedBy: editorId,
        userId: user.id,
        profileFound: !!profile,
        changedFields: Object.keys(formData),
      });

      const { error: historyError } = await supabase
        .from('studio_edit_history')
        .insert({
          studio_id: studioId,
          edited_by: editorId,
          edit_type: 'update',
          old_values: existingStudio,
          new_values: studio,
          changed_fields: Object.keys(formData),
        });

      if (historyError) {
        Logger.error('履歴保存エラー詳細:', {
          historyError,
          studioId,
          editedBy: editorId,
          userId: user.id,
          profileError: profileError || null,
          errorCode: historyError.code,
          errorMessage: historyError.message,
          errorDetails: historyError.details,
          errorHint: historyError.hint,
        });
        // 履歴保存失敗でも更新は成功として扱う
      } else {
        Logger.info('履歴保存成功:', { studioId, editedBy: editorId });
      }
    } catch (historyErr) {
      Logger.error('履歴保存例外:', historyErr);
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
 * スタジオ編集履歴を取得する
 */
export async function getStudioEditHistoryAction(studioId: string): Promise<{
  success: boolean;
  history?: StudioEditHistory[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: history, error } = await supabase
      .from('studio_edit_history')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      Logger.error('履歴取得エラー:', error);
      return { success: false, error: '履歴の取得に失敗しました' };
    }

    return { success: true, history: history || [] };
  } catch (error) {
    Logger.error('履歴取得失敗:', error);
    return {
      success: false,
      error: '履歴取得中にエラーが発生しました',
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
    // ユーザー認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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

// =============================================================================
// スタジオ画像管理
// =============================================================================

/**
 * スタジオ画像を作成する
 */
export async function createStudioPhotoAction(
  studioId: string,
  imageUrl: string,
  options?: {
    alt_text?: string;
    caption?: string;
    category?: string;
    display_order?: number;
  }
): Promise<{
  success: boolean;
  photo?: StudioPhoto;
  error?: string;
}> {
  try {
    // ユーザー認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // スタジオの存在確認
    const { data: studio, error: studioError } = await supabase
      .from('studios')
      .select('id, created_by')
      .eq('id', studioId)
      .single();

    if (studioError || !studio) {
      Logger.error('スタジオが見つからない:', studioError);
      return { success: false, error: 'スタジオが見つかりません' };
    }

    // 既存の画像数を取得してdisplay_orderを設定
    const { count } = await supabase
      .from('studio_photos')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', studioId);

    const displayOrder = options?.display_order ?? (count || 0) + 1;

    // スタジオ画像を作成
    const { data: photo, error } = await supabase
      .from('studio_photos')
      .insert({
        studio_id: studioId,
        image_url: imageUrl,
        image_filename: imageUrl.split('/').pop(),
        alt_text: options?.alt_text,
        caption: options?.caption,
        category: (options?.category as StudioPhoto['category']) || 'other',
        display_order: displayOrder,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      Logger.error('スタジオ画像作成エラー:', error);
      return { success: false, error: '画像の追加に失敗しました' };
    }

    revalidatePath(`/studios/${studioId}`);
    Logger.info('スタジオ画像作成成功:', { photoId: photo.id, studioId });

    return { success: true, photo };
  } catch (error) {
    Logger.error('スタジオ画像作成失敗:', error);
    return {
      success: false,
      error: '画像の追加中にエラーが発生しました',
    };
  }
}

/**
 * スタジオ画像を削除する
 */
export async function deleteStudioPhotoAction(photoId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // ユーザー認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user: _user, supabase } = authResult.data;

    // 画像の存在確認
    const { data: photo, error: photoError } = await supabase
      .from('studio_photos')
      .select('id, studio_id')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      Logger.error('スタジオ画像が見つからない:', photoError);
      return { success: false, error: '画像が見つかりません' };
    }

    // 画像を削除
    const { error } = await supabase
      .from('studio_photos')
      .delete()
      .eq('id', photoId);

    if (error) {
      Logger.error('スタジオ画像削除エラー:', error);
      return { success: false, error: '画像の削除に失敗しました' };
    }

    revalidatePath(`/studios/${photo.studio_id}`);
    Logger.info('スタジオ画像削除成功:', {
      photoId,
      studioId: photo.studio_id,
    });

    return { success: true };
  } catch (error) {
    Logger.error('スタジオ画像削除失敗:', error);
    return {
      success: false,
      error: '画像の削除中にエラーが発生しました',
    };
  }
}

/**
 * スタジオ画像の表示順を更新する
 */
export async function updateStudioPhotoOrderAction(
  photoId: string,
  displayOrder: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // ユーザー認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user: _user, supabase } = authResult.data;

    // 画像の存在確認
    const { data: photo, error: photoError } = await supabase
      .from('studio_photos')
      .select('id, studio_id')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return { success: false, error: '画像が見つかりません' };
    }

    // 表示順を更新
    const { error } = await supabase
      .from('studio_photos')
      .update({ display_order: displayOrder })
      .eq('id', photoId);

    if (error) {
      Logger.error('スタジオ画像表示順更新エラー:', error);
      return { success: false, error: '表示順の更新に失敗しました' };
    }

    revalidatePath(`/studios/${photo.studio_id}`);
    return { success: true };
  } catch (error) {
    Logger.error('スタジオ画像表示順更新失敗:', error);
    return {
      success: false,
      error: '表示順の更新中にエラーが発生しました',
    };
  }
}

// =============================================================================
// スタジオ報告機能
// =============================================================================

/**
 * スタジオを報告する
 */
export async function reportStudioAction(
  studioId: string,
  reportReason: 'spam' | 'inappropriate' | 'false_info' | 'other',
  reportDetails?: string
): Promise<{
  success: boolean;
  error?: string;
  autoHidden?: boolean;
}> {
  try {
    // ユーザー認証チェック
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    // スタジオの存在確認
    const { data: studio, error: studioError } = await supabase
      .from('studios')
      .select('id')
      .eq('id', studioId)
      .single();

    if (studioError || !studio) {
      Logger.error('スタジオが見つからない:', studioError);
      return { success: false, error: 'スタジオが見つかりません' };
    }

    // 重複報告チェック（同じユーザーが同じスタジオに既に報告していないか）
    const { data: existingReport, error: checkError } = await supabase
      .from('studio_reports')
      .select('id')
      .eq('studio_id', studioId)
      .eq('reporter_id', user.id)
      .eq('status', 'pending')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      Logger.error('報告チェックエラー:', checkError);
      return { success: false, error: '報告の確認中にエラーが発生しました' };
    }

    if (existingReport) {
      return {
        success: false,
        error: 'このスタジオには既に報告済みです',
      };
    }

    // 報告レコード作成
    const { error: createError } = await supabase
      .from('studio_reports')
      .insert({
        studio_id: studioId,
        reporter_id: user.id,
        report_reason: reportReason,
        report_details: reportDetails || null,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      Logger.error('報告作成エラー:', createError);
      return { success: false, error: '報告の送信に失敗しました' };
    }

    // 報告数が3件に達したかチェック（トリガーで自動的に非表示になるが、確認のため）
    const { count: reportCount } = await supabase
      .from('studio_reports')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', studioId)
      .eq('status', 'pending');

    // スタジオの非表示状態を確認
    const { data: updatedStudio } = await supabase
      .from('studios')
      .select('is_hidden')
      .eq('id', studioId)
      .single();

    revalidatePath(`/studios/${studioId}`);
    Logger.info('スタジオ報告成功:', {
      studioId,
      reporterId: user.id,
      reportReason,
      reportCount: reportCount || 0,
      isHidden: updatedStudio?.is_hidden || false,
    });

    return {
      success: true,
      autoHidden: updatedStudio?.is_hidden || false,
    };
  } catch (error) {
    Logger.error('スタジオ報告失敗:', error);
    return {
      success: false,
      error: '報告の送信中にエラーが発生しました',
    };
  }
}
