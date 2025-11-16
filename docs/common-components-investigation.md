# 共通化が必要な機能の調査結果

## 調査日: 2025-01-18

日付・時刻の多言語化対応統一化と同様に、共通化が求められている機能を調査しました。

## 🔍 調査結果サマリー

### 1. **空状態（Empty State）の表示** ⭐⭐⭐ 高優先度

**現状:**
- 59ファイルで166箇所の空状態表示が存在
- `EmptyFavorites.tsx`は専用コンポーネントがあるが、他の場所ではインライン実装が多い

**問題点:**
- 各コンポーネントで異なるデザイン・実装
- 多言語化対応が不統一
- 再利用性が低い

**影響範囲:**
- `ReviewList.tsx` - インライン実装
- `UserList` (users/search/page.tsx) - インライン実装
- `MessagesLayout.tsx` - インライン実装
- `ConversationList.tsx` - インライン実装
- `PhotoSessionList.tsx` - 空状態の表示あり
- その他多数

**推奨対応:**
```typescript
// 統一的なEmptyStateコンポーネント
<EmptyState
  icon={Search}
  title={t('empty.noResults')}
  description={t('empty.noResultsDescription')}
  action={{
    label: t('empty.browseAll'),
    onClick: () => router.push('/')
  }}
/>
```

---

### 2. **ローディング状態の表示** ⭐⭐⭐ 高優先度

**現状:**
- 104ファイルで681箇所のローディング表示が存在
- `LoadingCard.tsx`、`FavoritesLoading.tsx`、`ProfileSkeleton.tsx`など専用コンポーネントがあるが、多くの場所でインライン実装

**問題点:**
- ローディング表示のパターンが統一されていない
- スケルトンローダーとスピナーの使い分けが不明確
- 多言語化対応が不統一（「読み込み中...」がハードコード）

**影響範囲:**
- `PhotoSessionList.tsx` - カスタムスケルトン実装
- `MessagesLayout.tsx` - インライン実装
- `ConversationList.tsx` - インライン実装
- `UserList` - インライン実装
- その他多数

**推奨対応:**
```typescript
// 統一的なローディングコンポーネント
<LoadingState
  variant="skeleton" // or "spinner"
  count={3}
  message={t('common.loading')}
/>

// または
<SkeletonList count={3} />
<Spinner message={t('common.loading')} />
```

---

### 3. **認証状態の確認** ⭐⭐ 中優先度

**現状:**
- 808箇所で`createClient`や`supabase.auth.getUser`が使用
- `useAuth`フックは存在するが、直接`createClient`を使っている箇所が多い

**問題点:**
- 認証チェックのロジックが分散
- エラーハンドリングが不統一
- パフォーマンスの問題（重複した認証チェック）

**影響範囲:**
- ほぼ全コンポーネント
- Server Actions
- API Routes

**推奨対応:**
- `useAuth`フックの徹底的な使用
- Server Components用の`getCurrentUser()`の統一使用
- 認証ガードコンポーネントの活用

---

### 4. **画像のフォールバック処理** ⭐⭐ 中優先度

**現状:**
- 7ファイルで`no-image`関連の処理が存在
- `/images/no-image.png`の使用が統一されていない可能性

**問題点:**
- 画像がない場合の処理が不統一
- フォールバック画像のパスがハードコードされている可能性

**影響範囲:**
- `PhotoSessionCard.tsx`
- `StudioCard.tsx`
- `UserProfileCard.tsx`
- その他画像表示コンポーネント

**推奨対応:**
```typescript
// 統一的な画像コンポーネント
<ImageWithFallback
  src={imageUrl}
  alt={altText}
  fallback="/images/no-image.png"
/>
```

---

### 5. **エラーメッセージの表示** ⭐ 低優先度

**現状:**
- フォーム用は`FormMessage`で統一されている
- その他のエラー表示はカスタム実装が多い

**問題点:**
- エラーメッセージのスタイルが統一されていない
- 多言語化対応が不統一

**影響範囲:**
- `PhotoSessionLotteryEntry.tsx` - カスタム実装
- `AdminLotteryEntry.tsx` - カスタム実装
- その他エラー表示が必要なコンポーネント

**推奨対応:**
```typescript
// 統一的なエラーメッセージコンポーネント
<ErrorMessage
  type="error" // or "warning", "info"
  title={t('error.title')}
  message={t('error.message')}
/>
```

---

### 6. **数値フォーマット（通貨以外）** ⭐ 低優先度

**現状:**
- 18ファイルで`toLocaleString()`が通貨以外でも使用
- 通貨以外の数値（参加者数、ページ数など）のフォーマットが不統一

**問題点:**
- ロケール対応が不統一
- フォーマット方法が一貫していない

**影響範囲:**
- `StudioEditHistory.tsx`
- `QuickRequestForm.tsx`
- その他数値表示が必要なコンポーネント

**推奨対応:**
```typescript
// 統一的な数値フォーマットコンポーネント
<FormattedNumber
  value={count}
  format="integer" // or "decimal", "percentage"
  unit="人"
/>
```

---

## 📊 優先度マトリックス

| 機能 | 影響範囲 | 実装難易度 | 優先度 | 推定工数 |
|------|---------|-----------|--------|---------|
| 空状態表示 | 59ファイル | 中 | ⭐⭐⭐ | 2-3日 |
| ローディング表示 | 104ファイル | 中 | ⭐⭐⭐ | 2-3日 |
| 認証状態確認 | 808箇所 | 高 | ⭐⭐ | 1週間 |
| 画像フォールバック | 7ファイル | 低 | ⭐⭐ | 1日 |
| エラーメッセージ | 中 | 低 | ⭐ | 1-2日 |
| 数値フォーマット | 18ファイル | 低 | ⭐ | 1-2日 |

---

## 🎯 推奨実装順序

### Phase 1: 高優先度（即座に対応）
1. **空状態（Empty State）の統一化**
   - `EmptyState`コンポーネントの作成
   - 既存のインライン実装を置き換え

2. **ローディング状態の統一化**
   - `LoadingState`コンポーネントの作成
   - スケルトンとスピナーの統一
   - 多言語化対応

### Phase 2: 中優先度（短期対応）
3. **画像フォールバックの統一化**
   - `ImageWithFallback`コンポーネントの作成
   - 既存の画像表示を置き換え

4. **認証状態確認の統一化**
   - `useAuth`フックの徹底的な使用
   - 直接`createClient`使用の削減

### Phase 3: 低優先度（長期対応）
5. **エラーメッセージの統一化**
6. **数値フォーマットの統一化**

---

## 📝 実装時の注意事項

### 日付・時刻の多言語化対応と同様のアプローチ

1. **共通コンポーネントの作成**
   - `src/components/ui/`に配置
   - 多言語化対応必須
   - 型安全性の確保

2. **段階的な移行**
   - 新規実装から統一コンポーネントを使用
   - 既存実装は修正時に置き換え
   - 一括置換は時間がある時に実施

3. **ドキュメント化**
   - `development.mdc`にルールを追加
   - 使用例とベストプラクティスを記載

4. **テスト**
   - 各コンポーネントの動作確認
   - 多言語化対応の確認
   - アクセシビリティの確認

---

## 🔗 参考

- **日付・時刻の多言語化対応**: `docs/currency-timezone-settings-investigation.md`
- **実装完了状況**: 52ファイルの実装完了記録あり
- **開発ルール**: `.cursor/rules/dev-rules/development.mdc`

