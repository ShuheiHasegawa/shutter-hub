# 空状態表示の統一化実装計画

## 目標

空状態（Empty State）の表示を統一的な`EmptyState`コンポーネントで共通化し、一貫性のあるUI/UXを提供する。

## 実装ステップ

### Phase 1: 統一コンポーネントの作成 ✅

#### 1.1 `EmptyState`コンポーネントの作成 ✅

- **ファイル**: `src/components/ui/empty-state.tsx`
- **機能**:
  - アイコン表示（Lucide React）
  - タイトル・説明文の表示
  - アクションボタン（オプション）
  - 検索結果が空の場合の特別な表示（オプション）
  - 多言語化対応（`next-intl`）
  - カードでラップするかどうかのオプション
- **バリアント**: `default`と`search`の2つのみ（`minimal`は削除）

#### 1.2 多言語化キーの追加 ✅

- **ファイル**: `messages/ja.json`, `messages/en.json`
- **追加キー**:
  - `common.empty.default.title` - デフォルトタイトル
  - `common.empty.search.noResults` - 検索結果なし
  - `common.empty.search.noResultsWithTerm` - 検索キーワード付きメッセージ
  - `common.empty.search.description` - 検索結果なしの説明
  - `common.empty.search.suggestions.*` - 検索のヒント

### Phase 2: 高優先度コンポーネントの置き換え ✅

#### 2.1 レビューリスト（ReviewList.tsx） ✅

- **ファイル**: `src/components/reviews/ReviewList.tsx`
- **変更**: 424-442行目のインライン実装を`EmptyState`に置き換え
- **特徴**: アイコン（Star）、タイトル、説明、アクションボタン

#### 2.2 ユーザーリスト（UserList） ✅

- **ファイル**: `src/app/[locale]/users/search/page.tsx`
- **変更**: 260-268行目のインライン実装を`EmptyState`に置き換え
- **特徴**: アイコン（Users）、メッセージのみ

#### 2.3 メッセージレイアウト（MessagesLayout.tsx） ✅

- **ファイル**: `src/components/social/MessagesLayout.tsx`
- **変更**: 249-262行目のインライン実装を`EmptyState`に置き換え
- **特徴**: アイコン（MessageCircle）、メッセージ、アクションボタン、検索結果対応

#### 2.4 会話リスト（ConversationList.tsx） ✅

- **ファイル**: `src/components/social/ConversationList.tsx`
- **変更**: 186-197行目のインライン実装を`EmptyState`に置き換え
- **特徴**: MessagesLayoutと同様

### Phase 3: 中優先度コンポーネントの置き換え ✅

#### 3.1 撮影会リスト（PhotoSessionList.tsx） ✅

- **ファイル**: `src/components/photo-sessions/PhotoSessionList.tsx`
- **変更**: 709行目付近の空状態表示を`EmptyState`に置き換え

#### 3.2 その他のリストコンポーネント（要確認）

以下のコンポーネントで空状態表示がある可能性があります：

- `OrganizerModelsList.tsx`
- `PendingInvitationsList.tsx`
- `UserReviewList.tsx`
- `PhotobookGallery.tsx`
- `StudiosList.tsx`
- `UpcomingModelSessions.tsx`
- `UpcomingOrganizerSessions.tsx`
- `NotificationCenter.tsx`
- `PhotobookDashboard.tsx`
- `FavoritesContent.tsx`
- その他、空状態表示があるコンポーネント

### Phase 4: 既存コンポーネントの統合検討

#### 4.1 EmptyFavoritesの統合検討

- **ファイル**: `src/components/favorites/EmptyFavorites.tsx`
- **検討**: `EmptyState`コンポーネントを使用するようにリファクタリング
- **注意**: 既存の機能（検索結果対応、タイプ別表示、使い方説明）を維持

## コンポーネント設計

### EmptyState Props

```typescript
interface EmptyStateProps {
  icon?: LucideIcon; // デフォルト: Inbox
  title?: string; // 多言語化キーまたは直接テキスト
  description?: string; // 多言語化キーまたは直接テキスト
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  searchTerm?: string; // 検索結果が空の場合（自動的にsearchバリアント）
  variant?: 'default' | 'search'; // デフォルト: 'default'（minimalは削除）
  wrapped?: boolean; // Cardでラップするか（デフォルト: true）
  className?: string;
}
```

### 使用例

```typescript
// 基本的な空状態
<EmptyState
  icon={Star}
  title={t('reviews.empty.title')}
  description={t('reviews.empty.description')}
  action={{
    label: t('reviews.empty.action'),
    onClick: handleAddReview
  }}
/>

// 検索結果が空の場合（searchTermを指定すると自動的にsearchバリアント）
<EmptyState
  searchTerm={searchQuery}
  action={{
    label: t('common.empty.search.browseAll'),
    href: '/photo-sessions'
  }}
/>

// 明示的にsearchバリアントを指定
<EmptyState
  variant="search"
  searchTerm={searchQuery}
/>
```

## 実装時の注意事項

1. **多言語化対応**: すべてのテキストは`next-intl`を使用
2. **既存機能の維持**: `EmptyFavorites`の機能を損なわない
3. **段階的移行**: 新規実装から使用し、既存実装は修正時に置き換え
4. **アクセシビリティ**: 適切なARIA属性を設定
5. **型安全性**: TypeScriptの型定義を適切に設定
6. **minimalバリアントは削除**: `default`と`search`の2つのみ提供

## 期待される成果

- 一貫性のある空状態表示
- メンテナンス性の向上
- 多言語化対応の統一
- 開発効率の向上（再利用可能なコンポーネント）

## 実装完了状況

### 完了したタスク

- ✅ `EmptyState`コンポーネントの作成
- ✅ 多言語化キーの追加
- ✅ `ReviewList.tsx`の置き換え
- ✅ `UserList`の置き換え
- ✅ `MessagesLayout.tsx`の置き換え
- ✅ `ConversationList.tsx`の置き換え
- ✅ `PhotoSessionList.tsx`の置き換え

### 追加で完了したタスク

- ✅ `OrganizerModelsList.tsx`の置き換え（フィルター結果が空の場合）
- ✅ `PendingInvitationsList.tsx`の置き換え
- ✅ `PhotobookGallery.tsx`の置き換え
- ✅ `StudiosList.tsx`の置き換え（search/defaultバリアント）

### 今後のタスク

- [ ] その他のリストコンポーネントの確認と置き換え（必要に応じて）
- [ ] `EmptyFavorites`の統合検討

## 実装完了サマリー

### 置き換え完了コンポーネント（合計11件）

1. ✅ `ReviewList.tsx`
2. ✅ `UserList` (users/search/page.tsx)
3. ✅ `MessagesLayout.tsx`
4. ✅ `ConversationList.tsx`
5. ✅ `PhotoSessionList.tsx`
6. ✅ `OrganizerModelsList.tsx`
7. ✅ `PendingInvitationsList.tsx`
8. ✅ `PhotobookGallery.tsx`
9. ✅ `StudiosList.tsx`

### 実装日

- 開始: 2025-01-18
- 完了: 2025-01-18
