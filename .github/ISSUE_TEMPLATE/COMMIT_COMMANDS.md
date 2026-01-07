# コミットコマンド一覧

## Issue 1: お気に入り機能の最適化（SWR一括取得）

```bash
git checkout -b refactor/favorites-optimization
git add src/hooks/useFavoriteStates.ts
git add src/components/ui/favorite-heart-button.tsx
git add src/components/photo-sessions/PhotoSessionList.tsx
git add src/components/photo-sessions/PhotoSessionCard.tsx
git add src/components/photo-sessions/PhotoSessionGridCard.tsx
git add src/components/photo-sessions/PhotoSessionMobileCompactCard.tsx
git add src/components/photo-sessions/PhotoSessionMobileListCard.tsx
git add src/components/photo-sessions/PhotoSessionTableRow.tsx
git add src/components/studio/StudioCard.tsx
git add src/components/studio/StudiosList.tsx
git add src/components/favorites/FavoritesContent.tsx
git add src/app/actions/favorites.ts
git add src/hooks/usePhotoSessions.ts
git add src/app/[locale]/studios/[id]/page.tsx
git commit -m "refactor: お気に入り機能の最適化（SWR一括取得）

- useFavoriteStatesフックを新規作成（SWRを使用した一括取得）
- FavoriteHeartButtonをリファクタリング（個別取得から一括取得へ）
- PhotoSessionList/StudioListでのuseFavoriteStates統合
- 楽観的更新により即座にUIを更新
- revalidatePath削除（楽観的更新のため不要）

期待される効果:
- API呼び出し回数の大幅削減（N件のアイテムに対してN回 → 1回）
- ページ遷移時のデータ保持（keepPreviousData）
- UX向上（即座のUI更新）"
git push origin refactor/favorites-optimization
```

---

## Issue 2: 認証フックの最適化（グローバルキャッシュ）

```bash
git checkout main
git checkout -b refactor/auth-optimization
git add src/hooks/useAuth.ts
git add src/components/layout/authenticated-layout.tsx
git add src/hooks/useNotifications.ts
git add src/lib/supabase/client.ts
git commit -m "refactor: 認証フックの最適化（グローバルキャッシュ）

- useAuthにグローバルキャッシュを実装
- getUser()からgetSession()に変更（ローカルキャッシュから取得）
- Promise再利用により並行呼び出し時の重複リクエストを防止
- エラーハンドリングの最適化

期待される効果:
- 認証チェック回数の削減（複数コンポーネントで1回のみ）
- レスポンス時間の短縮（getSession()はローカルキャッシュから取得）
- パフォーマンス向上"
git push origin refactor/auth-optimization
```

---

## Issue 3: Toggleコンポーネントの追加とフィルターUI改善

```bash
git checkout main
git checkout -b feature/toggle-component
git add src/components/ui/toggle.tsx
git add src/app/[locale]/photo-sessions/page.tsx
git add src/components/photo-sessions/CompactFilterBar.tsx
git add src/components/ui/page-title-header.tsx
git commit -m "feat: Toggleコンポーネントの追加とフィルターUI改善

- Radix UIベースのToggleコンポーネントを新規作成
- デザインシステムのsuccessカラー統合
- 撮影会リストのフィルターUI変更（Checkbox → Toggle）
- 「空きがある撮影会のみ」「活動拠点で絞る」フィルターのToggle化
- 「適用中:」バッジから除外（Toggleボタン自体で状態を表現）

期待される効果:
- フィルター有効/無効の視覚的フィードバック強化
- UX向上（状態が一目で分かる）
- モバイルでの操作性向上"
git push origin feature/toggle-component
```

---

## Issue 4: TypeScript型エラー修正

```bash
git checkout main
git checkout -b fix/typescript-type-errors
git add src/app/actions/admin-lottery.ts
git add src/components/organizer/AdminLotterySelection.tsx
git add src/components/organizer/PriorityTicketManagement.tsx
git add src/components/photo-sessions/JointSessionForm.tsx
git commit -m "fix: TypeScript型エラーの修正

- admin-lottery.ts: photo_sessionのjoinクエリ結果の型処理を修正
- AdminLotterySelection.tsx: cheki_unsigned_count/cheki_signed_countのnull許容型対応
- PriorityTicketManagement.tsx: usernameのnull許容型対応
- JointSessionForm.tsx: photoSessionIdプロパティの追加"
git push origin fix/typescript-type-errors
```

---

## Issue 5: Sentry設定の更新

```bash
git checkout main
git checkout -b chore/sentry-update
git add sentry.edge.config.ts
git add sentry.server.config.ts
git add src/instrumentation-client.ts
git commit -m "chore: Sentry設定の更新

- sentry.edge.config.tsの更新
- sentry.server.config.tsの更新
- instrumentation-client.tsの更新"
git push origin chore/sentry-update
```
