export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action: string;
          admin_id: string;
          created_at: string | null;
          details: Json | null;
          id: string;
          ip_address: unknown | null;
          target_id: string | null;
          target_type: string | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          admin_id: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          ip_address?: unknown | null;
          target_id?: string | null;
          target_type?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          admin_id?: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          ip_address?: unknown | null;
          target_id?: string | null;
          target_type?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_activity_logs_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      admin_invitations: {
        Row: {
          created_at: string | null;
          email: string;
          expires_at: string;
          id: string;
          invitation_token: string;
          invited_by: string | null;
          role: Database['public']['Enums']['user_role'] | null;
          used_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          expires_at: string;
          id?: string;
          invitation_token: string;
          invited_by?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          used_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          invitation_token?: string;
          invited_by?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      escrow_payments: {
        Row: {
          admin_notes: string | null;
          auto_confirm_at: string | null;
          auto_confirm_enabled: boolean | null;
          auto_confirm_hours: number | null;
          booking_id: string;
          completed_at: string | null;
          confirmed_at: string | null;
          created_at: string | null;
          delivered_at: string | null;
          delivery_status: string;
          dispute_created_at: string | null;
          dispute_reason: string | null;
          dispute_resolved_at: string | null;
          escrow_status: string;
          escrowed_at: string | null;
          id: string;
          payment_created_at: string | null;
          photographer_earnings: number;
          platform_fee: number;
          stripe_payment_intent_id: string;
          total_amount: number;
          updated_at: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          auto_confirm_at?: string | null;
          auto_confirm_enabled?: boolean | null;
          auto_confirm_hours?: number | null;
          booking_id: string;
          completed_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string | null;
          delivered_at?: string | null;
          delivery_status?: string;
          dispute_created_at?: string | null;
          dispute_reason?: string | null;
          dispute_resolved_at?: string | null;
          escrow_status?: string;
          escrowed_at?: string | null;
          id?: string;
          payment_created_at?: string | null;
          photographer_earnings: number;
          platform_fee: number;
          stripe_payment_intent_id: string;
          total_amount: number;
          updated_at?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          auto_confirm_at?: string | null;
          auto_confirm_enabled?: boolean | null;
          auto_confirm_hours?: number | null;
          booking_id?: string;
          completed_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string | null;
          delivered_at?: string | null;
          delivery_status?: string;
          dispute_created_at?: string | null;
          dispute_reason?: string | null;
          dispute_resolved_at?: string | null;
          escrow_status?: string;
          escrowed_at?: string | null;
          id?: string;
          payment_created_at?: string | null;
          photographer_earnings?: number;
          platform_fee?: number;
          stripe_payment_intent_id?: string;
          total_amount?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'escrow_payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'instant_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      instant_bookings: {
        Row: {
          actual_duration: number | null;
          created_at: string | null;
          delivery_url: string | null;
          end_time: string | null;
          guest_rating: number | null;
          guest_review: string | null;
          holiday_fee: number | null;
          id: string;
          night_fee: number | null;
          payment_method: string | null;
          payment_status: string | null;
          photographer_earnings: number;
          photographer_id: string;
          photographer_rating: number | null;
          photographer_review: string | null;
          photos_delivered: number | null;
          platform_fee: number;
          request_id: string;
          rush_fee: number | null;
          start_time: string | null;
          total_amount: number;
        };
        Insert: {
          actual_duration?: number | null;
          created_at?: string | null;
          delivery_url?: string | null;
          end_time?: string | null;
          guest_rating?: number | null;
          guest_review?: string | null;
          holiday_fee?: number | null;
          id?: string;
          night_fee?: number | null;
          payment_method?: string | null;
          payment_status?: string | null;
          photographer_earnings: number;
          photographer_id: string;
          photographer_rating?: number | null;
          photographer_review?: string | null;
          photos_delivered?: number | null;
          platform_fee: number;
          request_id: string;
          rush_fee?: number | null;
          start_time?: string | null;
          total_amount: number;
        };
        Update: {
          actual_duration?: number | null;
          created_at?: string | null;
          delivery_url?: string | null;
          end_time?: string | null;
          guest_rating?: number | null;
          guest_review?: string | null;
          holiday_fee?: number | null;
          id?: string;
          night_fee?: number | null;
          payment_method?: string | null;
          payment_status?: string | null;
          photographer_earnings?: number;
          photographer_id?: string;
          photographer_rating?: number | null;
          photographer_review?: string | null;
          photos_delivered?: number | null;
          platform_fee?: number;
          request_id?: string;
          rush_fee?: number | null;
          start_time?: string | null;
          total_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'instant_bookings_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: true;
            referencedRelation: 'instant_photo_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      instant_photo_disputes: {
        Row: {
          admin_id: string | null;
          admin_notes: string | null;
          booking_id: string;
          created_at: string | null;
          description: string;
          evidence_urls: string[] | null;
          id: string;
          issues: string[] | null;
          requested_resolution: string;
          resolution: string | null;
          resolution_amount: number | null;
          resolution_detail: string | null;
          resolved_at: string | null;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          admin_id?: string | null;
          admin_notes?: string | null;
          booking_id: string;
          created_at?: string | null;
          description: string;
          evidence_urls?: string[] | null;
          id?: string;
          issues?: string[] | null;
          requested_resolution: string;
          resolution?: string | null;
          resolution_amount?: number | null;
          resolution_detail?: string | null;
          resolved_at?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          admin_id?: string | null;
          admin_notes?: string | null;
          booking_id?: string;
          created_at?: string | null;
          description?: string;
          evidence_urls?: string[] | null;
          id?: string;
          issues?: string[] | null;
          requested_resolution?: string;
          resolution?: string | null;
          resolution_amount?: number | null;
          resolution_detail?: string | null;
          resolved_at?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'instant_photo_disputes_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'instant_photo_disputes_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'instant_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      instant_photo_requests: {
        Row: {
          budget: number;
          completed_at: string | null;
          created_at: string | null;
          duration: number;
          expires_at: string;
          guest_email: string | null;
          guest_name: string;
          guest_phone: string;
          id: string;
          location_address: string | null;
          location_landmark: string | null;
          location_lat: number;
          location_lng: number;
          matched_at: string | null;
          matched_photographer_id: string | null;
          party_size: number | null;
          request_type: string;
          special_requests: string | null;
          status: string | null;
          urgency: string;
        };
        Insert: {
          budget: number;
          completed_at?: string | null;
          created_at?: string | null;
          duration: number;
          expires_at: string;
          guest_email?: string | null;
          guest_name: string;
          guest_phone: string;
          id?: string;
          location_address?: string | null;
          location_landmark?: string | null;
          location_lat: number;
          location_lng: number;
          matched_at?: string | null;
          matched_photographer_id?: string | null;
          party_size?: number | null;
          request_type: string;
          special_requests?: string | null;
          status?: string | null;
          urgency: string;
        };
        Update: {
          budget?: number;
          completed_at?: string | null;
          created_at?: string | null;
          duration?: number;
          expires_at?: string;
          guest_email?: string | null;
          guest_name?: string;
          guest_phone?: string;
          id?: string;
          location_address?: string | null;
          location_landmark?: string | null;
          location_lat?: number;
          location_lng?: number;
          matched_at?: string | null;
          matched_photographer_id?: string | null;
          party_size?: number | null;
          request_type?: string;
          special_requests?: string | null;
          status?: string | null;
          urgency?: string;
        };
        Relationships: [];
      };
      instant_photo_reviews: {
        Row: {
          booking_id: string;
          created_at: string | null;
          id: string;
          photo_quality_comment: string | null;
          photo_quality_rating: number;
          photographer_rating: number;
          photographer_review: string | null;
          recommend_reason: string | null;
          service_comment: string | null;
          service_rating: number;
          would_recommend: boolean;
        };
        Insert: {
          booking_id: string;
          created_at?: string | null;
          id?: string;
          photo_quality_comment?: string | null;
          photo_quality_rating: number;
          photographer_rating: number;
          photographer_review?: string | null;
          recommend_reason?: string | null;
          service_comment?: string | null;
          service_rating: number;
          would_recommend: boolean;
        };
        Update: {
          booking_id?: string;
          created_at?: string | null;
          id?: string;
          photo_quality_comment?: string | null;
          photo_quality_rating?: number;
          photographer_rating?: number;
          photographer_review?: string | null;
          recommend_reason?: string | null;
          service_comment?: string | null;
          service_rating?: number;
          would_recommend?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'instant_photo_reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'instant_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      photo_deliveries: {
        Row: {
          booking_id: string;
          confirmed_at: string | null;
          delivered_at: string | null;
          delivery_method: string;
          delivery_url: string | null;
          download_count: number | null;
          download_expires_at: string;
          external_expires_at: string | null;
          external_password: string | null;
          external_service: string | null;
          external_url: string | null;
          formats: string[];
          id: string;
          max_downloads: number | null;
          photo_count: number;
          photographer_message: string | null;
          resolution: string;
          thumbnail_url: string | null;
          total_size_mb: number | null;
        };
        Insert: {
          booking_id: string;
          confirmed_at?: string | null;
          delivered_at?: string | null;
          delivery_method: string;
          delivery_url?: string | null;
          download_count?: number | null;
          download_expires_at: string;
          external_expires_at?: string | null;
          external_password?: string | null;
          external_service?: string | null;
          external_url?: string | null;
          formats: string[];
          id?: string;
          max_downloads?: number | null;
          photo_count: number;
          photographer_message?: string | null;
          resolution: string;
          thumbnail_url?: string | null;
          total_size_mb?: number | null;
        };
        Update: {
          booking_id?: string;
          confirmed_at?: string | null;
          delivered_at?: string | null;
          delivery_method?: string;
          delivery_url?: string | null;
          download_count?: number | null;
          download_expires_at?: string;
          external_expires_at?: string | null;
          external_password?: string | null;
          external_service?: string | null;
          external_url?: string | null;
          formats?: string[];
          id?: string;
          max_downloads?: number | null;
          photo_count?: number;
          photographer_message?: string | null;
          resolution?: string;
          thumbnail_url?: string | null;
          total_size_mb?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_deliveries_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'instant_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string | null;
          display_name: string | null;
          email: string;
          id: string;
          instagram_handle: string | null;
          is_verified: boolean | null;
          location: string | null;
          phone: string | null;
          role: Database['public']['Enums']['user_role'] | null;
          twitter_handle: string | null;
          updated_at: string | null;
          user_type: Database['public']['Enums']['user_type'];
          website: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email: string;
          id: string;
          instagram_handle?: string | null;
          is_verified?: boolean | null;
          location?: string | null;
          phone?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          twitter_handle?: string | null;
          updated_at?: string | null;
          user_type: Database['public']['Enums']['user_type'];
          website?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email?: string;
          id?: string;
          instagram_handle?: string | null;
          is_verified?: boolean | null;
          location?: string | null;
          phone?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          twitter_handle?: string | null;
          updated_at?: string | null;
          user_type?: Database['public']['Enums']['user_type'];
          website?: string | null;
        };
        Relationships: [];
      };
      // ... 他のテーブル型定義も同様に含める
    };
    Views: {
      delivery_method_stats: {
        Row: {
          avg_photo_count: number | null;
          avg_size_mb: number | null;
          confirmation_rate: number | null;
          delivery_method: string | null;
          total_deliveries: number | null;
        };
        Relationships: [];
      };
      photographer_review_stats: {
        Row: {
          avg_photo_quality_rating: number | null;
          avg_photographer_rating: number | null;
          avg_service_rating: number | null;
          photographer_id: string | null;
          rating_1_count: number | null;
          rating_2_count: number | null;
          rating_3_count: number | null;
          rating_4_count: number | null;
          rating_5_count: number | null;
          recommendation_rate: number | null;
          total_reviews: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_admin_invitation: {
        Args: { invitation_token_param: string; user_id: string };
        Returns: {
          success: boolean;
          message: string;
        }[];
      };
      invite_admin: {
        Args: {
          invite_email: string;
          invite_role: Database['public']['Enums']['user_role'];
          invited_by_id: string;
        };
        Returns: {
          success: boolean;
          message: string;
          invitation_token: string;
        }[];
      };
      create_initial_admin: {
        Args: { admin_email: string; admin_user_id: string };
        Returns: {
          success: boolean;
          message: string;
        }[];
      };
      process_auto_confirmations: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      // ... 他の関数も同様に含める
    };
    Enums: {
      user_role: 'user' | 'admin' | 'super_admin';
      user_type: 'model' | 'photographer' | 'organizer';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

// 専用型定義をエクスポート
export type Profile = Tables<'profiles'>;
export type AdminInvitation = Tables<'admin_invitations'>;
export type AdminActivityLog = Tables<'admin_activity_logs'>;
export type EscrowPayment = Tables<'escrow_payments'>;
export type InstantBooking = Tables<'instant_bookings'>;
export type InstantPhotoDispute = Tables<'instant_photo_disputes'>;
export type InstantPhotoRequest = Tables<'instant_photo_requests'>;
export type InstantPhotoReview = Tables<'instant_photo_reviews'>;
export type PhotoDelivery = Tables<'photo_deliveries'>;
export type UserRole = Database['public']['Enums']['user_role'];
export type UserType = Database['public']['Enums']['user_type'];
