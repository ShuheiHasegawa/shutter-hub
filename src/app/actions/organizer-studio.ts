'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';
import {
  OrganizerStudio,
  SelectedStudio,
  StudioRelationshipType,
} from '@/types/database';

// =============================================================================
// Organizer Studio Management (ModelSelection同様)
// =============================================================================

/**
 * 運営者の専属スタジオ一覧取得
 */
export async function getOrganizerStudiosAction(
  organizerId?: string
): Promise<{ success: boolean; studios?: SelectedStudio[]; error?: string }> {
  try {
    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'ログインが必要です。',
      };
    }

    const targetOrganizerId = organizerId || user.id;

    // 権限チェック（本人または管理者のみ）
    if (targetOrganizerId !== user.id) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (userProfile?.user_type !== 'organizer') {
        return {
          success: false,
          error: '他の運営者のスタジオ情報を閲覧する権限がありません。',
        };
      }
    }

    // 運営者のスタジオ関係取得
    const { data: organizerStudios, error } = await supabase
      .from('organizer_studios')
      .select(
        `
        *,
        studios!inner(
          id,
          name,
          address,
          max_capacity,
          hourly_rate_min,
          hourly_rate_max
        )
      `
      )
      .eq('organizer_id', targetOrganizerId)
      .eq('status', 'active')
      .order('priority_level', { ascending: false });

    if (error) {
      logger.error('運営者スタジオ取得エラー:', error);
      return {
        success: false,
        error: 'スタジオ情報の取得中にエラーが発生しました。',
      };
    }

    // SelectedStudio形式に変換
    const studios: SelectedStudio[] = (organizerStudios || []).map(os => ({
      studio_id: os.studio_id,
      name: os.studios.name,
      address: os.studios.address,
      hourly_rate: os.usage_rate || os.studios.hourly_rate_min || 0,
      max_capacity: os.studios.max_capacity || 0,
      relationship_type: os.relationship_type,
      contact_person: os.contact_person,
      contact_notes: os.contact_notes,
      priority_level: os.priority_level,
    }));

    return {
      success: true,
      studios,
    };
  } catch (error) {
    logger.error('運営者スタジオ取得失敗:', error);
    return {
      success: false,
      error: '運営者スタジオ情報の取得中に予期しないエラーが発生しました。',
    };
  }
}

/**
 * 運営者スタジオ関係追加
 */
export async function addOrganizerStudioAction(
  studioId: string,
  relationshipData: {
    relationship_type: StudioRelationshipType;
    usage_rate?: number;
    contact_person?: string;
    contact_notes?: string;
    priority_level?: number;
    contract_start_date?: string;
    contract_end_date?: string;
  }
): Promise<{
  success: boolean;
  organizerStudio?: OrganizerStudio;
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
      return {
        success: false,
        error: 'ログインが必要です。',
      };
    }

    // 運営者権限チェック
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (userProfile?.user_type !== 'organizer') {
      return {
        success: false,
        error: '運営者のみがスタジオ関係を管理できます。',
      };
    }

    // スタジオ存在確認
    const { data: studio, error: studioError } = await supabase
      .from('studios')
      .select('id, name')
      .eq('id', studioId)
      .single();

    if (studioError || !studio) {
      return {
        success: false,
        error: 'スタジオが見つかりません。',
      };
    }

    // 既存関係チェック
    const { data: existing } = await supabase
      .from('organizer_studios')
      .select('id')
      .eq('organizer_id', user.id)
      .eq('studio_id', studioId)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'このスタジオとの関係は既に登録されています。',
      };
    }

    // 関係追加
    const { data: organizerStudio, error } = await supabase
      .from('organizer_studios')
      .insert({
        organizer_id: user.id,
        studio_id: studioId,
        ...relationshipData,
      })
      .select()
      .single();

    if (error) {
      logger.error('運営者スタジオ関係追加エラー:', error);
      return {
        success: false,
        error: 'スタジオ関係の追加中にエラーが発生しました。',
      };
    }

    // キャッシュ無効化
    revalidatePath('/photo-sessions/create');

    logger.info('運営者スタジオ関係追加成功:', {
      organizerId: user.id,
      studioId,
      relationshipType: relationshipData.relationship_type,
    });

    return {
      success: true,
      organizerStudio,
    };
  } catch (error) {
    logger.error('運営者スタジオ関係追加失敗:', error);
    return {
      success: false,
      error: 'スタジオ関係の追加中に予期しないエラーが発生しました。',
    };
  }
}

/**
 * 運営者スタジオ関係更新
 */
export async function updateOrganizerStudioAction(
  organizerStudioId: string,
  updateData: Partial<{
    relationship_type: StudioRelationshipType;
    usage_rate: number;
    contact_person: string;
    contact_notes: string;
    priority_level: number;
    status: 'active' | 'inactive' | 'archived';
    contract_start_date: string;
    contract_end_date: string;
  }>
): Promise<{
  success: boolean;
  organizerStudio?: OrganizerStudio;
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
      return {
        success: false,
        error: 'ログインが必要です。',
      };
    }

    // 権限チェック
    const { data: existing, error: fetchError } = await supabase
      .from('organizer_studios')
      .select('organizer_id')
      .eq('id', organizerStudioId)
      .single();

    if (fetchError || !existing) {
      return {
        success: false,
        error: 'スタジオ関係が見つかりません。',
      };
    }

    if (existing.organizer_id !== user.id) {
      return {
        success: false,
        error: 'このスタジオ関係を編集する権限がありません。',
      };
    }

    // 更新実行
    const { data: organizerStudio, error } = await supabase
      .from('organizer_studios')
      .update(updateData)
      .eq('id', organizerStudioId)
      .select()
      .single();

    if (error) {
      logger.error('運営者スタジオ関係更新エラー:', error);
      return {
        success: false,
        error: 'スタジオ関係の更新中にエラーが発生しました。',
      };
    }

    // キャッシュ無効化
    revalidatePath('/photo-sessions/create');

    logger.info('運営者スタジオ関係更新成功:', {
      organizerStudioId,
      userId: user.id,
    });

    return {
      success: true,
      organizerStudio,
    };
  } catch (error) {
    logger.error('運営者スタジオ関係更新失敗:', error);
    return {
      success: false,
      error: 'スタジオ関係の更新中に予期しないエラーが発生しました。',
    };
  }
}

/**
 * 運営者スタジオ関係削除
 */
export async function removeOrganizerStudioAction(
  organizerStudioId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'ログインが必要です。',
      };
    }

    // 権限チェック
    const { data: existing, error: fetchError } = await supabase
      .from('organizer_studios')
      .select('organizer_id, studio_id')
      .eq('id', organizerStudioId)
      .single();

    if (fetchError || !existing) {
      return {
        success: false,
        error: 'スタジオ関係が見つかりません。',
      };
    }

    if (existing.organizer_id !== user.id) {
      return {
        success: false,
        error: 'このスタジオ関係を削除する権限がありません。',
      };
    }

    // 削除実行
    const { error } = await supabase
      .from('organizer_studios')
      .delete()
      .eq('id', organizerStudioId);

    if (error) {
      logger.error('運営者スタジオ関係削除エラー:', error);
      return {
        success: false,
        error: 'スタジオ関係の削除中にエラーが発生しました。',
      };
    }

    // キャッシュ無効化
    revalidatePath('/photo-sessions/create');

    logger.info('運営者スタジオ関係削除成功:', {
      organizerStudioId,
      studioId: existing.studio_id,
      userId: user.id,
    });

    return {
      success: true,
    };
  } catch (error) {
    logger.error('運営者スタジオ関係削除失敗:', error);
    return {
      success: false,
      error: 'スタジオ関係の削除中に予期しないエラーが発生しました。',
    };
  }
}

/**
 * 運営者の利用可能スタジオ検索（専属スタジオ優先表示）
 */
export async function searchAvailableStudiosAction(
  query: string = '',
  excludeIds: string[] = []
): Promise<{ success: boolean; studios?: SelectedStudio[]; error?: string }> {
  try {
    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'ログインが必要です。',
      };
    }

    // 専属スタジオ取得
    const { data: organizerStudios } = await supabase
      .from('organizer_studios')
      .select(
        `
        *,
        studios!inner(*)
      `
      )
      .eq('organizer_id', user.id)
      .eq('status', 'active')
      .not('studio_id', 'in', `(${excludeIds.join(',')})`)
      .order('priority_level', { ascending: false });

    // 一般スタジオ検索
    let generalQuery = supabase
      .from('studios')
      .select('*')
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(20);

    if (query.trim()) {
      generalQuery = generalQuery.or(
        `name.ilike.%${query}%,address.ilike.%${query}%`
      );
    }

    const { data: generalStudios } = await generalQuery;

    // 専属スタジオを優先してSelectedStudio形式に変換
    const preferredStudios: SelectedStudio[] = (organizerStudios || []).map(
      os => ({
        studio_id: os.studio_id,
        name: os.studios.name,
        address: os.studios.address,
        hourly_rate: os.usage_rate || os.studios.hourly_rate_min || 0,
        max_capacity: os.studios.max_capacity || 0,
        relationship_type: os.relationship_type,
        contact_person: os.contact_person,
        contact_notes: os.contact_notes,
        priority_level: os.priority_level,
      })
    );

    // 一般スタジオ（専属スタジオを除く）
    const organizerStudioIds = new Set(
      (organizerStudios || []).map(os => os.studio_id)
    );
    const availableGeneralStudios: SelectedStudio[] = (generalStudios || [])
      .filter(studio => !organizerStudioIds.has(studio.id))
      .map(studio => ({
        studio_id: studio.id,
        name: studio.name,
        address: studio.address,
        hourly_rate: studio.hourly_rate_min || 0,
        max_capacity: studio.max_capacity || 0,
        relationship_type: 'preferred' as StudioRelationshipType,
        priority_level: 1,
      }));

    // 専属スタジオ → 一般スタジオの順で結合
    const allStudios = [...preferredStudios, ...availableGeneralStudios];

    return {
      success: true,
      studios: allStudios,
    };
  } catch (error) {
    logger.error('利用可能スタジオ検索失敗:', error);
    return {
      success: false,
      error: 'スタジオ検索中に予期しないエラーが発生しました。',
    };
  }
}

/**
 * 運営者のスタジオ利用統計取得
 */
export async function getOrganizerStudioStatsAction(organizerId?: string) {
  try {
    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'ログインが必要です。',
      };
    }

    const targetOrganizerId = organizerId || user.id;

    // 権限チェック（本人または管理者のみ）
    if (targetOrganizerId !== user.id) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (userProfile?.user_type !== 'organizer') {
        return {
          success: false,
          error: '統計情報を閲覧する権限がありません。',
        };
      }
    }

    // 並行データ取得
    const [
      { data: organizerStudios },
      { data: studioUsage },
      { data: photoSessions },
    ] = await Promise.all([
      // 運営者のスタジオ関係
      supabase
        .from('organizer_studios')
        .select('*')
        .eq('organizer_id', targetOrganizerId),

      // スタジオ利用履歴
      supabase
        .from('photo_session_studios')
        .select(
          `
          *,
          photo_sessions!inner(organizer_id)
        `
        )
        .eq('photo_sessions.organizer_id', targetOrganizerId)
        .order('usage_date', { ascending: false })
        .limit(10),

      // 撮影会履歴
      supabase
        .from('photo_sessions')
        .select('id, title, start_time')
        .eq('organizer_id', targetOrganizerId)
        .order('start_time', { ascending: false })
        .limit(5),
    ]);

    // 統計計算
    const totalStudios = organizerStudios?.length || 0;
    const activeStudios =
      organizerStudios?.filter(os => os.status === 'active').length || 0;
    const totalUsage = studioUsage?.length || 0;
    const averageCost =
      studioUsage && studioUsage.length > 0
        ? studioUsage.reduce((sum, usage) => sum + (usage.total_cost || 0), 0) /
          studioUsage.length
        : 0;

    return {
      success: true,
      stats: {
        totalStudios,
        activeStudios,
        totalUsage,
        averageCost,
        recentUsage: studioUsage || [],
        recentSessions: photoSessions || [],
      },
    };
  } catch (error) {
    logger.error('運営者スタジオ統計取得失敗:', error);
    return {
      success: false,
      error: '統計情報の取得中に予期しないエラーが発生しました。',
    };
  }
}

/**
 * 撮影会とスタジオの関連付け作成
 */
export async function linkPhotoSessionStudioAction(
  photoSessionId: string,
  studioId: string,
  usageData: {
    usage_date: string;
    start_time: string;
    end_time: string;
    total_cost?: number;
    notes?: string;
  }
) {
  try {
    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'ログインが必要です。',
      };
    }

    // 撮影会の所有者確認
    const { data: photoSession, error: sessionError } = await supabase
      .from('photo_sessions')
      .select('organizer_id')
      .eq('id', photoSessionId)
      .single();

    if (sessionError || !photoSession) {
      return {
        success: false,
        error: '撮影会が見つかりません。',
      };
    }

    if (photoSession.organizer_id !== user.id) {
      return {
        success: false,
        error: 'この撮影会にスタジオを関連付ける権限がありません。',
      };
    }

    // 重複チェック
    const { data: existing } = await supabase
      .from('photo_session_studios')
      .select('id')
      .eq('photo_session_id', photoSessionId)
      .eq('studio_id', studioId)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'この撮影会にはすでにこのスタジオが関連付けられています。',
      };
    }

    // 関連付け作成
    const { data, error } = await supabase
      .from('photo_session_studios')
      .insert({
        photo_session_id: photoSessionId,
        studio_id: studioId,
        ...usageData,
      })
      .select()
      .single();

    if (error) {
      logger.error('撮影会スタジオ関連付けエラー:', error);
      return {
        success: false,
        error: 'スタジオの関連付け中にエラーが発生しました。',
      };
    }

    // キャッシュ無効化
    revalidatePath(`/photo-sessions/${photoSessionId}`);
    revalidatePath(`/studios/${studioId}`);

    logger.info('撮影会スタジオ関連付け成功:', {
      photoSessionId,
      studioId,
      userId: user.id,
    });

    return {
      success: true,
      linkage: data,
    };
  } catch (error) {
    logger.error('撮影会スタジオ関連付け失敗:', error);
    return {
      success: false,
      error: 'スタジオの関連付け中に予期しないエラーが発生しました。',
    };
  }
}
