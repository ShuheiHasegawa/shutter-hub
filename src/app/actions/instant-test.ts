'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { createInstantPhotoRequest, autoMatchRequest } from './instant-photo';
import type {
  CreateInstantPhotoRequestData,
  InstantPhotoRequest,
  RequestType,
  RequestUrgency,
} from '@/types/instant-photo';

/**
 * フォトグラファー一覧を取得する
 */
export async function getPhotographersList(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    display_name: string;
    avatar_url?: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // フォトグラファーのプロフィールを取得
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('user_type', 'photographer')
      .order('display_name', { ascending: true });

    if (error) {
      logger.error('フォトグラファー一覧取得エラー:', error);
      return {
        success: false,
        error: 'フォトグラファー一覧の取得に失敗しました',
      };
    }

    return {
      success: true,
      data: profiles || [],
    };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return { success: false, error: '予期しないエラーが発生しました' };
  }
}

/**
 * ランダムなリクエストデータを生成する
 */
function generateRandomRequestData(
  photographerId: string,
  locationLat: number,
  locationLng: number
): CreateInstantPhotoRequestData {
  // ランダムな日本語名のリスト
  const firstNames = [
    '太郎',
    '花子',
    '一郎',
    '美咲',
    '健太',
    'さくら',
    '大輔',
    'あかり',
  ];
  const lastNames = ['テスト', 'サンプル', 'デモ', '開発'];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const guestName = `${lastName}${firstName}`;

  // ランダムな電話番号（090-XXXX-XXXX形式）
  const phoneNumber = `090-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

  // ランダムなメールアドレス
  const randomId = Math.floor(Math.random() * 100000);
  const guestEmail = `test-${randomId}@example.com`;

  // 撮影タイプをランダム選択
  const requestTypes: RequestType[] = [
    'portrait',
    'couple',
    'family',
    'group',
    'landscape',
  ];
  const requestType =
    requestTypes[Math.floor(Math.random() * requestTypes.length)];

  // 緊急度をランダム選択（DBのCHECK制約に合わせて、テストではnormal固定を使用）
  const urgencies: RequestUrgency[] = ['normal'];
  const urgency = urgencies[Math.floor(Math.random() * urgencies.length)];

  // 撮影時間をランダム選択
  const durations: (15 | 30 | 45 | 60)[] = [15, 30, 45, 60];
  const duration = durations[Math.floor(Math.random() * durations.length)];

  // 参加人数をランダム選択（1-10名）
  const partySize = Math.floor(Math.random() * 10) + 1;

  // 希望料金をランダム生成（3000-15000円）
  const budget = Math.floor(Math.random() * 12000) + 3000;

  // 特別リクエスト（50%の確率で追加）
  const specialRequests =
    Math.random() > 0.5
      ? `テスト用リクエスト - ${new Date().toLocaleString('ja-JP')}`
      : undefined;

  return {
    guest_name: guestName,
    guest_phone: phoneNumber,
    guest_email: guestEmail,
    party_size: partySize,
    location_lat: locationLat,
    location_lng: locationLng,
    location_address: '東京都千代田区丸の内1丁目（テスト用）',
    location_landmark: '東京駅周辺',
    request_type: requestType,
    urgency: urgency,
    duration: duration,
    budget: budget,
    special_requests: specialRequests,
  };
}

/**
 * テスト用の即座撮影リクエストを作成する
 * 指定したフォトグラファーに確実にマッチングされるように設定
 */
export async function createTestInstantRequest(
  photographerId: string
): Promise<{
  success: boolean;
  data?: {
    request: InstantPhotoRequest;
    bookingId?: string;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // フォトグラファーの存在確認
    const { data: photographer, error: photographerError } = await supabase
      .from('profiles')
      .select('id, display_name, user_type')
      .eq('id', photographerId)
      .eq('user_type', 'photographer')
      .single();

    if (photographerError || !photographer) {
      return {
        success: false,
        error: '指定されたフォトグラファーが見つかりません',
      };
    }

    // 東京駅周辺のランダム座標（リクエスト用）
    const baseLat = 35.6762; // 東京駅の緯度
    const baseLng = 139.6503; // 東京駅の経度
    const offset = 0.01; // 約1kmの範囲
    const requestLat = baseLat + (Math.random() - 0.5) * offset;
    const requestLng = baseLng + (Math.random() - 0.5) * offset;

    // フォトグラファーの位置情報をリクエスト位置の近くに設定（マッチング確実化）
    const photographerLat = requestLat + (Math.random() - 0.5) * 0.001; // 約100m以内
    const photographerLng = requestLng + (Math.random() - 0.5) * 0.001;

    // ランダムデータ生成
    const requestData = generateRandomRequestData(
      photographerId,
      requestLat,
      requestLng
    );

    // リクエストを作成（ゲスト利用制限をスキップするため、特別な電話番号を使用）
    // テスト用の電話番号プレフィックスを使用
    requestData.guest_phone = `090-TEST-${Math.floor(Math.random() * 10000)}`;

    // リクエスト作成
    const createResult = await createInstantPhotoRequest(requestData);

    if (!createResult.success || !createResult.data) {
      return {
        success: false,
        error: createResult.error || 'リクエストの作成に失敗しました',
      };
    }

    const request = createResult.data;

    // フォトグラファーの位置情報を直接データベースに設定（マッチング確実化のため）
    // 認証不要で位置情報を設定するため、直接データベースに書き込む
    const { error: locationError } = await supabase
      .from('photographer_locations')
      .upsert({
        photographer_id: photographerId,
        latitude: photographerLat,
        longitude: photographerLng,
        accuracy: 10,
        is_online: true,
        available_until: new Date(
          Date.now() + 2 * 60 * 60 * 1000
        ).toISOString(), // 2時間後
        accepting_requests: true,
        response_radius: 5000, // 5km
        instant_rates: {
          portrait: requestData.budget,
          couple: requestData.budget,
          family: requestData.budget,
          group: requestData.budget,
          landscape: requestData.budget,
          pet: requestData.budget,
        },
        updated_at: new Date().toISOString(),
      });

    if (locationError) {
      logger.warn(
        'フォトグラファー位置情報更新に失敗しましたが、リクエストは作成されました:',
        locationError
      );
    } else {
      logger.info('フォトグラファー位置情報を更新しました:', {
        photographerId,
        latitude: photographerLat,
        longitude: photographerLng,
      });
    }

    // 自動マッチングを再実行（確実にマッチングさせるため）
    const matchResult = await autoMatchRequest(request.id);

    if (matchResult.success && matchResult.data?.matched_photographer_id) {
      logger.info('テストリクエストマッチング成功:', {
        requestId: request.id,
        photographerId: matchResult.data.matched_photographer_id,
      });

      // 予約レコードを取得
      const { data: booking } = await supabase
        .from('instant_bookings')
        .select('id')
        .eq('request_id', request.id)
        .single();

      return {
        success: true,
        data: {
          request,
          bookingId: booking?.id,
        },
      };
    } else {
      logger.warn('自動マッチングが実行されませんでした:', matchResult.error);
      return {
        success: true,
        data: {
          request,
        },
      };
    }
  } catch (error) {
    logger.error('テストリクエスト作成エラー:', error);
    return {
      success: false,
      error: '予期しないエラーが発生しました',
    };
  }
}

/**
 * 作成済みのテストリクエスト一覧を取得する
 */
export async function getTestRequests(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    guest_name: string;
    request_type: RequestType;
    budget: number;
    status: string;
    created_at: string;
    booking_id?: string;
    photographer_id?: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // テスト用電話番号で始まるリクエストを取得
    const { data: requests, error } = await supabase
      .from('instant_photo_requests')
      .select(
        `
        id,
        guest_name,
        request_type,
        budget,
        status,
        created_at,
        matched_photographer_id,
        pending_photographer_id
      `
      )
      .like('guest_phone', '090-TEST-%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('テストリクエスト一覧取得エラー:', error);
      return {
        success: false,
        error: 'テストリクエスト一覧の取得に失敗しました',
      };
    }

    if (!requests || requests.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // 各リクエストに対応する予約を取得
    const requestIds = requests.map(r => r.id);
    const { data: bookings } = await supabase
      .from('instant_bookings')
      .select('id, request_id')
      .in('request_id', requestIds);

    // リクエストIDをキーとした予約マップを作成
    const bookingMap = new Map<string, string>();
    bookings?.forEach(booking => {
      bookingMap.set(booking.request_id, booking.id);
    });

    // データを整形
    const formattedRequests = requests.map(request => ({
      id: request.id,
      guest_name: request.guest_name,
      request_type: request.request_type,
      budget: request.budget,
      status: request.status,
      created_at: request.created_at,
      booking_id: bookingMap.get(request.id),
      // マッチ済みなら matched_photographer_id、受諾状態なら pending_photographer_id を使用
      photographer_id:
        request.matched_photographer_id ||
        request.pending_photographer_id ||
        undefined,
    }));

    return {
      success: true,
      data: formattedRequests,
    };
  } catch (error) {
    logger.error('予期しないエラー:', error);
    return {
      success: false,
      error: '予期しないエラーが発生しました',
    };
  }
}

/**
 * テスト用：写真配信をシミュレートする
 * 決済完了後のフローをテストするためのヘルパー関数
 */
export async function simulatePhotoDelivery(bookingId: string): Promise<{
  success: boolean;
  data?: {
    deliveryId: string;
    deliveryUrl: string;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // booking情報を取得
    const { data: booking, error: bookingError } = await supabase
      .from('instant_bookings')
      .select('*, request:instant_photo_requests(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: '予約情報が見つかりません',
      };
    }

    // 配信情報を作成
    const deliveryUrl = `https://example.com/photos/test-delivery-${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data: delivery, error: deliveryError } = await supabase
      .from('photo_deliveries')
      .upsert(
        {
          booking_id: bookingId,
          delivery_method: 'external_url',
          external_service: 'test_simulation',
          external_url: deliveryUrl,
          photo_count: 10,
          total_size_mb: 50,
          resolution: 'high',
          formats: ['jpg', 'edited'],
          photographer_message: 'テスト配信です。素敵な写真をお届けします！',
          download_expires_at: expiresAt.toISOString(),
          download_count: 0,
          max_downloads: 10,
          delivered_at: new Date().toISOString(),
        },
        {
          onConflict: 'booking_id',
        }
      )
      .select()
      .single();

    if (deliveryError) {
      logger.error('写真配信シミュレートエラー:', deliveryError);
      return {
        success: false,
        error: '配信情報の作成に失敗しました',
      };
    }

    // エスクロー決済ステータスを更新
    await supabase
      .from('escrow_payments')
      .update({
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId);

    // 予約情報を更新
    await supabase
      .from('instant_bookings')
      .update({
        photos_delivered: 10,
        delivery_url: deliveryUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    // リクエストのステータスを 'delivered' に更新
    const request = Array.isArray(booking.request)
      ? booking.request[0]
      : booking.request;

    if (request?.id) {
      await supabase
        .from('instant_photo_requests')
        .update({
          status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);
    }

    logger.info('写真配信シミュレート成功:', {
      bookingId,
      deliveryId: delivery.id,
      deliveryUrl,
    });

    return {
      success: true,
      data: {
        deliveryId: delivery.id,
        deliveryUrl,
      },
    };
  } catch (error) {
    logger.error('写真配信シミュレートエラー:', error);
    return {
      success: false,
      error: '予期しないエラーが発生しました',
    };
  }
}
