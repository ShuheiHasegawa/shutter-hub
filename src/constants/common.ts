/**
 * アプリケーション全体で使用される共通定数
 */

/**
 * アプリケーション情報
 */
export const APP_INFO = {
  name: 'ShutterHub',
  version: '2.0.0',
  description:
    'モデル、カメラマン、撮影会運営者をつなぐ統合型撮影会予約プラットフォーム',
  author: 'ShutterHub Team',
  website: 'https://shutterhub.app',
} as const;

/**
 * ページネーション設定
 */
export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
  limits: [10, 20, 50, 100] as const,
} as const;

/**
 * ファイルアップロード制限
 */
export const FILE_UPLOAD = {
  image: {
    maxSize: 15 * 1024 * 1024, // 15MB
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ] as const,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'] as const,
  },
  document: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ] as const,
    allowedExtensions: ['.pdf', '.doc', '.docx'] as const,
  },
} as const;

/**
 * 画像サイズ・品質設定
 */
export const IMAGE_SETTINGS = {
  thumbnails: {
    width: 300,
    height: 300,
    quality: 60,
  },
  small: {
    width: 600,
    height: 600,
    quality: 75,
  },
  medium: {
    width: 1200,
    height: 1200,
    quality: 85,
  },
  large: {
    width: 1920,
    height: 1920,
    quality: 90,
  },
} as const;

/**
 * 日付・時刻フォーマット
 */
export const DATE_FORMATS = {
  display: 'YYYY年MM月DD日',
  displayWithTime: 'YYYY年MM月DD日 HH:mm',
  api: 'YYYY-MM-DD',
  apiWithTime: 'YYYY-MM-DD HH:mm:ss',
  time: 'HH:mm',
} as const;

/**
 * 通貨・価格設定
 */
export const CURRENCY = {
  code: 'JPY',
  symbol: '¥',
  locale: 'ja-JP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
} as const;

/**
 * レート制限設定
 */
export const RATE_LIMITS = {
  api: {
    authenticated: 1000, // per hour
    anonymous: 100, // per hour
  },
  upload: {
    perMinute: 10,
    perHour: 50,
  },
  notification: {
    perHour: 10,
    perDay: 50,
  },
} as const;

/**
 * バリデーション設定
 */
export const VALIDATION = {
  name: {
    minLength: 1,
    maxLength: 100,
  },
  description: {
    maxLength: 500,
  },
  address: {
    minLength: 1,
    maxLength: 200,
  },
  phone: {
    pattern: /^[\d-+()]*$/,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  url: {
    pattern: /^https?:\/\/.+/,
  },
} as const;

/**
 * デバウンス・スロットリング設定
 */
export const TIMING = {
  searchDebounce: 300, // ms
  autoSave: 1000, // ms
  toastDuration: 3000, // ms
  animationDuration: 300, // ms
} as const;
