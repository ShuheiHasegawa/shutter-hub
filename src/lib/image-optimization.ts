/**
 * 画像最適化・品質管理システム
 * フォトブック対応高画質画像保存を含む統合システム
 */

export interface ImageQualityConfig {
  // Web表示用品質設定
  web: {
    quality: number;
    maxWidth: number;
    maxHeight: number;
    format: 'webp' | 'avif' | 'jpg';
  };
  // フォトブック用高画質設定
  print: {
    quality: number;
    maxWidth: number;
    maxHeight: number;
    dpi: number;
    format: 'jpg' | 'png';
  };
  // サムネイル用設定
  thumbnail: {
    quality: number;
    width: number;
    height: number;
    format: 'webp' | 'jpg';
  };
}

export const IMAGE_QUALITY_CONFIGS: Record<string, ImageQualityConfig> = {
  // プロフィール画像
  profile: {
    web: { quality: 85, maxWidth: 800, maxHeight: 600, format: 'webp' },
    print: {
      quality: 95,
      maxWidth: 2048,
      maxHeight: 1536,
      dpi: 300,
      format: 'jpg',
    },
    thumbnail: { quality: 70, width: 150, height: 150, format: 'webp' },
  },
  // 撮影会画像
  photoSession: {
    web: { quality: 80, maxWidth: 1200, maxHeight: 900, format: 'webp' },
    print: {
      quality: 95,
      maxWidth: 4096,
      maxHeight: 3072,
      dpi: 300,
      format: 'jpg',
    },
    thumbnail: { quality: 65, width: 300, height: 200, format: 'webp' },
  },
  // フォトブック専用（最高品質）
  photobook: {
    web: { quality: 85, maxWidth: 1920, maxHeight: 1440, format: 'webp' },
    print: {
      quality: 100,
      maxWidth: 6000,
      maxHeight: 4500,
      dpi: 300,
      format: 'jpg',
    },
    thumbnail: { quality: 70, width: 400, height: 300, format: 'webp' },
  },
  // SNS投稿用
  social: {
    web: { quality: 75, maxWidth: 1080, maxHeight: 1080, format: 'webp' },
    print: {
      quality: 90,
      maxWidth: 2160,
      maxHeight: 2160,
      dpi: 300,
      format: 'jpg',
    },
    thumbnail: { quality: 60, width: 200, height: 200, format: 'webp' },
  },
};

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
  hash?: string; // ファイルの重複チェック用
}

export interface OptimizedImageUrls {
  web: string;
  print?: string;
  thumbnail: string;
  original?: string;
}

export const SUPPORTED_INPUT_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
];

export const MAX_FILE_SIZES = {
  profile: 15 * 1024 * 1024, // 15MB
  photoSession: 25 * 1024 * 1024, // 25MB
  photobook: 50 * 1024 * 1024, // 50MB (フォトブック用高画質)
  social: 10 * 1024 * 1024, // 10MB
};

/**
 * 画像ファイルのバリデーション
 */
export function validateImageFile(
  file: File,
  category: keyof typeof MAX_FILE_SIZES
): { valid: boolean; error?: string } {
  // ファイル形式チェック
  if (!SUPPORTED_INPUT_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `サポートされていない画像形式です。対応形式: ${SUPPORTED_INPUT_FORMATS.join(', ')}`,
    };
  }

  // ファイルサイズチェック
  const maxSize = MAX_FILE_SIZES[category];
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `ファイルサイズが${maxSizeMB}MBを超えています（現在: ${Math.round(file.size / (1024 * 1024))}MB）`,
    };
  }

  return { valid: true };
}

/**
 * 画像の最適化されたURLを生成（Supabase Transform対応）
 * 一時的に安全モード: キャッシュ問題解決まで元URLをそのまま返す
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  _quality: 'web' | 'print' | 'thumbnail' = 'web',
  _category: keyof typeof IMAGE_QUALITY_CONFIGS = 'photoSession'
): string {
  // 安全のため、すべての場合で元のURLをそのまま返す
  // Next.js Imageコンポーネントが自動で最適化します
  return baseUrl;
}

/**
 * レスポンシブ画像のsrcSet生成
 * 注意: この関数は現在使用されていませんが、後方互換性のため残しています
 */
export function generateSrcSet(
  _baseUrl: string,
  _category: keyof typeof IMAGE_QUALITY_CONFIGS = 'photoSession'
): string {
  // 安全のため、すべての場合で空文字を返す
  // Next.js Imageコンポーネントが自動でsrcSetを生成します
  return '';
}

/**
 * Next.js Image用のsizes属性生成
 */
export function generateSizesAttribute(
  category: keyof typeof IMAGE_QUALITY_CONFIGS = 'photoSession'
): string {
  switch (category) {
    case 'profile':
      return '(max-width: 768px) 150px, (max-width: 1024px) 200px, 300px';
    case 'photoSession':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
    case 'photobook':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 75vw, 50vw';
    case 'social':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 400px';
    default:
      return '100vw';
  }
}

/**
 * 画像の圧縮率計算
 */
export function calculateCompressionRatio(
  originalSize: number,
  compressedSize: number
): number {
  return Math.round((1 - compressedSize / originalSize) * 100);
}

/**
 * ファイルハッシュ生成（重複検出用）
 */
export async function generateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const imageOptimization = {
  IMAGE_QUALITY_CONFIGS,
  validateImageFile,
  getOptimizedImageUrl,
  generateSrcSet,
  generateSizesAttribute,
  calculateCompressionRatio,
  generateFileHash,
};

export default imageOptimization;
