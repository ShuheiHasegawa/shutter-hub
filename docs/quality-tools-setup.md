# 品質向上ツール設定ガイド

このドキュメントでは、ShutterHub v2で導入している品質向上ツールの設定と使用方法を説明します。

## 📋 導入済みツール一覧

### 高優先度ツール

1. **Dependabot** - セキュリティパッチの自動検出
2. **CodeQL** - GitHub標準のセキュリティスキャン
3. **Lighthouse CI** - パフォーマンス劣化の早期検出

### 中優先度ツール

4. **SonarCloud** - コード品質の可視化
5. **Bundle Analyzer** - バンドルサイズの監視
6. **lint-staged拡張** - コミット前チェック強化

## 🔧 各ツールの設定と使用方法

### 1. Dependabot

**設定ファイル**: `.github/dependabot.yml`

**機能**:
- npm依存関係のセキュリティ更新を自動検出
- GitHub Actions依存関係の更新チェック
- 週次スケジュール実行（月曜日 09:00）

**使用方法**:
- 自動実行（設定不要）
- GitHubの「Security」タブでセキュリティアラートを確認

**注意事項**:
- `open-pull-requests: false` により、PRは作成されません
- セキュリティ更新のみ通知されます

### 2. CodeQL

**設定ファイル**: `.github/workflows/codeql.yml`

**機能**:
- JavaScriptコードのセキュリティ脆弱性検出
- 自動実行（push時 + 週次スケジュール）

**使用方法**:
- 自動実行（設定不要）
- GitHubの「Security」タブで結果を確認

**必要な設定**:
- 追加設定不要（GitHub標準機能）

### 3. Lighthouse CI

**設定ファイル**: 
- `.github/workflows/lighthouse.yml`
- `.lighthouserc.json`

**機能**:
- Core Web Vitals計測
- パフォーマンススコア監視
- アクセシビリティ・SEOスコアチェック

**使用方法**:
- 自動実行（mainブランチへのpush時）
- 手動実行: GitHub Actionsから「Lighthouse CI」ワークフローを実行

**目標スコア**:
- Performance: 90以上
- Accessibility: 95以上
- Best Practices: 95以上
- SEO: 95以上

**ローカル実行**:
```bash
# Lighthouse CIをローカルで実行（要インストール）
npm install -g @lhci/cli
lhci autorun
```

### 4. SonarCloud

**設定ファイル**: 
- `.github/workflows/sonarcloud.yml`
- `sonar-project.properties`

**機能**:
- コード品質の可視化
- バグ・脆弱性・コードスメルの検出
- 技術的負債の追跡

**セットアップ手順**:
1. [SonarCloud](https://sonarcloud.io/) にログイン
2. GitHubアカウントで連携
3. プロジェクトを作成（`shutter-hub-v2`）
4. GitHub Secretsに `SONAR_TOKEN` を追加
5. `sonar-project.properties` の `sonar.projectKey` を更新

**使用方法**:
- 自動実行（mainブランチへのpush時 + 週次スケジュール）
- SonarCloud Dashboardで結果を確認

**注意事項**:
- 初回実行前にSonarCloudプロジェクトの作成とトークン設定が必要
- 設定完了までは警告のみで実行は継続されます

### 5. Bundle Analyzer

**設定ファイル**: `next.config.ts`

**機能**:
- バンドルサイズの可視化
- 大きな依存関係の特定
- バンドル肥大化の検出

**使用方法**:
```bash
# 全バンドル分析
npm run analyze

# サーバーバンドルのみ分析
npm run analyze:server

# ブラウザバンドルのみ分析
npm run analyze:browser
```

**出力**:
- ブラウザで自動的にバンドル分析レポートが開きます
- 各チャンクのサイズと依存関係を可視化

**推奨事項**:
- 定期的に実行してバンドルサイズを監視
- 大きな依存関係は代替手段を検討

### 6. lint-staged拡張

**設定ファイル**: `package.json` の `lint-staged` セクション

**機能**:
- コミット前の自動チェック
- TypeScript型チェック
- ESLint + Prettier自動修正

**実行タイミング**:
- `git commit` 実行時（Husky経由）

**チェック内容**:
- JavaScript/TypeScript: ESLint + Prettier
- TypeScript: 型チェック
- JSON/CSS/Markdown: Prettier

**注意事項**:
- 型エラーがある場合はコミットがブロックされます
- 自動修正可能な問題は自動で修正されます

## 🚀 ワークフロー統合

すべてのツールはGitHub Actionsに統合されており、以下のタイミングで自動実行されます：

- **push時**: CodeQL、Lighthouse CI、SonarCloud
- **スケジュール実行**: CodeQL（週1回）、SonarCloud（週1回）
- **Dependabot**: 週次スケジュール（月曜日 09:00）

## 📊 結果の確認方法

### GitHub Actions
1. GitHubリポジトリの「Actions」タブを開く
2. 各ワークフローの実行結果を確認
3. 失敗した場合はログを確認

### GitHub Security
1. GitHubリポジトリの「Security」タブを開く
2. CodeQLとDependabotの結果を確認
3. セキュリティアラートを確認

### SonarCloud Dashboard
1. [SonarCloud](https://sonarcloud.io/) にログイン
2. プロジェクトを選択
3. コード品質メトリクスを確認

## 🔧 トラブルシューティング

### SonarCloudが動作しない
- `SONAR_TOKEN` がGitHub Secretsに設定されているか確認
- `sonar-project.properties` の `sonar.projectKey` が正しいか確認
- SonarCloudでプロジェクトが作成されているか確認

### Lighthouse CIが失敗する
- アプリケーションが正常に起動しているか確認
- ポート3000が使用可能か確認
- `.lighthouserc.json` の設定を確認

### Bundle Analyzerが開かない
- `ANALYZE=true` 環境変数が設定されているか確認
- ビルドが正常に完了しているか確認
- ブラウザのポップアップブロックを確認

## 📝 今後の拡張

### 低優先度ツール（将来検討）
- Codecov - テストカバレッジ可視化
- TypeDoc - APIドキュメント生成
- Snyk - 詳細なセキュリティスキャン

## 🎯 ベストプラクティス

1. **定期的な確認**: 週1回は各ツールの結果を確認
2. **早期対応**: セキュリティアラートは即座に対応
3. **パフォーマンス監視**: Lighthouseスコアの推移を追跡
4. **バンドルサイズ管理**: 定期的にBundle Analyzerを実行
5. **コード品質維持**: SonarCloudの指摘事項を改善

## 📚 参考リンク

- [Dependabot公式ドキュメント](https://docs.github.com/ja/code-security/dependabot)
- [CodeQL公式ドキュメント](https://codeql.github.com/docs/)
- [Lighthouse CI公式ドキュメント](https://github.com/GoogleChrome/lighthouse-ci)
- [SonarCloud公式ドキュメント](https://docs.sonarcloud.io/)
- [Bundle Analyzer公式ドキュメント](https://www.npmjs.com/package/@next/bundle-analyzer)

