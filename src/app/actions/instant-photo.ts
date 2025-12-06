'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { revalidatePath } from 'next/cache';
import { requireAuthForAction } from '@/lib/auth/server-actions';
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

    // 有効期限を設定（数日以内：3日後）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

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
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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
 * カメラマンの現在のオンライン状態を取得
 */
export async function getPhotographerOnlineStatus(): Promise<
  ActionResult<boolean>
> {
  try {
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    const { data: photographerLocation, error } = await supabase
      .from('photographer_locations')
      .select('is_online')
      .eq('photographer_id', user.id)
      .single();

    if (error) {
      // 位置情報が存在しない場合はオフラインとみなす
      if (error.code === 'PGRST116') {
        return { success: true, data: false };
      }
      logger.warn('オンライン状態取得エラー:', error);
      return { success: false, error: 'オンライン状態の取得に失敗しました' };
    }

    return { success: true, data: photographerLocation?.is_online === true };
  } catch (error) {
    logger.error('オンライン状態取得エラー（例外）:', error);
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
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      logger.warn('認証エラー:', authResult.error);
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    logger.info('フォトグラファーリクエスト取得開始:', { userId: user.id });

    // 1. フォトグラファーの位置情報とオンライン状態を取得
    const { data: photographerLocation, error: locationError } = await supabase
      .from('photographer_locations')
      .select('*')
      .eq('photographer_id', user.id)
      .single();

    if (locationError) {
      logger.warn('フォトグラファー位置情報取得エラー:', locationError);
      // 位置情報がない場合は、自分がマッチング済みのリクエストのみ返す
      const { data: matchedRequests, error: matchedError } = await supabase
        .from('instant_photo_requests')
        .select('*')
        .or(
          `matched_photographer_id.eq.${user.id},pending_photographer_id.eq.${user.id}`
        )
        .order('created_at', { ascending: false })
        .limit(20);

      if (matchedError) {
        logger.error('マッチング済みリクエスト取得エラー:', matchedError);
        return { success: false, error: 'リクエストの取得に失敗しました' };
      }

      return { success: true, data: matchedRequests || [] };
    }

    // 2. オンライン状態と受諾可能状態をチェック
    const isOnline = photographerLocation?.is_online === true;
    const acceptingRequests =
      photographerLocation?.accepting_requests !== false; // デフォルトtrue

    if (!isOnline || !acceptingRequests) {
      logger.info('フォトグラファーはオフラインまたは受諾不可:', {
        isOnline,
        acceptingRequests,
      });
      // オフラインでも、自分がマッチング済みのリクエストは表示
      const { data: matchedRequests, error: matchedError } = await supabase
        .from('instant_photo_requests')
        .select('*')
        .or(
          `matched_photographer_id.eq.${user.id},pending_photographer_id.eq.${user.id}`
        )
        .order('created_at', { ascending: false })
        .limit(20);

      if (matchedError) {
        logger.error('マッチング済みリクエスト取得エラー:', matchedError);
        return { success: false, error: 'リクエストの取得に失敗しました' };
      }

      return { success: true, data: matchedRequests || [] };
    }

    // 3. 位置情報ベースのフィルタリング
    // まず、pending状態のリクエストを取得
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('instant_photo_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50); // 多めに取得してからフィルタリング

    if (pendingError) {
      logger.error('pendingリクエスト取得エラー:', pendingError);
      return { success: false, error: 'リクエストの取得に失敗しました' };
    }

    // 4. 位置情報によるフィルタリング（距離ベース）
    const { calculateDistance } = await import('@/lib/utils/location');
    const photographerLat = photographerLocation.latitude;
    const photographerLng = photographerLocation.longitude;
    const responseRadius = photographerLocation.response_radius || 10000; // デフォルト10km

    // 注: 同県フィルタリングは将来的に実装予定

    // 距離と都道府県でフィルタリング
    const filteredRequests = (pendingRequests || []).filter(request => {
      // 他のフォトグラファーが受諾済みのリクエストは除外
      if (
        request.status === 'photographer_accepted' &&
        request.pending_photographer_id &&
        request.pending_photographer_id !== user.id
      ) {
        return false;
      }

      // 過去に辞退したリクエストは除外（後でチェック）

      // 距離チェック
      const distance = calculateDistance(
        photographerLat,
        photographerLng,
        request.location_lat,
        request.location_lng
      );

      if (distance > responseRadius) {
        return false;
      }

      // 同県フィルタリング（将来的に実装）
      // if (photographerPrefecture && request.location_address) {
      //   const requestPrefecture = extractPrefecture(request.location_address);
      //   // 同県の場合は優先（距離が近い順にソートされる）
      // }

      return true;
    });

    // 5. 過去に辞退したリクエストを除外
    const { data: declinedResponses, error: responseError } = await supabase
      .from('photographer_request_responses')
      .select('request_id')
      .eq('photographer_id', user.id)
      .eq('response_type', 'decline');

    if (responseError) {
      logger.warn('辞退履歴取得エラー:', responseError);
    }

    const declinedRequestIds = new Set(
      (declinedResponses || []).map(r => r.request_id)
    );

    const availableRequests = filteredRequests.filter(
      request => !declinedRequestIds.has(request.id)
    );

    // 6. 自分がマッチング済みのリクエストも取得
    const { data: matchedRequests, error: matchedError } = await supabase
      .from('instant_photo_requests')
      .select('*')
      .or(
        `matched_photographer_id.eq.${user.id},pending_photographer_id.eq.${user.id}`
      )
      .order('created_at', { ascending: false })
      .limit(20);

    if (matchedError) {
      logger.warn('マッチング済みリクエスト取得エラー:', matchedError);
    }

    // 7. 結果をマージして重複を除去
    const allRequests = [
      ...availableRequests.slice(0, 20), // 新規リクエスト（最大20件）
      ...(matchedRequests || []), // マッチング済みリクエスト
    ];

    // IDで重複除去
    const uniqueRequests = Array.from(
      new Map(allRequests.map(r => [r.id, r])).values()
    );

    // 作成日時でソート
    uniqueRequests.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    logger.info('取得したリクエスト:', {
      count: uniqueRequests.length,
      pending: availableRequests.length,
      matched: matchedRequests?.length || 0,
      requests: uniqueRequests.map(r => ({
        id: r.id,
        status: r.status,
        matched_photographer_id: r.matched_photographer_id,
        pending_photographer_id: r.pending_photographer_id,
        guest_name: r.guest_name,
        created_at: r.created_at, // デバッグ用
      })),
    });

    return { success: true, data: uniqueRequests.slice(0, 20) };
  } catch (error) {
    logger.error('リクエスト取得エラー（例外）:', error);
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
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

    if (responseType === 'accept') {
      // リクエスト情報を取得
      const { data: request, error: requestError } = await supabase
        .from('instant_photo_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        logger.error('リクエスト取得エラー:', requestError);
        return { success: false, error: 'リクエストが見つかりません' };
      }

      // 既にマッチング済みかチェック
      if (request.status === 'matched' && request.matched_photographer_id) {
        return {
          success: false,
          error: 'このリクエストは既に他のカメラマンにマッチングされています',
        };
      }

      // 他のフォトグラファーが受諾済みかチェック
      if (
        request.status === 'photographer_accepted' &&
        request.pending_photographer_id &&
        request.pending_photographer_id !== user.id
      ) {
        return {
          success: false,
          error: 'このリクエストは既に他のカメラマンが受諾しています',
        };
      }

      // 同じフォトグラファーの再受諾防止チェック
      const { data: existingResponse } = await supabase
        .from('photographer_request_responses')
        .select('id, response_type')
        .eq('request_id', requestId)
        .eq('photographer_id', user.id)
        .single();

      if (existingResponse) {
        // 過去に応答したことがある場合、再度受諾できない
        logger.warn('同じフォトグラファーが再度受諾しようとしています:', {
          requestId,
          photographerId: user.id,
          previousResponseType: existingResponse.response_type,
        });
        return {
          success: false,
          error:
            'このリクエストには既に応答済みです。再度受諾することはできません。',
        };
      }

      // リクエストのステータスを更新（photographer_accepted状態に）
      logger.info('リクエストステータス更新開始:', {
        requestId,
        photographerId: user.id,
        currentStatus: request.status,
      });

      const timeoutAt = new Date();
      timeoutAt.setMinutes(timeoutAt.getMinutes() + 10); // 10分後

      const { error: updateError, data: updatedRequests } = await supabase
        .from('instant_photo_requests')
        .update({
          status: 'photographer_accepted',
          pending_photographer_id: user.id,
          photographer_accepted_at: new Date().toISOString(),
          photographer_timeout_at: timeoutAt.toISOString(),
          // matched_photographer_idはまだ設定しない（ゲスト承認後に設定）
        })
        .eq('id', requestId)
        .eq('status', 'pending') // pending状態のもののみ更新
        .select();

      if (updateError) {
        logger.error('リクエストステータス更新エラー:', {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          requestId,
          photographerId: user.id,
          currentStatus: request.status,
        });
        return {
          success: false,
          error: `リクエストの受諾に失敗しました: ${updateError.message || 'データベースエラー'}`,
        };
      }

      // 更新された行数を確認
      if (!updatedRequests || updatedRequests.length === 0) {
        logger.warn('リクエストステータス更新: 更新された行が0件', {
          requestId,
          currentStatus: request.status,
        });
        // 既にマッチング済みか、ステータスが変更されている可能性
        // 最新の状態を再取得
        const { data: currentRequest, error: fetchError } = await supabase
          .from('instant_photo_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (fetchError) {
          logger.error('リクエスト再取得エラー:', fetchError);
          return { success: false, error: 'リクエストの受諾に失敗しました' };
        }

        if (!currentRequest) {
          logger.error('リクエストが見つかりません:', { requestId });
          return { success: false, error: 'リクエストが見つかりません' };
        }

        logger.info('リクエスト最新状態:', {
          requestId,
          status: currentRequest.status,
          matched_photographer_id: currentRequest.matched_photographer_id,
          userId: user.id,
        });

        if (
          (currentRequest.status === 'matched' &&
            currentRequest.matched_photographer_id === user.id) ||
          (currentRequest.status === 'photographer_accepted' &&
            currentRequest.pending_photographer_id === user.id)
        ) {
          logger.info(
            'リクエストは既に受諾済みです、予約レコードと応答記録を確認します'
          );
          // 既に受諾済みの場合は成功として扱う（処理を続行）
        } else if (
          (currentRequest.status === 'matched' &&
            currentRequest.matched_photographer_id !== user.id) ||
          (currentRequest.status === 'photographer_accepted' &&
            currentRequest.pending_photographer_id !== user.id)
        ) {
          logger.warn('リクエストは既に他のカメラマンに受諾されています', {
            status: currentRequest.status,
            matched_photographer_id: currentRequest.matched_photographer_id,
            pending_photographer_id: currentRequest.pending_photographer_id,
            current_user_id: user.id,
          });
          return {
            success: false,
            error: 'このリクエストは既に他のカメラマンが受諾しています',
          };
        } else if (currentRequest.status === 'pending') {
          // まだpending状態の場合、強制的に更新を試みる（楽観的ロック回避）
          logger.warn('リクエストはまだpending状態です、強制更新を試みます', {
            requestId,
            currentStatus: currentRequest.status,
          });
          // 強制更新: status条件を外して更新を試みる
          logger.info('強制更新: status条件なしで更新を試みます', {
            requestId,
            photographerId: user.id,
          });
          const timeoutAt = new Date();
          timeoutAt.setMinutes(timeoutAt.getMinutes() + 10); // 10分後

          const {
            error: forceUpdateError,
            data: forceUpdatedArray,
            count,
          } = await supabase
            .from('instant_photo_requests')
            .update({
              status: 'photographer_accepted',
              pending_photographer_id: user.id,
              photographer_accepted_at: new Date().toISOString(),
              photographer_timeout_at: timeoutAt.toISOString(),
            })
            .eq('id', requestId)
            .select();

          logger.info('強制更新結果:', {
            error: forceUpdateError,
            updatedCount: forceUpdatedArray?.length || 0,
            count,
            requestId,
          });

          if (forceUpdateError) {
            logger.error('強制更新エラー:', {
              error: forceUpdateError,
              code: forceUpdateError.code,
              message: forceUpdateError.message,
              details: forceUpdateError.details,
              hint: forceUpdateError.hint,
            });
            return {
              success: false,
              error: `リクエストの受諾に失敗しました: ${forceUpdateError.message || 'データベースエラー'}`,
            };
          }

          if (!forceUpdatedArray || forceUpdatedArray.length === 0) {
            logger.error('強制更新: 更新されたデータが取得できませんでした', {
              requestId,
              currentStatus: currentRequest.status,
            });
            // 最終確認：リクエストが存在するか、別の状態になっていないか確認
            const { data: finalCheck } = await supabase
              .from('instant_photo_requests')
              .select('*')
              .eq('id', requestId)
              .single();

            if (
              (finalCheck?.status === 'matched' &&
                finalCheck?.matched_photographer_id === user.id) ||
              (finalCheck?.status === 'photographer_accepted' &&
                finalCheck?.pending_photographer_id === user.id)
            ) {
              logger.info('強制更新: 既に受諾済みでした', { requestId });
              // 既に受諾済み（処理を続行）
            } else {
              return {
                success: false,
                error: 'リクエストの受諾に失敗しました: 更新データの取得に失敗',
              };
            }
          } else {
            logger.info('強制更新成功:', {
              requestId,
              newStatus: forceUpdatedArray[0]?.status,
              pendingPhotographerId:
                forceUpdatedArray[0]?.pending_photographer_id,
            });
            // 強制更新成功（処理を続行）
          }
        } else {
          logger.warn('リクエストのステータスが予期しない状態です', {
            currentStatus: currentRequest.status,
            requestId,
          });
          return { success: false, error: 'リクエストの受諾に失敗しました' };
        }
      } else {
        logger.info('リクエストステータス更新成功:', {
          requestId,
          newStatus: updatedRequests[0]?.status,
          pendingPhotographerId: updatedRequests[0]?.pending_photographer_id,
        });
      }

      // 注: 予約レコード（instant_bookings）は、ゲストが承認した後に作成する
      // フォトグラファーが受諾した時点では作成しない

      // 応答記録を作成（既にチェック済みなので、必ず存在しない）
      const { error: responseError } = await supabase
        .from('photographer_request_responses')
        .insert({
          request_id: requestId,
          photographer_id: user.id,
          response_type: 'accept',
          estimated_arrival_time: estimatedArrivalTime || 15,
        });

      if (responseError) {
        logger.warn('応答記録エラー:', responseError);
        // 応答記録は失敗しても受諾処理は完了しているので警告のみ
      }
    } else {
      // 応答を記録（辞退）
      logger.info('辞退処理開始:', {
        requestId,
        photographerId: user.id,
        declineReason,
      });

      // 既存の応答記録をチェック
      const { data: existingResponse } = await supabase
        .from('photographer_request_responses')
        .select('id')
        .eq('request_id', requestId)
        .eq('photographer_id', user.id)
        .single();

      if (!existingResponse) {
        // 応答記録が存在しない場合のみ作成
        const { error } = await supabase
          .from('photographer_request_responses')
          .insert({
            request_id: requestId,
            photographer_id: user.id,
            response_type: 'decline',
            decline_reason: declineReason,
          });

        if (error) {
          logger.error('応答記録エラー（辞退）:', error);
          return { success: false, error: '応答の記録に失敗しました' };
        }
        logger.info('辞退応答記録を作成しました');
      } else {
        // 既存の応答記録を更新（declineに変更）
        const { error: updateError } = await supabase
          .from('photographer_request_responses')
          .update({
            response_type: 'decline',
            decline_reason: declineReason,
          })
          .eq('request_id', requestId)
          .eq('photographer_id', user.id);

        if (updateError) {
          logger.error('応答記録更新エラー（辞退）:', updateError);
          return { success: false, error: '応答の記録に失敗しました' };
        }
        logger.info('辞退応答記録を更新しました');
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
    const authResult = await requireAuthForAction();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    const { user, supabase } = authResult.data;

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

/**
 * ゲストがフォトグラファーを承認する
 */
export async function approvePhotographer(
  requestId: string,
  photographerId: string
): Promise<ActionResult<{ bookingId: string | null }>> {
  try {
    const supabase = await createClient();

    // リクエスト情報を取得
    const { data: request, error: requestError } = await supabase
      .from('instant_photo_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      logger.error('リクエスト取得エラー:', requestError);
      return { success: false, error: 'リクエストが見つかりません' };
    }

    // ステータスとpending_photographer_idを確認
    if (
      request.status !== 'photographer_accepted' ||
      request.pending_photographer_id !== photographerId
    ) {
      logger.warn('承認できないリクエスト:', {
        requestId,
        status: request.status,
        pending_photographer_id: request.pending_photographer_id,
        requested_photographer_id: photographerId,
      });
      return {
        success: false,
        error: 'このフォトグラファーは受諾していないか、既に承認済みです',
      };
    }

    // タイムアウトチェック
    if (request.photographer_timeout_at) {
      const timeoutAt = new Date(request.photographer_timeout_at);
      if (timeoutAt < new Date()) {
        logger.warn('タイムアウト済みのリクエスト:', {
          requestId,
          timeoutAt: request.photographer_timeout_at,
        });
        // タイムアウト処理を実行
        await checkPhotographerTimeout(requestId);
        return {
          success: false,
          error: '承認期限が過ぎています。リクエストは再度オープンされました。',
        };
      }
    }

    // ステータスを'guest_approved' → 'matched'に変更
    const { error: updateError } = await supabase
      .from('instant_photo_requests')
      .update({
        status: 'matched',
        matched_photographer_id: photographerId,
        guest_approved_at: new Date().toISOString(),
        matched_at: new Date().toISOString(),
        // pending_photographer_idはそのまま（履歴として保持）
      })
      .eq('id', requestId)
      .eq('status', 'photographer_accepted')
      .eq('pending_photographer_id', photographerId);

    if (updateError) {
      logger.error('承認処理エラー:', updateError);
      return { success: false, error: '承認処理に失敗しました' };
    }

    // 予約レコード（instant_bookings）を作成
    const platformFeeRate = 0.1; // 10%のプラットフォーム手数料
    const platformFee = Math.floor(request.budget * platformFeeRate);
    const photographerEarnings = request.budget - platformFee;

    const { data: booking, error: bookingError } = await supabase
      .from('instant_bookings')
      .insert({
        request_id: requestId,
        photographer_id: photographerId,
        total_amount: request.budget,
        platform_fee: platformFee,
        photographer_earnings: photographerEarnings,
        payment_status: 'pending',
      })
      .select('id')
      .single();

    if (bookingError) {
      logger.error('予約レコード作成エラー:', bookingError);
      // ステータス更新は成功しているので、警告として処理
      logger.warn('予約レコードの作成に失敗しましたが、承認処理は完了しました');
      return {
        success: true,
        data: { bookingId: null } as { bookingId: string | null },
      };
    }

    logger.info('フォトグラファー承認成功:', {
      requestId,
      photographerId,
      bookingId: booking?.id,
    });

    // マッチング完了通知を送信（ゲストに通知）
    try {
      const { createNotification } = await import(
        '@/app/actions/notifications'
      );

      // カメラマンのプロフィール情報を取得
      const { data: photographerProfile, error: photographerError } =
        await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', photographerId)
          .single();

      if (!photographerError && photographerProfile && request.guest_id) {
        const { getNotificationMessage } = await import(
          '@/lib/utils/notification-i18n'
        );
        const notification = await getNotificationMessage(
          request.guest_id,
          'notificationMessages.instantPhoto.matchFound',
          { photographerName: photographerProfile.display_name }
        );

        await createNotification({
          userId: request.guest_id,
          type: 'instant_photo_match_found',
          category: 'instant_photo',
          priority: 'high',
          title: notification.title,
          message: notification.message,
          data: {
            request_id: requestId,
            photographer_id: photographerId,
            photographer_name: photographerProfile.display_name,
            booking_id: booking?.id,
            budget: request.budget,
          },
          relatedEntityType: 'instant_photo_request',
          relatedEntityId: requestId,
          actionUrl: `/instant/${requestId}`,
          actionLabel: '決済に進む',
        });
      }
    } catch (notificationError) {
      // 通知作成失敗はログに記録するが、メイン処理は継続
      logger.error('マッチング完了通知送信エラー:', notificationError);
    }

    return { success: true, data: { bookingId: booking?.id || null } };
  } catch (error) {
    logger.error('承認処理エラー（例外）:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * ゲストがフォトグラファーを拒否する
 */
export async function rejectPhotographer(
  requestId: string,
  photographerId: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // リクエスト情報を取得
    const { data: request, error: requestError } = await supabase
      .from('instant_photo_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      logger.error('リクエスト取得エラー:', requestError);
      return { success: false, error: 'リクエストが見つかりません' };
    }

    // ステータスとpending_photographer_idを確認
    if (
      request.status !== 'photographer_accepted' ||
      request.pending_photographer_id !== photographerId
    ) {
      logger.warn('拒否できないリクエスト:', {
        requestId,
        status: request.status,
        pending_photographer_id: request.pending_photographer_id,
        requested_photographer_id: photographerId,
      });
      return {
        success: false,
        error: 'このフォトグラファーは受諾していないか、既に承認済みです',
      };
    }

    // ステータスを'pending'に戻す
    const { error: updateError } = await supabase
      .from('instant_photo_requests')
      .update({
        status: 'pending',
        pending_photographer_id: null,
        photographer_accepted_at: null,
        photographer_timeout_at: null,
      })
      .eq('id', requestId)
      .eq('status', 'photographer_accepted')
      .eq('pending_photographer_id', photographerId);

    if (updateError) {
      logger.error('拒否処理エラー:', updateError);
      return { success: false, error: '拒否処理に失敗しました' };
    }

    // フォトグラファーの応答記録を'decline'に更新
    const { error: responseError } = await supabase
      .from('photographer_request_responses')
      .update({
        response_type: 'decline',
        decline_reason: 'ゲストが拒否しました',
      })
      .eq('request_id', requestId)
      .eq('photographer_id', photographerId);

    if (responseError) {
      logger.warn('応答記録更新エラー:', responseError);
      // 応答記録の更新は失敗しても拒否処理は完了しているので警告のみ
    }

    logger.info('フォトグラファー拒否成功:', {
      requestId,
      photographerId,
    });

    return { success: true, data: undefined };
  } catch (error) {
    logger.error('拒否処理エラー（例外）:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * フォトグラファー受諾のタイムアウトをチェックして処理する
 */
export async function checkPhotographerTimeout(
  requestId?: string
): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient();

    // 特定のリクエストIDが指定されている場合
    if (requestId) {
      const { data: request, error: requestError } = await supabase
        .from('instant_photo_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        logger.error('リクエスト取得エラー:', requestError);
        return { success: false, error: 'リクエストが見つかりません' };
      }

      // タイムアウトチェック
      if (
        request.status === 'photographer_accepted' &&
        request.photographer_timeout_at
      ) {
        const timeoutAt = new Date(request.photographer_timeout_at);
        if (timeoutAt < new Date()) {
          // タイムアウト処理
          const { error: updateError } = await supabase
            .from('instant_photo_requests')
            .update({
              status: 'pending',
              pending_photographer_id: null,
              photographer_accepted_at: null,
              photographer_timeout_at: null,
            })
            .eq('id', requestId)
            .eq('status', 'photographer_accepted');

          if (updateError) {
            logger.error('タイムアウト処理エラー:', updateError);
            return { success: false, error: 'タイムアウト処理に失敗しました' };
          }

          logger.info('タイムアウト処理成功:', { requestId });
          return { success: true, data: 1 };
        }
      }

      return { success: true, data: 0 };
    }

    // 全リクエストのタイムアウトチェック
    const now = new Date().toISOString();
    const { data: timeoutRequests, error: fetchError } = await supabase
      .from('instant_photo_requests')
      .select('id')
      .eq('status', 'photographer_accepted')
      .not('photographer_timeout_at', 'is', null)
      .lt('photographer_timeout_at', now);

    if (fetchError) {
      logger.error('タイムアウトリクエスト取得エラー:', fetchError);
      return { success: false, error: 'タイムアウトチェックに失敗しました' };
    }

    if (!timeoutRequests || timeoutRequests.length === 0) {
      return { success: true, data: 0 };
    }

    // タイムアウト処理
    const { error: updateError } = await supabase
      .from('instant_photo_requests')
      .update({
        status: 'pending',
        pending_photographer_id: null,
        photographer_accepted_at: null,
        photographer_timeout_at: null,
      })
      .eq('status', 'photographer_accepted')
      .not('photographer_timeout_at', 'is', null)
      .lt('photographer_timeout_at', now);

    if (updateError) {
      logger.error('タイムアウト一括処理エラー:', updateError);
      return { success: false, error: 'タイムアウト処理に失敗しました' };
    }

    logger.info('タイムアウト一括処理成功:', {
      count: timeoutRequests.length,
    });

    return { success: true, data: timeoutRequests.length };
  } catch (error) {
    logger.error('タイムアウトチェックエラー（例外）:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
