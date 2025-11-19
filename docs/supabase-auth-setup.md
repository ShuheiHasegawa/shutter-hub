# Supabase認証設定手順

このドキュメントでは、ShutterHub v2で使用するSupabase認証プロバイダーの設定手順を説明します。

## 目次

1. [Apple Sign In設定](#apple-sign-in設定)
2. [LINE設定](#line設定)
3. [2FA（TOTP）設定](#2fa-totp設定)
4. [セッション設定](#セッション設定)

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

## LINE設定

### 前提条件

- LINE Developersアカウント
- LINE Channelの作成

### 手順

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
   - 「Callback URL」に以下を追加:
     ```
     https://[your-project-ref].supabase.co/auth/v1/callback
     ```
   - 「Save」をクリック

4. **Supabase Dashboardで設定**
   - Supabase Dashboard → Authentication → Providers → LINE
   - 「Enable LINE」をONにする
   - 取得した情報を入力:
     - **Channel ID**: LINE Developers Consoleから取得
     - **Channel Secret**: LINE Developers Consoleから取得

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

### LINE

**問題**: 「Invalid redirect URI」エラー
- **解決策**: LINE Developers ConsoleのCallback URLとSupabaseのRedirect URLが一致しているか確認

**問題**: 「Invalid client」エラー
- **解決策**: Channel IDとChannel Secretが正しく入力されているか確認

### 2FA

**問題**: QRコードが表示されない
- **解決策**: TOTP methodが有効化されているか確認

**問題**: 認証コードが無効
- **解決策**: システム時刻が正確か確認（TOTPは時刻に依存）

## 参考リンク

- [Supabase Authentication Documentation](https://supabase.com/docs/guides/auth)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [LINE Login Documentation](https://developers.line.biz/en/docs/line-login/)
- [Supabase MFA Documentation](https://supabase.com/docs/guides/auth/auth-mfa)


