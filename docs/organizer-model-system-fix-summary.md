# 運営所属モデルシステム修正作業 要約

## 概要
小日向ゆかアカウントでの招待表示問題から始まり、運営所属モデルシステム全体の修正を行った作業の要約。

## 発生していた問題

### 1. 招待が表示されない問題
- **現象**: モデル側ダッシュボードで招待通知が表示されない
- **原因**: RLSポリシーが`email`ベースの検索を許可していない
- **解決**: RLSポリシーを`model_id`と`email`の両方に対応するよう修正

### 2. 招待拒否時のエラー
- **現象**: `rejection_reason`カラムが存在しないエラー
- **原因**: テーブル構造とマイグレーションファイルの不一致
- **解決**: 不足カラム（`rejection_reason`, `invitation_message`, `responded_at`）の追加

### 3. CHECK制約エラー
- **現象**: `'rejected'`ステータスが制約違反でエラー
- **原因**: CHECK制約が`'rejected'`値を許可していない
- **解決**: 制約を`('pending', 'accepted', 'rejected', 'expired')`に更新

### 4. 招待承認後に所属モデルに反映されない問題
- **現象**: 招待承認後も運営側で所属モデルにカウントされない
- **原因**: `organizer_models`テーブルとトリガー関数が存在しない/不完全
- **解決**: テーブル作成、トリガー関数実装、アプリケーションコード修正

## 修正内容

### データベース修正

#### organizer_model_invitations テーブル
```sql
-- 追加されたカラム
ALTER TABLE organizer_model_invitations 
ADD COLUMN rejection_reason TEXT,
ADD COLUMN invitation_message TEXT,
ADD COLUMN responded_at TIMESTAMPTZ;

-- CHECK制約修正
ALTER TABLE organizer_model_invitations 
ADD CONSTRAINT organizer_model_invitations_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'));
```

#### organizer_models テーブル
```sql
-- 新規作成（完全版）
CREATE TABLE organizer_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    model_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active',
    joined_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,
    last_activity_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    -- 契約・統計関連カラムも含む
    UNIQUE(organizer_id, model_id)
);
```

#### トリガー関数
```sql
-- 招待承認時に自動で所属関係を作成
CREATE FUNCTION handle_invitation_acceptance()
CREATE TRIGGER trigger_invitation_acceptance
```

### アプリケーションコード修正

#### getModelInvitationsAction
- 冗長なデバッグクエリを削除
- 効率的な単一クエリ + inner join に最適化
- `organizer_profile` → `organizer` への型定義変更

#### acceptModelInvitationAction / rejectModelInvitationAction
- `accepted_at` → `responded_at` へのカラム名変更
- `model_id` 補完処理の追加

### RLSポリシー修正
```sql
-- emailベースの検索に対応
CREATE POLICY "organizer_model_invitations_model_policy" ON organizer_model_invitations
  FOR ALL USING (
    (auth.uid() = model_id AND user_type = 'model')
    OR
    (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND user_type = 'model'
        AND email = organizer_model_invitations.email
    ))
  );
```

## 最終的な動作フロー

1. **招待作成**: 運営者がモデルを招待（`email`と`model_id`を両方設定）
2. **招待表示**: モデル側ダッシュボードで招待通知が表示（RLS対応）
3. **招待承認**: モデルが承認すると`responded_at`が設定される
4. **所属関係作成**: トリガーが自動的に`organizer_models`テーブルにレコード作成
5. **所属表示**: 運営側で所属モデル一覧に表示される
6. **招待拒否**: 拒否理由と共に適切に処理される

## テーブル構造の課題と対応

### 既存の問題
- マイグレーションファイルと実際のテーブル構造の不一致
- `email`ベースと`model_id`ベースの混在設計

### 今回の対応
- 現在の構造を維持しつつ、不足機能を段階的に追加
- 両方の検索方法に対応するRLSポリシー
- 安全なデータ移行（`ON CONFLICT DO NOTHING`）

### 将来の改善案
- `email`ベースから`model_id`ベースへの統一
- マイグレーションファイルの整理統合
- テーブル構造の正規化

## 作成されたファイル

### マイグレーション
- `supabase/migrations/20250123000002_fix_organizer_model_system_final.sql`
  - 最終的な構成を再現可能な完全なマイグレーション

### ドキュメント
- `docs/organizer-model-system-fix-summary.md`（本ファイル）
  - 修正作業の完全な記録

## 注意事項

1. **RLSポリシー**: 手動でSupabase管理画面から実行が必要
2. **データ移行**: 既存データの整合性を保持
3. **型安全性**: TypeScript型定義も同時に更新
4. **パフォーマンス**: 複数クエリから単一クエリへの最適化

## 検証項目

- [x] 招待表示機能
- [x] 招待承認機能  
- [x] 招待拒否機能
- [x] 所属モデル自動作成
- [x] 所属モデル一覧表示
- [x] RLSポリシー動作確認
- [x] データ整合性確認

## 今後の保守について

このシステムは複数のコンポーネントが連携しているため、変更時は以下に注意：

1. **テーブル構造変更**: マイグレーションファイルの更新
2. **RLSポリシー変更**: 両方の検索方法への影響を考慮
3. **アプリケーションコード**: 型定義との整合性維持
4. **トリガー関数**: ビジネスロジックの変更時は関数も更新 