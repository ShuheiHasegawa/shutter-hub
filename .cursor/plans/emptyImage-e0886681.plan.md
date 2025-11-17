<!-- e0886681-d901-414b-9665-abd88298f162 0776ffe5-b202-448c-ade1-e9b6428963d0 -->
# 認証状態確認統一化実装計画

## 現状分析

### 問題点

1. **認証チェックの分散**: 808箇所で`createClient`や`supabase.auth.getUser`を直接使用
2. **エラーハンドリングの不統一**: エラーメッセージが多様（「認証が必要です」「ログインが必要です」「Authentication required」など）
3. **権限チェックの重複**: プロフィール取得が各所で個別に実行され、パフォーマンス問題
4. **パターンの混在**: 同じ目的で異なる実装パターンが使用されている

### 現状の使用状況

- **Server Actions**: 51ファイルで185箇所の`supabase.auth.getUser`使用
- **Server Components**: 直接`createClient`と`supabase.auth.getUser`を使用するパターンが多数
- **Client Components**: `useAuth`フックが存在するが、直接`createClient`を使用する箇所も存在

## 理想的な構造設計

### 1. Server Actions用認証ユーティリティ

**ファイル**: `src/lib/auth/server-actions.ts`

```typescript
// 統一的な認証チェック関数
export async function requireAuthForAction(): Promise<{ user: User; supabase: SupabaseClient }>

// 統一的な権限チェック関数
export async function requireUserType(userType: 'model' | 'photographer' | 'organizer'): Promise<{ user: User; profile: Profile }>
export async function requireAdminRole(): Promise<{ user: User; profile: Profile }>

// 統一的なエラーレスポンス
export type AuthActionResult<T> = { success: true; data: T } | { success: false; error: string; code: string }
```

### 2. Server Components用認証ユーティリティ（拡張）

**ファイル**: `src/lib/auth/server.ts`（既存を拡張）

```typescript
// 既存: getCurrentUser(), requireAuth(), getCurrentUserProfile()

// 新規追加
export async function requireUserType(userType: 'model' | 'photographer' | 'organizer'): Promise<{ user: User; profile: Profile }>
export async function requireAdminRole(): Promise<{ user: User; profile: Profile }>
export async function getUserWithProfile(): Promise<{ user: User; profile: Profile | null } | null>
```

### 3. Client Components用認証フック（拡張）

**ファイル**: `src/hooks/useAuth.ts`（既存を拡張）

```typescript
// 既存: useAuth() - { user, loading, logout }

// 新規追加
export function useUserProfile(): { profile: Profile | null; loading: boolean }
export function useRequireAuth(): { user: User; loading: boolean }
export function useRequireUserType(userType: 'model' | 'photographer' | 'organizer'): { user: User; profile: Profile; loading: boolean }
```

### 4. 認証ガードコンポーネント（拡張）

**ファイル**: `src/components/auth/auth-guard.tsx`（既存を拡張）

```typescript
// 既存: AuthGuard

// 新規追加
export function UserTypeGuard({ userType, children }: { userType: 'model' | 'photographer' | 'organizer'; children: React.ReactNode })
export function AdminGuard({ children }: { children: React.ReactNode })
```

## 実装ステップ

### Phase 1: 基盤ユーティリティの作成

1. **Server Actions用認証ユーティリティ作成**

   - `src/lib/auth/server-actions.ts`を作成
   - `requireAuthForAction()`関数を実装
   - `requireUserType()`関数を実装
   - `requireAdminRole()`関数を実装
   - 統一的なエラーレスポンス型を定義

2. **Server Components用認証ユーティリティ拡張**

   - `src/lib/auth/server.ts`に新規関数を追加
   - `requireUserType()`関数を実装
   - `requireAdminRole()`関数を実装
   - `getUserWithProfile()`関数を実装（プロフィール取得の最適化）

3. **Client Components用認証フック拡張**

   - `src/hooks/useAuth.ts`に新規フックを追加
   - `useUserProfile()`フックを実装
   - `useRequireAuth()`フックを実装
   - `useRequireUserType()`フックを実装

4. **認証ガードコンポーネント拡張**

   - `src/components/auth/auth-guard.tsx`に新規コンポーネントを追加
   - `UserTypeGuard`コンポーネントを実装
   - `AdminGuard`コンポーネントを実装

### Phase 2: Server Actionsの統一化

1. **高優先度Server Actionsから順次置き換え**

   - `src/app/actions/payments.ts`
   - `src/app/actions/message.ts`
   - `src/app/actions/organizer-model.ts`
   - `src/app/actions/admin-system.ts`
   - `src/app/actions/bulk-photo-sessions.ts`

2. **置き換えパターン**
   ```typescript
   // Before
   const supabase = await createClient();
   const { data: { user }, error: authError } = await supabase.auth.getUser();
   if (authError || !user) {
     return { success: false, error: '認証が必要です' };
   }
   
   // After
   const authResult = await requireAuthForAction();
   if (!authResult.success) {
     return authResult;
   }
   const { user, supabase } = authResult.data;
   ```

3. **権限チェックの統一化**
   ```typescript
   // Before
   const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single();
   if (profile?.user_type !== 'organizer') {
     return { success: false, error: '運営者のみが利用できます' };
   }
   
   // After
   const typeResult = await requireUserType('organizer');
   if (!typeResult.success) {
     return typeResult;
   }
   const { user, profile } = typeResult.data;
   ```


### Phase 3: Server Componentsの統一化

1. **高優先度Server Componentsから順次置き換え**

   - `src/app/[locale]/admin/page.tsx`
   - `src/app/[locale]/admin/users/page.tsx`
   - `src/app/[locale]/admin/disputes/page.tsx`
   - `src/app/[locale]/subscription/page.tsx`
   - `src/app/[locale]/photo-sessions/[id]/reviews/page.tsx`

2. **置き換えパターン**
   ```typescript
   // Before
   const supabase = await createClient();
   const { data: { user }, error: authError } = await supabase.auth.getUser();
   if (authError || !user) {
     return <Alert>認証が必要です</Alert>;
   }
   
   // After
   const user = await getCurrentUser();
   if (!user) {
     redirect('/auth/signin');
   }
   ```

3. **権限チェックの統一化**
   ```typescript
   // Before
   const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
   if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
     return <Alert>管理者権限が必要です</Alert>;
   }
   
   // After
   const { user, profile } = await requireAdminRole();
   ```


### Phase 4: Client Componentsの統一化

1. **高優先度Client Componentsから順次置き換え**

   - 直接`createClient`を使用しているコンポーネントを特定
   - `useAuth`フックを使用するように置き換え

2. **置き換えパターン**
   ```typescript
   // Before
   const supabase = createClient();
   const { data: { user } } = await supabase.auth.getUser();
   
   // After
   const { user, loading } = useAuth();
   ```


### Phase 5: エラーメッセージの統一化

1. **多言語化対応**

   - `messages/ja.json`と`messages/en.json`に認証エラーメッセージを追加
   - 統一的なエラーメッセージキーを定義

2. **エラーメッセージの標準化**

   - 認証エラー: `auth.required`
   - 権限エラー: `auth.insufficientPermissions`
   - ユーザータイプエラー: `auth.invalidUserType`

### Phase 6: パフォーマンス最適化

1. **プロフィール取得の最適化**

   - 複数回のプロフィール取得を1回に統合
   - キャッシュ戦略の検討

2. **認証チェックの最適化**

   - 重複した認証チェックを削減
   - 認証状態のキャッシュ（適切な範囲で）

## 実装時の注意事項

### 1. 段階的な移行

- 一度にすべてを置き換えるのではなく、高優先度から順次実施
- 各Phase完了後に動作確認を実施

### 2. 後方互換性

- 既存の関数（`getCurrentUser()`、`useAuth()`など）は維持
- 新規関数は既存関数を内部で使用

### 3. エラーハンドリング

- 統一的なエラーレスポンス型を使用
- エラーメッセージは多言語化対応

### 4. 型安全性

- TypeScriptの型定義を適切に設定
- プロフィール型の統一

### 5. テスト

- 各ユーティリティ関数の単体テスト
- 統合テスト（認証フローの確認）

## 期待される成果

1. **コードの一貫性**: 認証チェックが統一され、保守性が向上
2. **パフォーマンス向上**: プロフィール取得の最適化により、重複クエリを削減
3. **エラーハンドリングの統一**: 一貫したエラーメッセージと処理
4. **開発効率向上**: 新しい機能実装時の認証チェックが簡潔に
5. **セキュリティ向上**: 認証チェックの漏れを防止

## 参考資料

- 既存実装: `src/lib/auth/server.ts`, `src/hooks/useAuth.ts`
- エラーハンドラー: `src/lib/server-action-error-handler.ts`
- 多言語化: `messages/ja.json`, `messages/en.json`

### To-dos

- [ ] 多言語化キーを追加（messages/ja.json, messages/en.json）