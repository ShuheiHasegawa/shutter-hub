# Supabase認証設定手順

このドキュメントでは、ShutterHub v2で使用するSupabase認証プロバイダーの設定手順を説明します。

## 目次

1. [Apple Sign In設定](#apple-sign-in設定)
2. [X (Twitter) ログイン設定](#x-twitter-ログイン設定)
3. [LINE設定](#line設定)
4. [2FA（TOTP）設定](#2fa-totp設定)
5. [セッション設定](#セッション設定)

## Apple Sign In設定

### 前提条件

- Apple Developerアカウント（有料）
- Services IDの作成
- Private Key（.p8ファイル）の生成

### 手順

1. **Supabase Dashboardにアクセス**
   - プロジェクトを選択
   - 左メニューから「Authentication」→「Providers」を選択

2. **Appleプロバイダーを有効化**
   - 「Apple」を選択
   - 「Enable Sign in with Apple」をONにする

3. **Apple Developerから取得した情報を入力**
   - **Services ID（Client ID）**: Apple Developer Consoleで作成したServices ID
   - **Team ID**: Apple DeveloperアカウントのTeam ID
   - **Key ID**: 生成したPrivate KeyのKey ID
   - **Private Key**: .p8ファイルの内容（`-----BEGIN PRIVATE KEY-----`から`-----END PRIVATE KEY-----`まで）

4. **Redirect URLを確認**
   - Supabaseが自動生成するRedirect URL: `https://[your-project-ref].supabase.co/auth/v1/callback`
   - このURLをApple Developer ConsoleのServices ID設定に登録

### Apple Developer Consoleでの設定

1. **Services IDを作成**
   - Apple Developer Console → Certificates, Identifiers & Profiles
   - Identifiers → Services IDs → 「+」ボタン
   - DescriptionとIdentifierを入力（例: `com.shutterhub.app`）

2. **Services IDを設定**
   - 作成したServices IDを選択
   - 「Sign in with Apple」を有効化
   - 「Configure」をクリック
   - Primary App IDを選択
   - Return URLsにSupabaseのRedirect URLを追加

3. **Private Keyを生成**
   - Keys → 「+」ボタン
   - Key Nameを入力（例: `ShutterHub Sign In Key`）
   - 「Sign in with Apple」にチェック
   - 「Configure」をクリックしてPrimary App IDを選択
   - 「Continue」→「Register」
   - **重要**: ダウンロードした.p8ファイルは一度しか表示されないため、安全に保管

## X (Twitter) ログイン設定

### 前提条件

- X（旧Twitter）Developerアカウント
- X Developer Portalでアプリの作成

### 手順

1. **X Developer Portalでアプリを作成**
   - [X Developer Portal](https://developer.twitter.com/)にログイン
   - 「Create Project」または既存のプロジェクトを選択
   - 「Create App」をクリック
   - App nameとUse caseを入力
   - 「Create」をクリック

2. **OAuth 2.0設定を有効化**
   - 作成したアプリを選択
   - 「Settings」タブに移動
   - 「User authentication settings」セクションで「Set up」をクリック
   - **App permissions**: 「Read and write」または「Read」を選択
     - ⚠️ **重要**: メールアドレス取得のため、「Read email address」の権限が有効になっていることを確認
   - **Type of App**: 「Web App, Automated App or Bot」を選択
   - **App info**: アプリ名、ウェブサイトURL、コールバックURLを入力

3. **Callback URLを設定**
   - **Callback URI / Redirect URL**に以下を追加:
     ```
     https://[your-project-ref].supabase.co/auth/v1/callback
     ```
   - 「Save」をクリック

4. **Client IDとClient Secretを取得**
   - 「Keys and tokens」タブに移動
   - **OAuth 2.0 Client ID**と**OAuth 2.0 Client Secret**を確認
   - **重要**: Client Secretは一度しか表示されないため、安全に保管

5. **Supabase Dashboardで設定**
   - Supabase Dashboard → Authentication → Providers → Twitter
   - 「Enable Twitter」をONにする
   - 取得した情報を入力:
     - **Client ID**: X Developer Portalから取得したOAuth 2.0 Client ID
     - **Client Secret**: X Developer Portalから取得したOAuth 2.0 Client Secret

### 注意事項

- X（Twitter）ログインはSupabaseの標準機能としてサポートされています
- OAuth 2.0を使用するため、X Developer PortalでOAuth 2.0設定を有効化する必要があります
- Client Secretは機密情報のため、安全に管理してください
- コールバックURLはSupabaseのRedirect URLと一致させる必要があります

### トラブルシューティング

**問題**: 「Invalid redirect URI」エラー
- **解決策**: X Developer PortalのCallback URLとSupabaseのRedirect URLが一致しているか確認

**問題**: 「Invalid client」エラー
- **解決策**: Client IDとClient Secretが正しく入力されているか確認

**問題**: 「Error getting user email from external provider」エラー
- **原因**: X Developer Portalでメールアドレス取得の権限が有効になっていない
- **解決策**:
  1. X Developer Portal → アプリの「Settings」→「User authentication settings」を開く
  2. 「App permissions」で「Read and write」または「Read」を選択
  3. 「Read email address」の権限が有効になっているか確認
  4. 設定を保存して再度認証を試す
  5. それでも解決しない場合は、X Developer Portalでアプリの承認状態を確認（承認待ちの可能性）

**問題**: OAuth 2.0設定が表示されない
- **解決策**: X Developer Portalでアプリのタイプが「Web App, Automated App or Bot」になっているか確認

## LINE設定

### ⚠️ 実装状況

**現在のステータス**: 後回し（未実装）

**理由**: Supabaseの標準機能にはLINEログインが含まれておらず、別途Supabase Edge Functionを使用したカスタム実装が必要です。実装には追加の開発工数とテストが必要なため、MVP段階では後回しとします。

### 実装に必要な手順

LINEログインを実装するには、以下の手順が必要です。詳細は[Supabaseで完結するLINEログイン実装!](https://zenn.dev/kota113/articles/79a75dac7236c0)を参照してください。

#### 1. 事前準備: PostgreSQL関数の作成

SupabaseのSQL Editorで、メールアドレスでユーザーを検索する関数を作成します。

```sql
CREATE OR REPLACE FUNCTION public.get_user_by_email (
  user_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT id
          FROM auth.users
          WHERE email = user_email
          LIMIT 1);
END;
$$;

-- 権限設定（service_roleのみ実行可能）
REVOKE EXECUTE ON FUNCTION public.get_user_by_email(TEXT) FROM anon, authenticated, public;
```

#### 2. Edge Functionの実装

**Webアプリ用**: `line-auth-web` Edge Functionを作成
- OAuth 2.0認証コードフローを実装
- LINEから受け取った認証コードを検証
- IDトークンを取得してユーザー情報を取得
- Supabase Admin APIでユーザーを作成/更新
- Magic linkを発行してセッションを取得
- セッショントークンをクライアントに返却

**ネイティブアプリ用**: `line-auth-native` Edge Functionを作成
- LINE SDKから受け取ったIDトークンを検証
- ユーザー情報を取得
- Supabase Admin APIでユーザーを作成/更新
- Magic linkを発行してセッションを取得
- セッショントークンをクライアントに返却

#### 3. フロントエンドの実装

**Webアプリ**:
- LINE認証エンドポイントへのリダイレクト処理
- コールバックページでの認証コード処理
- Edge Functionへのリクエスト送信
- 返却されたセッショントークンでSupabaseセッション設定

**ネイティブアプリ**:
- LINE SDKの統合
- IDトークンの取得
- Edge FunctionへのIDトークン送信
- 返却されたセッショントークンでSupabaseセッション設定

#### 4. 環境変数の設定

Supabase Edge Functionsの環境変数（Secrets）に以下を設定:

- `LINE_CHANNEL_ID`: LINE Developers ConsoleのChannel ID
- `LINE_CHANNEL_SECRET`: LINE Developers ConsoleのChannel Secret（Webアプリのみ）
- `LINE_REDIRECT_URI`: アプリのコールバックURL（Webアプリのみ）
- `SUPABASE_URL`: SupabaseプロジェクトのURL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseプロジェクトのservice_roleキー

#### 5. LINE Developers Consoleでの設定

1. **LINE Developers ConsoleでChannelを作成**
   - [LINE Developers Console](https://developers.line.biz/console/)にログイン
   - 「Create」→「Create a new channel」
   - Channel type: 「LINE Login」を選択
   - Channel nameとDescriptionを入力
   - 「Create」をクリック

2. **Channel情報を取得**
   - 作成したChannelを選択
   - 「Basic settings」タブから以下を確認:
     - **Channel ID**: チャネルID
     - **Channel Secret**: チャネルシークレット（「Issue」ボタンで表示）

3. **Callback URLを設定**
   - 「LINE Login」タブを選択
   - 「Callback URL」にアプリのコールバックURLを追加
   - 「Save」をクリック

### 実装のメリット

- ✅ SupabaseとLINEログインの併用: RLSやAuthなどSupabaseの恩恵を受けつつ、LINEログインを実装可能
- ✅ 高いセキュリティ: Client Secretなどの機密情報をフロントエンドに漏らすことなく、安全な認証フローを構築
- ✅ 柔軟性: Web/ネイティブを問わず、同じバックエンドロジックを再利用してLINEログインを導入可能

### 参考資料

- [Supabaseで完結するLINEログイン実装!](https://zenn.dev/kota113/articles/79a75dac7236c0) - 詳細な実装手順とコード例
- [LINE Login Documentation](https://developers.line.biz/en/docs/line-login/)

## 2FA（TOTP）設定

### 手順

1. **Supabase Dashboardにアクセス**
   - プロジェクトを選択
   - 左メニューから「Authentication」→「Settings」を選択

2. **Multi-Factor Authenticationを有効化**
   - 「Enable Multi-Factor Authentication」をONにする
   - TOTP methodを有効化

3. **設定オプション**
   - **Enrollment period**: ユーザーが2FAを設定できる期間（デフォルト: 無制限）
   - **Challenge period**: 2FAチャレンジの有効期間（デフォルト: 60秒）

### 注意事項

- 2FAはオプション機能として実装されています
- ユーザーは設定画面から2FAを有効/無効にできます
- バックアップコードの生成と表示機能を含みます

## セッション設定

### 手順

1. **Supabase Dashboardにアクセス**
   - プロジェクトを選択
   - 左メニューから「Authentication」→「Settings」を選択

2. **Session settingsを設定**
   - **JWT expiry**: `3600`秒（1時間）
   - **Refresh token rotation**: `Enabled`（推奨）
   - **Concurrent sessions**: `3`（複数デバイス対応）

### 推奨設定値

```yaml
session_settings:
  jwt_expiry: 3600  # 1時間
  refresh_token_rotation: true
  concurrent_sessions: 3
```

### セキュリティ考慮事項

- **JWT expiry**: 短すぎるとユーザー体験が悪化、長すぎるとセキュリティリスクが増加
- **Refresh token rotation**: トークン再利用攻撃を防ぐため有効化を推奨
- **Concurrent sessions**: ユーザーの利便性とセキュリティのバランスを考慮

## トラブルシューティング

### Apple Sign In

**問題**: 「Invalid client」エラー
- **解決策**: Services IDとRedirect URLの設定を確認

**問題**: 「Invalid key」エラー
- **解決策**: Private Keyの内容が正しくコピーされているか確認（改行を含む）

### X (Twitter)

**問題**: 「Invalid redirect URI」エラー
- **解決策**: X Developer PortalのCallback URLとSupabaseのRedirect URLが一致しているか確認

**問題**: 「Invalid client」エラー
- **解決策**: Client IDとClient Secretが正しく入力されているか確認

**問題**: OAuth 2.0設定が表示されない
- **解決策**: X Developer Portalでアプリのタイプが「Web App, Automated App or Bot」になっているか確認

### LINE

**注意**: LINEログインは現在未実装のため、以下のトラブルシューティングは実装後の参考として記載しています。

**問題**: 「Invalid redirect URI」エラー
- **解決策**: LINE Developers ConsoleのCallback URLとアプリのコールバックURLが一致しているか確認

**問題**: 「Invalid client」エラー
- **解決策**: Channel IDとChannel Secretが正しく設定されているか確認（Edge Functionの環境変数）

**問題**: Edge Functionでエラーが発生する
- **解決策**: 
  - `get_user_by_email`関数が正しく作成されているか確認
  - Edge Functionの環境変数が正しく設定されているか確認
  - service_roleキーが正しく設定されているか確認

### 2FA

**問題**: QRコードが表示されない
- **解決策**: TOTP methodが有効化されているか確認

**問題**: 認証コードが無効
- **解決策**: システム時刻が正確か確認（TOTPは時刻に依存）

## 参考リンク

- [Supabase Authentication Documentation](https://supabase.com/docs/guides/auth)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [X (Twitter) API Documentation](https://developer.twitter.com/en/docs)
- [LINE Login Documentation](https://developers.line.biz/en/docs/line-login/)
- [Supabase MFA Documentation](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabaseで完結するLINEログイン実装!](https://zenn.dev/kota113/articles/79a75dac7236c0) - LINEログイン実装の詳細ガイド


