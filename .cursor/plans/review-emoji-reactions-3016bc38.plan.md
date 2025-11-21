<!-- 3016bc38-9b58-40a9-961b-ff9861cc9179 d92f6474-fcb9-4734-a880-7334440a418c -->
# レビュー絵文字リアクション機能実装

## 実装方針

既存の「参考になった」「参考にならない」機能を絵文字リアクション機能に置き換えます。

### 要件

- 絵文字リアクションのみ（参考になった/ならないは削除）
- 標準的なリアクション: 👍 ❤️ 😂 😮 😢 😡
- 1つのレビューに1つのリアクションのみ（変更可能）

## 実装内容

### 1. データベース設計

#### 1.1 テーブル設計

既存の`review_helpful_votes`テーブルを`review_reactions`に変更：

```sql
CREATE TABLE review_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('photo_session', 'user')),
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('👍', '❤️', '😂', '😮', '😢', '😡')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, review_type, voter_id)
);

-- インデックス
CREATE INDEX idx_review_reactions_review ON review_reactions(review_id, review_type);
CREATE INDEX idx_review_reactions_voter ON review_reactions(voter_id);
```

#### 1.2 レビューテーブルの変更

`helpful_count`を削除し、各リアクションタイプのカウントを保持するビューまたは関数を作成：

```sql
-- リアクション集計ビュー
CREATE VIEW review_reaction_counts AS
SELECT 
  review_id,
  review_type,
  reaction_type,
  COUNT(*) as count
FROM review_reactions
GROUP BY review_id, review_type, reaction_type;
```

または、リアクション数を動的に計算する関数を作成。

#### 1.3 トリガー関数の更新

既存の`trigger_update_helpful_count`を削除し、新しいリアクションシステムに対応。

#### 1.4 データ移行

既存の`review_helpful_votes`データを`review_reactions`に移行：

- `is_helpful = true` → `reaction_type = '👍'`
- `is_helpful = false` → `reaction_type = '😡'`

### 2. バックエンド実装

#### 2.1 Server Actions (`src/app/actions/reviews.ts`)

- `voteReviewHelpful`を`addReviewReaction`に変更
- リアクションタイプのバリデーション
- 既存のリアクションがある場合は更新、ない場合は作成
```typescript
export interface ReviewReactionData {
  review_id: string;
  review_type: 'photo_session' | 'user';
  reaction_type: '👍' | '❤️' | '😂' | '😮' | '😢' | '😡';
}

export async function addReviewReaction(data: ReviewReactionData) {
  // 既存のリアクションをチェック
  // 存在する場合は更新、ない場合は作成
}
```


#### 2.2 レビュー取得関数の更新

- `getPhotoSessionReviews`: 現在のユーザーのリアクション状態も取得
- `getUserReviews`: 同様にリアクション状態を取得
```typescript
// レビュー取得時にリアクション状態も取得
const { data: reviews } = await supabase
  .from('photo_session_reviews')
  .select(`
    *,
    reviewer:profiles(...),
    user_reaction:review_reactions!left(
      reaction_type
    )
  `)
  .eq('photo_session_id', photoSessionId);
```


#### 2.3 リアクション数取得関数

各リアクションタイプのカウントを取得する関数を追加：

```typescript
export async function getReviewReactionCounts(
  reviewId: string,
  reviewType: 'photo_session' | 'user'
) {
  // review_reaction_countsビューから取得
}
```

### 3. フロントエンド実装

#### 3.1 ReviewCardコンポーネント (`src/components/reviews/ReviewCard.tsx`)

- 「参考になった」「参考にならない」ボタンを削除
- 絵文字リアクションボタンを追加
- 既存のリアクション状態を表示
- リアクション数の表示
```tsx
// リアクション選択UI
<div className="flex items-center gap-2">
  {REACTION_TYPES.map(emoji => (
    <Button
      key={emoji}
      variant={userReaction === emoji ? 'default' : 'outline'}
      size="sm"
      onClick={() => handleReaction(emoji)}
    >
      <span className="text-lg">{emoji}</span>
      {reactionCounts[emoji] > 0 && (
        <span className="ml-1 text-xs">{reactionCounts[emoji]}</span>
      )}
    </Button>
  ))}
</div>
```


#### 3.2 リアクションタイプの定義

```typescript
export const REACTION_TYPES = ['👍', '❤️', '😂', '😮', '😢', '😡'] as const;
export type ReactionType = typeof REACTION_TYPES[number];
```

#### 3.3 既存リアクション状態の取得

`ReviewCard`コンポーネントで`useEffect`を使用して既存のリアクション状態を取得：

```tsx
useEffect(() => {
  if (review.user_reaction) {
    setUserReaction(review.user_reaction.reaction_type);
  }
}, [review.user_reaction]);
```

#### 3.4 ReviewListコンポーネント (`src/components/reviews/ReviewList.tsx`)

- `helpful_count`の参照を削除
- リアクション数の表示を更新

### 4. 多言語対応

#### 4.1 メッセージファイル (`messages/ja.json`, `messages/en.json`)

```json
{
  "reviews": {
    "reactions": {
      "thumbsUp": "いいね",
      "heart": "好き",
      "laugh": "面白い",
      "surprised": "驚き",
      "sad": "悲しい",
      "angry": "怒り"
    }
  }
}
```

### 5. マイグレーション

#### 5.1 マイグレーションファイル作成

1. `review_helpful_votes` → `review_reactions`への移行
2. 既存データの移行
3. トリガー関数の更新
4. `helpful_count`カラムの削除（オプション）

## 影響範囲

- `src/components/reviews/ReviewCard.tsx`: 大幅な変更
- `src/components/reviews/ReviewList.tsx`: リアクション表示の更新
- `src/app/actions/reviews.ts`: Server Actionsの変更
- `src/components/profile/UserReviewList.tsx`: リアクション表示の更新
- データベース: テーブル名変更、スキーマ変更

## テスト項目

- 絵文字リアクションの送信
- 既存リアクションの変更
- リアクション数の表示
- 複数レビューでのリアクション状態の保持
- データ移行の確認

### To-dos

- [ ] データベースマイグレーション: review_helpful_votes → review_reactions
- [ ] 既存データの移行（is_helpful → reaction_type）
- [ ] トリガー関数の更新
- [ ] Server Actions: voteReviewHelpful → addReviewReaction
- [ ] レビュー取得関数にリアクション状態を含める
- [ ] ReviewCardコンポーネントのUI更新
- [ ] リアクションタイプの定義と定数作成
- [ ] 多言語対応メッセージの追加
- [ ] ReviewListコンポーネントの更新
- [ ] UserReviewListコンポーネントの更新
- [ ] 動作テストの実施
