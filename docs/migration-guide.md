# Supabase マイグレーション管理ガイド

## 概要

ShutterHub v2では、Supabaseデータベースのスキーマ変更をマイグレーションファイルで管理しています。
MCP (Model Context Protocol) 接続により、マイグレーションの自動実行も可能です。

## ディレクトリ構造

```
src/lib/database/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_user_preferences.sql
│   └── ...
├── schema.sql (レガシー、参考用)
└── types.ts
```

## マイグレーションファイル命名規則

- `{番号}_{説明}.sql` 形式
- 番号は3桁のゼロパディング（001, 002, 003...）
- 説明は英語のスネークケース
- 例: `001_initial_schema.sql`, `002_add_user_preferences.sql`

## 使用方法

### 1. 手動実行（推奨）

```bash
# 全マイグレーション表示
npm run migrate

# 特定のマイグレーション表示
npm run migrate 001_initial_schema

# 初期スキーマのみ表示
npm run migrate:init
```

このコマンドは、SQLの内容を表示するだけです。実際の実行は手動で行います：

1. コマンド実行でSQLを表示
2. SQLをコピー
3. Supabase Dashboard > SQL Editor でペースト・実行

### 2. MCP自動実行（上級者向け）

```bash
# 環境変数設定が必要
export SUPABASE_ACCESS_TOKEN=your_access_token

# 全マイグレーション自動実行
npm run migrate:auto

# 特定のマイグレーション自動実行
npm run migrate:auto 001_initial_schema

# 初期スキーマのみ自動実行
npm run migrate:auto:init
```

## 環境変数設定

### 基本設定（.env.local）

```bash
# Supabase基本設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# MCP自動実行用（オプション）
SUPABASE_ACCESS_TOKEN=your_access_token
```

### アクセストークン取得方法

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. 右上のアバター → 「Account Settings」
3. 左サイドバー「Access Tokens」
4. 「Generate new token」
5. トークン名: `shutter-hub-v2-mcp`
6. 生成されたトークンをコピー（⚠️ 一度しか表示されません）

## 新しいマイグレーション作成

### 1. ファイル作成

```bash
# 次の番号のファイルを作成
touch src/lib/database/migrations/002_add_user_preferences.sql
```

### 2. マイグレーション内容記述

```sql
-- Migration: 002_add_user_preferences
-- Description: Add user preferences table
-- Created: 2024-01-XX

CREATE TABLE user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'ja' CHECK (language IN ('ja', 'en')),
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS設定
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

### 3. 実行

```bash
# 新しいマイグレーションを実行
npm run migrate 002_add_user_preferences
```

## ベストプラクティス

### 1. マイグレーションの原則

- **前方互換性**: 既存データを破壊しない
- **ロールバック可能**: 必要に応じて元に戻せる
- **小さな変更**: 一つのマイグレーションで一つの機能
- **テスト**: 本番適用前に開発環境でテスト

### 2. 危険な操作

```sql
-- ❌ 避けるべき操作
DROP TABLE existing_table;
ALTER TABLE users DROP COLUMN important_data;

-- ✅ 安全な操作
ALTER TABLE users ADD COLUMN new_field TEXT;
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);
```

### 3. RLS (Row Level Security)

新しいテーブルには必ずRLSを設定：

```sql
-- RLS有効化
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- 適切なポリシー設定
CREATE POLICY "policy_name" ON new_table
  FOR ALL USING (auth.uid() = user_id);
```

## トラブルシューティング

### よくある問題

1. **マイグレーション失敗**
   - SQLシンタックスエラーを確認
   - 依存関係（外部キー）を確認
   - RLS設定を確認

2. **環境変数エラー**
   - `.env.local`の設定を確認
   - 開発サーバーを再起動

3. **権限エラー**
   - アクセストークンの有効性を確認
   - プロジェクトIDが正しいか確認

### ログ確認

```bash
# Supabaseログ確認（MCP使用時）
# プロジェクトのログを確認してエラーを特定
```

## 参考リンク

- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security) 