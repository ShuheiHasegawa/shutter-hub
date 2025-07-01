# ShutterHub v2 E2Eテストガイド

ShutterHub v2のE2Eテストは、Playwrightを使用して複雑な撮影会予約システム、エスクロー決済、リアルタイム機能を自動テストします。MCP連携により、Supabaseプロジェクトとの統合テストが可能です。

## 🚀 クイックスタート（MCP連携）

### 1. 環境変数設定

```bash
# MCP連携モードを有効化
export MCP_ENABLED=true

# ベースURL設定（ポート3002対応）
export PLAYWRIGHT_BASE_URL=http://localhost:3002

# 🎭 推奨：モック認証使用（Google認証スキップ）
export TEST_OAUTH_PROVIDER=google
export TEST_OAUTH_MOCK_ENABLED=true

# Supabase設定（MCP経由で自動取得）
export NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxx
```

### 2. 基本テスト実行（推奨：モック認証）

```bash
# 🎭 推奨：モック認証でのテスト（Google認証自動スキップ）
PLAYWRIGHT_BASE_URL=http://localhost:3002 TEST_OAUTH_MOCK_ENABLED=true npm run test:e2e:mcp

# ヘッドレス無効でブラウザ表示（モック認証）
PLAYWRIGHT_BASE_URL=http://localhost:3002 TEST_OAUTH_MOCK_ENABLED=true npm run test:e2e:mcp:headed

# デバッグモード（詳細ログ + ブラウザ表示 + モック認証）
PLAYWRIGHT_BASE_URL=http://localhost:3002 TEST_OAUTH_MOCK_ENABLED=true npm run test:e2e:mcp:debug
```

### 3. 実際のOAuth認証を使用する場合（非推奨）

```bash
# ⚠️ 注意：実際のGoogle認証は手動操作が必要
PLAYWRIGHT_BASE_URL=http://localhost:3002 TEST_OAUTH_MOCK_ENABLED=false npm run test:e2e:mcp

# 実際のOAuth認証でのデバッグ（手動操作が必要）
PLAYWRIGHT_BASE_URL=http://localhost:3002 TEST_OAUTH_MOCK_ENABLED=false npm run test:e2e:mcp:debug
```

## 📋 テストコマンド一覧

### MCP連携専用コマンド

```bash
# 基本的なE2Eテスト実行
npm run test:e2e:mcp

# ヘッドレス無効（ブラウザ表示）
npm run test:e2e:mcp:headed

# デバッグモード（詳細ログ + ブラウザ表示）
npm run test:e2e:mcp:debug

# 認証テストのみ実行
npm run test:e2e:mcp:setup

# 予約システムテストのみ実行
npm run test:e2e:mcp:booking

# エスクロー決済テストのみ実行
npm run test:e2e:mcp:escrow

# HTMLレポート生成
npm run test:e2e:mcp:report
```

### 従来コマンド（MCP非対応）

```bash
# 通常のPlaywrightテスト
npx playwright test

# UIモード
npx playwright test --ui

# レポート表示
npx playwright show-report
```

## 🎭 モック認証システム

### モック認証の利点

- ✅ **完全自動化**: 手動操作不要
- ✅ **高速実行**: Google認証画面のスキップ
- ✅ **信頼性**: 外部サービス依存なし
- ✅ **デバッグ容易**: 認証状態を直接制御

### モック認証の仕組み

1. **LocalStorageに認証トークン設定**: `supabase.auth.token`
2. **モックユーザーデータ作成**: テスト用のユーザー情報
3. **カスタムイベント発火**: 認証状態変更を通知
4. **ページリロード**: 認証状態を反映

### モック認証設定

```bash
# モック認証有効化
export TEST_OAUTH_MOCK_ENABLED=true

# プロバイダー選択（Google/X/Discord）
export TEST_OAUTH_PROVIDER=google
```

## ⚙️ MCP環境設定

### 必須環境変数

```bash
# MCP連携
export MCP_ENABLED=true

# アプリケーション設定（ポート自動検出）
export PLAYWRIGHT_BASE_URL=http://localhost:3002

# 認証設定（推奨：モック認証）
export TEST_OAUTH_PROVIDER=google
export TEST_OAUTH_MOCK_ENABLED=true

# Supabase設定（MCP経由で自動取得可能）
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 自動ポート検出

開発サーバーが別のポートで起動している場合の対応：

```bash
# Next.jsが3002で起動している場合
PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e:mcp

# 他のポートの場合
PLAYWRIGHT_BASE_URL=http://localhost:XXXX npm run test:e2e:mcp
```

## 🧪 テスト対象機能

### Phase 1: 認証システム

- ✅ **モック認証フロー**: LocalStorage認証状態設定
- ✅ **OAuth認証フロー**: Google/X/Discord認証（手動操作時）
- ✅ **認証状態永続化**: Storage State保存
- ✅ **プロフィール設定**: 認証後のプロフィール作成

### Phase 2: 撮影会システム

- [ ] **撮影会作成フロー**: 5種類の予約タイプ対応
- [ ] **先着順予約**: リアルタイム在庫管理
- [ ] **抽選予約**: 応募・抽選・結果通知
- [ ] **管理者抽選**: 手動抽選システム
- [ ] **優先予約**: ユーザーランク別アクセス
- [ ] **キャンセル待ち**: 自動繰り上げシステム

### Phase 3: エスクロー決済システム

- [ ] **エスクロー決済フロー**: 安全な3者間決済
- [ ] **写真配信システム**: 決済完了後の写真配信
- [ ] **争議処理**: 管理者による争議解決
- [ ] **返金処理**: 自動・手動返金

### Phase 4: リアルタイム機能

- [ ] **即座撮影リクエスト**: 位置ベースマッチング
- [ ] **リアルタイム通知**: Supabase Realtime連携
- [ ] **チャット機能**: リアルタイムメッセージング

## 🔧 トラブルシューティング

### よくある問題と解決法

#### 1. ポート接続エラー

```bash
# エラー: ERR_CONNECTION_REFUSED
# 解決: ポート番号を確認して修正
PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e:mcp
```

#### 2. Google認証でテストが止まる

```bash
# 問題: Google認証画面で手動操作が必要
# 解決: モック認証を使用
TEST_OAUTH_MOCK_ENABLED=true npm run test:e2e:mcp
```

#### 3. 認証状態が保存されない

```bash
# 原因: 認証フロー未完了
# 解決: ヘッドレス無効でデバッグ
npm run test:e2e:mcp:debug
```

#### 4. Supabase接続エラー

```bash
# 原因: 環境変数未設定
# 解決: 正しい環境変数設定
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### 5. MCP環境でのタイムアウト

```bash
# 原因: MCP環境での処理遅延
# 解決: タイムアウト延長済み（60秒）
# デバッグ情報確認
npm run test:e2e:mcp:debug
```

### デバッグ情報の確認

1. **スクリーンショット**: `test-results/`フォルダ内
2. **HTMLレポート**: `npm run test:e2e:mcp:report`
3. **詳細ログ**: デバッグモード実行時のコンソール出力

## 📊 レポート機能

### HTMLレポート

```bash
# レポート生成
npm run test:e2e:mcp:report

# レポート表示
npx playwright show-report
```

### スクリーンショット

- **正常時**: 主要ステップのスクリーンショット
- **エラー時**: `test-results/auth-error.png`等のエラー画面
- **フルページ**: 問題の詳細確認用

## 🎯 推奨実行手順

### 日常開発での実行

```bash
# 1. 開発サーバー起動
npm run dev

# 2. ポート確認（通常3002）
echo "開発サーバー: http://localhost:3002"

# 3. モック認証でのE2Eテスト実行
PLAYWRIGHT_BASE_URL=http://localhost:3002 TEST_OAUTH_MOCK_ENABLED=true npm run test:e2e:mcp
```

### CI/CDでの実行

```bash
# GitHub Actions等での自動実行
MCP_ENABLED=true TEST_OAUTH_MOCK_ENABLED=true npm run test:e2e:mcp
```

### デバッグ時の実行

```bash
# ブラウザ表示で詳細確認
PLAYWRIGHT_BASE_URL=http://localhost:3002 TEST_OAUTH_MOCK_ENABLED=true npm run test:e2e:mcp:debug
```

---

## 📝 まとめ

ShutterHub v2のE2Eテストは、モック認証システムにより完全自動化されたテストを実現しています。MCP連携により、Supabaseプロジェクトとの統合テストが効率的に実行できます。

**推奨設定**: `TEST_OAUTH_MOCK_ENABLED=true` + `PLAYWRIGHT_BASE_URL=http://localhost:3002`

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