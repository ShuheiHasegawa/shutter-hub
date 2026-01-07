# PR作成準備ガイド

## Issue分割結果

変更内容を以下の5つのIssueに分割しました：

### Issue 1: お気に入り機能の最適化（SWR一括取得）
**ファイルリスト:**
- `src/hooks/useFavoriteStates.ts` (新規)
- `src/components/ui/favorite-heart-button.tsx`
- `src/components/photo-sessions/PhotoSessionList.tsx`
- `src/components/photo-sessions/PhotoSessionCard.tsx`
- `src/components/photo-sessions/PhotoSessionGridCard.tsx`
- `src/components/photo-sessions/PhotoSessionMobileCompactCard.tsx`
- `src/components/photo-sessions/PhotoSessionMobileListCard.tsx`
- `src/components/photo-sessions/PhotoSessionTableRow.tsx`
- `src/components/studio/StudioCard.tsx`
- `src/components/studio/StudiosList.tsx`
- `src/components/favorites/FavoritesContent.tsx`
- `src/app/actions/favorites.ts`
- `src/hooks/usePhotoSessions.ts`
- `src/app/[locale]/studios/[id]/page.tsx` (お気に入り機能統合)

**コミットメッセージ案:**
```
refactor: お気に入り機能の最適化（SWR一括取得）

- useFavoriteStatesフックを新規作成（SWRを使用した一括取得）
- FavoriteHeartButtonをリファクタリング（個別取得から一括取得へ）
- PhotoSessionList/StudioListでのuseFavoriteStates統合
- 楽観的更新により即座にUIを更新
- revalidatePath削除（楽観的更新のため不要）

期待される効果:
- API呼び出し回数の大幅削減（N件のアイテムに対してN回 → 1回）
- ページ遷移時のデータ保持（keepPreviousData）
- UX向上（即座のUI更新）
```

---

### Issue 2: 認証フックの最適化（グローバルキャッシュ）
**ファイルリスト:**
- `src/hooks/useAuth.ts`
- `src/components/layout/authenticated-layout.tsx`
- `src/hooks/useNotifications.ts`
- `src/lib/supabase/client.ts`

**コミットメッセージ案:**
```
refactor: 認証フックの最適化（グローバルキャッシュ）

- useAuthにグローバルキャッシュを実装
- getUser()からgetSession()に変更（ローカルキャッシュから取得）
- Promise再利用により並行呼び出し時の重複リクエストを防止
- エラーハンドリングの最適化

期待される効果:
- 認証チェック回数の削減（複数コンポーネントで1回のみ）
- レスポンス時間の短縮（getSession()はローカルキャッシュから取得）
- パフォーマンス向上
```

---

### Issue 3: Toggleコンポーネントの追加とフィルターUI改善
**ファイルリスト:**
- `src/components/ui/toggle.tsx` (新規)
- `src/app/[locale]/photo-sessions/page.tsx`
- `src/components/photo-sessions/CompactFilterBar.tsx`
- `src/components/ui/page-title-header.tsx`

**コミットメッセージ案:**
```
feat: Toggleコンポーネントの追加とフィルターUI改善

- Radix UIベースのToggleコンポーネントを新規作成
- デザインシステムのsuccessカラー統合
- 撮影会リストのフィルターUI変更（Checkbox → Toggle）
- 「空きがある撮影会のみ」「活動拠点で絞る」フィルターのToggle化
- 「適用中:」バッジから除外（Toggleボタン自体で状態を表現）

期待される効果:
- フィルター有効/無効の視覚的フィードバック強化
- UX向上（状態が一目で分かる）
- モバイルでの操作性向上
```

---

### Issue 4: TypeScript型エラー修正
**ファイルリスト:**
- `src/app/actions/admin-lottery.ts` (joinクエリ結果の型処理)
- `src/components/organizer/AdminLotterySelection.tsx` (null許容型対応)
- `src/components/organizer/PriorityTicketManagement.tsx` (usernameのnull許容型)
- `src/components/photo-sessions/JointSessionForm.tsx` (photoSessionIdプロパティ追加)

**コミットメッセージ案:**
```
fix: TypeScript型エラーの修正

- admin-lottery.ts: photo_sessionのjoinクエリ結果の型処理を修正
- AdminLotterySelection.tsx: cheki_unsigned_count/cheki_signed_countのnull許容型対応
- PriorityTicketManagement.tsx: usernameのnull許容型対応
- JointSessionForm.tsx: photoSessionIdプロパティの追加
```

---

### Issue 5: Sentry設定の更新
**ファイルリスト:**
- `sentry.edge.config.ts`
- `sentry.server.config.ts`
- `src/instrumentation-client.ts`

**コミットメッセージ案:**
```
chore: Sentry設定の更新

- sentry.edge.config.tsの更新
- sentry.server.config.tsの更新
- instrumentation-client.tsの更新
```

---

## PR作成手順

### 1. GitHub Issue作成

各IssueテンプレートをGitHubに作成してください：

1. **Issue 1**: `.github/ISSUE_TEMPLATE/temp-issue-1-favorites-optimization.md`
2. **Issue 2**: `.github/ISSUE_TEMPLATE/temp-issue-2-auth-optimization.md`
3. **Issue 3**: `.github/ISSUE_TEMPLATE/temp-issue-3-toggle-component.md`
4. **Issue 4**: `.github/ISSUE_TEMPLATE/temp-issue-5-type-fixes.md`
5. **Issue 5**: `.github/ISSUE_TEMPLATE/temp-issue-4-sentry-update.md`

### 2. ブランチ作成とコミット

各Issueごとにブランチを作成し、対応するファイルをコミット：

```bash
# Issue 1: お気に入り機能の最適化
git checkout -b refactor/favorites-optimization
git add [Issue 1のファイルリスト]
git commit -m "refactor: お気に入り機能の最適化（SWR一括取得）"
git push origin refactor/favorites-optimization

# Issue 2: 認証フックの最適化
git checkout main
git checkout -b refactor/auth-optimization
git add [Issue 2のファイルリスト]
git commit -m "refactor: 認証フックの最適化（グローバルキャッシュ）"
git push origin refactor/auth-optimization

# Issue 3: Toggleコンポーネント
git checkout main
git checkout -b feature/toggle-component
git add [Issue 3のファイルリスト]
git commit -m "feat: Toggleコンポーネントの追加とフィルターUI改善"
git push origin feature/toggle-component

# Issue 4: TypeScript型エラー修正
git checkout main
git checkout -b fix/typescript-type-errors
git add [Issue 4のファイルリスト]
git commit -m "fix: TypeScript型エラーの修正"
git push origin fix/typescript-type-errors

# Issue 5: Sentry設定
git checkout main
git checkout -b chore/sentry-update
git add [Issue 5のファイルリスト]
git commit -m "chore: Sentry設定の更新"
git push origin chore/sentry-update
```

### 3. PR作成

各ブランチからPRを作成し、対応するIssueをリンク：

- PRタイトル: `[Refactor] お気に入り機能の最適化（SWR一括取得）`
- 説明: Issue #XX を参照
- ラベル: `refactor`, `performance`

---

## 注意事項

- Issue 1とIssue 2は依存関係がある可能性があります（useAuthの変更がuseFavoriteStatesに影響）
- 実装順序: Issue 2 → Issue 1 → Issue 3 → Issue 4 → Issue 5 を推奨
- 各PRは独立してレビュー可能な粒度に分割されています
- Issue 4（型エラー修正）は他のIssueに依存しないため、優先的に実装可能
