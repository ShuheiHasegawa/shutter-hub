// 写真集データモデルの型定義

// 写真のポジションとサイズ
export interface PhotoPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
}

// 写真情報
export interface Photo {
  id: string;
  src: string;
  alt?: string;
  position?: PhotoPosition;
}

// 単一レイアウトタイプ
export interface LayoutTemplate {
  id: string;
  name: string;
  description?: string;
  photoPositions: PhotoPosition[];
  isPremium?: boolean;
}

// 見開きページのレイアウト
export interface SpreadLayout {
  id: string;
  leftPageTemplate?: LayoutTemplate;
  rightPageTemplate?: LayoutTemplate;
  fullSpreadTemplate?: LayoutTemplate;
  photos: Photo[];
}

// 全体の写真集定義
export interface Photobook {
  id: string;
  userId: string;
  title: string;
  description?: string;
  coverPhoto?: Photo;
  spreads: SpreadLayout[];
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  isPremium?: boolean;
  maxPages?: number; // 無料ユーザーの場合は制限あり
  themeId?: string;
}

// レイアウトテンプレートカテゴリ
export interface LayoutCategory {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  templates: LayoutTemplate[];
}

// 利用可能なユーザー権限
export enum PhotobookUserPermission {
  FREE = 'free',
  PREMIUM = 'premium',
  ADMIN = 'admin',
}

// ユーザーの写真集権限設定
export interface PhotobookUserSettings {
  userId: string;
  permission: PhotobookUserPermission;
  maxPages: number;
  maxPhotos: number;
  maxPhotobooks: number;
  hasPremiumTemplates: boolean;
}
