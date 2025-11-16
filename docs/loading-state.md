# ローディング状態の表示統一化実装計画

## 目標

ローディング状態の表示を統一的な`LoadingState`コンポーネントで共通化し、一貫性のあるUI/UXを提供する。

## 現状分析

### 問題点

- 104ファイルで681箇所のローディング表示が存在
- ローディング表示のパターンが統一されていない
- スケルトンローダーとスピナーの使い分けが不明確
- 多言語化対応が不統一（「読み込み中...」がハードコード）

### 既存コンポーネント

- `LoadingCard.tsx` - 基本的なカード形式のスケルトン
- `FavoritesLoading.tsx` - お気に入り専用のスケルトン
- `ProfileSkeleton.tsx` - プロフィール専用のスケルトン
- `Skeleton.tsx` - 基本的なスケルトンコンポーネント（Shadcn/ui）

### インライン実装の例

- `PhotoSessionList.tsx` - カスタムスケルトン実装（3つのカード）
- `MessagesLayout.tsx` - テキストのみ「読み込み中...」
- `ConversationList.tsx` - テキストのみ「読み込み中...」
- `UserList` - Loader2 + テキスト「読み込み中...」（ハードコード）

## 実装ステップ

### Phase 1: 統一コンポーネントの作成

#### 1.1 `LoadingState`コンポーネントの作成

- **ファイル**: `src/components/ui/loading-state.tsx`
- **機能**:
  - `spinner`バリアント: シンプルなスピナー表示（軽量なローディング）
  - `skeleton`バリアント: スケルトンローダー（リスト表示用）
  - `card`バリアント: カード形式のスケルトン（既存の`LoadingCard`を統合）
  - 多言語化対応（`next-intl`）
  - カスタマイズ可能なメッセージ

#### 1.2 多言語化キーの追加

- **ファイル**: `messages/ja.json`, `messages/en.json`
- **追加キー**:
  - `common.loading.default` - デフォルトメッセージ「読み込み中...」
  - `common.loading.data` - 「データを読み込み中...」
  - `common.loading.list` - 「リストを読み込み中...」

### Phase 2: 高優先度コンポーネントの置き換え

#### 2.1 シンプルなスピナー表示

- `UserList` (users/search/page.tsx) - Loader2 + テキスト
- `MessagesLayout.tsx` - テキストのみ
- `ConversationList.tsx` - テキストのみ

#### 2.2 スケルトンローダー表示

- `PhotoSessionList.tsx` - カスタムスケルトン実装
- その他のリストコンポーネント

### Phase 3: 既存コンポーネントの統合検討

#### 3.1 専用スケルトンコンポーネントの統合

- `FavoritesLoading.tsx` - `LoadingState`の`card`バリアントで代替可能か検討
- `ProfileSkeleton.tsx` - 専用レイアウトのため維持（必要に応じて`LoadingState`を内部で使用）

## コンポーネント設計

### LoadingState Props

```typescript
interface LoadingStateProps {
  /** バリアント（デフォルト: 'spinner'） */
  variant?: 'spinner' | 'skeleton' | 'card';
  /** カスタムメッセージ（多言語化キーまたは直接テキスト） */
  message?: string;
  /** スケルトンの数（skeleton/cardバリアントの場合） */
  count?: number;
  /** カスタムクラス名 */
  className?: string;
  /** フルスクリーン表示（デフォルト: false） */
  fullScreen?: boolean;
}
```

### 使用例

```typescript
// シンプルなスピナー
<LoadingState message={t('common.loading.default')} />

// スケルトンローダー（リスト用）
<LoadingState variant="skeleton" count={3} />

// カード形式のスケルトン
<LoadingState variant="card" count={3} />

// フルスクリーン表示
<LoadingState fullScreen message={t('common.loading.data')} />
```

## 実装時の注意事項

1. **多言語化対応**: すべてのテキストは`next-intl`を使用
2. **既存機能の維持**: 専用スケルトンコンポーネントの機能を損なわない
3. **段階的移行**: 新規実装から使用し、既存実装は修正時に置き換え
4. **パフォーマンス**: スケルトンローダーは適切な数のみ表示
5. **アクセシビリティ**: 適切なARIA属性を設定

## 期待される成果

- 一貫性のあるローディング表示
- メンテナンス性の向上
- 多言語化対応の統一
- 開発効率の向上（再利用可能なコンポーネント）

## 実装完了状況

### 完了したタスク

- ✅ `LoadingState`コンポーネントの作成
- ✅ 多言語化キーの追加
- ✅ `UserList`の置き換え（spinnerバリアント）
- ✅ `MessagesLayout.tsx`の置き換え（spinnerバリアント）
- ✅ `ConversationList.tsx`の置き換え（spinnerバリアント）
- ✅ `PhotoSessionList.tsx`の置き換え（cardバリアント）
- ✅ `GroupManagement.tsx`の置き換え（spinnerバリアント）

### 今後のタスク

- [ ] その他のコンポーネントの確認と置き換え（必要に応じて）
- [ ] 既存専用スケルトンコンポーネントの統合検討

## 実装完了サマリー

### 置き換え完了コンポーネント（合計5件）

1. ✅ `UserList` (users/search/page.tsx) - spinnerバリアント
2. ✅ `MessagesLayout.tsx` - spinnerバリアント
3. ✅ `ConversationList.tsx` - spinnerバリアント
4. ✅ `PhotoSessionList.tsx` - cardバリアント
5. ✅ `GroupManagement.tsx` - spinnerバリアント

### 実装の特徴

- **spinnerバリアント**: シンプルなスピナー表示（軽量なローディング）
- **skeletonバリアント**: スケルトンローダー（リスト表示用）
- **cardバリアント**: カード形式のスケルトン（既存の`LoadingCard`を統合）
- **多言語化対応**: すべてのメッセージは`common.loading.*`キーを使用

### 実装日

- 開始: 2025-01-18
- 完了: 2025-01-18

