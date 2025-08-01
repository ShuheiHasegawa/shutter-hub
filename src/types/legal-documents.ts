/**
 * 法的文書管理システムの型定義
 * GDPR対応・利用規約・プライバシーポリシー管理
 */

// =============================================================================
// 基本ENUM型
// =============================================================================

export type DocumentType =
  | 'terms_of_service' // 利用規約
  | 'privacy_policy' // プライバシーポリシー
  | 'cookie_policy' // クッキーポリシー
  | 'data_processing' // データ処理方針
  | 'gdpr_notice' // GDPR通知
  | 'community_guidelines'; // コミュニティガイドライン

export type DocumentStatus =
  | 'draft' // 下書き
  | 'review' // レビュー中
  | 'approved' // 承認済み
  | 'published' // 公開中
  | 'archived'; // アーカイブ済み

export type GdprRequestType =
  | 'access' // データアクセス要求（Article 15）
  | 'rectification' // データ訂正要求（Article 16）
  | 'erasure' // データ削除要求（Article 17）
  | 'portability' // データポータビリティ要求（Article 20）
  | 'restriction' // 処理制限要求（Article 18）
  | 'objection'; // 処理への異議（Article 21）

export type GdprRequestStatus =
  | 'submitted' // 提出済み
  | 'verified' // 本人確認済み
  | 'processing' // 処理中
  | 'completed' // 完了
  | 'rejected' // 拒否
  | 'cancelled'; // 取り消し

// =============================================================================
// データベーステーブル型
// =============================================================================

export interface LegalDocument {
  id: string;
  document_type: DocumentType;
  version: string;
  title: string;
  content: string;
  summary?: string;
  language_code: string;
  status: DocumentStatus;

  // 承認・公開情報
  created_by?: string;
  approved_by?: string;
  published_by?: string;

  // 有効期間
  effective_date?: string;
  expiry_date?: string;

  // メタデータ
  legal_basis?: string;
  processing_purposes?: string[];
  data_categories?: string[];
  retention_period?: string;

  // タイムスタンプ
  created_at: string;
  updated_at: string;
  approved_at?: string;
  published_at?: string;
}

export interface UserConsent {
  id: string;
  user_id: string;
  document_id: string;

  // 同意情報
  consent_given: boolean;
  consent_method: string;
  ip_address?: string;
  user_agent?: string;

  // 同意の詳細
  granular_consents?: Record<string, boolean>;
  withdrawal_reason?: string;

  // タイムスタンプ
  consented_at: string;
  created_at: string;
}

export interface DataProcessingRecord {
  id: string;
  user_id: string;

  // 処理活動情報
  processing_purpose: string;
  data_categories: string[];
  legal_basis: string;
  data_controller: string;
  data_processor?: string;

  // データの流れ
  data_source?: string;
  data_recipients?: string[];
  third_country_transfers: boolean;
  safeguards?: string;

  // データ保護
  retention_period?: string;
  deletion_date?: string;
  security_measures?: string[];

  // メタデータ
  system_reference?: string;
  automated_decision_making: boolean;
  profiling: boolean;

  created_at: string;
  updated_at: string;
}

export interface GdprRequest {
  id: string;
  user_id: string;
  request_type: GdprRequestType;
  status: GdprRequestStatus;

  // 要求詳細
  request_details?: string;
  verification_method?: string;
  verification_data?: Record<string, unknown>;

  // 処理情報
  assigned_to?: string;
  processing_notes?: string;
  completion_notes?: string;
  rejection_reason?: string;

  // ファイル関連
  export_file_url?: string;
  export_file_expires_at?: string;

  // タイムスタンプ
  created_at: string;
  updated_at: string;
  verified_at?: string;
  completed_at?: string;
  response_due_date: string;
}

export interface DataDeletionLog {
  id: string;
  user_id: string;
  gdpr_request_id?: string;

  // 削除情報
  deletion_type: string;
  deleted_tables: string[];
  deleted_record_counts: Record<string, number>;

  // 実行情報
  executed_by?: string;
  execution_method: string;

  // 技術詳細
  deletion_script?: string;
  verification_hash?: string;

  // メタデータ
  backup_created: boolean;
  backup_location?: string;
  backup_expires_at?: string;

  created_at: string;
}

// =============================================================================
// API・UI用の型
// =============================================================================

export interface LegalDocumentSummary {
  id: string;
  document_type: DocumentType;
  title: string;
  version: string;
  language_code: string;
  status: DocumentStatus;
  effective_date?: string;
  last_updated: string;
}

export interface UserConsentStatus {
  document_type: DocumentType;
  document_id: string;
  document_title: string;
  document_version: string;
  consent_given: boolean;
  consented_at?: string;
  requires_update: boolean; // 新しいバージョンが利用可能
}

export interface GdprRequestCreate {
  request_type: GdprRequestType;
  request_details: string;
  verification_method: string;
}

export interface GdprRequestUpdate {
  status?: GdprRequestStatus;
  processing_notes?: string;
  completion_notes?: string;
  rejection_reason?: string;
  assigned_to?: string;
}

export interface ConsentUpdate {
  document_id: string;
  consent_given: boolean;
  granular_consents?: Record<string, boolean>;
  withdrawal_reason?: string;
}

// =============================================================================
// データエクスポート用の型（GDPR Article 20対応）
// =============================================================================

export interface UserDataExport {
  user_info: {
    id: string;
    email: string;
    display_name?: string;
    user_type: string;
    created_at: string;
  };

  profile_data?: {
    bio?: string;
    location?: string;
    website?: string;
    social_handles?: Record<string, string>;
  };

  activity_data: {
    photo_sessions?: unknown[];
    bookings?: unknown[];
    messages?: unknown[];
    posts?: unknown[];
  };

  consent_history: UserConsent[];
  processing_records: DataProcessingRecord[];

  export_metadata: {
    exported_at: string;
    export_format: 'json' | 'pdf';
    data_categories: string[];
    retention_info: Record<string, string>;
  };
}

// =============================================================================
// UI用のラベル・メッセージ型
// =============================================================================

export interface DocumentTypeLabels {
  terms_of_service: string;
  privacy_policy: string;
  cookie_policy: string;
  data_processing: string;
  gdpr_notice: string;
  community_guidelines: string;
}

export interface GdprRequestTypeLabels {
  access: string;
  rectification: string;
  erasure: string;
  portability: string;
  restriction: string;
  objection: string;
}

export interface GdprRequestStatusLabels {
  submitted: string;
  verified: string;
  processing: string;
  completed: string;
  rejected: string;
  cancelled: string;
}

// =============================================================================
// フォーム・バリデーション用の型
// =============================================================================

export interface LegalDocumentForm {
  document_type: DocumentType;
  title: string;
  content: string;
  summary?: string;
  language_code: string;
  version: string;
  legal_basis?: string;
  processing_purposes?: string[];
  data_categories?: string[];
  retention_period?: string;
  effective_date?: string;
  expiry_date?: string;
}

export interface ConsentFormData {
  document_id: string;
  consent_given: boolean;
  granular_consents?: Record<string, boolean>;
}

// =============================================================================
// エラーハンドリング用の型
// =============================================================================

export interface LegalDocumentError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface GdprRequestError {
  code: string;
  message: string;
  validation_errors?: Record<string, string[]>;
}

// =============================================================================
// 設定・環境用の型
// =============================================================================

export interface LegalDocumentConfig {
  supported_languages: string[];
  default_language: string;
  consent_renewal_period_days: number;
  gdpr_response_deadline_days: number;
  export_file_retention_days: number;
  backup_retention_period_days: number;
}

export interface GdprSettings {
  data_controller_name: string;
  data_controller_contact: string;
  dpo_contact?: string; // Data Protection Officer
  supervisory_authority: string;
  legal_basis_default: string;
  third_country_transfers_enabled: boolean;
  automated_decision_making_enabled: boolean;
}

// =============================================================================
// ユーティリティ型
// =============================================================================

export type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// 公開用の法的文書（機密情報を除く）
export type PublicLegalDocument = Pick<
  LegalDocument,
  | 'id'
  | 'document_type'
  | 'title'
  | 'content'
  | 'version'
  | 'language_code'
  | 'effective_date'
  | 'published_at'
>;

// ユーザー向けのGDPR要求表示用
export type PublicGdprRequest = Pick<
  GdprRequest,
  | 'id'
  | 'request_type'
  | 'status'
  | 'request_details'
  | 'created_at'
  | 'response_due_date'
  | 'completed_at'
>;

const legalDocumentsTypes = {};
export default legalDocumentsTypes;
