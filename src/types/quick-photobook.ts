// クイックフォトブック機能の型定義

export type PhotobookType = 'quick' | 'advanced';
export type ImageOrientation = 'portrait' | 'landscape' | 'square';

/**
 * フォトブック基本情報
 */
export interface Photobook {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  photobook_type: PhotobookType;
  max_pages: number;
  current_pages: number;
  cover_image_url?: string;
  is_published: boolean;
  theme_id?: string;
  advanced_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * フォトブック画像情報
 */
export interface PhotobookImage {
  id: string;
  photobook_id: string;
  image_url: string;
  page_number: number;
  original_filename?: string;
  file_size_bytes?: number;
  image_width?: number;
  image_height?: number;
  orientation: ImageOrientation;
  position_x: number;
  position_y: number;
  scale_factor: number;
  rotation_angle: number;
  advanced_settings: Record<string, unknown>;
  created_at: string;
}

/**
 * 仮画像情報（フロントエンド専用）
 */
export interface TempImage {
  id: string; // 一時ID
  file: File; // 元ファイル
  preview: string; // Object.createObjectURL()
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  pageNumber: number;
  orientation: ImageOrientation;
  metadata: {
    width: number;
    height: number;
    size: number;
  };
  error?: string;
}

/**
 * 統合画像表示用（仮画像 + 確定画像）
 */
export interface UnifiedImage {
  id: string;
  type: 'temp' | 'saved';
  pageNumber: number;
  orientation: ImageOrientation;
  preview: string; // 表示用URL
  status?: 'pending' | 'uploading' | 'uploaded' | 'error';
  data: TempImage | PhotobookImage;
}

/**
 * フォトブック作成・編集用データ
 */
export interface PhotobookFormData {
  title: string;
  description?: string;
  photobook_type: PhotobookType;
  max_pages: number;
  is_published?: boolean;
  cover_image_url?: string;
}

/**
 * 画像アップロード用データ
 */
export interface ImageUploadData {
  file: File;
  page_number: number;
  orientation: ImageOrientation;
}

/**
 * 画像順番入れ替え用データ
 */
export interface ImageReorderData {
  imageId: string;
  oldPageNumber: number;
  newPageNumber: number;
}

/**
 * プラン制限情報
 */
export interface PhotobookPlanLimits {
  quick: {
    maxPages: number;
    maxPhotobooks: number;
  };
  advanced: {
    maxPages: number;
    maxPhotobooks: number;
  };
  allowedTypes: PhotobookType[];
}

/**
 * フォトブック一覧表示用
 */
export interface PhotobookListItem {
  id: string;
  title: string;
  photobook_type: PhotobookType;
  current_pages: number;
  max_pages: number;
  cover_image_url?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 画像処理結果
 */
export interface ProcessedImage {
  url: string;
  width: number;
  height: number;
  orientation: ImageOrientation;
  file_size_bytes: number;
}

/**
 * エラー情報
 */
export interface PhotobookError {
  type: 'validation' | 'upload' | 'plan_limit' | 'server' | 'network';
  message: string;
  details?: Record<string, unknown>;
}

/**
 * プラン制限チェック結果
 */
export interface PlanLimitCheck {
  allowed: boolean;
  current_usage: number;
  limit: number;
  remaining: number;
  plan_name: string;
  upgrade_required?: boolean;
}
