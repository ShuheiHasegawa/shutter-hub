# ShutterHub v2 E2Eテストガイド

ShutterHub v2のE2Eテストは、Playwrightを使用して複雑な撮影会予約システム、エスクロー決済、リアルタイム機能を自動テストします。MCP連携により、Supabaseプロジェクトとの統合テストが可能です。

## 🚀 クイックスタート（MCP連携）

### 1. 環境変数設定

```bash
# MCP連携モードを有効化
export MCP_ENABLED=true

# ベースURL設定（ポート3002対応）
export PLAYWRIGHT_BASE_URL=http://localhost:3002

# OAuth設定（推奨：モック認証）
export TEST_OAUTH_PROVIDER=google
export TEST_OAUTH_MOCK_ENABLED=true

# Supabase設定（MCP経由で自動取得）
export NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxx
```

### 2. 基本テスト実行

```bash
# 推奨：MCP環境での基本テスト（ポート3002）
PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e:mcp

# ヘッドレス無効でブラウザ表示
PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e:mcp:headed

# デバッグモード（詳細ログ + ブラウザ表示）
PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e:mcp:debug
```

## 📋 テストコマンド一覧

### MCP連携専用コマンド

```bash
# 基本MCP連携テスト（バックグラウンド）
npm run test:e2e:mcp

# ブラウザ表示テスト（開発・デバッグ用）
npm run test:e2e:mcp:headed

# デバッグモード（詳細ログ + ブラウザ表示）
npm run test:e2e:mcp:debug

# 認証テストのみ実行
npm run test:e2e:mcp:setup

# 予約システムテストのみ実行
npm run test:e2e:mcp:booking

# エスクロー決済テストのみ実行
npm run test:e2e:mcp:escrow

# レポート生成
npm run test:e2e:mcp:report
```

### 標準コマンド（開発環境）

```bash
# 全テスト実行
npm run test:e2e

# ヘッドレス無効
npm run test:e2e:headed

# デバッグモード
npm run test:e2e:debug

# UI モード
npm run test:e2e:ui

# レポート表示
npm run test:e2e:report
```

## 🔧 MCP環境設定

### 重要な設定項目

```bash
# MCP連携モード
MCP_ENABLED=true

# ベースURL（開発サーバーのポートに応じて設定）
PLAYWRIGHT_BASE_URL=http://localhost:3002  # 通常ポート3000が使用されている場合
# または
PLAYWRIGHT_BASE_URL=http://localhost:3000  # ポート3000が空いている場合

# OAuth認証設定
TEST_OAUTH_PROVIDER=google          # google/twitter/discord
TEST_OAUTH_MOCK_ENABLED=true        # 推奨：モック認証

# テスト実行制御
PLAYWRIGHT_HEADLESS=false           # ブラウザ表示（デバッグ用）
PLAYWRIGHT_WORKERS=1                # 並列実行数（MCP環境では1推奨）
PLAYWRIGHT_RETRIES=2                # リトライ回数
```

### ポート自動検出

MCP環境では、開発サーバーが使用するポートが動的に変更される場合があります：

```bash
# ポート3000が使用されている場合、3002に自動変更
⚠ Port 3000 is in use, using available port 3002 instead.

# この場合、テスト実行時に正しいポートを指定
PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e:mcp
```

## 🎯 テスト対象機能

### Phase 1: 認証システム
- OAuth認証フロー（Google/X/Discord）
- プロフィール設定
- 認証状態の永続化

### Phase 2: 撮影会管理
- 撮影会作成・編集
- 公開/非公開設定
- 画像アップロード

### Phase 3: 予約システム
- 先着順予約
- 抽選予約
- 管理抽選
- 優先予約
- キャンセル待ち

### Phase 4: 即座撮影リクエスト
- ゲスト機能（認証不要）
- 位置ベースマッチング
- リアルタイム通知

### Phase 5: エスクロー決済
- Stripe決済フロー
- エスクロー保護
- 写真配信確認

## 🔍 デバッグ・トラブルシューティング

### よくある問題と解決法

#### 1. ポート接続エラー
```
Error: page.goto: net::ERR_ABORTED
```

**解決法**: 開発サーバーのポートを確認
```bash
# 開発サーバーの実際のポートを確認
npm run dev
# 表示されたポート（例：3002）をベースURLに設定
PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e:mcp
```

#### 2. 認証失敗
```
OAuth認証セットアップに失敗しました
```

**解決法**: モック認証を有効化
```bash
export TEST_OAUTH_MOCK_ENABLED=true
npm run test:e2e:mcp:setup
```

#### 3. タイムアウトエラー
```
Test timeout of 30000ms exceeded
```

**解決法**: MCP環境用タイムアウト延長
```bash
export PLAYWRIGHT_TIMEOUT=60000
npm run test:e2e:mcp
```

### デバッグ用ツール

```bash
# 詳細ログ出力
DEBUG=pw:* npm run test:e2e:mcp

# スクリーンショット付きテスト
PLAYWRIGHT_SCREENSHOT=on npm run test:e2e:mcp

# ビデオ録画
PLAYWRIGHT_VIDEO=on npm run test:e2e:mcp

# トレース記録
PLAYWRIGHT_TRACE=on npm run test:e2e:mcp
```

### レポート・ログ確認

```bash
# HTMLレポート表示
npm run test:e2e:report

# 結果ファイル確認
cat test-results/results.json
cat test-results/results.xml

# エラー時スクリーンショット
ls test-results/*.png
```

## 📊 CI/CD統合

### GitHub Actions設定例

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        env:
          MCP_ENABLED: true
          PLAYWRIGHT_BASE_URL: http://localhost:3000
          TEST_OAUTH_MOCK_ENABLED: true
        run: npm run test:e2e:mcp
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 🏗️ 今後の拡張予定

- [ ] 視覚回帰テスト追加
- [ ] パフォーマンステスト統合
- [ ] モバイル端末テスト拡張
- [ ] アクセシビリティテスト追加
- [ ] 負荷テスト連携

---

**最終更新**: 2024年12月
**対応バージョン**: Playwright 1.47.2, Next.js 15.3.2
**MCP連携**: 完全対応（自動ポート検出、OAuth専用認証） 