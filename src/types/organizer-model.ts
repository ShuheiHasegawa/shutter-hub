// 運営所属モデル管理の型定義
// Note: データベースのマイグレーション適用後に型を再生成する必要があります

// 招待ステータス
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

// 所属ステータス
export type OrganizerModelStatus = 'active' | 'inactive' | 'suspended';

// 運営モデル招待型
export interface OrganizerModelInvitation {
  id: string;
  organizer_id: string;
  model_id: string;
  status: InvitationStatus;
  invitation_message?: string;
  rejection_reason?: string;
  invited_at: string;
  responded_at?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// プロフィール情報付き招待型
export interface OrganizerModelInvitationWithProfiles
  extends OrganizerModelInvitation {
  organizer?: {
    id: string;
    display_name?: string;
    email?: string;
    avatar_url?: string;
  };
  model_profile?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
    user_type: string;
  };
}

// 運営所属モデル型
export interface OrganizerModel {
  id: string;
  organizer_id: string;
  model_id: string;
  status: OrganizerModelStatus;
  joined_at: string;
  contract_start_date?: string;
  contract_end_date?: string;
  notes?: string;
  total_sessions_participated: number;
  total_revenue_generated: number;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

// プロフィール情報付き所属関係型
export interface OrganizerModelWithProfile extends OrganizerModel {
  model_profile?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
    user_type: string;
    email?: string;
    is_public?: boolean;
    bio?: string;
    location?: string;
  };
  organizer_profile?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
    user_type: string;
    is_public?: boolean;
  };
}

// 招待作成フォームデータ
export interface CreateInvitationData {
  model_id: string;
  invitation_message?: string;
}

// 招待回答データ
export interface RespondToInvitationData {
  invitation_id: string;
  status: 'accepted' | 'rejected';
  rejection_reason?: string;
}

// 所属関係更新データ
export interface UpdateOrganizerModelData {
  status?: OrganizerModelStatus;
  contract_start_date?: string;
  contract_end_date?: string;
  notes?: string;
}

// 統計データ型
export interface ModelStatistics {
  model_id: string;
  model_name?: string;
  total_sessions: number;
  total_revenue: number;
  last_activity?: string;
  joined_date: string;
  contract_status: OrganizerModelStatus;
  average_rating?: number;
}

// 検索・フィルタリング用
export interface OrganizerModelSearchParams {
  status?: OrganizerModelStatus;
  search_query?: string;
  joined_after?: string;
  joined_before?: string;
  min_sessions?: number;
  min_revenue?: number;
  sort_by?: 'joined_at' | 'total_sessions' | 'total_revenue' | 'last_activity';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// 招待検索・フィルタリング用
export interface InvitationSearchParams {
  status?: InvitationStatus;
  search_query?: string;
  invited_after?: string;
  invited_before?: string;
  sort_by?: 'invited_at' | 'responded_at' | 'expires_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// API レスポンス型
export interface OrganizerModelResponse {
  success: boolean;
  data?: OrganizerModelWithProfile | OrganizerModelWithProfile[];
  error?: string;
}

export interface InvitationResponse {
  success: boolean;
  data?:
    | OrganizerModelInvitationWithProfiles
    | OrganizerModelInvitationWithProfiles[];
  error?: string;
}

// バルク操作用
export interface BulkInvitationData {
  model_ids: string[];
  invitation_message?: string;
}

export interface BulkInvitationResult {
  success: boolean;
  successful_invitations: string[];
  failed_invitations: {
    model_id: string;
    error: string;
  }[];
  total_sent: number;
}

// 統計サマリー型
export interface OrganizerStatistics {
  total_models: number;
  active_models: number;
  inactive_models: number;
  suspended_models: number;
  pending_invitations: number;
  total_sessions_organized: number;
  total_revenue_generated: number;
  average_model_tenure_days: number;
  top_performing_models: ModelStatistics[];
}

// フォーム用型
export interface OrganizerModelFormData {
  contract_start_date?: string;
  contract_end_date?: string;
  notes?: string;
}

export interface InvitationFormData {
  model_id: string;
  invitation_message?: string;
}

// 通知・アラート用
export interface ModelActivityAlert {
  type: 'low_activity' | 'contract_expiring' | 'high_performance';
  model_id: string;
  model_name?: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  created_at: string;
}

// エクスポート用データ型
export interface ExportOrganizerModelData {
  model_name: string;
  joined_date: string;
  status: string;
  total_sessions: number;
  total_revenue: string;
  last_activity: string;
  contract_start?: string;
  contract_end?: string;
  notes?: string;
}
