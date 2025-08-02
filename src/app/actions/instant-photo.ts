'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';
import type {
  CreateInstantPhotoRequestData,
  UpdatePhotographerLocationData,
  InstantPhotoRequest,
  PhotographerLocation,
  NearbyPhotographer,
  AutoMatchResult,
  GuestUsageLimit,
  ApiResponse,
  ActionResult,
} from '@/types/instant-photo';

// 即座撮影リクエストを作成
export async function createInstantPhotoRequest(
  data: CreateInstantPhotoRequestData
): Promise<ApiResponse<InstantPhotoRequest>> {
  try {
    const supabase = await createClient();

    // ゲスト利用制限チェック
    const usageCheck = await checkGuestUsageLimit(data.guest_phone);
    if (!usageCheck.success || !usageCheck.data?.can_use) {
      return {
        success: false,
        error: `月の利用制限（3回）に達しています。現在 ${usageCheck.data?.usage_count || 0}/3 回`,
      };
    }

    // 有効期限を設定（2時間後）
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    // リクエストを作成
    const { data: request, error } = await supabase
      .from('instant_photo_requests')
      .insert({
        guest_name: data.guest_name,
        guest_phone: data.guest_phone,
        guest_email: data.guest_email,
        party_size: data.party_size,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        location_address: data.location_address,
        location_landmark: data.location_landmark,
        request_type: data.request_type,
        urgency: data.urgency,
        duration: data.duration,
        budget: data.budget,
        special_requests: data.special_requests,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('即座撮影リクエスト作成エラー:', error);
      return { success: false, error: 'リクエストの作成に失敗しました' };
    }

    // 利用履歴を記録
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    await supabase.from('guest_usage_history').insert({
      guest_phone: data.guest_phone,
      guest_email: data.guest_email,
      request_id: request.id,
      usage_month: currentMonth,
    });

    // 自動マッチングを実行
    const matchResult = await autoMatchRequest(request.id);
    if (matchResult.success) {
      logger.debug('自動マッチング実行:', matchResult.data?.message);
    }

    revalidatePath('/instant');
    return { success: true, data: request };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// カメラマンの位置情報を更新
export async function updatePhotographerLocation(
  data: UpdatePhotographerLocationData
): Promise<ApiResponse<PhotographerLocation>> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data: location, error } = await supabase
      .from('photographer_locations')
      .upsert({
        photographer_id: user.id,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        is_online: data.is_online,
        available_until: data.available_until,
        accepting_requests: data.accepting_requests,
        response_radius: data.response_radius,
        instant_rates: data.instant_rates,
      })
      .select()
      .single();

    if (error) {
      logger.error('位置情報更新エラー:', error);
      return { success: false, error: '位置情報の更新に失敗しました' };
    }

    revalidatePath('/dashboard');
    return { success: true, data: location };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 近くのカメラマンを検索
export async function findNearbyPhotographers(
  latitude: number,
  longitude: number,
  radiusMeters: number = 1000,
  requestType?: string,
  maxBudget?: number,
  urgency: string = 'normal'
): Promise<ApiResponse<NearbyPhotographer[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      'find_nearby_photographers_with_urgency',
      {
        target_lat: latitude,
        target_lng: longitude,
        radius_meters: radiusMeters,
        request_type: requestType,
        max_budget: maxBudget,
        urgency_level: urgency,
      }
    );

    if (error) {
      logger.error('近くのカメラマン検索エラー:', error);
      return { success: false, error: 'カメラマンの検索に失敗しました' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 自動マッチングを実行
export async function autoMatchRequest(
  requestId: string
): Promise<ApiResponse<AutoMatchResult>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('auto_match_request', {
      request_id: requestId,
    });

    if (error) {
      logger.error('自動マッチングエラー:', error);
      return { success: false, error: '自動マッチングに失敗しました' };
    }

    const result = data?.[0] as AutoMatchResult;
    return { success: true, data: result };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// ゲストの利用制限をチェック
export async function checkGuestUsageLimit(
  guestPhone: string
): Promise<ApiResponse<GuestUsageLimit>> {
  try {
    const supabase = await createClient();

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const { data, error } = await supabase.rpc('check_guest_usage_limit', {
      guest_phone: guestPhone,
      current_month: currentMonth,
    });

    if (error) {
      logger.error('利用制限チェックエラー:', error);
      return { success: false, error: '利用制限のチェックに失敗しました' };
    }

    const result = data?.[0] as GuestUsageLimit;
    return { success: true, data: result };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 即座撮影リクエストの詳細を取得
export async function getInstantPhotoRequest(
  requestId: string
): Promise<ApiResponse<InstantPhotoRequest>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('instant_photo_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error) {
      logger.error('リクエスト取得エラー:', error);
      return { success: false, error: 'リクエストの取得に失敗しました' };
    }

    return { success: true, data };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// ゲストのリクエスト履歴を取得
export async function getGuestRequestHistory(
  guestPhone: string
): Promise<ApiResponse<InstantPhotoRequest[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('instant_photo_requests')
      .select('*')
      .eq('guest_phone', guestPhone)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logger.error('履歴取得エラー:', error);
      return { success: false, error: '履歴の取得に失敗しました' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 期限切れリクエストの自動処理
export async function expireOldRequests(): Promise<ApiResponse<number>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('expire_old_requests');

    if (error) {
      logger.error('期限切れ処理エラー:', error);
      return { success: false, error: '期限切れ処理に失敗しました' };
    }

    return { success: true, data: data || 0 };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// カメラマンのオンライン状態を切り替え
export async function togglePhotographerOnlineStatus(
  isOnline: boolean
): Promise<ActionResult<PhotographerLocation | null>> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    if (isOnline) {
      // オンラインにする場合は位置情報が必要
      // フロントエンドから位置情報を受け取る必要があるため、
      // 実際の実装では位置情報をパラメータとして受け取る
      return { success: false, error: '位置情報が必要です' };
    } else {
      // オフラインにする場合は位置情報を削除
      const { error } = await supabase
        .from('photographer_locations')
        .delete()
        .eq('photographer_id', user.id);

      if (error) {
        logger.error('位置情報削除エラー:', error);
        return { success: false, error: '状態の更新に失敗しました' };
      }

      return { success: true, data: null };
    }
  } catch (error) {
    logger.error('オンライン状態切り替えエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * カメラマンのオンライン状態を切り替え（位置情報付き）
 */
export async function togglePhotographerOnlineStatusWithLocation(
  isOnline: boolean,
  latitude?: number,
  longitude?: number
): Promise<ActionResult<PhotographerLocation | null>> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    if (isOnline) {
      if (!latitude || !longitude) {
        return { success: false, error: '位置情報が必要です' };
      }

      // 位置情報を更新してオンラインにする
      const { data, error } = await supabase
        .from('photographer_locations')
        .upsert({
          photographer_id: user.id,
          latitude,
          longitude,
          is_online: true,
          accepting_requests: true,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('位置情報更新エラー:', error);
        return { success: false, error: '状態の更新に失敗しました' };
      }

      return { success: true, data };
    } else {
      // オフラインにする場合は位置情報を削除
      const { error } = await supabase
        .from('photographer_locations')
        .delete()
        .eq('photographer_id', user.id);

      if (error) {
        logger.error('位置情報削除エラー:', error);
        return { success: false, error: '状態の更新に失敗しました' };
      }

      return { success: true, data: null };
    }
  } catch (error) {
    logger.error('オンライン状態切り替えエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * カメラマンが受信したリクエスト一覧を取得
 */
export async function getPhotographerRequests(): Promise<
  ActionResult<InstantPhotoRequest[]>
> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // カメラマンに関連するリクエストを取得
    // 1. 近くのリクエスト（pending状態）
    // 2. 自分がマッチしたリクエスト
    const { data, error } = await supabase
      .from('instant_photo_requests')
      .select('*')
      .or(`status.eq.pending,matched_photographer_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error('リクエスト取得エラー:', error);
      return { success: false, error: 'リクエストの取得に失敗しました' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    logger.error('リクエスト取得エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * リクエストに応答する
 */
export async function respondToRequest(
  requestId: string,
  responseType: 'accept' | 'decline',
  declineReason?: string,
  estimatedArrivalTime?: number
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    if (responseType === 'accept') {
      // リクエストを受諾する
      const { error } = await supabase.rpc('accept_instant_photo_request', {
        p_request_id: requestId,
        p_photographer_id: user.id,
        p_estimated_arrival_time: estimatedArrivalTime || 15,
      });

      if (error) {
        logger.error('リクエスト受諾エラー:', error);
        return { success: false, error: 'リクエストの受諾に失敗しました' };
      }
    } else {
      // 応答を記録（辞退）
      const { error } = await supabase
        .from('photographer_request_responses')
        .insert({
          request_id: requestId,
          photographer_id: user.id,
          response_type: 'decline',
          decline_reason: declineReason,
        });

      if (error) {
        logger.error('応答記録エラー:', error);
        return { success: false, error: '応答の記録に失敗しました' };
      }
    }

    return { success: true, data: undefined };
  } catch (error) {
    logger.error('リクエスト応答エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * リクエストのステータスを更新
 */
export async function updateRequestStatus(
  requestId: string,
  status: 'in_progress' | 'completed' | 'cancelled'
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: '認証が必要です' };
    }

    // リクエスト情報を取得
    const { data: request, error: requestError } = await supabase
      .from('instant_photo_requests')
      .select('*')
      .eq('id', requestId)
      .eq('matched_photographer_id', user.id)
      .single();

    if (requestError || !request) {
      return { success: false, error: 'リクエストが見つかりません' };
    }

    // リクエストのステータスを更新
    const { error: updateError } = await supabase
      .from('instant_photo_requests')
      .update({
        status,
        updated_at: new Date().toISOString(),
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', requestId)
      .eq('matched_photographer_id', user.id);

    if (updateError) {
      logger.error('ステータス更新エラー:', updateError);
      return { success: false, error: 'ステータスの更新に失敗しました' };
    }

    // 撮影完了時に予約レコードを作成
    if (status === 'completed') {
      const platformFeeRate = 0.1; // 10%のプラットフォーム手数料
      const platformFee = Math.floor(request.budget * platformFeeRate);
      const photographerEarnings = request.budget - platformFee;

      const { error: bookingError } = await supabase
        .from('instant_bookings')
        .insert({
          request_id: requestId,
          photographer_id: user.id,
          total_amount: request.budget,
          platform_fee: platformFee,
          photographer_earnings: photographerEarnings,
          payment_status: 'pending',
          start_time: new Date().toISOString(), // 撮影開始時刻（現在時刻で仮設定）
        });

      if (bookingError) {
        logger.error('予約レコード作成エラー:', bookingError);
        // ステータス更新は成功しているので、警告として処理
        logger.warn(
          '予約レコードの作成に失敗しましたが、ステータス更新は完了しました'
        );
      }
    }

    return { success: true, data: undefined };
  } catch (error) {
    logger.error('ステータス更新エラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
