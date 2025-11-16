# 画像フォールバック処理の統一化実装計画

## 実装完了日: 2025-01-18

## 目標

画像がない場合のフォールバック表示を、アイコン + グラデーション背景のパターンで統一し、一貫性のあるUI/UXを提供する。

## 実装完了状況

### Phase 1: 統一コンポーネントの作成 ✅

#### 1.1 `EmptyImage`コンポーネントの作成 ✅

- **ファイル**: `src/components/ui/empty-image.tsx`
- **機能**:
  - Next.js Imageコンポーネントのラッパー
  - 画像がない場合またはエラー時にアイコン + グラデーション背景を表示
  - コンポーネント別に適切なアイコンを選択可能（propsで指定）
  - テーマ対応のグラデーション背景
  - 既存のNext.js Imageの機能を維持（fill, width/height, sizes等）
  - `EmptyState`と命名規則を統一

#### 1.2 デフォルトアイコンの定義 ✅

- スタジオ: `Building2`
- 撮影会: `Camera`
- ユーザー: `User`
- その他: `Image`（汎用）

#### 1.3 デモページの作成 ✅

- **ファイル**: `src/app/[locale]/dev/empty-image-demo/page.tsx`
- **目的**: 各種アイコンとサイズの組み合わせを確認

### Phase 2: 高優先度コンポーネントの置き換え ✅

#### 2.1 画像ファイル使用箇所の置き換え ✅

- `studios/[id]/page.tsx` - `/images/no-image.png`使用箇所（4箇所）✅
  - メイン画像（328行目）
  - ギャラリー画像（533行目）
  - 空のギャラリー（545行目）
  - モーダル画像（673行目）

- `StudioImageUpload.tsx` - `/images/no-image.png`使用箇所（193行目）✅

- `EditableCanvas.tsx` - `/images/no-image.png`使用箇所（309行目、473行目）✅
  - データ構造のデフォルト値を`null`に変更
  - KonvaImageElementで画像がない場合のフォールバック表示を追加

#### 2.2 既存のアイコン実装の統一 ✅

- `StudioCard.tsx` - 既にアイコン実装あり、`EmptyImage`に置き換え（118-120行目）✅
- `PhotoSessionCard.tsx` - 既にアイコン実装あり、`EmptyImage`に置き換え（3箇所）✅
  - cardモード（99-101行目）
  - verticalモード（219-221行目）
  - horizontalモード（572-573行目）

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
```

## 実装時の注意事項

1. **既存機能の維持**: Next.js Imageの最適化機能を維持
2. **パフォーマンス**: アイコン表示は軽量で高速
3. **テーマ対応**: グラデーション背景はテーマ色を使用
4. **アクセシビリティ**: 適切なalt属性を設定
5. **段階的移行**: 新規実装から使用し、既存実装は修正時に置き換え
6. **OptimizedImageとの関係**: `OptimizedImage`は高度な最適化機能を持つため、`EmptyImage`とは別途維持。`EmptyImage`はシンプルなフォールバック用途に特化。

## 期待される成果

- 一貫性のある画像フォールバック表示
- メンテナンス性の向上
- テーマ対応の統一
- 開発効率の向上（再利用可能なコンポーネント）
- `/images/no-image.png`への依存を削減

## 今後のタスク

- [ ] その他のコンポーネントの確認と置き換え（必要に応じて）
- [ ] 71ファイルで画像表示が存在するため、段階的に置き換え

## 参考資料

- `EmptyState`コンポーネント実装: `src/components/ui/empty-state.tsx`
- `OptimizedImage`コンポーネント: `src/components/ui/optimized-image.tsx`
- 空状態実装計画: `docs/empty-state.md`

