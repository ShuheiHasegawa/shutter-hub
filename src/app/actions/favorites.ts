'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import Logger from '@/lib/logger';

// お気に入り追加/削除（トグル）
export async function toggleFavoriteAction(
  favoriteType: 'studio' | 'photo_session',
  favoriteId: string
) {
  try {
    const supabase = await createClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: '認証が必要です',
        isAuthenticated: false,
      };
    }

    // PostgreSQL関数を使用してお気に入りをトグル
    const { data, error } = await supabase.rpc('toggle_favorite', {
      target_user_id: user.id,
      target_type: favoriteType,
      target_id: favoriteId,
    });

    if (error) {
      Logger.error('Toggle favorite error:', error);
      return {
        success: false,
        error: 'お気に入りの操作に失敗しました',
        isAuthenticated: true,
      };
    }

    // 関連ページの再検証
    revalidatePath('/favorites');
    revalidatePath('/studios');
    revalidatePath('/photo-sessions');
    revalidatePath(`/studios/${favoriteId}`);
    revalidatePath(`/photo-sessions/${favoriteId}`);

    return {
      success: true,
      data,
      isAuthenticated: true,
    };
  } catch (error) {
    Logger.error('Unexpected error in toggleFavoriteAction:', error);
    return {
      success: false,
      error: 'システムエラーが発生しました',
      isAuthenticated: true,
    };
  }
}

// お気に入り状態の確認
export async function checkFavoriteStatusAction(
  favoriteType: 'studio' | 'photo_session',
  favoriteId: string
) {
  try {
    const supabase = await createClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: true,
        isFavorited: false,
        favoriteCount: 0,
        isAuthenticated: false,
      };
    }

    // お気に入り状態を確認
    const { data: favoriteData, error: favoriteError } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('favorite_type', favoriteType)
      .eq('favorite_id', favoriteId)
      .maybeSingle();

    if (favoriteError && favoriteError.code !== 'PGRST116') {
      Logger.error('Check favorite status error:', favoriteError);
      return {
        success: false,
        error: 'お気に入り状態の確認に失敗しました',
        isAuthenticated: true,
      };
    }

    // お気に入り数を取得
    const { data: countData, error: countError } = await supabase
      .from('favorite_statistics')
      .select('total_favorites')
      .eq('target_type', favoriteType)
      .eq('target_id', favoriteId)
      .maybeSingle();

    if (countError && countError.code !== 'PGRST116') {
      Logger.error('Get favorite count error:', countError);
    }

    return {
      success: true,
      isFavorited: !!favoriteData,
      favoriteCount: countData?.total_favorites || 0,
      isAuthenticated: true,
    };
  } catch (error) {
    Logger.error('Unexpected error in checkFavoriteStatusAction:', error);
    return {
      success: false,
      error: 'システムエラーが発生しました',
      isAuthenticated: true,
    };
  }
}

// ユーザーのお気に入り一覧取得
export async function getUserFavoritesAction(
  favoriteType?: 'studio' | 'photo_session',
  page: number = 1,
  limit: number = 20
) {
  try {
    const supabase = await createClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: '認証が必要です',
        isAuthenticated: false,
      };
    }

    const offset = (page - 1) * limit;

    // お気に入り一覧を取得（基本情報のみ）
    let query = supabase
      .from('user_favorites')
      .select(
        `
        id,
        favorite_type,
        favorite_id,
        created_at
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (favoriteType) {
      query = query.eq('favorite_type', favoriteType);
    }

    const { data, error, count } = await query;

    if (error) {
      Logger.error('Get user favorites error:', error);
      return {
        success: false,
        error: 'お気に入り一覧の取得に失敗しました',
        isAuthenticated: true,
      };
    }

    // 詳細情報を手動で取得
    const enrichedFavorites = [];
    if (data && data.length > 0) {
      for (const favorite of data) {
        let details = null;

        if (favorite.favorite_type === 'studio') {
          const { data: studioData, error: studioError } = await supabase
            .from('studios')
            .select(
              `
              id,
              name,
              address,
              prefecture,
              city,
              hourly_rate_min,
              hourly_rate_max,
              description
            `
            )
            .eq('id', favorite.favorite_id)
            .single();
          if (studioError) {
            Logger.error('Studio data fetch error:', studioError);
          }
          details = studioData;
        } else if (favorite.favorite_type === 'photo_session') {
          const { data: sessionData, error: sessionError } = await supabase
            .from('photo_sessions')
            .select(
              `
              id,
              title,
              description,
              start_time,
              end_time,
              location,
              price_per_person,
              max_participants,
              booking_type,
              organizer:organizer_id(
                id,
                display_name,
                avatar_url
              )
            `
            )
            .eq('id', favorite.favorite_id)
            .single();
          if (sessionError) {
            Logger.error('Photo session data fetch error:', sessionError);
          }
          details = sessionData;
        }

        // 詳細データが取得できた場合のみ追加
        if (details) {
          enrichedFavorites.push({
            ...favorite,
            [favorite.favorite_type === 'studio' ? 'studio' : 'photo_session']:
              details,
          });
        } else {
          Logger.error('No details found for favorite:', {
            favoriteId: favorite.favorite_id,
            favoriteType: favorite.favorite_type,
          });
        }
      }
    }

    return {
      success: true,
      favorites: enrichedFavorites,
      totalCount: count || 0,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / limit),
      hasMore: (count || 0) > offset + limit,
      isAuthenticated: true,
    };
  } catch (error) {
    Logger.error('Unexpected error in getUserFavoritesAction:', error);
    return {
      success: false,
      error: 'システムエラーが発生しました',
      isAuthenticated: true,
    };
  }
}

// お気に入り数の取得（認証不要）
export async function getFavoriteCountAction(
  favoriteType: 'studio' | 'photo_session',
  favoriteId: string
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('favorite_statistics')
      .select('total_favorites')
      .eq('target_type', favoriteType)
      .eq('target_id', favoriteId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      Logger.error('Get favorite count error:', error);
      return {
        success: false,
        error: 'お気に入り数の取得に失敗しました',
      };
    }

    return {
      success: true,
      count: data?.total_favorites || 0,
    };
  } catch (error) {
    Logger.error('Unexpected error in getFavoriteCountAction:', error);
    return {
      success: false,
      error: 'システムエラーが発生しました',
    };
  }
}

// 人気のお気に入りアイテム取得
export async function getPopularFavoritesAction(
  favoriteType: 'studio' | 'photo_session',
  limit: number = 10
) {
  try {
    const supabase = await createClient();

    // お気に入り統計から人気のアイテムを取得
    const { data: statsData, error: statsError } = await supabase
      .from('favorite_statistics')
      .select('target_id, total_favorites')
      .eq('target_type', favoriteType)
      .order('total_favorites', { ascending: false })
      .limit(limit);

    if (statsError) {
      Logger.error('Get popular favorites error:', statsError);
      return {
        success: false,
        error: '人気のお気に入りの取得に失敗しました',
      };
    }

    if (!statsData || statsData.length === 0) {
      return {
        success: true,
        items: [],
      };
    }

    // 詳細情報を取得
    const targetIds = statsData.map(item => item.target_id);

    let detailsData;
    if (favoriteType === 'studio') {
      const { data, error } = await supabase
        .from('studios')
        .select(
          `
          id,
          name,
          address,
          prefecture,
          city,
          hourly_rate_min,
          hourly_rate_max
        `
        )
        .in('id', targetIds);

      if (error) {
        Logger.error('Get studio details error:', error);
        return {
          success: false,
          error: 'スタジオ詳細の取得に失敗しました',
        };
      }
      detailsData = data;
    } else {
      const { data, error } = await supabase
        .from('photo_sessions')
        .select(
          `
          id,
          title,
          description,
          start_time,
          end_time,
          location_name,
          price_per_person,
          max_participants,
          booking_type
        `
        )
        .in('id', targetIds);

      if (error) {
        Logger.error('Get photo session details error:', error);
        return {
          success: false,
          error: '撮影会詳細の取得に失敗しました',
        };
      }
      detailsData = data;
    }

    // 統計データと詳細データを結合
    const items = statsData
      .map(stat => {
        const details = detailsData?.find(item => item.id === stat.target_id);
        return {
          ...details,
          favoriteCount: stat.total_favorites,
        };
      })
      .filter(item => item && 'id' in item && item.id); // 詳細が見つからないものは除外

    return {
      success: true,
      items,
    };
  } catch (error) {
    Logger.error('Unexpected error in getPopularFavoritesAction:', error);
    return {
      success: false,
      error: 'システムエラーが発生しました',
    };
  }
}

// お気に入り状態の一括取得
export async function getBulkFavoriteStatusAction(
  items: Array<{ type: 'studio' | 'photo_session'; id: string }>
) {
  try {
    // Server Action呼び出し開始ログ
    Logger.debug('[getBulkFavoriteStatusAction] 開始', {
      itemsLength: items.length,
    });

    const supabase = await createClient();

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      Logger.error('[getBulkFavoriteStatusAction] 認証エラー', { authError });
      return {
        success: false,
        error: '認証が必要です',
        isAuthenticated: false,
        favoriteStates: {},
      };
    }

    Logger.debug('[getBulkFavoriteStatusAction] 認証成功', { userId: user.id });

    // 一括でお気に入り状態を取得
    const favoriteStates: Record<
      string,
      { isFavorited: boolean; favoriteCount: number }
    > = {};

    // スタジオとフォトセッションを分けて処理
    const studioIds = items
      .filter(item => item.type === 'studio')
      .map(item => item.id);
    const photoSessionIds = items
      .filter(item => item.type === 'photo_session')
      .map(item => item.id);

    // スタジオのお気に入り状態を一括取得
    if (studioIds.length > 0) {
      const { data: studioFavorites } = await supabase
        .from('user_favorites')
        .select('favorite_id')
        .eq('user_id', user.id)
        .eq('favorite_type', 'studio')
        .in('favorite_id', studioIds);

      const favoritedStudioIds = new Set(
        studioFavorites?.map(f => f.favorite_id) || []
      );

      // スタジオの統計を一括取得
      const { data: studioStats } = await supabase
        .from('favorite_statistics')
        .select('target_id, total_favorites')
        .eq('target_type', 'studio')
        .in('target_id', studioIds);

      const studioStatMap = new Map(
        studioStats?.map(s => [s.target_id, s.total_favorites]) || []
      );

      studioIds.forEach(id => {
        favoriteStates[`studio_${id}`] = {
          isFavorited: favoritedStudioIds.has(id),
          favoriteCount: studioStatMap.get(id) || 0,
        };
      });
    }

    // 撮影会のお気に入り状態を一括取得
    if (photoSessionIds.length > 0) {
      const { data: photoSessionFavorites } = await supabase
        .from('user_favorites')
        .select('favorite_id')
        .eq('user_id', user.id)
        .eq('favorite_type', 'photo_session')
        .in('favorite_id', photoSessionIds);

      const favoritedPhotoSessionIds = new Set(
        photoSessionFavorites?.map(f => f.favorite_id) || []
      );

      // 撮影会の統計を一括取得
      const { data: photoSessionStats } = await supabase
        .from('favorite_statistics')
        .select('target_id, total_favorites')
        .eq('target_type', 'photo_session')
        .in('target_id', photoSessionIds);

      const photoSessionStatMap = new Map(
        photoSessionStats?.map(s => [s.target_id, s.total_favorites]) || []
      );

      photoSessionIds.forEach(id => {
        favoriteStates[`photo_session_${id}`] = {
          isFavorited: favoritedPhotoSessionIds.has(id),
          favoriteCount: photoSessionStatMap.get(id) || 0,
        };
      });
    }

    Logger.debug('[getBulkFavoriteStatusAction] 成功', {
      stateCount: Object.keys(favoriteStates).length,
    });

    return {
      success: true,
      isAuthenticated: true,
      favoriteStates,
    };
  } catch (error) {
    Logger.error('[getBulkFavoriteStatusAction] 予期しないエラー:', error);
    return {
      success: false,
      error: 'システムエラーが発生しました',
      isAuthenticated: true,
      favoriteStates: {},
    };
  }
}
