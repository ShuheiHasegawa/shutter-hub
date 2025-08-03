# フォトブック作成・編集システム 仕様書

> **実装技術**: React DnD + Konva.js | **対象デバイス**: PC・スマートフォン・タブレット

## 📋 システム概要

**フォトブック作成・編集システム**は、ユーザーが直感的に操作できるドラッグ&ドロップベースの高機能フォトブック作成ツールです。プロフェッショナルな印刷品質に対応し、将来的には印刷企業との提携による印刷サービス展開も可能な拡張性の高いアーキテクチャを採用しています。

### 🎯 ターゲットユーザー
- **一般ユーザー**: 思い出の写真を美しいフォトブックに
- **プロフォトグラファー**: クライアント向けのフォトブック制作
- **デザイナー**: レイアウトデザインの実験・制作
- **企業**: 会社案内やカタログ制作

---

## 🚀 主要機能

### 1. エディター画面構成

#### **左サイドバー**
```typescript
interface SidebarTabs {
  layoutTab: {
    name: 'レイアウト調整';
    features: [
      'プリセットレイアウトテンプレート',
      'ドラッグ可能な画像ボックス', 
      'テキストボックス',
      '図形・装飾要素'
    ];
  };
  
  uploadTab: {
    name: '画像アップロード';
    features: [
      'ドラッグ&ドロップアップロード',
      'ファイル選択アップロード',
      'カメラ撮影（スマホ）',
      'クリップボード貼り付け',
      '画像ライブラリ管理'
    ];
  };
}
```

#### **メインキャンバス**
- **ページビュー**: 単一ページ編集モード
- **見開きビュー**: 左右ページ同時編集
- **フルビュー**: 全ページ俯瞰表示
- **プレビューモード**: 本のようなページめくり

#### **右プロパティパネル**
- **選択要素の詳細設定**
- **レイヤー管理**
- **履歴パネル（アンドゥ・リドゥ）**

### 2. 画像ボックス操作

#### **配置操作**
```typescript
interface PlacementOperations {
  // PC操作
  pc: {
    dragFromSidebar: 'サイドバーからページにドラッグ';
    clickToAdd: 'レイアウトテンプレートをクリックで追加';
    rightClickMenu: '右クリックメニューから追加';
  };
  
  // スマホ操作  
  mobile: {
    touchDragFromSidebar: 'サイドバーからタッチドラッグ';
    longPressToAdd: 'ロングタップで追加メニュー表示';
    bottomSheetSelection: 'ボトムシートでレイアウト選択';
  };
}
```

#### **選択・編集状態UI**
```typescript
interface EditingUI {
  // 選択状態
  selection: {
    singleTap: '単一選択（選択枠表示）';
    multiSelect: 'Ctrl+クリック / 2本指タップで複数選択';
    selectionBox: 'ドラッグで範囲選択';
  };
  
  // リサイズハンドル
  resizeHandles: {
    corners: ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    edges: ['top', 'right', 'bottom', 'left'];
    mobile: 'スマホ用に44px以上の大きなハンドル';
  };
  
  // コンテキストメニュー
  contextMenu: {
    triggers: {
      pc: '右クリック';
      mobile: 'ロングタップ（1秒）';
    };
    actions: [
      '削除', 'コピー', '最前面へ', '最背面へ',
      'トリミング', '回転', '透明度調整', 'フィルター適用'
    ];
  };
}
```

#### **ドラッグ操作の判定ロジック**
```typescript
interface DragBehavior {
  zones: {
    centerArea: {
      action: '要素移動';
      cursor: 'move';
      touchFeedback: 'ハプティック + ビジュアル';
    };
    resizeHandles: {
      action: 'サイズ変更';
      cursor: 'nw-resize | ne-resize | ...';
      touchFeedback: '抵抗感のあるドラッグ';
    };
    rotateHandle: {
      action: '回転';
      cursor: 'grab';
      gesture: '2本指回転ジェスチャー対応';
    };
  };
}
```

### 3. 画像入れ替え機能

#### **入れ替えトリガー**
```typescript
interface ImageReplacement {
  triggers: {
    doubleClick: 'ダブルクリック（PC）';
    doubleTap: 'ダブルタップ（スマホ）';
    contextMenu: 'コンテキストメニューから「画像を変更」';
    replaceButton: '画像上にホバー時表示される変更ボタン';
  };
  
  replacementFlow: {
    modalUpload: 'モーダルでアップロード画面表示';
    dragOverReplace: '新しい画像を既存画像上にドラッグして入れ替え';
    librarySelection: '画像ライブラリから選択';
  };
}
```

### 4. 高度な編集機能

#### **精密位置調整**
```typescript
interface PrecisionControls {
  alignment: {
    quickSnap: {
      snapToGrid: 'グリッドにスナップ（5px/10px/20px）';
      snapToGuides: 'ガイドラインにスナップ';
      snapToElements: '他の要素の端にスナップ';
      magneticAlignment: '近づくと自動吸着';
    };
    
    distributionTools: {
      alignLeft: '左揃え';
      alignCenter: '中央揃え（水平）';
      alignRight: '右揃え';
      alignTop: '上揃え';
      alignMiddle: '中央揃え（垂直）';
      alignBottom: '下揃え';
      distributeHorizontal: '水平等間隔';
      distributeVertical: '垂直等間隔';
    };
  };
  
  pixelPerfect: {
    numericInput: 'X座標、Y座標、幅、高さの数値入力';
    arrowKeyNudge: '方向キーで1px移動（Shift+で10px移動）';
    marginSettings: '上下左右マージン設定';
    centerWithMargins: 'マージンを考慮した中央寄せ';
  };
}
```

#### **スマートフォン特化機能**
```typescript
interface MobileOptimization {
  gestures: {
    singleTouch: {
      tap: '選択';
      longPress: 'コンテキストメニュー';
      drag: '移動';
    };
    multiTouch: {
      pinchZoom: 'ピンチでキャンバスズーム';
      twoFingerRotate: '2本指で要素回転';
      threeFingerTap: '複数選択モード切り替え';
    };
  };
  
  ui: {
    bottomToolbar: '下部固定ツールバー';
    floatingActionButton: '右下FABでクイックアクション';
    collapsibleSidebar: '左からスワイプでサイドバー表示';
    fullscreenMode: 'ダブルタップでフルスクリーン編集';
  };
}
```

---

## 🏗️ 技術仕様

### 1. アーキテクチャ構成

#### **コア技術スタック**
```typescript
interface TechStack {
  frontend: {
    dragDrop: 'React DnD 16.0+';
    canvas: 'Konva.js + react-konva';
    ui: 'Tailwind CSS + shadcn/ui';
    state: 'Zustand（軽量状態管理）';
    gestures: 'Hammer.js（タッチジェスチャー）';
  };
  
  backend: {
    storage: 'Supabase Storage（画像保存）';
    database: 'PostgreSQL（プロジェクトデータ）';
    auth: 'Supabase Auth';
  };
  
  optimization: {
    imageProcessing: 'Canvas API + WebAssembly';
    caching: 'Service Worker + IndexedDB';
    bundling: 'Next.js App Router + Bundle Analysis';
  };
}
```

### 2. データ構造設計

#### **フォトブックプロジェクト構造**
```typescript
interface PhotobookProject {
  meta: {
    id: string;
    version: string; // セマンティックバージョニング
    createdAt: string;
    updatedAt: string;
    title: string;
    accountTier: 'free' | 'premium' | 'pro';
  };
  
  settings: {
    dimensions: { width: number; height: number }; // mm単位
    dpi: number; // 印刷解像度（300dpi推奨）
    colorSpace: 'RGB' | 'CMYK'; // 印刷用CMYK対応
    bleedMargin: number; // 裁ち落とし（3mm推奨）
    binding: 'left' | 'right' | 'spiral'; // 製本方式
    paperType: 'matte' | 'glossy' | 'premium'; // 用紙タイプ
  };
  
  pages: PhotobookPage[];
  resources: {
    images: ImageResource[];
    fonts: FontResource[];
  };
  
  // 印刷企業連携用メタデータ
  printingSpec: {
    vendor?: string; // 印刷企業識別子
    specification: PrintSpecification;
    qualityChecks: QualityCheck[];
  };
}

interface PrintSpecification {
  // 印刷企業標準仕様
  minResolution: number; // 最小解像度要件
  maxFileSize: number; // 最大ファイルサイズ
  colorProfile: string; // カラープロファイル
  supportedFormats: string[]; // 対応フォーマット
  bleedRequirement: number; // 必須ブリード
  safeArea: number; // セーフエリア
}
```

#### **効率的履歴管理**
```typescript
interface HistoryManager {
  settings: {
    maxStates: number; // アカウントランクに応じて制限
    maxMemoryMB: number; // メモリ使用量制限
    snapshotInterval: number; // スナップショット間隔
  };
  
  states: HistoryState[];
}

interface HistoryState {
  id: string;
  timestamp: number;
  action: HistoryAction;
  
  // 差分データで効率化
  changes: {
    type: 'add' | 'remove' | 'modify';
    path: string; // JSONPath形式
    before?: any;
    after?: any;
  }[];
  
  // 大きな変更時のスナップショット
  isSnapshot?: boolean;
  snapshotData?: Partial<PhotobookProject>;
}

type HistoryAction = 
  | 'add_element' | 'remove_element' | 'move_element'
  | 'resize_element' | 'rotate_element' | 'modify_style'
  | 'change_layout' | 'add_page' | 'remove_page'
  | 'replace_image' | 'apply_filter';
```

### 3. パフォーマンス最適化

#### **段階的制限設計（課金ランク対応）**
```typescript
interface AccountLimits {
  free: {
    maxPages: 20;
    maxImagesPerPage: 4;
    maxImageSizeMB: 5;
    maxProjectSizeMB: 50;
    maxProjects: 3;
    maxHistoryStates: 20;
    exportFormats: ['pdf_72dpi', 'jpg_medium'];
    cloudStorage: false;
  };
  
  premium: {
    maxPages: 100;
    maxImagesPerPage: 10;
    maxImageSizeMB: 20;
    maxProjectSizeMB: 500;
    maxProjects: 20;
    maxHistoryStates: 50;
    exportFormats: ['pdf_300dpi', 'jpg_high', 'png', 'tiff'];
    cloudStorage: true;
    cloudStorageGB: 10;
  };
  
  pro: {
    maxPages: -1; // 無制限
    maxImagesPerPage: -1;
    maxImageSizeMB: 100;
    maxProjectSizeMB: 2000;
    maxProjects: -1;
    maxHistoryStates: 100;
    exportFormats: ['pdf_print_ready', 'cmyk_tiff', 'eps'];
    cloudStorage: true;
    cloudStorageGB: 100;
    printingPartnership: true; // 印刷提携アクセス
  };
}
```

#### **メモリ・レンダリング最適化**
```typescript
interface PerformanceOptimization {
  imageOptimization: {
    multiResolution: {
      thumbnail: '150px（一覧表示）';
      preview: '800px（編集時）';
      editing: '1200px（精密編集）';
      print: '300dpi（印刷用）';
    };
    
    lazyLoading: {
      enabled: true;
      preloadDistance: 2; // 前後2ページ
      unloadDistance: 5; // 5ページ離れたら解放
    };
    
    compression: {
      webpSupport: 'WebP形式で50%削減';
      progressive: 'プログレッシブJPEG';
      qualityAdjustment: 'ネットワーク状況に応じて品質調整';
    };
  };
  
  renderingOptimization: {
    layerCaching: '変更されていないレイヤーをキャッシュ';
    virtualization: 'ビューポート外要素の描画停止';
    rafThrottling: 'requestAnimationFrameによる描画制御';
    webWorkers: '画像処理をワーカースレッドで実行';
  };
  
  memoryManagement: {
    automaticCleanup: {
      interval: 30000; // 30秒間隔
      thresholds: {
        warning: '500MB';
        critical: '800MB';
      };
    };
    
    emergencyActions: [
      '古い履歴データを削除',
      '高解像度画像を低解像度に置換',
      '非表示ページのデータを一時的にアンロード'
    ];
  };
}
```

---

## 🎨 デザイン・UX仕様

### 1. レスポンシブデザイン

#### **ブレークポイント設計**
```typescript
interface ResponsiveBreakpoints {
  mobile: {
    range: '320px - 767px';
    layout: 'single-column';
    sidebar: 'bottom-sheet';
    toolbar: 'bottom-fixed';
    gestures: 'touch-optimized';
  };
  
  tablet: {
    range: '768px - 1023px';
    layout: 'hybrid';
    sidebar: 'collapsible';
    toolbar: 'top-responsive';
    gestures: 'touch + mouse';
  };
  
  desktop: {
    range: '1024px+';
    layout: 'three-column';
    sidebar: 'fixed-left';
    toolbar: 'top-full';
    gestures: 'mouse-optimized';
  };
}
```

#### **タッチ最適化**
```typescript
interface TouchOptimization {
  targetSizes: {
    minimum: '44px'; // WCAG準拠
    recommended: '48px';
    spacing: '8px以上';
  };
  
  feedback: {
    visual: 'タップ時の色変更・拡大';
    haptic: 'iOS/Android対応ハプティック';
    audio: 'オプションで効果音';
  };
  
  gestures: {
    drag: '最低100ms長押し後にドラッグ開始';
    zoom: 'ピンチズーム（0.5x - 5.0x）';
    rotate: '2本指回転（15度刻み対応）';
    multiSelect: '2本指タップで複数選択モード';
  };
}
```

### 2. アクセシビリティ対応

```typescript
interface AccessibilityFeatures {
  screenReader: {
    ariaLabels: '全要素に適切なaria-label';
    liveRegions: '操作結果の音声フィードバック';
    keyboardNav: 'Tab順序の最適化';
  };
  
  visualA11y: {
    highContrast: 'ハイコントラストモード';
    largeText: 'テキストサイズ調整（100%-200%）';
    colorBlind: '色覚異常対応（色+形状での区別）';
    focusIndicator: '明確なフォーカスインジケーター';
  };
  
  motor: {
    largeTargets: '最小44pxのタッチターゲット';
    dragAlternative: 'ドラッグ操作の代替手段';
    timeout: 'タイムアウト時間の延長オプション';
  };
}
```

---

## 📤 印刷企業連携仕様

### 1. 印刷データ標準化

#### **印刷企業向けエクスポート形式**
```typescript
interface PrintReadyExport {
  // 標準印刷仕様
  standardSpecs: {
    resolution: '300dpi（CMYK）';
    colorProfile: 'Japan Color 2001 Coated';
    bleed: '3mm（四方）';
    safeArea: '5mm（テキスト・重要要素）';
    format: 'PDF/X-1a or PDF/X-4';
  };
  
  // 品質チェック項目
  qualityChecks: {
    resolution: '全画像300dpi以上';
    colorSpace: 'CMYK変換確認';
    fonts: 'フォントのアウトライン化';
    bleed: 'ブリード領域の確認';
    overprint: 'オーバープリント設定';
  };
  
  // メタデータ
  metadata: {
    jobTicket: 'JDF（Job Definition Format）対応';
    specifications: '印刷仕様書JSON';
    preflightReport: 'プリフライトチェック結果';
    costEstimate: '印刷コスト見積もり';
  };
}
```

#### **主要印刷企業との連携想定**
```typescript
interface PrintingPartners {
  domestic: {
    // 国内大手印刷企業
    toppan: {
      api: 'REST API連携';
      formats: ['PDF/X-4', 'TIFF', 'EPS'];
      specialties: ['高級フォトブック', '写真集'];
      minQuantity: 1;
      deliveryDays: 3-7;
    };
    
    printing: {
      api: 'API + FTP連携';
      formats: ['PDF/X-1a', 'PDF/X-4'];
      specialties: ['オンデマンド印刷', '小ロット'];
      minQuantity: 1;
      deliveryDays: 2-5;
    };
  };
  
  international: {
    // 国際展開時の候補
    blurb: {
      api: 'REST API';
      formats: ['PDF', 'JPG_300dpi'];
      specialties: ['フォトブック', '雑誌'];
      regions: ['US', 'EU', 'AU'];
    };
    
    printful: {
      api: 'REST API';
      formats: ['PDF', 'PNG_300dpi'];
      specialties: ['POD', 'ドロップシッピング'];
      regions: ['Worldwide'];
    };
  };
}
```

### 2. 印刷ワークフロー統合

```typescript
interface PrintingWorkflow {
  // 印刷前チェックフロー
  prepress: {
    automaticChecks: [
      '解像度チェック（300dpi以上）',
      '色域チェック（CMYK変換）',
      'ブリードチェック（3mm確保）',
      'セーフエリアチェック（重要要素配置）',
      'フォントチェック（埋め込み確認）'
    ];
    
    manualReview: [
      '色校正プレビュー',
      '印刷シミュレーション',
      '品質確認チェックリスト'
    ];
  };
  
  // 注文フロー
  orderFlow: {
    estimation: '即座コスト計算（数量・仕様別）';
    specification: '印刷仕様の確定';
    dataSubmission: '印刷データの自動送信';
    proofApproval: 'デジタル校正・承認';
    production: '印刷開始通知';
    shipping: '配送状況追跡';
    delivery: '納品確認';
  };
  
  // 品質保証
  qualityAssurance: {
    preflightCheck: 'Adobe Acrobat準拠チェック';
    colorManagement: 'ICCプロファイル管理';
    proofing: 'ソフトプルーフ・本紙校正';
    feedback: '印刷品質フィードバック収集';
  };
}
```

---

## 🚀 実装ロードマップ

### Phase 1: 基盤構築（2週間）
```typescript
const Phase1 = {
  week1: [
    'React DnD基本実装',
    'Konva.jsキャンバス統合',
    'プロジェクトデータ構造',
    '基本的なドラッグ&ドロップ'
  ],
  
  week2: [
    'レスポンシブUI基盤',
    '画像アップロード機能',
    '基本的な履歴管理',
    'エラーハンドリング'
  ],
  
  deliverable: 'MVP編集機能（PC・スマホ対応）'
};
```

### Phase 2: 編集機能拡充（2週間）
```typescript
const Phase2 = {
  week3: [
    '高度なドラッグ操作',
    'リサイズ・回転機能',
    'テキスト編集機能',
    'レイアウトテンプレート'
  ],
  
  week4: [
    '精密位置調整',
    '整列・分布機能',
    'コンテキストメニュー',
    'スマホジェスチャー最適化'
  ],
  
  deliverable: '本格的編集機能完成'
};
```

### Phase 3: 最適化・品質向上（2週間）
```typescript
const Phase3 = {
  week5: [
    'パフォーマンス最適化',
    'メモリ管理実装',
    '印刷品質対応',
    'アクセシビリティ強化'
  ],
  
  week6: [
    '課金ランク制限実装',
    'クラウド保存機能',
    'エクスポート機能',
    'E2Eテスト整備'
  ],
  
  deliverable: 'プロダクション準備完了'
};
```

### Phase 4: 印刷連携・拡張機能（継続的）
```typescript
const Phase4 = {
  ongoing: [
    '印刷企業API連携',
    'CMYK対応強化',
    'プリフライトチェック',
    '高度な画像編集機能',
    'AI機能統合'
  ],
  
  deliverable: '商用印刷対応フル機能版'
};
```

---

## 📊 成功指標・KPI

### 技術指標
- **パフォーマンス**: 初回読み込み3秒以内、操作レスポンス100ms以内
- **メモリ使用量**: 500MB以下（通常使用時）
- **モバイル対応**: iOS Safari, Android Chrome完全対応
- **アクセシビリティ**: WCAG 2.1 AA準拠

### ユーザー体験指標
- **操作習得時間**: 初回ユーザーが基本操作を習得するまで5分以内
- **プロジェクト完成率**: ユーザーがプロジェクトを最後まで完成させる割合80%以上
- **印刷品質満足度**: 印刷物に対する満足度90%以上

### ビジネス指標
- **印刷連携率**: プロユーザーの印刷サービス利用率60%以上
- **課金転換率**: フリーユーザーから有料プランへの転換率15%以上
- **リピート利用率**: 月次アクティブユーザーのリピート率70%以上

---

## 🔧 開発・運用体制

### 技術スタック管理
- **バージョン管理**: セマンティックバージョニング採用
- **品質管理**: TypeScript strict mode + ESLint + Prettier
- **テスト**: Jest + React Testing Library + Playwright
- **CI/CD**: GitHub Actions + Vercel/AWS

### セキュリティ・コンプライアンス
- **データ保護**: HTTPS + 保存時暗号化
- **プライバシー**: GDPR基本準拠
- **監査**: 定期的なセキュリティ監査実施

---

*この仕様書は実装進捗に応じて継続的にアップデートされます。*
*最終更新: 2025年1月*