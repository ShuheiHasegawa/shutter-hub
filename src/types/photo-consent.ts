// 写真公開合意システムの型定義

export type ConsentStatus = 'pending' | 'approved' | 'rejected' | 'requires_discussion';
export type UsageScope = 'web' | 'sns' | 'print' | 'commercial';
export type TagStatus = 'pending' | 'accepted' | 'declined';
export type ImageType = 'profile' | 'portfolio' | 'representative';
export type ReminderType = 'email' | 'push' | 'sms';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';
export type AuditActionType = 'created' | 'approved' | 'rejected' | 'modified' | 'revoked' | 'auto_expired';

// 写真公開合意リクエスト
export interface PhotoConsentRequest {
  id: string;
  photographerId: string;
  modelId: string;
  photoSessionId?: string;
  
  // 写真情報
  photoUrl: string; // 短期保存用（7日間）
  photoFilename: string; // 永続保存用
  photoHash: string;
  photoMetadata?: Record<string, unknown>;
  
  // 合意状態
  consentStatus: ConsentStatus;
  usageScope: UsageScope[];
  usageNotes?: string;
  
  // メッセージ
  requestMessage?: string;
  responseMessage?: string;
  
  // 日時
  consentGivenAt?: Date;
  expiresAt?: Date; // 画像自動削除日時
  createdAt: Date;
  updatedAt: Date;
  
  // GDPR対応
  gdprConsent: boolean;
  dataRetentionAgreed: boolean;
}

// Tinder風UI用の拡張型
export interface SwipeablePhotoConsent extends PhotoConsentRequest {
  photographer: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  photoSession?: {
    id: string;
    title: string;
    location: string;
    date: Date;
  };
  // UI状態管理
  isLoading?: boolean;
  swipeDirection?: 'left' | 'right' | 'up';
}

// モデルタグ付け
export interface PhotoSessionModelTag {
  id: string;
  photoSessionId: string;
  modelId: string;
  taggedBy: string;
  
  // 状態管理
  tagStatus: TagStatus;
  invitationMessage?: string;
  responseMessage?: string;
  
  // 日時
  taggedAt: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// @mention用のユーザー候補
export interface MentionableUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isFollowing: boolean;
  isFollower: boolean;
}

// モデル代表画像
export interface ModelPortfolioImage {
  id: string;
  modelId: string;
  
  // 画像情報
  imageUrl: string;
  imageHash: string;
  imageFilename: string;
  
  // 設定
  imageType: ImageType;
  isPrimary: boolean;
  displayOrder: number;
  
  // メタデータ
  title?: string;
  description?: string;
  tags: string[];
  
  // 公開設定
  isPublic: boolean;
  isAvailableForSessions: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

// 合意証跡・監査ログ
export interface PhotoConsentAuditLog {
  id: string;
  consentRequestId: string;
  
  // 変更情報
  actionType: AuditActionType;
  previousStatus?: ConsentStatus;
  newStatus?: ConsentStatus;
  changeReason?: string;
  
  // 変更者情報
  changedBy: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  
  // GDPR・法的根拠
  legalBasis?: string;
  gdprArticle?: string;
  
  // タイムスタンプ
  createdAt: Date;
  auditHash?: string;
}

// リマインダー管理
export interface PhotoConsentReminder {
  id: string;
  consentRequestId: string;
  
  // リマインダー設定
  reminderType: ReminderType;
  sentAt?: Date;
  
  // 配信状況
  deliveryStatus: DeliveryStatus;
  errorMessage?: string;
  
  // 次回送信予定
  nextReminderAt?: Date;
  
  createdAt: Date;
}

// API Request/Response 型

// 合意リクエスト作成
export interface CreateConsentRequestData {
  modelId: string;
  photoSessionId?: string;
  photoFile: File;
  usageScope: UsageScope[];
  usageNotes?: string;
  requestMessage?: string;
}

// 合意状態更新
export interface UpdateConsentStatusData {
  consentStatus: ConsentStatus;
  responseMessage?: string;
  usageScope?: UsageScope[];
}

// モデルタグ付け作成
export interface CreateModelTagData {
  photoSessionId: string;
  modelUsernames: string[];
  invitationMessage?: string;
}

// ポートフォリオ画像アップロード
export interface UploadPortfolioImageData {
  imageFile: File;
  imageType: ImageType;
  title?: string;
  description?: string;
  tags?: string[];
  isPrimary?: boolean;
  isPublic?: boolean;
}

// 拡張されたプロフィール型（既存型の拡張）
export interface ModelProfileWithPortfolio {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  portfolioImages: ModelPortfolioImage[];
  primaryImage?: ModelPortfolioImage;
  representativeImages: ModelPortfolioImage[];
  // 統計情報
  totalPhotos: number;
  totalConsents: number;
  approvalRate: number; // 合意承認率
}

// 撮影会にタグ付けされたモデル情報
export interface TaggedModelInfo extends PhotoSessionModelTag {
  model: ModelProfileWithPortfolio;
}

// 拡張された撮影会型（既存型の拡張）
export interface PhotoSessionWithConsentInfo {
  id: string;
  title: string;
  description?: string;
  location: string;
  startDate: Date;
  organizerId: string;
  
  // タグ付けされたモデル情報
  taggedModels: TaggedModelInfo[];
  confirmedModels: ModelProfileWithPortfolio[];
  pendingModels: ModelProfileWithPortfolio[];
  
  // 合意関連統計
  totalConsentRequests: number;
  approvedConsents: number;
  pendingConsents: number;
}

// UI状態管理型
export interface ConsentUIState {
  // スワイプ状態
  currentPhotoIndex: number;
  isSwipeMode: boolean;
  isBatchMode: boolean;
  selectedPhotos: string[];
  
  // ローディング状態
  isLoading: boolean;
  isSubmitting: boolean;
  
  // フィルター・検索
  statusFilter: ConsentStatus[];
  usageFilter: UsageScope[];
  searchQuery: string;
  
  // エラー・成功状態
  error?: string;
  successMessage?: string;
}

// バッチ操作型
export interface BatchConsentOperation {
  photoIds: string[];
  action: ConsentStatus;
  message?: string;
  usageScope?: UsageScope[];
}

// 統計・分析型
export interface ConsentStatistics {
  totalRequests: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  discussionCount: number;
  
  // 期間別統計
  thisWeek: number;
  thisMonth: number;
  
  // 使用用途別統計
  usageScopeStats: Record<UsageScope, number>;
  
  // 応答時間統計
  averageResponseTime: number; // 時間（時）
  fastestResponse: number;
  slowestResponse: number;
}

// エラー型
export interface ConsentError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// API Response wrapper
export interface ConsentApiResponse<T = unknown> {
  data?: T;
  error?: ConsentError;
  success: boolean;
}

// Form validation 型
export interface ConsentFormErrors {
  photo?: string;
  usageScope?: string;
  message?: string;
  general?: string;
}

export interface ModelTagFormErrors {
  usernames?: string;
  invitationMessage?: string;
  general?: string;
}

// 検索・フィルタリング型
export interface ConsentSearchParams {
  status?: ConsentStatus[];
  usageScope?: UsageScope[];
  dateFrom?: Date;
  dateTo?: Date;
  photographerId?: string;
  modelId?: string;
  photoSessionId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'consent_given_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

// GDPR・データ管理型
export interface DataDeletionRequest {
  userId: string;
  deletionType: 'all' | 'consents' | 'photos' | 'audit_logs';
  reason?: string;
  requestedAt: Date;
}

export interface DataExportRequest {
  userId: string;
  dataTypes: ('consents' | 'photos' | 'audit_logs' | 'reminders')[];
  format: 'json' | 'csv';
  requestedAt: Date;
}

// 商用利用ライセンス型（将来拡張用）
export interface CommercialLicense {
  id: string;
  consentRequestId: string;
  licenseType: 'standard' | 'extended' | 'exclusive';
  price: number;
  currency: string;
  validFrom: Date;
  validTo?: Date;
  terms: string;
  createdAt: Date;
}

// Utility型
export type ConsentRequestWithRelations = PhotoConsentRequest & {
  photographer: ModelProfileWithPortfolio;
  model: ModelProfileWithPortfolio;
  photoSession?: PhotoSessionWithConsentInfo;
  auditLogs: PhotoConsentAuditLog[];
  reminders: PhotoConsentReminder[];
};

export type CreateConsentRequestResult = ConsentApiResponse<{
  id: string;
  photoUrl: string;
  expiresAt: Date;
}>;

export type ConsentListResult = ConsentApiResponse<{
  requests: SwipeablePhotoConsent[];
  totalCount: number;
  hasMore: boolean;
}>;

export type ConsentStatisticsResult = ConsentApiResponse<ConsentStatistics>; 