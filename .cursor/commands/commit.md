# Commit and Push

## Overview
ShutterHub の開発ルールに従って、機能実装完了時に適切なコミット&プッシュを実行します。

## ⚡ **実装効率化ルール（重要）**

### **ビルド実施タイミングの最適化**

```yaml
従来の問題:
  - 実装 → 即座にビルド確認 → 3-5分待機 → 進行が遅い

改善ルール:
  実装完了時:
    - 動作確認: 手動でブラウザ確認（ホットリロード活用）
    - ESLintチェック: 記述エラーのみ修正（10-20秒）
    - TODO更新: 完了タスクの更新

  コミット直前のみ:
    - ビルドテスト: npm run build（最終確認）
    - 型チェック: TypeScript型エラー確認
    - 全体チェック: ESLint警告レベルまで確認
```

**効果:**
- ⏱️ **開発速度向上**: ビルド待機時間を削減
- 🎯 **集中力維持**: 実装フローの中断を最小化
- ✅ **品質確保**: コミット直前に全チェック実施

## 🔄 **機能実装完了時の自動処理手順**

### **Step 1: 軽量ESLintチェック（実装完了時）**

**⚡ 効率化ルール適用: ビルドは後回し、記述エラーのみ修正**

```bash
# 記述エラーのみ確認（高速：10-20秒）
npx eslint src/ --format=compact 2>&1 | grep " error:" | head -20

# 自動修正可能なものは修正
npx eslint src/ --fix
```

**対応対象（即座修正）:**
- ❌ Syntax Errors（括弧の閉じ忘れ等）
- ❌ Critical Errors（useClient漏れ、必須props等）
- ❌ Reactルール違反（exhaustive-deps等）

**対応不要（コミット直前に対応）:**
- ⚠️ Warnings（未使用変数等）
- 📝 Style Issues（フォーマット等）

**動作確認:** 手動でブラウザ確認（ホットリロード活用）

### **Step 2: 開発サーバー停止**
```bash
# 現在のポート使用状況確認
lsof -ti:8888

# 開発サーバープロセス停止（必須）
lsof -ti:8888 | xargs kill -9

# 特定プロセスID停止（個別対応時）
# kill -9 [プロセスID]
```

### **Step 3: 調査コードのクリーンアップ**
以下の調査・デバッグ目的のコードを削除してください：
- [ ] console.log("調査用ログ") ※直接的なconsole出力のみ
- [ ] console.error("デバッグ詳細", error) ※直接的なconsole出力のみ  
- [ ] alert("テスト確認")
- [ ] 一時的なデータ構造変更
- [ ] テスト用の条件分岐

**保持すべきコード（削除不要）：**
- ✅ logger.info(), logger.error(), logger.debug() ※環境変数で制御可能
- ✅ 本番でも必要なエラーログ
- ✅ 運用監視に必要なログ出力
- ✅ パフォーマンス監視のログ
- ✅ セキュリティ監査のログ

**Logger使用ガイドライン：**
```typescript
// ✅ 適切なlogger使用（保持推奨）
logger.info('User login successful', { userId: user.id });
logger.error('Database connection failed', error);
logger.debug('Processing payment', { amount, currency });

// ❌ 削除すべき直接console使用
console.log('デバッグ用の一時的なログ');
console.error('調査中のエラー詳細:', JSON.stringify(error, null, 2));
```

### **Step 4: 【必須】TODO更新**
`.cursor/rules/dev-rules/todo.mdc` を必ず更新：
- [ ] 完了した機能を [ ] → [x] に変更
- [ ] 実装時間・技術成果を詳細に記録
- [ ] Phase完了状況を正確に反映
- [ ] 次期タスクの優先度を調整
- [ ] **禁止**: プログラムコード・技術詳細の記載（専門ファイルへ）

### **Step 5: マイグレーション統合**
新しいマイグレーションがある場合：
- [ ] `supabase/migrations/` の最新マイグレーション確認
- [ ] MCP連携でマイグレーション適用完了確認
- [ ] 関連するTypeScript型定義の更新確認

## 🔧 **ビルド・最終チェック（コミット直前のみ）**

**⚡ 効率化ルール: ここで初めてビルドテストを実施**

### **Step 1: TypeScript型チェック**
```bash
# 型エラー確認（高速）
npx tsc --noEmit
```

### **Step 2: ESLint最終確認**
```bash
# 警告レベルまで全チェック
npx eslint src/ --format=compact --max-warnings=0
```

### **Step 3: ビルドテスト**
```bash
# 本番環境ビルドテスト
npm run build

# Vercel本番環境ビルドテスト（推奨）
npx vercel build
```

**エラーがないことを確認してください。**
Vercelビルドは本番環境と完全に同じ条件でテストできます。

## 🚀 **コミット実行**

### **コミットメッセージ形式**
```
[type]: [変更内容の日本語要約]

[詳細説明]
- [変更点1]
- [変更点2]
- [変更点3]
```

### **Types**
- `feat`: 新機能追加
- `fix`: バグ修正
- `refactor`: リファクタリング
- `style`: スタイル・UI調整
- `docs`: ドキュメント更新
- `test`: テスト追加・修正
- `chore`: その他の変更
- `db`: データベーススキーマ変更
- `migration`: マイグレーション追加・更新

### **実行コマンド**
```bash
# 1. 全ての変更をステージング
git add .

# 2. 日本語でのコミット（必須）
git commit -m "feat: [実装した機能の日本語要約]"

# 3. リモートリポジトリにプッシュ（必須）
git push origin main
```

## 📋 **コミット前必須チェックリスト**

### **プロセス管理**
- [ ] npm run devプロセスが停止されているか
- [ ] ポート8888が解放されているか
- [ ] バックグラウンドプロセスが残っていないか

### **コード品質（実装完了時）**
- [ ] ESLint記述エラーなし（npx eslint --format=compact | grep error）
- [ ] 手動での動作確認完了（ブラウザでホットリロード確認）
- [ ] logger使用確認（console.log直接出力なし）
- [ ] 調査コードのクリーンアップ完了

### **最終チェック（コミット直前）**
- [ ] TypeScript型チェック（npx tsc --noEmit）成功
- [ ] ESLint最終確認（--max-warnings=0）成功
- [ ] ビルドテスト（npm run build）成功
- [ ] Vercelビルドテスト成功（重要な変更時）

### **ドキュメント**
- [ ] TODO.mdcが更新されているか
- [ ] 実装時間・技術成果が記録されているか
- [ ] 変更内容が適切に記録されているか

## ✅ **良いコミットメッセージ例**

```bash
git commit -m "feat: カレンダーコンポーネント実装

ダッシュボードページに撮影会カレンダー表示機能を追加
- Shadcn/ui Calendarコンポーネント使用
- レスポンシブデザイン対応
- 多言語化対応実装"

git commit -m "fix: スタジオ作成ページのSelect.Item空文字列エラー修正

Select.Itemのvalue=\"\"をvalue=\"all\"に変更
- studios/page.tsxの都道府県フィルター修正
- studio.tsのフィルター処理でall値対応
- 一時的な定数フォールバック追加"
```

## ❌ **悪いコミットメッセージ例**

```bash
git commit -m "fix"
git commit -m "update files"
git commit -m "WIP"
git commit -m "Fixed various bugs and added features"
```

## 🎯 **コミット・プッシュのタイミング**

### **必須実行タイミング**
- 機能実装完了時
- TODO更新完了時
- バグ修正完了時
- 型エラー修正完了時
- Phase完了時

### **分割コミット判断基準**
以下の場合は複数回に分けてコミット：
- 機能追加とバグ修正が混在
- フロントエンドとバックエンドの大幅変更
- データベーススキーマ変更と型定義更新
- 設定ファイル変更とソースコード変更

### **統合コミット対象**
以下は1つのコミットにまとめる：
- 同一機能の関連ファイル群
- 型定義とその使用箇所
- ドキュメントとその関連実装

## 🚨 **調査段階のコード（コミット不要）**

### **調査完了後の必須作業**
1. **一時的な調査コード削除**
   - 直接的なconsole.log/console.errorの削除
   - テスト用alertの削除
   - 一時的な詳細エラー出力の削除
   - **logger.xxx()は保持** ※環境変数制御のため削除不要

2. **クリーンな実装復元**
   - 本来のシンプルな実装に復元
   - パフォーマンス重視の処理に戻す
   - 一括処理の復活

3. **クリーンアップ後コミット**
   - 一時的な調査コードなしの状態で記録
   - 適切なlogger使用は維持
   - "fix: [問題の修正内容]"でコミット

## 📅 **日付・タイムスタンプ管理**

### **マイグレーションファイル作成時**
```bash
# タイムスタンプ取得
date +"%Y%m%d%H%M%S"

# ファイル名形式
[timestamp]_[snake_case_description].sql
# 例: 20250718115321_create_user_storage_bucket.sql
```

### **ドキュメント作成時**
```bash
# 現在日付取得
date +"%Y-%m-%d"

# 履歴形式
- **YYYY-MM-DD**: 変更内容の詳細
```

## 🔧 **自動化スクリプト（推奨）**

package.jsonに以下のスクリプトを追加：
```json
{
  "scripts": {
    "dev:stop": "lsof -ti:8888 | xargs kill -9 || true",
    "dev:clean": "npm run dev:stop && npm run dev",
    "commit:safe": "npm run dev:stop && npm run build && git add . && echo 'Ready for commit - please run: git commit -m \"your message\"'",
    "vercel:build": "vercel build",
    "vercel:check": "tsc --noEmit && eslint . --ext .ts,.tsx --max-warnings 0 && vercel build",
    "deploy:safe": "npm run vercel:check && git push origin main"
  }
}
```

## 🎯 **最終確認**

コミット実行前に以下を必ず確認：
- [ ] 全ての必須手順が完了している
- [ ] TODO.mdcが最新状態に更新されている
- [ ] ビルドエラーがない
- [ ] 開発サーバーが停止している
- [ ] 適切なコミットメッセージが準備されている

**重要**: 機能実装完了後は必ずこのコマンドを実行してください。TODO更新とコミット・プッシュは開発フローの必須要素です。
