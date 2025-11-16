<!-- e0886681-d901-414b-9665-abd88298f162 0776ffe5-b202-448c-ade1-e9b6428963d0 -->
# 画像フォールバック処理の統一化実装計画

## 目標

画像がない場合のフォールバック表示を、アイコン + グラデーション背景のパターンで統一し、一貫性のあるUI/UXを提供する。

## 現状分析

### 問題点

- 画像フォールバックのパターンが統一されていない
- `/images/no-image.png`を使用している箇所と、アイコン + グラデーション背景を使用している箇所が混在
- コンポーネントごとに異なる実装

### 既存実装パターン

1. **アイコン + グラデーション背景**（推奨パターン）

   - `StudioCard.tsx`: Building2アイコン + グラデーション（118-120行目）
   - `PhotoSessionCard.tsx`: CalendarIconアイコン + グラデーション（99-101行目）

2. **画像ファイル**

   - `studios/[id]/page.tsx`: `/images/no-image.png`を使用（4箇所）
     - メイン画像（328行目）
     - ギャラリー画像（533行目）
     - 空のギャラリー（545行目）
     - モーダル画像（673行目）
   - `StudioImageUpload.tsx`: `/images/no-image.png`を使用（193行目）
   - `EditableCanvas.tsx`: `/images/no-image.png`を使用（309行目、473行目）

3. **エラー表示**

   - `OptimizedImage.tsx`: AlertCircleアイコン + テキスト（エラー時）

### 影響範囲

- 71ファイルで画像表示が存在
- 3ファイルで`/images/no-image.png`を使用（合計6箇所）
- 複数のコンポーネントでアイコン + グラデーション背景を使用

## 実装ステップ

### Phase 1: 統一コンポーネントの作成

#### 1.1 `EmptyImage`コンポーネントの作成

- **ファイル**: `src/components/ui/empty-image.tsx`
- **機能**:
  - Next.js Imageコンポーネントのラッパー
  - 画像がない場合またはエラー時にアイコン + グラデーション背景を表示
  - コンポーネント別に適切なアイコンを選択可能（propsで指定）
  - テーマ対応のグラデーション背景
  - 既存のNext.js Imageの機能を維持（fill, width/height, sizes等）
  - `EmptyState`と命名規則を統一

#### 1.2 デフォルトアイコンの定義

- スタジオ: `Building2`
- 撮影会: `CalendarIcon` / `Camera`
- ユーザー: `User`
- その他: `Image`（汎用）

#### 1.3 デモページの作成

- **ファイル**: `src/app/[locale]/dev/empty-image-demo/page.tsx`
- **目的**: 各種アイコンとサイズの組み合わせを確認

### Phase 2: 高優先度コンポーネントの置き換え

#### 2.1 画像ファイル使用箇所の置き換え

- `studios/[id]/page.tsx` - `/images/no-image.png`使用箇所（4箇所）
  - メイン画像（328行目）
  - ギャラリー画像（533行目）
  - 空のギャラリー（545行目）
  - モーダル画像（673行目）

- `StudioImageUpload.tsx` - `/images/no-image.png`使用箇所（193行目）

- `EditableCanvas.tsx` - `/images/no-image.png`使用箇所（309行目、473行目）

#### 2.2 既存のアイコン実装の統一

- `StudioCard.tsx` - 既にアイコン実装あり、`EmptyImage`に置き換え（118-120行目）
- `PhotoSessionCard.tsx` - 既にアイコン実装あり、`EmptyImage`に置き換え（99-101行目）

### Phase 3: その他のコンポーネントの確認と置き換え

- 71ファイルで画像表示が存在するため、必要に応じて段階的に置き換え
- 新規実装時は必ず`EmptyImage`を使用

## コンポーネント設計

### EmptyImage Props

```typescript
interface EmptyImageProps {
  /** 画像URL */
  src?: string | null;
  /** alt属性 */
  alt: string;
  /** フォールバックアイコン（デフォルト: Image） */
  fallbackIcon?: LucideIcon;
  /** フォールバック時のアイコンサイズ（デフォルト: 'md'） */
  fallbackIconSize?: 'sm' | 'md' | 'lg' | 'xl';
  /** フォールバック時のグラデーション方向（デフォルト: 'br'） */
  fallbackGradient?: 'br' | 'bl' | 'tr' | 'tl' | 'r' | 'l' | 't' | 'b';
  /** Next.js Imageのfillプロパティ */
  fill?: boolean;
  /** Next.js Imageのwidthプロパティ */
  width?: number;
  /** Next.js Imageのheightプロパティ */
  height?: number;
  /** Next.js Imageのsizesプロパティ */
  sizes?: string;
  /** カスタムクラス名 */
  className?: string;
  /** その他のNext.js Image props */
  ...ImageProps
}
```

### 使用例

```typescript
// スタジオカード
<EmptyImage
  src={studio.featuredPhotos?.[0]?.image_url}
  alt={studio.name}
  fallbackIcon={Building2}
  fill
  className="object-cover"
/>

// 撮影会カード
<EmptyImage
  src={session.image_url}
  alt={session.title}
  fallbackIcon={Camera}
  fill
  className="object-cover"
/>

// ユーザーアバター（小さいサイズ）
<EmptyImage
  src={user.avatar_url}
  alt={user.display_name}
  fallbackIcon={User}
  width={40}
  height={40}
  className="rounded-full"
/>

// スタジオ詳細ページのメイン画像
<EmptyImage
  src={photos.length > 0 ? photos[0].image_url : undefined}
  alt={photos.length > 0 ? photos[0].alt_text || studio.name : 'No Image'}
  fallbackIcon={Building2}
  fallbackIconSize="xl"
  fill
  className="object-cover"
/>
```

## 実装時の注意事項

1. **既存機能の維持**: Next.js Imageの最適化機能を維持
2. **パフォーマンス**: アイコン表示は軽量で高速
3. **テーマ対応**: グラデーション背景はテーマ色を使用
4. **アクセシビリティ**: 適切なalt属性を設定
5. **段階的移行**: 新規実装から使用し、既存実装は修正時に置き換え
6. **OptimizedImageとの関係**: `OptimizedImage`は高度な最適化機能を持つため、`EmptyImage`とは別途維持。`EmptyImage`はシンプルなフォールバック用途に特化。

## パフォーマンス考慮事項

1. **アイコン表示の軽量化**: SVGアイコンはCSSで描画されるため、画像ファイルより軽量
2. **グラデーション背景**: CSSグラデーションはGPUアクセラレーション対応
3. **Next.js Image最適化**: 画像がある場合は既存の最適化機能を活用
4. **遅延読み込み**: フォールバック表示も遅延読み込みに対応

## アクセシビリティ

1. **alt属性の必須化**: 画像がない場合でも適切なalt属性を設定
2. **スクリーンリーダー対応**: アイコンは装飾的要素として扱い、alt属性で情報を提供
3. **コントラスト比**: グラデーション背景とアイコンのコントラスト比をWCAG AA準拠に

## テスト計画

1. **コンポーネントテスト**: 各種propsの組み合わせをテスト
2. **テーマ切り替えテスト**: ライト/ダークモードでの表示確認
3. **レスポンシブテスト**: 各種画面サイズでの表示確認
4. **アクセシビリティテスト**: スクリーンリーダーでの動作確認

## ドキュメント化

### development.mdcへの追加内容

````markdown
## 画像フォールバック統一ルール

### 基本原則

- **EmptyImageコンポーネントの使用必須**: 画像がない場合は必ず`EmptyImage`を使用する
- **アイコン + グラデーション背景**: `/images/no-image.png`の使用を避け、アイコン + グラデーション背景を使用する
- **適切なアイコンの選択**: コンテキストに応じたアイコンを選択する

### 実装パターン

```typescript
// ✅ 推奨: EmptyImageコンポーネント使用
<EmptyImage
  src={imageUrl}
  alt={altText}
  fallbackIcon={Building2}
  fill
  className="object-cover"
/>

// ❌ 禁止: 画像ファイルの直接使用
<Image src={imageUrl || '/images/no-image.png'} alt={altText} />
````
```

## 期待される成果

- 一貫性のある画像フォールバック表示
- メンテナンス性の向上
- テーマ対応の統一
- 開発効率の向上（再利用可能なコンポーネント）
- `/images/no-image.png`への依存を削減

## 多言語化対応

### 多言語化キーの追加（必要に応じて）

画像フォールバック自体は視覚的な要素のため、基本的に多言語化は不要。ただし、エラーメッセージやツールチップが必要な場合は以下を追加：

- `common.image.loadError` - 画像読み込みエラー
- `common.image.noImage` - 画像なし（スクリーンリーダー用）

## 参考資料

- `EmptyState`コンポーネント実装: `src/components/ui/empty-state.tsx`
- `OptimizedImage`コンポーネント: `src/components/ui/optimized-image.tsx`
- 空状態実装計画: `docs/empty-state.md`

### To-dos

- [ ] 多言語化キーを追加（messages/ja.json, messages/en.json）