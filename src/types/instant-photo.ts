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
  | 'landscape';
export type RequestUrgency = 'now' | 'within_30min' | 'within_1hour';
export type RequestStatus =
  | 'pending'
  | 'matched'
  | 'in_progress'
  | 'completed'
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
  duration: 15 | 30 | 60; // 分
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
  duration: 15 | 30 | 60;
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
  duration: 15 | 30 | 60;
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
  read: boolean;
  created_at: string;
}
