/**
 * スタジオシステムに関する定数
 */

/**
 * スタジオ設備カテゴリ一覧
 */
export const STUDIO_EQUIPMENT_CATEGORIES = [
  'lighting',
  'camera',
  'audio',
  'backdrop',
  'furniture',
  'props',
  'editing',
  'other',
] as const;

/**
 * 設備カテゴリの表示名
 */
export const EQUIPMENT_CATEGORY_LABELS = {
  lighting: '照明機材',
  camera: 'カメラ機材',
  audio: '音響機材',
  backdrop: '背景・バックドロップ',
  furniture: '家具・インテリア',
  props: '小道具・アクセサリー',
  editing: '編集機材',
  other: 'その他',
} as const;

/**
 * スタジオ写真カテゴリ一覧
 */
export const STUDIO_PHOTO_CATEGORIES = [
  'exterior',
  'interior',
  'equipment',
  'lighting_setup',
  'sample_work',
  'other',
] as const;

/**
 * 写真カテゴリの表示名
 */
export const PHOTO_CATEGORY_LABELS = {
  exterior: '外観',
  interior: '内観',
  equipment: '設備・機材',
  lighting_setup: 'ライティング例',
  sample_work: '撮影例',
  other: 'その他',
} as const;

/**
 * スタジオ検証ステータス
 */
export const STUDIO_VERIFICATION_STATUS = [
  'pending',
  'verified',
  'rejected',
] as const;

/**
 * 検証ステータスの表示名
 */
export const VERIFICATION_STATUS_LABELS = {
  pending: '承認待ち',
  verified: '認証済み',
  rejected: '却下',
} as const;

/**
 * ユーザーロール（評価システム用）
 */
export const USER_ROLES = ['model', 'photographer', 'organizer'] as const;

/**
 * ユーザーロールの表示名
 */
export const USER_ROLE_LABELS = {
  model: 'モデル',
  photographer: 'フォトグラファー',
  organizer: '運営者',
} as const;

/**
 * 評価項目一覧
 */
export const EVALUATION_CRITERIA = [
  'overall_rating',
  'accessibility_rating',
  'cleanliness_rating',
  'staff_support_rating',
  'cost_performance_rating',
] as const;

/**
 * 評価項目の表示名
 */
export const EVALUATION_CRITERIA_LABELS = {
  overall_rating: '総合評価',
  accessibility_rating: 'アクセス',
  cleanliness_rating: '清潔さ',
  staff_support_rating: 'スタッフ対応',
  cost_performance_rating: 'コストパフォーマンス',
} as const;

/**
 * スタジオ関係タイプ（運営者-スタジオ間）
 */
export const STUDIO_RELATIONSHIP_TYPES = [
  'preferred',
  'partner',
  'exclusive',
] as const;

/**
 * 関係タイプの表示名
 */
export const RELATIONSHIP_TYPE_LABELS = {
  preferred: 'お気に入り',
  partner: 'パートナー',
  exclusive: '専属契約',
} as const;

/**
 * 検索・ソート用の並び順オプション
 */
export const STUDIO_SORT_OPTIONS = [
  { value: 'created_at_desc', label: '新着順' },
  { value: 'created_at_asc', label: '古い順' },
  { value: 'name_asc', label: '名前順（A-Z）' },
  { value: 'name_desc', label: '名前順（Z-A）' },
  { value: 'rating_desc', label: '評価順（高い順）' },
  { value: 'rating_asc', label: '評価順（低い順）' },
  { value: 'price_asc', label: '料金順（安い順）' },
  { value: 'price_desc', label: '料金順（高い順）' },
] as const;

/**
 * デフォルト検索設定
 */
export const DEFAULT_STUDIO_SEARCH = {
  sort_by: 'created_at' as const,
  sort_order: 'desc' as const,
  limit: 20,
} as const;
