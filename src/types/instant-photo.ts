// 即座撮影リクエスト機能の型定義

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
  address?: string; // 逆ジオコーディング
  landmark?: string; // 近くの観光地
}

export type RequestType =
  | 'portrait'
  | 'couple'
  | 'family'
  | 'group'
  | 'landscape'
  | 'pet';
export type RequestUrgency = 'now' | 'within_30min' | 'within_1hour' | 'normal';
export type RequestStatus =
  | 'pending'
  | 'matched'
  | 'in_progress'
  | 'completed'
  | 'delivered'
  | 'cancelled'
  | 'expired';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type ResponseType = 'accept' | 'decline' | 'timeout';

export interface InstantPhotoRequest {
  id: string;

  // ゲスト情報
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  party_size: number;

  // 位置情報
  location_lat: number;
  location_lng: number;
  location_address?: string;
  location_landmark?: string;

  // リクエスト内容
  request_type: RequestType;
  urgency: RequestUrgency;
  duration: 15 | 30 | 45 | 60; // 分
  budget: number;
  special_requests?: string;

  // マッチング・ステータス
  status: RequestStatus;
  matched_photographer_id?: string;

  // タイムスタンプ
  created_at: string;
  expires_at: string;
  matched_at?: string;
  completed_at?: string;
}

export interface CreateInstantPhotoRequestData {
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  party_size: number;
  location_lat: number;
  location_lng: number;
  location_address?: string;
  location_landmark?: string;
  request_type: RequestType;
  urgency: RequestUrgency;
  duration: 15 | 30 | 45 | 60;
  budget: number;
  special_requests?: string;
}

export interface PhotographerLocation {
  photographer_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  is_online: boolean;
  available_until?: string;
  accepting_requests: boolean;
  response_radius: number; // メートル
  instant_rates: Record<RequestType, number>; // 各撮影タイプの料金
  current_booking_id?: string;
  updated_at: string;
}

export interface UpdatePhotographerLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  is_online: boolean;
  available_until?: string;
  accepting_requests: boolean;
  response_radius: number;
  instant_rates: Record<RequestType, number>;
}

export interface InstantBooking {
  id: string;
  request_id: string;
  photographer_id: string;
  start_time?: string;
  end_time?: string;
  actual_duration?: number;
  photos_delivered: number;
  delivery_url?: string;
  guest_rating?: number;
  photographer_rating?: number;
  guest_review?: string;
  photographer_review?: string;
  total_amount: number;
  platform_fee: number;
  photographer_earnings: number;
  payment_status: PaymentStatus;
  payment_method?: string;
  rush_fee: number;
  holiday_fee: number;
  night_fee: number;
  created_at: string;
}

export interface PhotographerRequestResponse {
  id: string;
  request_id: string;
  photographer_id: string;
  response_type: ResponseType;
  response_time: string;
  decline_reason?: string;
  estimated_arrival_time?: number; // 分
  distance_meters?: number;
  response_time_seconds?: number;
  created_at: string;
}

export interface GuestUsageHistory {
  id: string;
  guest_phone: string;
  guest_email?: string;
  request_id: string;
  usage_month: string; // 'YYYY-MM' 形式
  created_at: string;
}

// ストアドプロシージャの戻り値型
export interface NearbyPhotographer {
  photographer_id: string;
  distance_meters: number;
  rating: number;
  instant_rate: number;
  response_time_avg: number;
  is_available: boolean;
  latitude: number;
  longitude: number;
  display_name?: string;
  avatar_url?: string;
  specialties?: string[];
}

export interface AutoMatchResult {
  success: boolean;
  message: string;
  matched_photographer_id?: string;
}

export interface ResponseResult {
  success: boolean;
  message: string;
  is_matched: boolean;
}

export interface GuestUsageLimit {
  can_use: boolean;
  usage_count: number;
  limit_reached: boolean;
}

// UI用のコンポーネント型
export interface InstantPhotoRequestWithDetails extends InstantPhotoRequest {
  photographer?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    average_rating?: number;
  };
  booking?: InstantBooking;
  responses?: PhotographerRequestResponse[];
}

export interface PhotographerLocationWithProfile extends PhotographerLocation {
  photographer: {
    id: string;
    display_name: string;
    avatar_url?: string;
    average_rating?: number;
    phone?: string;
  };
}

// 料金体系
export interface InstantPricingConfig {
  portrait_15min: number;
  couple_30min: number;
  family_30min: number;
  group_30min: number;
  premium_60min: number;

  // 追加料金
  rush_fee: number; // 緊急料金（30分以内）
  holiday_fee: number; // 休日料金
  night_fee: number; // 夜間料金（18時以降）
}

// マッチング基準
export interface MatchingCriteria {
  distance: number; // 距離の重み（0-1）
  rating: number; // 評価の重み（0-1）
  responseTime: number; // 応答速度の重み（0-1）
  priceMatch: number; // 料金適合性の重み（0-1）
}

// フォーム用の型
export interface QuickRequestFormData {
  requestType: RequestType;
  urgency: RequestUrgency;
  duration: 15 | 30 | 45 | 60;
  budget: number;
  specialRequests: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  partySize: number;
}

// Geolocation API用の型
export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    altitudeAccuracy?: number;
    heading?: number;
    speed?: number;
  };
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

// API応答の共通型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Server Action用の戻り値型
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// リアルタイム通信用の型
export interface RealtimeChannelData {
  event: string;
  type: string;
  table: string;
  old_record?: Record<string, unknown>;
  record?: Record<string, unknown>;
}

// 通知用の型
export interface InstantPhotoNotification {
  id: string;
  type:
    | 'new_request'
    | 'match_found'
    | 'payment_received'
    | 'booking_completed';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  booking_id?: string; // マッチング通知用のbooking ID
  read: boolean;
  created_at: string;
}

// === エスクロー決済システム用型定義 ===

// エスクロー決済ステータス
export type EscrowStatus =
  | 'pending' // 決済待ち
  | 'escrowed' // エスクロー（預託済み）
  | 'delivered' // 写真納品済み（カメラマン待機）
  | 'confirmed' // ゲスト受取確認済み
  | 'completed' // 決済完了（カメラマンに支払い済み）
  | 'disputed' // 争議中
  | 'cancelled' // キャンセル
  | 'refunded'; // 返金済み

// 配送・納品ステータス
export type DeliveryStatus =
  | 'waiting' // 撮影待ち
  | 'in_progress' // 撮影中
  | 'processing' // 編集・処理中
  | 'delivered' // 納品完了
  | 'confirmed'; // 受取確認済み

// 配送方法
export type DeliveryMethod =
  | 'direct_upload' // 直接アップロード
  | 'external_url' // 外部URL（ギガファイル便等）
  | 'cloud_storage'; // クラウドストレージ

// エスクロー決済情報
export interface EscrowPayment {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string;
  total_amount: number;
  platform_fee: number;
  photographer_earnings: number;
  escrow_status: EscrowStatus;
  delivery_status: DeliveryStatus;

  // タイムスタンプ
  payment_created_at: string;
  escrowed_at?: string;
  delivered_at?: string;
  confirmed_at?: string;
  completed_at?: string;

  // 自動確認設定（メルカリのような自動受取機能）
  auto_confirm_enabled: boolean;
  auto_confirm_hours: number; // デフォルト72時間
  auto_confirm_at?: string;

  // 争議・サポート
  dispute_reason?: string;
  dispute_created_at?: string;
  admin_notes?: string;

  created_at: string;
  updated_at: string;
}

// 写真配信情報
export interface PhotoDelivery {
  id: string;
  booking_id: string;
  delivery_method: DeliveryMethod;

  // 直接アップロード用
  delivery_url?: string;
  photo_count: number;
  total_size_mb: number;
  thumbnail_url?: string;

  // 外部URL用
  external_url?: string;
  external_service?: string; // "gigafile", "firestorage", "wetransfer", "googledrive", "dropbox", "other"
  external_password?: string;
  external_expires_at?: string;

  // ダウンロード情報
  download_expires_at: string; // 配信URL有効期限
  download_count: number;
  max_downloads: number;

  // 品質情報
  resolution: string; // "high" | "medium" | "web"
  formats: string[]; // ["jpg", "raw", "edited"]

  // カメラマンからのメッセージ
  photographer_message?: string;

  delivered_at: string;
  confirmed_at?: string;
}

// ゲスト受取確認データ（レビュー機能付き）
export interface ConfirmDeliveryData {
  booking_id: string;

  // 受取確認
  is_satisfied: boolean;
  issues?: string[]; // ["quality", "quantity", "timing", "other"]
  issue_description?: string;

  // レビュー（カメラマン評価）
  photographer_rating: number; // 1-5
  photographer_review?: string;

  // 写真品質評価
  photo_quality_rating: number; // 1-5
  photo_quality_comment?: string;

  // サービス評価
  service_rating: number; // 1-5
  service_comment?: string;

  // 推奨度
  would_recommend: boolean;
  recommend_reason?: string;
}

// カメラマン配信データ（配信方法選択付き）
export interface DeliverPhotosData {
  booking_id: string;
  delivery_method: DeliveryMethod;
  photo_count: number;

  // 直接アップロード用
  delivery_url?: string;
  total_size_mb?: number;
  thumbnail_url?: string;

  // 外部URL用
  external_url?: string;
  external_service?: string;
  external_password?: string;
  external_expires_at?: string;

  resolution: 'high' | 'medium' | 'web';
  formats: string[];
  photographer_message?: string;
}

// 争議申請データ
export interface DisputeData {
  booking_id: string;
  reason:
    | 'quality_issue'
    | 'quantity_issue'
    | 'no_delivery'
    | 'late_delivery'
    | 'service_issue'
    | 'other';
  description: string;
  evidence_urls?: string[]; // 証拠画像のURL
  requested_resolution: 'refund' | 'partial_refund' | 'redelivery' | 'other';
  resolution_detail?: string;
}

// 外部配信サービス情報
export interface ExternalDeliveryService {
  id: string;
  name: string;
  url_pattern: string;
  supports_password: boolean;
  supports_expiry: boolean;
  max_file_size_gb: number;
  icon_url?: string;
}

// レビュー統計
export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  photo_quality_average: number;
  service_average: number;
  recommendation_rate: number; // %
}

// === 統合された型定義 ===

// 拡張された予約型（UI用統合型）
export interface ExtendedBooking extends InstantBooking {
  request?: InstantPhotoRequest;
  photographer?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    average_rating?: number;
    phone?: string;
  };
  escrow_payment?: EscrowPayment;
  photo_delivery?: PhotoDelivery;
  photo_deliveries?: PhotoDelivery[];
}

// コンポーネントプロパティ型定義
export interface EscrowPaymentFormProps {
  booking: ExtendedBooking;
  guestPhone: string;
  onSuccess?: (escrowPayment: EscrowPayment) => void;
  onError?: (error: string) => void;
}

export interface DeliveryConfirmationFormProps {
  booking: ExtendedBooking;
  delivery: PhotoDelivery;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// フォトデリバリー確認フォーム用の簡易プロパティ型
export interface SimpleDeliveryConfirmationFormProps {
  delivery: PhotoDelivery;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}
