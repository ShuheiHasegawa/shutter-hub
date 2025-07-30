import { PhotoSession, Booking } from './database';

// 割引タイプ
export type DiscountType = 'none' | 'percentage' | 'fixed_amount';

// 撮影会スロット
export interface PhotoSessionSlot {
  id: string;
  photo_session_id: string;
  slot_number: number;

  // 時間設定
  start_time: string;
  end_time: string;
  break_duration_minutes: number;

  // 料金・参加者設定
  price_per_person: number;
  max_participants: number;
  current_participants: number;

  // 衣装画像
  costume_image_url?: string;
  costume_image_hash?: string; // 画像のハッシュ値（重複排除用）
  costume_description?: string;

  // 割引設定
  discount_type: DiscountType;
  discount_value: number;
  discount_condition?: string;

  // メタデータ
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// スロット作成・更新用の型
export interface CreatePhotoSessionSlotData {
  slot_number: number;
  start_time: string;
  end_time: string;
  break_duration_minutes?: number;
  price_per_person: number;
  max_participants: number;
  costume_image_url?: string;
  costume_image_hash?: string;
  costume_description?: string;
  discount_type?: DiscountType;
  discount_value?: number;
  discount_condition?: string;
  notes?: string;
}

export interface UpdatePhotoSessionSlotData
  extends Partial<CreatePhotoSessionSlotData> {
  id: string;
}

// スロット予約関連
export interface SlotBooking extends Omit<Booking, 'slot_id'> {
  slot_id: string;
  slot?: PhotoSessionSlot;
}

// スロット予約作成結果
export interface SlotBookingResult {
  booking_id: string | null;
  success: boolean;
  message: string;
}

// 撮影会（スロット対応版）
export interface PhotoSessionWithSlots extends PhotoSession {
  slots?: PhotoSessionSlot[];
  total_slots?: number;
  available_slots?: number;
}

// スロット統計情報
export interface SlotStatistics {
  total_slots: number;
  available_slots: number;
  booked_slots: number;
  total_revenue: number;
  average_price: number;
  peak_hours: { hour: number; bookings: number }[];
}

// 自動時間計算用のヘルパー型
export interface TimeSlotCalculation {
  slot_number: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  break_duration_minutes: number;
  next_slot_start_time?: string;
}

// 画像管理用の型
export interface CostumeImage {
  hash: string;
  url: string;
  usage_count: number;
  created_at: string;
}

// 一括撮影会作成用の型定義を追加

// 一括撮影会の選択モデル情報
export interface SelectedModel {
  model_id: string;
  display_name: string;
  avatar_url?: string;
  fee_amount: number; // モデルごとの個別料金
  profile_id?: string;
}

// 一括撮影会作成データ
export interface BulkPhotoSessionData {
  // 基本情報
  title: string;
  description?: string;
  location: string;
  address?: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  booking_type: string;
  allow_multiple_bookings: boolean;
  booking_settings: Record<string, unknown>;
  is_published: boolean;
  image_urls: string[];

  // 一括作成用
  selected_models: SelectedModel[];

  // 撮影枠（オプション）
  slots?: CreatePhotoSessionSlotData[];
}

// 一括撮影会作成結果
export interface BulkPhotoSessionResult {
  success: boolean;
  created_sessions: string[]; // 作成された撮影会IDのリスト
  bulk_group_id: string; // 一括作成グループID
  error?: string;
}

// モデル検索用の型
export interface ModelSearchResult {
  id: string;
  display_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  user_type: string;
}

// モデル検索フィルター
export interface ModelSearchFilter {
  query?: string;
  exclude_ids?: string[]; // 既に選択済みのモデルIDを除外
  limit?: number;
}
