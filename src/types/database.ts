// ShutterHub データベース型定義

export type UserType = 'model' | 'photographer' | 'organizer';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export type BookingType =
  | 'first_come'
  | 'lottery'
  | 'admin_lottery'
  | 'priority';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  user_type: UserType;
  bio: string | null;
  location: string | null;
  website: string | null;
  instagram_handle: string | null;
  twitter_handle: string | null;
  phone: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  username_updated_at?: string | null;
}

export interface PhotoSession {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  location: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  start_time: string;
  end_time: string;
  max_participants: number;
  current_participants: number;
  price_per_person: number;
  image_urls: string[] | null;
  booking_type: BookingType;
  allow_multiple_bookings: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  photo_session_id: string;
  user_id: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

// リレーション付きの型定義
export interface PhotoSessionWithOrganizer extends PhotoSession {
  organizer: Profile;
}

export interface BookingWithDetails extends Booking {
  photo_session: PhotoSession;
  user: Profile;
}

export interface PhotoSessionWithBookings extends PhotoSession {
  bookings: Booking[];
}

// 抽選撮影会関連の型定義
export interface LotteryPhotoSession {
  id: string;
  photo_session_id: string;
  entry_start: string;
  entry_end: string;
  lottery_date: string;
  winners_count: number;
  status: 'upcoming' | 'accepting' | 'closed' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface LotteryEntry {
  id: string;
  lottery_photo_session_id: string;
  user_id: string;
  application_message?: string;
  status: 'entered' | 'won' | 'lost';
  created_at: string;
  updated_at: string;
}

export interface LotteryResult {
  id: string;
  lottery_photo_session_id: string;
  drawn_at: string;
  total_entries: number;
  winners_selected: number;
  algorithm_used: string;
  seed_value?: string;
  created_at: string;
}

// 抽選撮影会と撮影会の結合型
export interface LotteryPhotoSessionWithDetails extends LotteryPhotoSession {
  photo_session: PhotoSessionWithOrganizer;
}

// 抽選エントリーとユーザー情報の結合型
export interface LotteryEntryWithUser extends LotteryEntry {
  user: Profile;
}

// 管理抽選撮影会関連の型定義
export interface AdminLotteryPhotoSession {
  id: string;
  photo_session_id: string;
  entry_start: string;
  entry_end: string;
  selection_deadline: string;
  winners_count: number;
  status: 'upcoming' | 'accepting' | 'selecting' | 'completed';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AdminLotteryEntry {
  id: string;
  admin_lottery_photo_session_id: string;
  user_id: string;
  application_message?: string;
  status: 'applied' | 'selected' | 'rejected';
  selected_at?: string;
  selected_by?: string;
  selection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface SelectionCriteria {
  id: string;
  admin_lottery_photo_session_id: string;
  criteria_name: string;
  weight: number;
  description?: string;
  created_at: string;
}

export interface AdminLotteryResult {
  id: string;
  admin_lottery_photo_session_id: string;
  selected_at: string;
  total_entries: number;
  winners_selected: number;
  selection_method: string;
  selected_by?: string;
  notes?: string;
  created_at: string;
}

// 管理抽選撮影会と撮影会の結合型
export interface AdminLotteryPhotoSessionWithDetails
  extends AdminLotteryPhotoSession {
  photo_session: PhotoSessionWithOrganizer;
}

// 管理抽選エントリーとユーザー情報の結合型
export interface AdminLotteryEntryWithUser extends AdminLotteryEntry {
  user: Profile;
}

// 管理抽選統計情報
export interface AdminLotteryStats {
  total_entries: number;
  selected_count: number;
  rejected_count: number;
  pending_count: number;
  first_time_participants: number;
  repeat_participants: number;
}

// フォーム用の型定義
export interface CreateProfileData {
  display_name: string;
  user_type: UserType;
  bio?: string;
  location?: string;
  website?: string;
  instagram_handle?: string;
  twitter_handle?: string;
  phone?: string;
}

export interface UpdateProfileData extends Partial<CreateProfileData> {
  avatar_url?: string;
}

export interface CreatePhotoSessionData {
  title: string;
  description?: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  start_time: string;
  end_time: string;
  max_participants: number;
  price_per_person: number;
  image_urls?: string[];
  booking_type: BookingType;
  booking_settings?: BookingSettings;
  is_published?: boolean;
}

// 予約設定の型定義
export interface BookingSettings {
  // 共通設定
  booking_start_time?: string;
  enable_waitlist?: boolean;
  max_waitlist_size?: number;

  // 抽選設定
  application_start_time?: string;
  application_end_time?: string;
  lottery_date_time?: string;
  auto_lottery?: boolean;

  // 管理抽選設定
  selection_criteria?: string;
  application_message?: string;

  // 優先予約設定
  vip_slots?: number;
  platinum_slots?: number;
  gold_slots?: number;
  enable_general_booking?: boolean;
  general_booking_start_time?: string;

  // 旧設定（後方互換性のため保持）
  lottery?: {
    entry_start_time: string;
    entry_end_time: string;
    lottery_date: string;
    max_winners: number;
  };
  admin_lottery?: {
    entry_start_time: string;
    entry_end_time: string;
    selection_deadline: string;
    max_selections: number;
  };
  priority?: {
    general_booking_start: string;
    ticket_priority_enabled: boolean;
    ticket_priority_start?: string;
    ticket_priority_end?: string;
    rank_priority_enabled: boolean;
    vip_start_time?: string;
    vip_end_time?: string;
    platinum_start_time?: string;
    platinum_end_time?: string;
    gold_start_time?: string;
    gold_end_time?: string;
    silver_start_time?: string;
    silver_end_time?: string;
  };
}

export type UpdatePhotoSessionData = Partial<CreatePhotoSessionData>;

export interface CreateBookingData {
  photo_session_id: string;
}

// キャンセル待ち関連の型定義
export interface WaitlistEntry {
  id: string;
  photo_session_id: string;
  user_id: string;
  queue_position: number;
  status: 'waiting' | 'promoted' | 'expired' | 'cancelled';
  auto_promote: boolean;
  notification_sent: boolean;
  promotion_deadline?: string;
  message?: string;
  promotion_reason?: string;
  created_at: string;
  promoted_at?: string;
  expired_at?: string;
  cancelled_at?: string;
}

// キャンセル待ちエントリーと撮影会の結合型
export interface WaitlistEntryWithPhotoSession extends WaitlistEntry {
  photo_session: PhotoSessionWithOrganizer;
}

// Supabase Database型定義
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'> & {
          id: string;
        };
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      photo_sessions: {
        Row: PhotoSession;
        Insert: Omit<
          PhotoSession,
          'id' | 'created_at' | 'updated_at' | 'current_participants'
        >;
        Update: Partial<Omit<PhotoSession, 'id' | 'created_at' | 'updated_at'>>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'status'>;
        Update: Partial<Omit<Booking, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_type: UserType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
