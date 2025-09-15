# クイックフォトブック機能 システム仕様書

> **プロジェクト**: ShutterHub v2 - クイックフォトブック機能  
> **作成日**: 2025-01-09  
> **バージョン**: 1.0  
> **実装方針**: 統合データベース・タイプ分け方式

## 📋 **概要**

### **機能目標**
ShutterHub に**下位プラン向け**のシンプルなフォトブック作成機能を追加し、既存の高機能フォトブック編集システムと統合して、プラン階層に応じた段階的な機能提供を実現する。

### **ビジネス価値**
- **プラン差別化**: 下位プラン向けシンプル機能の提供
- **ユーザー獲得**: モバイルファーストUIによる一般層取り込み
- **収益向上**: 段階的アップグレード促進

### **技術方針**
- **統合データベース**: 既存システム拡張・タイプ分け方式
- **モバイルファースト**: スマホ最適化・タッチ操作対応
- **レスポンシブ**: 全デバイス対応

---

## 🎯 **機能要件**

### **1. 基本機能範囲**

#### **✅ 含まれる機能**
- **画像アップロード**: ドラッグ&ドロップ、ファイル選択
- **画像順番入れ替え**: ドラッグ&ドロップ + ボタン操作
- **1ページ1枚表示**: 縦長・横長自動対応
- **ページ数制限**: プラン連動制限
- **基本プレビュー**: モバイル・デスクトップ表示
- **保存・公開**: 基本的な管理機能

#### **❌ 含まれない機能（上位プラン限定）**
- **複雑レイアウト編集**: 複数画像配置、自由配置
- **テキスト・図形追加**: 高度な編集機能
- **見開きページ編集**: 複雑なページ構成
- **高度なテンプレート**: プレミアムデザイン
- **印刷品質エクスポート**: 商用印刷対応

### **2. ユーザー体験設計**

#### **対象ユーザー**
- **フリープラン・ベーシックプランユーザー**
- **スマホメインユーザー**（モバイルファーストUI）
- **シンプル操作志向ユーザー**

#### **使用シナリオ**
- **撮影会後**: 思い出整理・フォトブック作成
- **SNS共有**: 簡単な作品集作成
- **プレゼント**: 手軽なギフト作成

---

## 📊 **データベース設計**

### **1. テーブル構造**

#### **統合フォトブックテーブル (`photobooks`)**
```sql
CREATE TABLE photobooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 基本情報
  title TEXT NOT NULL,
  description TEXT,
  photobook_type photobook_type NOT NULL DEFAULT 'quick', -- 'quick' | 'advanced'
  
  -- プラン制限関連
  max_pages INTEGER NOT NULL,
  current_pages INTEGER DEFAULT 0 CHECK (current_pages >= 0),
  
  -- 表示・公開設定
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  
  -- 高機能版用設定（将来拡張）
  theme_id UUID,
  advanced_settings JSONB DEFAULT '{}'::jsonb,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT valid_page_count CHECK (current_pages <= max_pages)
);
```

#### **フォトブック画像テーブル (`photobook_images`)**
```sql
CREATE TABLE photobook_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photobook_id UUID REFERENCES photobooks(id) ON DELETE CASCADE NOT NULL,
  
  -- 画像基本情報
  image_url TEXT NOT NULL,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  
  -- ファイルメタデータ
  original_filename TEXT,
  file_size_bytes INTEGER CHECK (file_size_bytes > 0),
  image_width INTEGER CHECK (image_width > 0),
  image_height INTEGER CHECK (image_height > 0),
  orientation image_orientation NOT NULL, -- 'portrait' | 'landscape' | 'square'
  
  -- 高機能版用設定（将来拡張）
  position_x DECIMAL DEFAULT 0,
  position_y DECIMAL DEFAULT 0,
  scale_factor DECIMAL DEFAULT 1 CHECK (scale_factor > 0),
  rotation_angle DECIMAL DEFAULT 0,
  advanced_settings JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  UNIQUE(photobook_id, page_number)
);
```

### **2. プラン制限設定**

#### **統一プラン制限（全ユーザータイプ共通）**
```typescript
interface UnifiedPlanLimits {
  free: {
    maxPages: 5;
    maxPhotobooks: 3;
    allowedTypes: ['quick'];
  };
  
  basic_pro_standard: {
    maxPages: 10;
    maxPhotobooks: 5;
    allowedTypes: ['quick', 'advanced'];
  };
  
  premium_studio: {
    maxPages: 15;
    maxPhotobooks: 10;
    allowedTypes: ['quick', 'advanced'];
  };
}
```

---

## 🎨 **UI/UX設計**

### **1. URL構造・命名**

#### **クイックフォトブック**
```
/photobooks/quick/           # 一覧ページ
/photobooks/quick/create     # 作成ページ
/photobooks/quick/[id]       # 表示ページ
/photobooks/quick/[id]/edit  # 編集ページ
```

#### **統合管理**
```
/photobooks/                 # 両タイプ統合一覧
/photobooks/advanced/        # 高機能版（将来）
```

### **2. レスポンシブ対応**

#### **ブレークポイント戦略**
```css
/* モバイルファースト */
mobile:   375px - 768px   /* メイン対象 */
tablet:   768px - 1024px  /* 中間サイズ */
desktop:  1024px+         /* 補完的対応 */
```

#### **モバイル最適化**
- **タッチ操作**: 44px以上のタップターゲット
- **ドラッグ&ドロップ**: `dnd-kit`でタッチ対応
- **フォールバック**: アップ・ダウンボタンによる確実操作
- **レイアウト**: 縦スクロール最適化

### **3. 操作方式**

#### **画像順番入れ替え**
```typescript
interface ReorderMethods {
  primary: {
    method: 'Touch drag with dnd-kit';
    target: 'Mobile users';
    feedback: 'Visual drag preview + haptic';
  };
  
  fallback: {
    method: 'Up/Down buttons on each card';
    target: 'Accessibility + reliability';
    feedback: 'Immediate visual update';
  };
  
  desktop: {
    method: 'Mouse drag + keyboard shortcuts';
    target: 'Power users';
    feedback: 'Smooth animations';
  };
}
```

---

## 🔧 **技術アーキテクチャ**

### **1. 技術スタック**

#### **フロントエンド**
```yaml
framework: 'Next.js 14 (App Router)'
ui_library: 'Shadcn/ui + TailwindCSS'
drag_drop: 'dnd-kit'
image_upload: 'react-dropzone'
state_management: 'React Hook Form + Zustand'
notifications: 'Sonner'
```

#### **バックエンド**
```yaml
database: 'Supabase PostgreSQL'
storage: 'Supabase Storage'
api: 'Next.js Server Actions'
authentication: 'Supabase Auth'
realtime: 'Supabase Realtime (プラン制限)'
```

### **2. コンポーネント構成**

#### **ページレベル**
```
src/app/[locale]/photobooks/quick/
├── page.tsx                    # 一覧ページ
├── create/page.tsx            # 作成ページ
└── [id]/
    ├── page.tsx               # 表示ページ
    └── edit/page.tsx          # 編集ページ
```

#### **コンポーネントレベル**
```
src/components/photobook/
├── QuickPhotobookCreateForm.tsx      # 作成フォーム
├── QuickPhotobookEditor.tsx          # メインエディター
├── QuickPhotobookImageManager.tsx    # 画像管理
├── QuickPhotobookPreview.tsx         # プレビュー
└── QuickPhotobookSettings.tsx        # 設定
```

#### **Server Actions**
```
src/app/actions/
├── quick-photobook.ts         # フォトブック CRUD
└── quick-photobook-images.ts  # 画像管理
```

### **3. 型定義**

#### **主要型定義 (`src/types/quick-photobook.ts`)**
```typescript
export type PhotobookType = 'quick' | 'advanced';
export type ImageOrientation = 'portrait' | 'landscape' | 'square';

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
  created_at: string;
  updated_at: string;
}

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
  created_at: string;
}
```

---

## 🔒 **セキュリティ・権限**

### **1. Row Level Security (RLS)**

#### **フォトブック**
```sql
-- ユーザーは自分のフォトブックをCRUD可能
CREATE POLICY "Users can manage own photobooks" ON photobooks
  FOR ALL USING (auth.uid() = user_id);

-- 公開されたフォトブックは全員が閲覧可能
CREATE POLICY "Anyone can view published photobooks" ON photobooks
  FOR SELECT USING (is_published = TRUE);
```

#### **画像**
```sql
-- ユーザーは自分のフォトブック画像をCRUD可能
CREATE POLICY "Users can manage own photobook images" ON photobook_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photobooks
      WHERE photobooks.id = photobook_images.photobook_id
      AND photobooks.user_id = auth.uid()
    )
  );
```

### **2. プラン制限チェック**

#### **作成時制限**
```typescript
export async function checkPhotobookCreationLimit(userId: string): Promise<PlanLimitCheck> {
  // 現在のフォトブック数取得
  const currentCount = await getPhotobookCount(userId);
  
  // プラン制限取得
  const limits = await getPhotobookPlanLimits(userId);
  
  return {
    allowed: currentCount < limits.maxPhotobooks,
    current_usage: currentCount,
    limit: limits.maxPhotobooks,
    remaining: Math.max(0, limits.maxPhotobooks - currentCount),
    plan_name: 'Current Plan'
  };
}
```

#### **ページ数制限**
```typescript
export async function addPhotobookImage(photobookId: string, userId: string, imageData: ImageData) {
  // フォトブック取得・所有権確認
  const photobook = await getPhotobook(photobookId, userId);
  
  // ページ数制限チェック
  if (photobook.current_pages >= photobook.max_pages) {
    throw new Error(`ページ数の上限（${photobook.max_pages}ページ）に達しています`);
  }
  
  // 画像追加処理
}
```

---

## 🚀 **実装フェーズ**

### **Phase 1: データベース・API基盤（1週間）**

#### **マイグレーション実装**
- [x] `20250910080010_create_unified_photobook_system.sql`
- [ ] MCP連携でマイグレーション実行
- [ ] テーブル作成・制約確認

#### **Server Actions実装**
- [x] `src/app/actions/quick-photobook.ts` - フォトブック管理
- [x] `src/app/actions/quick-photobook-images.ts` - 画像管理
- [ ] プラン制限チェック統合テスト

### **Phase 2: UI実装（2週間）**

#### **基本ページ**
- [x] フォトブック一覧ページ (`/photobooks/quick/`)
- [x] 作成ページ (`/photobooks/quick/create`)
- [x] 編集ページ (`/photobooks/quick/[id]/edit`)
- [ ] 表示・プレビューページ

#### **コンポーネント**
- [x] `QuickPhotobookCreateForm` - 作成フォーム
- [x] `QuickPhotobookImageManager` - 画像管理
- [x] `QuickPhotobookEditor` - メインエディター
- [ ] `QuickPhotobookPreview` - プレビュー
- [ ] `QuickPhotobookSettings` - 設定

### **Phase 3: 統合・最適化（1週間）**

#### **画像アップロード**
- [ ] Supabase Storage連携
- [ ] 画像最適化・リサイズ
- [ ] アップロード進捗表示

#### **多言語化**
- [ ] `messages/ja.json` 日本語対応
- [ ] `messages/en.json` 英語対応
- [ ] 動的テキスト翻訳

#### **テスト・品質保証**
- [ ] E2Eテスト実装
- [ ] モバイル実機テスト
- [ ] パフォーマンス最適化

---

## 📋 **品質保証**

### **1. テスト要件**

#### **機能テスト**
- [ ] フォトブック作成・編集・削除
- [ ] 画像アップロード・順番変更
- [ ] プラン制限チェック
- [ ] レスポンシブ対応

#### **パフォーマンステスト**
- [ ] 画像アップロード速度
- [ ] ドラッグ&ドロップ応答性
- [ ] モバイル操作性

#### **セキュリティテスト**
- [ ] RLSポリシー動作確認
- [ ] 不正アクセス防止
- [ ] データ整合性確認

### **2. 受け入れ基準**

#### **機能要件**
- ✅ 全プラン制限が正常動作する
- ✅ モバイル・デスクトップで同等の操作性
- ✅ 画像順番変更が確実に動作する
- ✅ エラーハンドリングが適切に機能する

#### **非機能要件**
- ✅ ページ読み込み時間 < 2秒
- ✅ 画像アップロード応答性 < 3秒
- ✅ モバイル操作の快適性
- ✅ アクセシビリティ対応

---

## 🔄 **運用・保守**

### **1. 監視項目**

#### **使用量監視**
- フォトブック作成数（プラン別）
- 画像アップロード量
- エラー発生率

#### **パフォーマンス監視**
- ページ表示速度
- 画像処理時間
- データベース負荷

### **2. 拡張計画**

#### **短期（3ヶ月）**
- [ ] 基本フィルター機能
- [ ] 簡単なキャプション追加
- [ ] 共有機能強化

#### **中期（6ヶ月）**
- [ ] テンプレート選択機能
- [ ] エクスポート機能
- [ ] 印刷サービス連携

#### **長期（1年）**
- [ ] 高機能版との完全統合
- [ ] AI自動レイアウト
- [ ] コラボレーション機能

---

## 📈 **成功指標（KPI）**

### **利用指標**
- **月間作成数**: 目標500冊/月
- **ユーザー利用率**: フリープランユーザーの30%が利用
- **完成率**: 作成開始から公開まで70%

### **ビジネス指標**
- **プランアップグレード率**: クイック→高機能版 15%
- **ユーザー満足度**: NPS 40以上
- **機能定着率**: 月2回以上利用 25%

### **技術指標**
- **エラー率**: < 1%
- **応答時間**: 平均2秒以内
- **アップタイム**: 99.9%以上

---

## 📚 **関連ドキュメント**

- **プロジェクト概要**: `docs/project.mdc`
- **技術スタック**: `docs/techstack.mdc`
- **UI/UXガイド**: `docs/ui-guide.mdc`
- **サブスクリプション**: `docs/subscription-system/`
- **既存フォトブック**: `docs/photobook-editing-system-spec.md`

---

## ✅ **承認・確認**

### **仕様確認済み項目**
- [x] 統合データベース方式採用
- [x] プラン制限統一（5/10/15ページ、3/5/10冊）
- [x] モバイルファースト設計
- [x] URL構造（`/photobooks/quick/`）
- [x] 上位プラン両方式選択可能

### **実装準備完了**
- [x] データベース設計完了
- [x] TypeScript型定義完了
- [x] Server Actions実装完了
- [x] 基本UIコンポーネント実装完了
- [ ] マイグレーション実行（次ステップ）

**この仕様書に基づいて、マイグレーション実行から実装を開始します。**
