# Supabase プロジェクト設定手順

## 1. Supabaseプロジェクト作成

1. [Supabase](https://supabase.com)にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインイン
4. 「New project」をクリック
5. プロジェクト名: `shutter-hub-v2`
6. データベースパスワードを設定
7. リージョン: `Northeast Asia (Tokyo)`を選択
8. 「Create new project」をクリック

## 2. データベーススキーマ設定

1. Supabaseダッシュボードの「SQL Editor」に移動
2. `src/lib/database/schema.sql`の内容をコピー&ペースト
3. 「Run」をクリックしてスキーマを実行

## 3. 認証プロバイダー設定

### 3.1 Email認証設定

1. 「Authentication」→「Settings」に移動
2. 「Email Auth」を有効化
3. 「Confirm email」を有効化（本番環境）

### 3.2 Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクト作成
2. 「APIs & Services」→「Credentials」に移動
3. 「Create Credentials」→「OAuth 2.0 Client IDs」
4. Application type: `Web application`
5. Authorized redirect URIs: `https://[your-project-ref].supabase.co/auth/v1/callback`
6. Client IDとClient Secretをコピー
7. Supabaseの「Authentication」→「Providers」→「Google」で設定

### 3.3 X (Twitter) OAuth設定

1. [Twitter Developer Portal](https://developer.twitter.com/)でアプリ作成
2. OAuth 2.0設定を有効化
3. Callback URL: `https://[your-project-ref].supabase.co/auth/v1/callback`
4. Client IDとClient Secretをコピー
5. Supabaseの「Authentication」→「Providers」→「Twitter」で設定

### 3.4 Discord OAuth設定

1. [Discord Developer Portal](https://discord.com/developers/applications)でアプリ作成
2. 「OAuth2」→「General」に移動
3. Redirects: `https://[your-project-ref].supabase.co/auth/v1/callback`
4. Client IDとClient Secretをコピー
5. Supabaseの「Authentication」→「Providers」→「Discord」で設定

### 3.5 LINE OAuth設定

1. [LINE Developers Console](https://developers.line.biz/)でチャネル作成
2. 「LINE Login」チャネルを作成
3. Callback URL: `https://[your-project-ref].supabase.co/auth/v1/callback`
4. Channel IDとChannel Secretをコピー
5. Supabaseの「Authentication」→「Providers」→「LINE」で設定

## 4. ストレージ設定

1. 「Storage」に移動
2. 「Create a new bucket」をクリック
3. Bucket名: `avatars`（プロフィール画像用）
4. Public bucketを有効化
5. 「Create bucket」をクリック
6. 同様に`photo-sessions`バケットを作成（撮影会画像用）

## 5. 環境変数設定

1. Supabaseダッシュボードの「Settings」→「API」に移動
2. 以下の値をコピー:
   - Project URL
   - anon public key
   - service_role key

3. `.env.local`ファイルを作成:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 6. RLS (Row Level Security) 確認

データベーススキーマ実行後、以下のポリシーが設定されていることを確認:

- `profiles`テーブル: ユーザーは自分のプロフィールを編集可能、他のプロフィールは閲覧のみ
- `photo_sessions`テーブル: 公開された撮影会は誰でも閲覧可能、主催者は自分の撮影会を管理可能
- `bookings`テーブル: ユーザーは自分の予約を管理可能、主催者は自分の撮影会の予約を閲覧可能

## 7. 動作確認

1. Next.jsアプリを起動: `npm run dev`
2. ブラウザで http://localhost:8888 にアクセス
3. 認証機能が正常に動作することを確認

## トラブルシューティング

### よくある問題

1. **認証エラー**: OAuth設定のCallback URLが正しいか確認
2. **データベースエラー**: スキーマが正しく実行されているか確認
3. **環境変数エラー**: `.env.local`の値が正しいか確認

### ログ確認

- Supabaseダッシュボードの「Logs」でエラーログを確認
- ブラウザの開発者ツールでクライアントサイドエラーを確認 