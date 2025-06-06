# 管理者アカウント作成システム

ShutterHub v2の管理者アカウント作成・管理システムの説明と初期セットアップ手順

## 概要

管理者システムは3つの権限レベルを提供します：
- **user**: 一般ユーザー（デフォルト）
- **admin**: 管理者（争議解決、ユーザー管理）
- **super_admin**: スーパー管理者（全権限 + 他の管理者の管理）

## 初期セットアップ手順

### 1. データベースマイグレーション実行

新しく追加された管理者システムのマイグレーションを実行します：

```bash
# Supabase CLIを使用
npx supabase db push

# または、Supabaseダッシュボードで以下のSQLを実行
```

```sql
-- Migration: 012_add_admin_system
-- ユーザーロール列挙型を追加
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');

-- プロフィールテーブルにroleフィールドを追加
ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'user';

-- 以下、管理者招待・ログテーブル等の作成...
```

### 2. 初期スーパー管理者の作成

#### 方法A: Supabaseダッシュボード（推奨）

1. **アカウント作成**
   - 通常通りShutterHubにサインアップ
   - プロフィール設定を完了

2. **権限昇格**
   - [Supabaseダッシュボード](https://app.supabase.com)にログイン
   - プロジェクトを選択
   - 「Table Editor」→「profiles」テーブルを開く
   - 自分のアカウント（email）を見つける
   - `role`フィールドを`user`から`super_admin`に変更
   - 保存

3. **確認**
   - ShutterHubにログイン
   - `/admin/disputes`にアクセス
   - 管理者画面が表示されることを確認

#### 方法B: SQLクエリ実行

Supabaseダッシュボードの「SQL Editor」で実行：

```sql
-- 自分のメールアドレスを指定してスーパー管理者に昇格
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';
```

### 3. 初回ログイン確認

初期管理者作成後、以下を確認：

1. **管理画面アクセス**
   ```
   https://your-domain.com/admin/disputes
   ```

2. **表示される画面**
   - 争議管理ダッシュボード
   - 統計情報（総件数、未解決等）
   - 争議一覧（空の場合は「争議はありません」）

3. **ナビゲーション確認**
   - 「争議管理」タブ
   - 管理者メニューの表示

## 追加管理者の招待

初期管理者作成後は、WebUIから他の管理者を招待できます：

### 管理者招待機能の実装

管理者招待システムのServer Actionsは実装済みです：

```typescript
// src/app/actions/admin-system.ts
export async function inviteAdmin(
  email: string,
  role: 'admin' | 'super_admin'
): Promise<ActionResult<{ invitationToken: string }>>

export async function acceptAdminInvitation(
  invitationToken: string
): Promise<ActionResult<void>>
```

### 招待の流れ

1. **招待送信**（既存管理者）
   - 管理画面で「管理者を招待」
   - メールアドレスと権限レベルを指定
   - 招待トークンが生成される

2. **招待受諾**（被招待者）
   - 招待リンクをクリック
   - 既存アカウントでログイン（またはサインアップ）
   - 招待トークンで権限が自動付与

3. **招待管理**
   - アクティブな招待の確認
   - 期限切れ招待の削除
   - 招待履歴の閲覧

## 管理者画面の機能

### 争議解決システム

- **争議一覧**: 全争議の表示・検索・フィルタリング
- **詳細表示**: 争議内容、証拠資料、撮影詳細
- **解決処理**: 4パターンの解決方法
  - 全額返金（Stripe refund API）
  - 部分返金（金額指定返金）
  - カメラマン有利（PaymentIntent capture）
  - 両者協議（状態更新のみ）

### 統計ダッシュボード

```typescript
interface DisputeStats {
  total: number;              // 総争議件数
  pending: number;            // 未解決件数
  resolved: number;           // 解決済み件数
  avgResolutionTimeHours: number; // 平均解決時間
  refundRate: number;         // 返金率
}
```

### 管理者権限チェック

全ての管理者機能は厳格な権限チェックを実装：

```typescript
// 権限チェック例
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

if (!profile || !['admin', 'super_admin'].includes(profile.role || '')) {
  return { success: false, error: '管理者権限が必要です' };
}
```

## セキュリティ考慮事項

### Row Level Security (RLS)

```sql
-- 管理者招待: 管理者のみ閲覧・作成可能
CREATE POLICY "admin_invitations_admin_policy" ON admin_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
```

### アクティビティログ

全ての管理者アクションはログに記録：

```sql
INSERT INTO admin_activity_logs (
  admin_id,
  action,
  target_type,
  target_id,
  details
) VALUES (
  current_admin_id,
  'dispute_resolved',
  'dispute',
  dispute_id,
  jsonb_build_object('resolution_type', 'full_refund')
);
```

## 運用フロー

### 日常運用

1. **争議確認**
   - 毎日管理画面で未解決争議をチェック
   - 優先度（金額・経過時間）順に対応

2. **争議解決**
   - 証拠資料を確認
   - 関係者とのコミュニケーション
   - 適切な解決方法を選択・実行

3. **統計監視**
   - 解決時間の推移
   - 返金率の傾向
   - 争議原因の分析

### 管理者管理

1. **権限レビュー**
   - 定期的な管理者権限の見直し
   - 不要なアカウントの権限削除

2. **アクティビティ監視**
   - 管理者行動ログの確認
   - 異常なアクションの検出

## トラブルシューティング

### よくある問題

**Q: 管理画面にアクセスできない**
```
A: 以下を確認：
1. profilesテーブルのroleが'admin'または'super_admin'か
2. ログインしているアカウントが正しいか
3. データベースのRLSポリシーが正しく設定されているか
```

**Q: 争議解決でエラーが発生する**
```
A: 以下を確認：
1. Stripe APIキーが正しく設定されているか
2. PaymentIntentが有効な状態か
3. エスクロー決済レコードが存在するか
```

**Q: 招待機能が動作しない**
```
A: 以下を確認：
1. 招待者が適切な権限を持っているか
2. メール送信機能が設定されているか（今後実装）
3. 招待トークンが期限内か
```

## 今後の拡張

- **メール通知**: 招待メール、争議通知の自動送信
- **詳細な権限管理**: 機能別の細かい権限設定
- **監査ログ**: より詳細な操作履歴の記録
- **自動化**: 簡単な争議の自動解決

---

このシステムにより、安全で効率的な管理者運用が可能になります。初期セットアップ後は、WebUIから完全に管理できる仕組みが整っています。 