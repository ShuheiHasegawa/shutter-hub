'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  CreateInstantPhotoRequestData,
  UpdatePhotographerLocationData,
  InstantPhotoRequest,
  PhotographerLocation,
  NearbyPhotographer,
  AutoMatchResult,
  ResponseResult,
  GuestUsageLimit,
  ApiResponse,
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
      console.error('即座撮影リクエスト作成エラー:', error);
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
      console.log('自動マッチング実行:', matchResult.data?.message);
    }

    revalidatePath('/instant');
    return { success: true, data: request };
  } catch (error) {
    console.error('予期しないエラー:', error);
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
      console.error('位置情報更新エラー:', error);
      return { success: false, error: '位置情報の更新に失敗しました' };
    }

    revalidatePath('/dashboard');
    return { success: true, data: location };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 近くのカメラマンを検索
export async function findNearbyPhotographers(
  latitude: number,
  longitude: number,
  radiusMeters: number = 1000,
  requestType?: string,
  maxBudget?: number
): Promise<ApiResponse<NearbyPhotographer[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('find_nearby_photographers', {
      target_lat: latitude,
      target_lng: longitude,
      radius_meters: radiusMeters,
      request_type: requestType,
      max_budget: maxBudget,
    });

    if (error) {
      console.error('近くのカメラマン検索エラー:', error);
      return { success: false, error: 'カメラマンの検索に失敗しました' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('予期しないエラー:', error);
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
      console.error('自動マッチングエラー:', error);
      return { success: false, error: '自動マッチングに失敗しました' };
    }

    const result = data?.[0] as AutoMatchResult;
    return { success: true, data: result };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// カメラマンがリクエストに応答
export async function respondToRequest(
  requestId: string,
  responseType: 'accept' | 'decline',
  declineReason?: string,
  estimatedArrivalTime?: number
): Promise<ApiResponse<ResponseResult>> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    const { data, error } = await supabase.rpc('respond_to_request', {
      request_id: requestId,
      photographer_id: user.id,
      response_type: responseType,
      decline_reason: declineReason,
      estimated_arrival_time: estimatedArrivalTime,
    });

    if (error) {
      console.error('リクエスト応答エラー:', error);
      return { success: false, error: 'リクエストへの応答に失敗しました' };
    }

    const result = data?.[0] as ResponseResult;
    revalidatePath('/dashboard');
    revalidatePath('/instant');

    return { success: true, data: result };
  } catch (error) {
    console.error('予期しないエラー:', error);
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
      console.error('利用制限チェックエラー:', error);
      return { success: false, error: '利用制限のチェックに失敗しました' };
    }

    const result = data?.[0] as GuestUsageLimit;
    return { success: true, data: result };
  } catch (error) {
    console.error('予期しないエラー:', error);
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
      console.error('リクエスト取得エラー:', error);
      return { success: false, error: 'リクエストの取得に失敗しました' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('予期しないエラー:', error);
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
      console.error('履歴取得エラー:', error);
      return { success: false, error: '履歴の取得に失敗しました' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// カメラマンの受信リクエスト一覧を取得
export async function getPhotographerRequests(): Promise<
  ApiResponse<InstantPhotoRequest[]>
> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // カメラマンに通知されたリクエストを取得
    const { data, error } = await supabase
      .from('photographer_request_responses')
      .select(
        `
        *,
        request:instant_photo_requests(*)
      `
      )
      .eq('photographer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('リクエスト一覧取得エラー:', error);
      return { success: false, error: 'リクエスト一覧の取得に失敗しました' };
    }

    const requests = data?.map(item => item.request).filter(Boolean) || [];
    return { success: true, data: requests };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// リクエストのステータスを更新
export async function updateRequestStatus(
  requestId: string,
  status: 'in_progress' | 'completed' | 'cancelled'
): Promise<ApiResponse<InstantPhotoRequest>> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '認証が必要です' };
    }

    // リクエストの所有者チェック（マッチしたカメラマンのみ更新可能）
    const { data: request, error: checkError } = await supabase
      .from('instant_photo_requests')
      .select('matched_photographer_id')
      .eq('id', requestId)
      .single();

    if (checkError || !request) {
      return { success: false, error: 'リクエストが見つかりません' };
    }

    if (request.matched_photographer_id !== user.id) {
      return { success: false, error: '権限がありません' };
    }

    // ステータス更新
    const updateData: Record<string, unknown> = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: updatedRequest, error } = await supabase
      .from('instant_photo_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('ステータス更新エラー:', error);
      return { success: false, error: 'ステータスの更新に失敗しました' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/instant');

    return { success: true, data: updatedRequest };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// 期限切れリクエストの自動処理
export async function expireOldRequests(): Promise<ApiResponse<number>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('expire_old_requests');

    if (error) {
      console.error('期限切れ処理エラー:', error);
      return { success: false, error: '期限切れ処理に失敗しました' };
    }

    return { success: true, data: data || 0 };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

// カメラマンのオンライン状態を切り替え
export async function togglePhotographerOnlineStatus(
  isOnline: boolean
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

    const { data, error } = await supabase
      .from('photographer_locations')
      .update({
        is_online: isOnline,
        accepting_requests: isOnline, // オフラインの場合はリクエストも受け付けない
        available_until: isOnline ? null : new Date().toISOString(),
      })
      .eq('photographer_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('オンライン状態更新エラー:', error);
      return { success: false, error: 'オンライン状態の更新に失敗しました' };
    }

    revalidatePath('/dashboard');
    return { success: true, data };
  } catch (error) {
    console.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}
