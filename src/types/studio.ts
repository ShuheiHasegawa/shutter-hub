// スタジオシステム専用型定義
// studio-system-specification.mdに基づく包括的な型定義

import {
  Studio,
  StudioEquipment,
  StudioPhoto,
  StudioEvaluation,
  StudioEditHistory,
  // OrganizerStudio, // 運営者スタジオ管理で使用
  PhotoSessionStudio,
  SelectedStudio,
  StudioDuplicateCheckResult,
  StudioSearchFilters,
  StudioWithStats,
  RoleSpecificRatings,
  // StudioRelationshipType, // 現在未使用
  StudioEquipmentCategory,
  StudioPhotoCategory,
} from './database';
// =============================================================================
// Component Props Types
// =============================================================================

// StudioCard コンポーネント props
export interface StudioCardProps {
  studio: StudioWithStats;
  averageRating: number;
  evaluationCount: number;
  priceRange: [number, number];
  distance?: number;
  onSelect?: (studio: StudioWithStats) => void;
  isSelected?: boolean;
}

// StudioList コンポーネント props
export interface StudioListProps {
  studios: StudioWithStats[];
  loading?: boolean;
  onStudioSelect?: (studio: StudioWithStats) => void;
  selectedStudioIds?: string[];
  showSelection?: boolean;
}

// StudioForm コンポーネント props
export interface StudioFormProps {
  studio?: Studio;
  mode: 'create' | 'edit';
  onSave: (studio: Studio) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

// StudioEvaluationForm コンポーネント props
export interface StudioEvaluationFormProps {
  studioId: string;
  photoSessionId: string;
  userRole: 'model' | 'photographer' | 'organizer';
  onSubmit: (evaluation: StudioEvaluation) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

// StudioEditForm コンポーネント props
export interface StudioEditFormProps {
  studio?: Studio;
  mode: 'create' | 'edit';
  onSave: (studio: Studio) => void;
  onCancel?: () => void;
}

// StudioSelectionForm コンポーネント props（ModelSelectionFormと同様）
export interface StudioSelectionFormProps {
  selectedStudios: SelectedStudio[];
  onStudiosChange: (studios: SelectedStudio[]) => void;
  maxStudios?: number;
  disabled?: boolean;
  organizerId?: string; // 専属スタジオ優先表示用
}

// DuplicateWarningDialog コンポーネント props
export interface DuplicateWarningDialogProps {
  duplicateCheck: StudioDuplicateCheckResult;
  onProceed: () => void;
  onSelectExisting: (studioId: string) => void;
  onCancel?: () => void;
}

// StudioSearchForm コンポーネント props
export interface StudioSearchFormProps {
  filters: StudioSearchFilters;
  onFiltersChange: (filters: StudioSearchFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
}

// StudioDetail コンポーネント props
export interface StudioDetailProps {
  studio: Studio;
  equipment: StudioEquipment[];
  photos: StudioPhoto[];
  evaluations: StudioEvaluation[];
  averageRatings: {
    overall: number;
    accessibility: number;
    cleanliness: number;
    staff_support: number;
    cost_performance: number;
    byRole: {
      model: number;
      photographer: number;
      organizer: number;
    };
  };
  userCanEvaluate?: boolean;
  userEvaluation?: StudioEvaluation;
}

// =============================================================================
// Form Data Types
// =============================================================================

// スタジオ作成フォームデータ
export interface CreateStudioFormData {
  name: string;
  description?: string;
  address: string;
  prefecture: string;
  city: string;
  access_info?: string;
  phone?: string;
  email?: string;
  website_url?: string;
  latitude?: number;
  longitude?: number;
  total_area?: number;
  max_capacity?: number;
  parking_available: boolean;
  wifi_available: boolean;
  business_hours?: Record<string, string>;
  regular_holidays?: string[];
  hourly_rate_min?: number;
  hourly_rate_max?: number;
}

// スタジオ更新フォームデータ
export interface UpdateStudioFormData extends Partial<CreateStudioFormData> {
  edit_reason?: string;
}

// 評価投稿フォームデータ
export interface CreateEvaluationFormData {
  studio_id: string;
  photo_session_id: string;
  overall_rating: number;
  accessibility_rating?: number;
  cleanliness_rating?: number;
  staff_support_rating?: number;
  cost_performance_rating?: number;
  role_specific_ratings?: RoleSpecificRatings;
  comment?: string;
  evaluation_photos?: string[];
}

// 設備追加フォームデータ
export interface CreateEquipmentFormData {
  studio_id: string;
  category: StudioEquipmentCategory;
  name: string;
  description?: string;
  quantity: number;
  rental_fee?: number;
  is_included: boolean;
  condition_notes?: string;
}

// 写真アップロードフォームデータ
export interface CreatePhotoFormData {
  studio_id: string;
  photo_url: string;
  caption?: string;
  category?: StudioPhotoCategory;
  sort_order: number;
  is_featured: boolean;
}

// =============================================================================
// API Response Types
// =============================================================================

// スタジオ一覧取得レスポンス
export interface GetStudiosResponse {
  studios: StudioWithStats[];
  totalCount: number;
  hasMore: boolean;
}

// スタジオ詳細取得レスポンス
export interface GetStudioDetailResponse {
  studio: Studio;
  equipment: StudioEquipment[];
  photos: StudioPhoto[];
  evaluations: StudioEvaluation[];
  averageRatings: {
    overall: number;
    accessibility: number;
    cleanliness: number;
    staff_support: number;
    cost_performance: number;
    byRole: {
      model: number;
      photographer: number;
      organizer: number;
    };
  };
  userCanEvaluate: boolean;
  userEvaluation?: StudioEvaluation;
}

// スタジオ作成レスポンス
export interface CreateStudioResponse {
  success: boolean;
  studio?: Studio;
  error?: string;
  duplicateCheck?: StudioDuplicateCheckResult;
}

// スタジオ検索レスポンス
export interface SearchStudiosResponse {
  studios: StudioWithStats[];
  totalCount: number;
  filters: StudioSearchFilters;
  suggestions?: string[];
}

// 重複チェックレスポンス
export interface CheckDuplicateResponse {
  success: boolean;
  result: StudioDuplicateCheckResult;
  error?: string;
}

// =============================================================================
// Hook Types
// =============================================================================

// useStudioForm フック戻り値
export interface UseStudioFormReturn {
  formData: CreateStudioFormData;
  setFormData: (data: CreateStudioFormData) => void;
  errors: Record<string, string>;
  isSubmitting: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  checkDuplicates: (
    data: CreateStudioFormData
  ) => Promise<StudioDuplicateCheckResult>;
}

// useStudioSearch フック戻り値
export interface UseStudioSearchReturn {
  studios: StudioWithStats[];
  filters: StudioSearchFilters;
  setFilters: (filters: StudioSearchFilters) => void;
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  search: () => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;
}

// useStudioSelection フック戻り値（ModelSelectionと同様）
export interface UseStudioSelectionReturn {
  selectedStudios: SelectedStudio[];
  availableStudios: Studio[];
  loading: boolean;
  error: string | null;
  addStudio: (studio: Studio, config: Partial<SelectedStudio>) => void;
  removeStudio: (studioId: string) => void;
  updateStudio: (studioId: string, updates: Partial<SelectedStudio>) => void;
  validateSelection: () => string[];
}

// =============================================================================
// Utility Types
// =============================================================================

// スタジオ状態管理
export interface StudioState {
  studios: Record<string, Studio>;
  selectedStudioIds: string[];
  filters: StudioSearchFilters;
  loading: boolean;
  error: string | null;
}

// 評価統計
export interface EvaluationStats {
  totalCount: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  roleDistribution: Record<string, number>;
  recentEvaluations: StudioEvaluation[];
}

// Wiki編集情報
export interface WikiEditInfo {
  canEdit: boolean;
  editHistory: StudioEditHistory[];
  pendingChanges: Partial<Studio>;
  conflictingFields: string[];
}

// 運営者スタジオ統計
export interface OrganizerStudioStats {
  totalStudios: number;
  activeStudios: number;
  totalUsage: number;
  averageCost: number;
  preferredStudios: Studio[];
  recentUsage: PhotoSessionStudio[];
}

// 地理的検索結果
export interface GeoSearchResult {
  studio: Studio;
  distance: number;
  travelTime?: number;
  coordinates: [number, number];
}

// =============================================================================
// Validation Types
// =============================================================================

// フォームバリデーション結果
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

// フィールドバリデーター
export type FieldValidator<T> = (
  value: T,
  formData?: CreateStudioFormData
) => string | null;

// スタジオバリデーションルール
export interface StudioValidationRules {
  name: FieldValidator<string>;
  address: FieldValidator<string>;
  prefecture: FieldValidator<string>;
  city: FieldValidator<string>;
  max_capacity: FieldValidator<number>;
  hourly_rate_min: FieldValidator<number>;
  hourly_rate_max: FieldValidator<number>;
  coordinates: FieldValidator<[number, number]>;
}

// =============================================================================
// Constants Types
// =============================================================================

// 都道府県リスト
export type Prefecture =
  | '北海道'
  | '青森県'
  | '岩手県'
  | '宮城県'
  | '秋田県'
  | '山形県'
  | '福島県'
  | '茨城県'
  | '栃木県'
  | '群馬県'
  | '埼玉県'
  | '千葉県'
  | '東京都'
  | '神奈川県'
  | '新潟県'
  | '富山県'
  | '石川県'
  | '福井県'
  | '山梨県'
  | '長野県'
  | '岐阜県'
  | '静岡県'
  | '愛知県'
  | '三重県'
  | '滋賀県'
  | '京都府'
  | '大阪府'
  | '兵庫県'
  | '奈良県'
  | '和歌山県'
  | '鳥取県'
  | '島根県'
  | '岡山県'
  | '広島県'
  | '山口県'
  | '徳島県'
  | '香川県'
  | '愛媛県'
  | '高知県'
  | '福岡県'
  | '佐賀県'
  | '長崎県'
  | '熊本県'
  | '大分県'
  | '宮崎県'
  | '鹿児島県'
  | '沖縄県';

// 定数は専用ファイルから直接インポートしてください
// import { EQUIPMENT_CATEGORY_LABELS } from '@/constants/studio';
// import { PREFECTURES } from '@/constants/japan';
// import { VALIDATION } from '@/constants/common';
