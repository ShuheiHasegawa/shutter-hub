/**
 * 画像関連型定義統合ファイル
 * 全ての画像実装で使用する共通型定義
 */

// 基本画像カテゴリ（拡張可能）
export type ImageCategory = 
  | 'profile'       // プロフィール画像
  | 'photoSession'  // 撮影会画像  
  | 'photobook'     // フォトブック用画像
  | 'social'        // SNS投稿画像
  | 'system';       // システム画像（ロゴ等）

// 画像品質レベル
export type ImageQuality = 'web' | 'print' | 'thumbnail';

// 画像フォーマット
export type ImageFormat = 'webp' | 'avif' | 'jpg' | 'png';

// 画像品質設定
export interface QualityConfig {
  quality: number;        // 圧縮品質 (0-100)
  maxWidth?: number;      // 最大幅
  maxHeight?: number;     // 最大高さ
  width?: number;         // 固定幅（サムネイル用）
  height?: number;        // 固定高さ（サムネイル用）
  format: ImageFormat;    // 出力フォーマット
  dpi?: number;          // DPI（印刷用）
}

// カテゴリ別品質設定
export interface ImageQualityConfig {
  web: QualityConfig;
  print?: QualityConfig;
  thumbnail: QualityConfig;
}

// 最適化された画像URL群
export interface OptimizedImageUrls {
  web: string;
  print?: string;
  thumbnail: string;
  original?: string;
}

// 画像メタデータ
export interface ImageMetadata {
  originalSize: number;
  processedSizes: {
    web: number;
    print?: number;
    thumbnail: number;
  };
  dimensions: {
    original: { width: number; height: number };
    web: { width: number; height: number };
    print?: { width: number; height: number };
    thumbnail: { width: number; height: number };
  };
  formats: string[];
  createdAt: string;
  hash?: string;
}

// 画像アップロードオプション
export interface ImageUploadOptions {
  category: ImageCategory;
  generatePrintVersion?: boolean;
  enableDeduplication?: boolean;
  watermark?: boolean;
  userId: string;
  relatedId?: string;
}

// 画像アップロード結果
export interface ImageUploadResult {
  success: boolean;
  urls?: OptimizedImageUrls;
  metadata?: ImageMetadata;
  error?: string;
  duplicateDetected?: boolean;
  originalHash?: string;
}

// 画像バリデーション結果
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

// 画像コンポーネント共通Props
export interface BaseImageProps {
  src: string;
  alt: string;
  category?: ImageCategory;
  quality?: ImageQuality;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  showErrorState?: boolean;
  showLoadingState?: boolean;
  errorFallback?: React.ReactNode;
}

// パフォーマンスメトリクス
export interface ImagePerformanceMetrics {
  loadTime: number;
  imageLoadTime: number;
  totalSize: number;
  compressedSize: number;
  cacheHit: boolean;
  format: string;
}

// キャッシュ統計
export interface ImageCacheStats {
  hitCount: number;
  missCount: number;
  hitRate: number;
  lastHit?: string;
  lastMiss?: string;
}

// アクセス統計
export interface ImageAccessStats {
  viewCount: number;
  downloadCount: number;
  bandwidthUsed: number;
  lastAccessed: string;
}

// 画像最適化ジョブ
export interface ImageOptimizationJob {
  id: string;
  imageId: string;
  jobType: 'resize' | 'compress' | 'format_convert' | 'watermark';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  sourceUrl: string;
  targetParams: Record<string, any>;
  targetUrl?: string;
  processingTime?: number;
  compressionRatio?: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// 遅延読み込みオプション
export interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  fallback?: React.ReactNode;
  className?: string;
  onIntersect?: () => void;
  onLoad?: () => void;
  delay?: number;
}

// ギャラリー設定
export interface GalleryConfig {
  columns: number;
  gap: number;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'auto';
  loadBatchSize?: number;
  loadDelay?: number;
}

// 無限スクロール設定
export interface InfiniteScrollConfig {
  hasMore: boolean;
  loadMore: () => void;
  loading: boolean;
  threshold?: number;
  rootMargin?: string;
}

// プログレッシブローディング設定
export interface ProgressiveLoadingConfig<T> {
  items: T[];
  batchSize: number;
  delay: number;
}

// プログレッシブローディング結果
export interface ProgressiveLoadingResult<T> {
  visibleItems: T[];
  hasMore: boolean;
  reset: () => void;
}

// 画像プリロード関数型
export type ImagePreloadFunction = (src: string, category?: ImageCategory) => Promise<void>;

// 画像URL生成関数型
export type ImageUrlGenerator = (
  baseUrl: string,
  quality?: ImageQuality,
  category?: ImageCategory
) => string;

// srcSet生成関数型
export type SrcSetGenerator = (
  baseUrl: string,
  category?: ImageCategory
) => string;

// sizes属性生成関数型
export type SizesGenerator = (
  category?: ImageCategory
) => string;

// 画像バリデーション関数型
export type ImageValidator = (
  file: File,
  category: ImageCategory
) => ImageValidationResult;

// ファイルハッシュ生成関数型
export type FileHashGenerator = (file: File) => Promise<string>;

// 圧縮率計算関数型
export type CompressionCalculator = (
  originalSize: number,
  compressedSize: number
) => number;

// 画像システム設定
export interface ImageSystemConfig {
  maxFileSizes: Record<ImageCategory, number>;
  supportedFormats: string[];
  qualityConfigs: Record<ImageCategory, ImageQualityConfig>;
  cacheSettings: {
    ttl: number;
    maxAge: number;
    staleWhileRevalidate: number;
  };
  performanceTargets: {
    maxLoadTime: number;
    minCompressionRatio: number;
    minCacheHitRate: number;
  };
}

// デフォルト設定
export const DEFAULT_IMAGE_CONFIG: ImageSystemConfig = {
  maxFileSizes: {
    profile: 15 * 1024 * 1024,      // 15MB
    photoSession: 25 * 1024 * 1024, // 25MB
    photobook: 50 * 1024 * 1024,    // 50MB
    social: 10 * 1024 * 1024,       // 10MB
    system: 5 * 1024 * 1024         // 5MB
  },
  supportedFormats: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/avif'
  ],
  qualityConfigs: {
    profile: {
      web: { quality: 85, maxWidth: 800, maxHeight: 600, format: 'webp' },
      print: { quality: 95, maxWidth: 2048, maxHeight: 1536, dpi: 300, format: 'jpg' },
      thumbnail: { quality: 70, width: 150, height: 150, format: 'webp' }
    },
    photoSession: {
      web: { quality: 80, maxWidth: 1200, maxHeight: 900, format: 'webp' },
      print: { quality: 95, maxWidth: 4096, maxHeight: 3072, dpi: 300, format: 'jpg' },
      thumbnail: { quality: 65, width: 300, height: 200, format: 'webp' }
    },
    photobook: {
      web: { quality: 85, maxWidth: 1920, maxHeight: 1440, format: 'webp' },
      print: { quality: 100, maxWidth: 6000, maxHeight: 4500, dpi: 300, format: 'jpg' },
      thumbnail: { quality: 70, width: 400, height: 300, format: 'webp' }
    },
    social: {
      web: { quality: 75, maxWidth: 1080, maxHeight: 1080, format: 'webp' },
      print: { quality: 90, maxWidth: 2160, maxHeight: 2160, dpi: 300, format: 'jpg' },
      thumbnail: { quality: 60, width: 200, height: 200, format: 'webp' }
    },
    system: {
      web: { quality: 90, maxWidth: 512, maxHeight: 512, format: 'webp' },
      thumbnail: { quality: 80, width: 64, height: 64, format: 'webp' }
    }
  },
  cacheSettings: {
    ttl: 31536000,      // 1年
    maxAge: 31536000,   // 1年
    staleWhileRevalidate: 86400  // 1日
  },
  performanceTargets: {
    maxLoadTime: 500,         // 500ms
    minCompressionRatio: 50,  // 50%
    minCacheHitRate: 85       // 85%
  }
};

// エラーメッセージ定数
export const IMAGE_ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'ファイルサイズが制限を超えています',
  INVALID_FORMAT: 'サポートされていないファイル形式です',
  UPLOAD_FAILED: 'アップロードに失敗しました。しばらく後に再試行してください',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  PERMISSION_DENIED: 'ファイルへのアクセス権限がありません',
  OPTIMIZATION_FAILED: '画像最適化に失敗しました',
  CACHE_ERROR: 'キャッシュエラーが発生しました',
  VALIDATION_ERROR: '画像バリデーションエラーです'
} as const;

export type ImageErrorMessage = typeof IMAGE_ERROR_MESSAGES[keyof typeof IMAGE_ERROR_MESSAGES];

// ユーティリティ型
export type ImageCategoryConfig = typeof DEFAULT_IMAGE_CONFIG.qualityConfigs;
export type ImageCategorySizes = typeof DEFAULT_IMAGE_CONFIG.maxFileSizes;

export default {
  DEFAULT_IMAGE_CONFIG,
  IMAGE_ERROR_MESSAGES
};