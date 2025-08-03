// フォトブック編集システム用の型定義

// ============================================
// プロジェクト関連の型定義
// ============================================

export interface PhotobookProject {
  meta: {
    id: string;
    version: string; // セマンティックバージョニング
    createdAt: string;
    updatedAt: string;
    lastSavedAt?: string;
    title: string;
    description?: string;
    tags?: string[];
    accountTier: AccountTier;
  };

  settings: ProjectSettings;
  pages: PhotobookPage[];
  resources: ProjectResources;
  history?: HistoryManager;
}

export interface ProjectSettings {
  dimensions: { width: number; height: number }; // mm単位
  dpi: number; // 印刷解像度（300dpi推奨）
  colorSpace: 'RGB' | 'CMYK';
  bleedMargin: number; // 裁ち落とし（3mm推奨）

  // 印刷仕様（将来の印刷企業連携用）
  binding?: 'left' | 'right' | 'spiral';
  coverType?: 'soft' | 'hard';
  paperType?: 'matte' | 'glossy' | 'premium';
}

export interface ProjectResources {
  images: ImageResource[];
  fonts: FontResource[];
  // 将来の拡張用
  shapes?: ShapeResource[];
  templates?: TemplateResource[];
}

// ============================================
// ページ・要素関連の型定義
// ============================================

export interface PhotobookPage {
  id: string;
  pageNumber: number;
  spreadId?: string; // 見開きページの場合

  layout: {
    templateId?: string;
    backgroundColor?: string;
    backgroundImage?: string;
    margins: { top: number; right: number; bottom: number; left: number };
  };

  elements: PageElement[];

  settings?: {
    locked?: boolean;
    hidden?: boolean;
    printable?: boolean;
  };
}

export interface PageElement {
  id: string;
  type: ElementType;

  // 位置・サイズ（パーセンテージ + 絶対値併用）
  transform: {
    x: number; // %
    y: number; // %
    width: number; // %
    height: number; // %
    rotation?: number; // degrees
    scaleX?: number;
    scaleY?: number;

    // 絶対値での微調整用
    offsetX?: number; // px
    offsetY?: number; // px
  };

  // 表示設定
  style: {
    opacity?: number;
    zIndex: number;
    visible?: boolean;
    locked?: boolean;
  };

  // 要素固有データ
  data: ElementData;

  // 履歴用
  lastModified?: string;
}

export type ElementType = 'image' | 'text' | 'shape' | 'sticker';

export type ElementData = ImageData | TextData | ShapeData | StickerData;

export interface ImageData {
  type: 'image';
  src: string;
  originalSrc?: string; // 高解像度版
  alt?: string;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  filters?: ImageFilter[];
}

export interface TextData {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?:
    | 'normal'
    | 'bold'
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900';
  color: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
}

export interface ShapeData {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface StickerData {
  type: 'sticker';
  stickerId: string;
  category: string;
}

// ============================================
// リソース関連の型定義
// ============================================

export interface ImageResource {
  id: string;
  name: string;
  src: string;
  thumbnailSrc?: string;
  size: number; // bytes
  dimensions: { width: number; height: number };
  format: string;
  uploadedAt: string;
}

export interface FontResource {
  id: string;
  name: string;
  family: string;
  url?: string;
  weight: string;
  style: string;
}

export interface ShapeResource {
  id: string;
  name: string;
  type: string;
  svg?: string;
}

export interface TemplateResource {
  id: string;
  name: string;
  description: string;
  preview: string;
  data: unknown;
}

// ============================================
// 履歴管理関連の型定義
// ============================================

export interface HistoryManager {
  settings: {
    maxStates: number;
    maxMemoryMB: number;
    snapshotInterval: number;
  };

  currentIndex: number;
  states: HistoryState[];
}

export interface HistoryState {
  id: string;
  timestamp: number;
  action: HistoryAction;

  // 差分データで効率化
  changes: HistoryChange[];

  // 大きな変更時のスナップショット
  isSnapshot?: boolean;
  snapshotData?: Partial<PhotobookProject>;
}

export interface HistoryChange {
  type: 'add' | 'remove' | 'modify';
  path: string; // JSONPath形式
  elementId?: string;
  pageId?: string;
  before?: unknown;
  after?: unknown;
}

export type HistoryAction =
  | 'add_element'
  | 'remove_element'
  | 'move_element'
  | 'resize_element'
  | 'rotate_element'
  | 'modify_style'
  | 'change_layout'
  | 'add_page'
  | 'remove_page'
  | 'replace_image'
  | 'apply_filter';

// ============================================
// ドラッグ&ドロップ関連の型定義
// ============================================

export interface DragItem {
  type: DragItemType;
  id: string;
  data?: unknown;
}

export type DragItemType =
  | 'layout-template'
  | 'image-box'
  | 'text-box'
  | 'shape-box'
  | 'uploaded-image'
  | 'page-element';

export interface DropResult {
  dropEffect: string;
  target: DropTarget;
}

export interface DropTarget {
  type: 'canvas' | 'page' | 'element';
  id: string;
  position?: { x: number; y: number };
}

// ============================================
// UI・操作関連の型定義
// ============================================

export interface EditorState {
  selectedElements: string[];
  activePageId: string;
  viewMode: ViewMode;
  zoomLevel: number;
  showGrid: boolean;
  showGuides: boolean;
  snapToGrid: boolean;
  snapToGuides: boolean;
}

export type ViewMode = 'single' | 'spread' | 'overview';

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================
// 課金ランク・制限関連の型定義
// ============================================

export type AccountTier = 'free' | 'premium' | 'pro';

export interface AccountLimits {
  maxPages: number;
  maxImagesPerPage: number;
  maxImageSizeMB: number;
  maxProjectSizeMB: number;
  maxProjects: number;
  maxHistoryStates: number;
  exportFormats: string[];
  cloudStorage: boolean;
  cloudStorageGB?: number;
  printingPartnership?: boolean;
}

// ============================================
// フィルター・エフェクト関連の型定義
// ============================================

export interface ImageFilter {
  type: FilterType;
  intensity?: number;
  params?: Record<string, unknown>;
}

export type FilterType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'blur'
  | 'sharpen'
  | 'sepia'
  | 'grayscale'
  | 'vintage'
  | 'vignette';

// ============================================
// 印刷企業連携関連の型定義（将来用）
// ============================================

export interface PrintSpecification {
  minResolution: number;
  maxFileSize: number;
  colorProfile: string;
  supportedFormats: string[];
  bleedRequirement: number;
  safeArea: number;
}

export interface QualityCheck {
  type: string;
  status: 'pass' | 'warning' | 'error';
  message: string;
  recommendation?: string;
}
