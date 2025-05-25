// ShutterHub v2 データベース型定義

export type UserType = 'model' | 'photographer' | 'organizer';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
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
  is_published?: boolean;
}

export type UpdatePhotoSessionData = Partial<CreatePhotoSessionData>;

export interface CreateBookingData {
  photo_session_id: string;
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
