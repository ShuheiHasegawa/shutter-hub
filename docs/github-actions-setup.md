# GitHub Actions CI/CD セットアップガイド

## 概要

ShutterHub v2 では個人開発最適化されたCI/CDパイプラインを構築しています。本ガイドでは、GitHub Actions の設定とSecrets の管理方法を説明します。

## 🎯 特徴

### 個人開発最適化設計
- **プッシュブロックなし**: テスト失敗時も開発を妨げない
- **警告ベース**: 重要な問題のみアラート
- **詳細レポート**: 問題の詳細は Artifacts で確認
- **手動実行オプション**: 必要時にワークフローを手動起動

## 📋 必要なSecrets設定

GitHub リポジトリの Settings > Secrets and variables > Actions で以下を設定してください。

### Supabase関連
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Stripe関連
```
STRIPE_SECRET_KEY=sk_test_your-test-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-test-publishable-key
```

### Vercel関連
```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
```

### アプリケーション関連
```
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

## 🔧 ワークフロー一覧

### 1. E2Eテスト & 品質保証 (`.github/workflows/e2e-tests.yml`)

**トリガー**:
- `main` ブランチへの push
- 手動実行 (workflow_dispatch)

**実行内容**:
- 静的解析・型チェック
- E2Eテスト実行（Playwright）
- セキュリティスキャン
- 詳細レポート生成

**個人開発最適化**:
- 失敗してもワークフロー継続
- 警告レベルでの通知
- 詳細なサマリー表示

### 2. プロダクションデプロイ (`.github/workflows/deploy.yml`)

**トリガー**:
- `main` ブランチへの push（変更ファイル判定あり）
- 手動実行 (workflow_dispatch)

**実行内容**:
- デプロイ前チェック
- データベースマイグレーション確認
- Vercel デプロイ
- デプロイ後ヘルスチェック

**スキップ条件**:
- コミットメッセージに `[skip deploy]` が含まれる場合
- デプロイ対象外のファイルのみの変更

### 3. 週次メンテナンス (`.github/workflows/weekly-maintenance.yml`)

**トリガー**:
- 毎週日曜日 3:00 AM JST（自動実行）
- 手動実行 (workflow_dispatch)

**実行内容**:
- 依存関係更新チェック
- 包括的セキュリティスキャン
- システムヘルスチェック
- データベースヘルスチェック
- 軽量E2Eテスト

## 🚀 使用方法

### 通常の開発フロー

1. **コード変更を main ブランチにプッシュ**
   ```bash
   git add .
   git commit -m "feat: 新機能追加"
   git push origin main
   ```

2. **自動実行される内容**:
   - E2Eテスト & 品質保証ワークフロー
   - デプロイワークフロー（変更内容による）

3. **結果確認**:
   - GitHub Actions ページでワークフロー状況確認
   - 失敗時は Summary タブで詳細確認
   - Artifacts から詳細レポートダウンロード

### 手動実行

#### E2Eテストのみ実行
```
GitHub Actions → E2E Tests & Quality Assurance → Run workflow
- test_suite: 実行したいテストスイート選択
- browser: ブラウザ選択
- debug_mode: デバッグが必要な場合は true
```

#### デプロイのみ実行
```
GitHub Actions → Deploy to Production → Run workflow
- environment: production/staging 選択
- force_deploy: テスト失敗時も強制実行する場合は true
```

#### 週次メンテナンス手動実行
```
GitHub Actions → Weekly Maintenance & Health Check → Run workflow
- maintenance_type: 実行したいメンテナンス種類選択
```

## 📊 結果の確認方法

### 1. ワークフロー Summary
- 各ワークフロー実行の Summary タブで結果確認
- マークダウン形式の詳細レポート表示
- 個人開発最適化メッセージも含む

### 2. Artifacts
- テスト失敗時の詳細情報
- Playwright レポート（HTML形式）
- スクリーンショット・動画
- トレースファイル

### 3. ログ
- 各ステップの詳細ログ
- エラー・警告の詳細情報
- デバッグ情報（有効時）

## ⚠️ トラブルシューティング

### よくある問題

#### 1. Secrets 未設定エラー
```
Error: Required secret 'STRIPE_SECRET_KEY' is not set
```
**解決方法**: GitHub リポジトリの Secrets 設定を確認

#### 2. E2Eテスト失敗
```
Error: page.goto: net::ERR_CONNECTION_REFUSED
```
**解決方法**: 
- アプリケーション起動の確認
- ポート設定の確認（8888）
- 環境変数設定の確認

#### 3. デプロイ失敗
```
Error: Project not found
```
**解決方法**: Vercel の ORG_ID、PROJECT_ID を確認

### デバッグ方法

#### 1. 手動実行でのデバッグ
- workflow_dispatch でデバッグモード有効化
- 詳細ログで問題箇所特定

#### 2. ローカルでの再現
```bash
# E2Eテストをローカルで実行
MCP_ENABLED=true npm run test:e2e

# デプロイ前チェックをローカルで実行
npm run build
npm start
```

#### 3. 段階的な問題切り分け
1. 静的解析のみ実行
2. ビルドテストのみ実行
3. 特定のE2Eテストのみ実行

## 🔧 カスタマイズ

### ワークフロー設定の変更

#### テスト実行頻度の調整
```yaml
# .github/workflows/e2e-tests.yml
on:
  push:
    branches: [main]
    paths:
      - 'src/**'  # ソースコード変更時のみ
```

#### デプロイ条件の調整
```yaml
# .github/workflows/deploy.yml
# 特定ファイルの変更でデプロイスキップ
if echo "$CHANGED_FILES" | grep -qE "(docs/|README)"; then
  echo "ドキュメントのみの変更のため、デプロイをスキップ"
  exit 0
fi
```

#### メンテナンス頻度の変更
```yaml
# .github/workflows/weekly-maintenance.yml
schedule:
  - cron: '0 18 * * 0'  # 毎週日曜日 → 毎日に変更する場合は '0 18 * * *'
```

## 📈 継続的改善

### メトリクス監視
- ビルド時間の監視
- テスト実行時間の監視
- デプロイ成功率の監視

### 定期的な見直し
- 月次でワークフロー効率性をレビュー
- 不要なステップの削除
- 新しいツール・手法の導入検討

## 🔗 関連リンク

- [GitHub Actions ドキュメント](https://docs.github.com/en/actions)
- [Playwright ドキュメント](https://playwright.dev/)
- [Vercel デプロイメント](https://vercel.com/docs/deployments)
- [Supabase CLI](https://supabase.com/docs/reference/cli)

---

**更新日**: 2025年1月3日  
**バージョン**: v1.0  
**対象**: ShutterHub v2 個人開発最適化CI/CD