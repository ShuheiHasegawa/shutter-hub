# ShutterHub v2 テストガイド

このドキュメントでは、ShutterHub v2のテスト環境とMCP連携について説明します。

## 📋 テスト概要

ShutterHub v2では以下のテストを実装しています：

- **E2E（End-to-End）テスト**: Playwrightを使用した統合テスト
- **コンポーネントテスト**: Jestを使用した単体テスト（今後実装予定）

## 🔗 MCP連携について

MCP（Model Context Protocol）連携により、E2Eテストを効率的に実行できます。

### MCP連携の利点

- **Supabaseプロジェクトとの自動連携**
- **テストデータの自動管理**
- **テスト環境の自動クリーンアップ**
- **CI/CD統合の簡素化**

## 🚀 MCP連携でのE2Eテスト実行

### 1. 基本的なMCP連携テスト

```bash
# 全てのE2Eテストを MCP連携で実行
npm run test:e2e:mcp

# ヘッドレスモードを無効にして実行（デバッグ用）
npm run test:e2e:mcp:headed

# デバッグモードで実行
npm run test:e2e:mcp:debug
```

### 2. 特定機能のテスト

```bash
# 認証セットアップのみ実行
npm run test:e2e:mcp:setup

# 予約システムのテストのみ実行
npm run test:e2e:mcp:booking

# エスクロー決済のテストのみ実行
npm run test:e2e:mcp:escrow
```

### 3. テスト結果の確認

```bash
# MCP環境でのテスト結果レポート表示
npm run test:e2e:mcp:report
```

## ⚙️ MCP環境設定

### 必要な環境変数

MCP連携でのテスト実行には以下の環境変数が必要です：

```bash
# MCP連携設定
MCP_ENABLED=true
MCP_TEST_ENVIRONMENT=true
MCP_AUTO_CLEANUP=true
MCP_TEST_DATA_SEED=true

# テスト用Supabase設定
TEST_SUPABASE_URL=your_test_supabase_url
TEST_SUPABASE_ANON_KEY=your_test_supabase_anon_key
TEST_SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key

# テスト用認証設定（OAuth対応）
# 注意: ShutterHub v2はOAuth専用（Google/X/Discord）のため、パスワード認証はありません
TEST_USER_EMAIL=test@shutterhub.app
# OAuth認証のため、パスワードは不要
# TEST_USER_PASSWORD=testpassword123  # ← この設定は不要

# テスト用OAuth設定（任意 - モック認証時に使用）
TEST_OAUTH_PROVIDER=google  # google, twitter, discord
TEST_OAUTH_MOCK_ENABLED=true
```

### 環境変数ファイルの設定

1. `tests/e2e/.env.test.example` をコピーして `.env.test` を作成
2. 実際のテスト環境の値を設定
3. MCP連携時に自動的に読み込まれます

## 🧪 テストの種類

### 1. 認証テスト (`auth.setup.ts`)

- Google OAuth認証
- X (Twitter) OAuth認証
- Discord OAuth認証
- 認証状態の保存
- **注意**: メール/パスワード認証は実装されていません（OAuth専用）

### 2. 予約システムテスト (`booking-systems.spec.ts`)

- 先着順予約
- 抽選予約
- 優先予約
- キャンセル待ち
- 管理者抽選

### 3. エスクロー決済テスト (`escrow-payment.spec.ts`)

- 即座撮影リクエスト
- 決済処理
- 写真配信
- 評価システム

## 🔧 MCP環境での動作

### 自動実行される処理

1. **環境変数の検証**: 必要な設定の確認
2. **データベースクリーンアップ**: 既存テストデータの削除
3. **テストデータシード**: 新しいテストデータの作成
4. **認証状態の確認**: テスト用ユーザーの認証状態確認
5. **テスト実行**: 各テストケースの実行
6. **クリーンアップ**: テスト後のデータ削除

### MCP特有の最適化

- **並列実行制御**: MCPモードでは1ワーカーに制限
- **タイムアウト延長**: MCP環境を考慮した長めの設定
- **詳細ログ出力**: デバッグしやすい詳細情報
- **ブラウザ制限**: Chrome中心の効率的なテスト

## 🐛 トラブルシューティング

### よくある問題

#### 1. 認証エラー

```bash
# 認証設定を再実行
npm run test:e2e:mcp:setup
```

**OAuth認証特有の問題**:
- OAuth認証は外部サービス依存のため、モック認証の使用を推奨
- 実際のGoogle/X/Discord認証は開発環境でのみ使用

#### 2. データベース接続エラー

- `TEST_SUPABASE_URL` と `TEST_SUPABASE_SERVICE_ROLE_KEY` を確認
- Supabaseプロジェクトのアクセス権限を確認

#### 3. テストタイムアウト

```bash
# タイムアウト時間を延長
PLAYWRIGHT_TIMEOUT=60000 npm run test:e2e:mcp
```

### デバッグ方法

1. **ヘッドレスモード無効化**:
   ```bash
   npm run test:e2e:mcp:headed
   ```

2. **デバッグモード**:
   ```bash
   npm run test:e2e:mcp:debug
   ```

3. **詳細ログ確認**:
   ```bash
   TEST_LOG_LEVEL=debug npm run test:e2e:mcp
   ```

## 📊 テスト結果

### 生成されるレポート

- **HTML レポート**: `test-results/html-report/`
- **JSON レポート**: `test-results/results.json`
- **JUnit レポート**: `test-results/results.xml`

### テスト成果物

- **スクリーンショット**: 失敗時のみ
- **ビデオ録画**: 失敗時のみ
- **トレース**: 初回リトライ時

## 🚀 CI/CD統合

MCP連携により、CI/CD環境でも同様のテスト環境を構築できます：

```bash
# CI環境での実行例
CI=true npm run test:e2e:mcp
```

## 📝 テスト追加ガイド

新しいテストを追加する場合：

1. `tests/e2e/` ディレクトリに `.spec.ts` ファイルを作成
2. MCP環境変数を考慮した実装
3. 適切なクリーンアップ処理の実装
4. このREADMEの更新

---

**注意**: 
- MCP連携はテスト環境専用です。本番環境では使用しないでください。
- ShutterHub v2はOAuth専用認証のため、メール/パスワード認証はサポートしていません。

## 🚀 クイックスタート

```bash
# 全テスト実行
npm run test:e2e

# デバッグモード（ブラウザ表示）
npm run test:e2e:ui

# 特定のテストのみ実行
npm run test:e2e:booking    # 予約システム
npm run test:e2e:escrow     # エスクロー決済
```

## 📁 ディレクトリ構成

```
tests/
├── e2e/
│   ├── auth.setup.ts              # 認証セットアップ
│   ├── global-setup.ts            # テスト環境初期化
│   ├── global-teardown.ts         # クリーンアップ処理
│   ├── booking-systems.spec.ts    # 予約システムテスト（455行）
│   ├── escrow-payment.spec.ts     # エスクロー決済テスト（350行）
│   ├── utils/
│   │   └── test-helpers.ts        # テストヘルパー関数
│   ├── .auth/                     # 認証状態保存（自動生成）
│   ├── fixtures/                  # テストデータ（自動生成）
│   └── .gitignore                 # テスト結果除外設定
└── README.md                      # このファイル
```

## 🧪 テスト対象

### 予約システム（5種類）
- **先着順予約**: 基本フロー、同時アクセス競合
- **抽選予約**: 応募〜結果発表
- **管理抽選**: 開催者手動選出
- **優先予約**: ランク別アクセス制御
- **キャンセル待ち**: 自動繰り上げ処理

### エスクロー決済システム
- **即座撮影フロー**: リクエスト〜決済〜配信〜確認
- **争議解決**: 申請〜管理者介入〜解決
- **決済統合**: Stripe連携、返金処理

## 🔧 よく使うコマンド

```bash
# 特定のテストケースのみ実行
npx playwright test -g "先着順予約"
npx playwright test -g "エスクロー決済"

# 特定のブラウザでテスト
npx playwright test --project=chromium
npx playwright test --project=firefox

# ヘッドレスモード無効（ブラウザ表示）
npx playwright test --headed

# スローモーション実行
npx playwright test --headed --slowMo=1000

# デバッグモード
npx playwright test booking-systems.spec.ts --debug
```

## 🔍 トラブルシューティング

### 認証エラー
```bash
# 認証状態をクリア
rm -rf tests/e2e/.auth
npm run test:e2e
```

### タイムアウトエラー
```bash
# タイムアウト時間を延長
npx playwright test --timeout=120000
```

### 要素が見つからない
- 動的コンテンツの読み込み待ちが不足している可能性
- `waitForSelector`や`waitForLoadState`を使用

## 📊 レポート確認

```bash
# HTMLレポート表示
npm run test:e2e:report
# ブラウザで test-results/index.html が開く
```

## 📚 詳細ドキュメント

詳細な情報は [`docs/e2e-testing.md`](../docs/e2e-testing.md) を参照してください。

---

**最終更新**: 2024年12月1日 