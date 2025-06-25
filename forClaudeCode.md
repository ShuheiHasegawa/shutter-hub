# Claude Code引き継ぎ用プロジェクト概要書

## 📋 プロジェクト概要

**ShutterHub v2** は、モデル・カメラマン・撮影会運営者をつなぐ統合型撮影会予約プラットフォームです。さらに、旅先での即座撮影リクエスト機能により「撮影業界のUber」として展開しています。

### 🎯 現在の開発状況
- **MVP完成度**: 95%
- **差別化機能**: 完成済み
- **フォトブック機能**: 完成
- **SNS機能**: 完成済み

## 🏗️ 技術スタック

### フロントエンド
- **Next.js** (v14.2.3) - App Router、Server Components優先
- **React** (v18) - UI ライブラリ
- **TypeScript** (v5.5.3) - 型安全性確保
- **Shadcn/ui** - UIコンポーネントライブラリ（Radix UI ベース）
- **Tailwind CSS** (v3.4.0) - ユーティリティファーストCSS

### バックエンド・データベース
- **Supabase** - 認証、PostgreSQL、ストレージ、リアルタイム
- **Row Level Security (RLS)** - データアクセス制御
- **Stripe** (v15.8.0) - 決済処理

### 開発ツール
- **TypeScript** - 型チェック
- **ESLint** + **Prettier** - コード品質
- **Jest** + **Playwright** - テスト
- **Vercel** - ホスティング

## 🗂️ 重要なディレクトリ構造

```
shutter-hub-v2/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/          # 多言語対応ルート
│   │   │   ├── (public)/      # 公開ルート
│   │   │   ├── admin/         # 管理者機能
│   │   │   ├── auth/          # 認証関連
│   │   │   ├── photo-sessions/ # 撮影会機能
│   │   │   ├── instant/       # 即座撮影リクエスト
│   │   │   ├── photobooks/    # フォトブック機能
│   │   │   └── messages/      # メッセージング
│   │   └── actions/           # Server Actions
│   ├── components/
│   │   ├── ui/                # Shadcn/ui コンポーネント
│   │   ├── photo-sessions/    # 撮影会関連コンポーネント
│   │   ├── instant/           # 即座撮影関連
│   │   ├── social/            # SNS機能
│   │   └── auth/              # 認証関連
│   ├── lib/
│   │   ├── supabase/         # Supabase設定
│   │   ├── utils/            # ユーティリティ
│   │   └── stripe/           # Stripe設定
│   └── types/                # TypeScript型定義
├── supabase/
│   └── migrations/           # データベースマイグレーション
├── messages/                 # 多言語化ファイル
│   ├── ja.json              # 日本語
│   └── en.json              # 英語
└── cursor/
    └── rules/
        └── dev-rules/       # 開発ルール・プロンプト
```

## 🚀 完成済み主要機能

### ✅ Phase 1: MVP基盤（完了）
- **認証システム** - Google/X/Discord OAuth、プロフィール管理
- **撮影会管理** - CRUD操作、画像アップロード、スロット制対応
- **予約システム** - 5種類（先着順・抽選・管理抽選・優先・キャンセル待ち）
- **多言語化** - 日本語・英語対応（next-intl）

### ✅ Phase 2: 差別化機能（完了）
- **即座撮影リクエスト** - ゲスト機能、位置ベースマッチング
- **エスクロー決済** - メルカリ型安全決済、写真配信システム
- **評価・レビューシステム** - 5段階評価、相互評価

### ✅ Phase 3: 高度機能（完了）
- **フォトブック機能** - 電子ブック表示、18種レイアウト
- **SNS型機能** - フォロー/アンフォロー、投稿、メッセージング
- **写真公開合意システム** - Tinder風UI、肖像権管理
- **管理者機能** - ダッシュボード、ユーザー管理

## 📋 重要なルールファイル

以下のファイルを必ず確認してください：

### 🔧 開発ルール
- `.cursor/rules/dev-rules/development.mdc` - **最重要**：開発ルール、コミット規則、多言語化ルール
- `.cursor/rules/dev-rules/ui-guide.mdc` - Shadcn/ui実装ガイド
- `.cursor/rules/dev-rules/techstack.mdc` - 技術スタック詳細

### 📋 プロジェクト管理
- `.cursor/rules/dev-rules/todo.mdc` - **タスク管理**（技術詳細なし、純粋なTODO）
- `.cursor/rules/dev-rules/project.mdc` - プロジェクト概要
- `.cursor/rules/dev-rules/implementation-plan.mdc` - 実装計画

### 🔐 機能別仕様
- `.cursor/rules/dev-rules/auth.mdc` - 認証システム実装詳細
- `.cursor/rules/dev-rules/prompts-booking.mdc` - 予約システム（5種類）
- `.cursor/rules/dev-rules/instant-photo-request.mdc` - 即座撮影リクエスト機能

## 🎯 現在の最高優先度タスク

### 🔴 t0-027: 基本E2Eテスト構築（品質保証）
- **期間**: 1-2週間
- **内容**: Playwright環境調整、認証・予約・決済フローの自動テスト
- **重要度**: リリース前の品質保証必須

## 🚨 重要な開発原則

### 1. **UI/UXデザイン保護ルール（絶対禁止）**
- **明示的な変更依頼がない限り、レイアウト・デザインの変更は絶対禁止**
- 許可される変更：バグ修正、アクセシビリティ改善のみ
- 禁止される変更：色、間隔、フォント、配置の変更

### 2. **開発ルール**
- **Server Components優先** - クライアントコンポーネントは必要時のみ
- **型安全性** - anyの使用禁止、unknownを活用
- **Shadcn/ui使用** - 一貫したUIコンポーネント
- **多言語化必須** - ハードコードされたテキスト禁止

### 3. **TODO管理ルール**
- 機能実装完了時は必ず `todo.mdc` を更新
- コミット＆プッシュ必須：`git commit -m "feat: [実装内容]"`
- 技術詳細は専門ファイルに分離

### 4. **ファイル分類ルール**
- `todo.mdc`: 純粋なタスク管理のみ
- 技術仕様：専門mdcファイル参照
- プログラムコード記載禁止

## 🔧 開発開始時のセットアップ手順

### 1. 環境確認
```bash
node --version  # 18.x以上
npm --version   # 10.x以上
```

### 2. 依存関係インストール
```bash
npm install
```

### 3. 環境変数設定
```bash
# .env.local を作成
cp .env.example .env.local
# Supabase、Stripe等の設定が必要
```

### 4. 開発サーバー起動
```bash
npm run dev
```

### 5. ビルドテスト
```bash
npm run build
```

## 📝 コミット規則

```
feat: [機能名] - [簡潔な説明]
fix: [修正内容]
docs: [ドキュメント更新内容]
refactor: [リファクタリング内容]
```

**例**：
```bash
git commit -m "feat: E2Eテスト基盤構築"
git push origin main
```

## 🔍 主要なファイル・コンポーネント

### 認証関連
- `src/lib/supabase/` - Supabase設定
- `src/components/auth/` - 認証コンポーネント

### 撮影会機能
- `src/app/[locale]/photo-sessions/` - 撮影会ページ
- `src/components/photo-sessions/` - 撮影会コンポーネント
- `src/app/actions/photo-session.ts` - Server Actions

### 即座撮影
- `src/app/[locale]/instant/` - 即座撮影ページ
- `src/components/instant/` - 即座撮影コンポーネント

### データベース
- `supabase/migrations/` - マイグレーションファイル
- `src/types/database.ts` - TypeScript型定義

## 🎯 次期実装予定

### 🟡 高優先度（2025年1月）
- 撮影会システム最適化（UX向上）
- 予約体験向上システム（推薦機能）

### 🟢 中優先度（2025年2-3月）
- モバイル最適化：PWA対応
- ゲーミフィケーション：バッジ・レベルシステム

## 📊 プロジェクト統計

- **総ファイル数**: 252+
- **実装済み機能**: 32/32 (100%)
- **コンポーネント数**: 97+
- **データベーステーブル**: 35+
- **総コード行数**: 26,200+
- **TypeScript型安全性**: 100%達成

## 🚀 Claude Code 開発開始時のチェックリスト

### ✅ 必須確認事項
1. **重要ルールファイル読み込み**
   - `development.mdc` - 開発ルール全般
   - `todo.mdc` - 現在のタスク状況
   - 該当する機能の専門mdcファイル

2. **現在の実装状況確認**
   - 最新のgit status確認
   - 未完了タスクの優先度確認
   - 依存関係の把握

3. **開発環境セットアップ**
   - Node.js 18.x以上
   - 依存関係インストール
   - 環境変数設定
   - ビルドテスト実行

4. **実装前の必須チェック**
   - UI/UXデザイン変更の有無確認
   - 既存機能との重複確認
   - 多言語化対応の準備
   - 型安全性の確保

### 🔧 開発時の注意点
- **明示的な指示なしのデザイン変更は絶対禁止**
- **技術詳細は専門ファイルを参照**
- **実装完了時は必ずTODO更新**
- **コミット＆プッシュ必須**

## 📚 追加リソース

### ドキュメント
- `docs/` - 各種セットアップ・実装ガイド
- `README.md` - プロジェクト基本情報

### テストデータ
- `supabase/test-data/` - テスト用データ
- `tests/` - テストファイル

この概要書により、Claude Codeでの開発を効率的に開始できます。不明点があれば、該当する専門ルールファイルを参照してください。 