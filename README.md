# ShutterHub v2

撮影会予約システム - モデル、カメラマン、撮影会運営者をつなぐ統合型プラットフォーム

## 🎯 概要

ShutterHub v2は、撮影業界の三者（モデル、カメラマン、運営者）をつなぐ革新的なプラットフォームです。従来の撮影会予約システムに加え、「即座撮影リクエスト機能」により「撮影業界のUber」として展開します。

## ✨ 主要機能

### Phase 1 (MVP)
- 🔐 認証・アカウント管理
- 📅 撮影会管理・予約システム（先着順）
- 🔍 検索・フィルタリング機能
- 👤 ユーザープロフィール管理
- 📧 基本通知システム

### Phase 2 (拡張機能)
- 🎲 高度な予約システム（抽選、優先予約、キャンセル待ち）
- ⭐ 評価・レビューシステム
- 💳 決済機能（Stripe）
- 📊 ユーザーランクシステム

### Phase 3 (差別化機能)
- ⚡ 即座撮影リクエスト機能
- 📚 StudioWiki（スタジオ情報共有）
- 🤖 AI機能・推薦システム

### 管理者機能
- 🛡️ 争議解決システム（エスクロー決済管理）
- 👨‍💼 管理者権限管理（admin/super_admin）
- 📊 統計ダッシュボード
- 📝 アクティビティログ

## 🛠️ 技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript
- **UI**: Shadcn/ui + TailwindCSS
- **バックエンド**: Supabase (認証、DB、ストレージ)
- **決済**: Stripe
- **デプロイ**: Vercel
- **地図**: OpenStreetMap + Leaflet.js

## 🚀 開発環境セットアップ

### 前提条件
- Node.js 18.x以上
- npm 8.x以上

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/your-username/shutter-hub-v2.git
cd shutter-hub-v2

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local
# .env.localを編集して必要な環境変数を設定

# 開発サーバーを起動
npm run dev
```

### Supabase MCP連携のトラブルシューティング

(https://supabase.com/docs/guides/getting-started/mcp?queryGroups=os&os=mac)
Cursor内でSupabase MCP連携が動作しない場合は、以下の手順でアクセストークンを更新してください：

1. **パーソナルアクセストークンの生成**
   - [Supabase Dashboard - Access Tokens](https://supabase.com/dashboard/account/tokens)にアクセス
   - 「Generate new token」をクリック
   - 適切な権限を設定してトークンを生成

2. **MCP設定ファイルの更新**
   ```json
   // ~/.cursor/mcp.json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": ["-y", "@supabase/mcp-server-supabase@latest"],
         "env": {
           "SUPABASE_ACCESS_TOKEN": "新しく生成したトークンをここに設定"
         }
       }
     }
   }
   ```

3. **Cursorの再起動**
   - MCP設定の変更を反映させるため、Cursorを完全に再起動

> **注意**: service_roleキーではなく、パーソナルアクセストークン（`sbp_v0_`で始まる）を使用してください。

### 利用可能なスクリプト

```bash
npm run dev          # 開発サーバー起動（Turbopack使用）
npm run build        # プロダクションビルド
npm run start        # プロダクションサーバー起動
npm run lint         # ESLintチェック
npm run lint:fix     # ESLint自動修正
npm run format       # Prettier実行
npm run format:check # Prettierチェック
npm run type-check   # TypeScriptタイプチェック
```

## 📁 プロジェクト構成

```
src/
├── app/                 # Next.js App Router
├── components/          # Reactコンポーネント
│   ├── ui/             # Shadcn/ui基本コンポーネント
│   ├── layout/         # レイアウトコンポーネント
│   ├── auth/           # 認証関連
│   ├── profile/        # プロフィール関連
│   ├── photo-sessions/ # 撮影会関連
│   ├── booking/        # 予約関連
│   ├── search/         # 検索関連
│   ├── instant/        # 即座撮影関連
│   └── studio-wiki/    # StudioWiki関連
├── hooks/              # カスタムフック
├── lib/                # ユーティリティ・設定
│   ├── auth/          # 認証ライブラリ
│   ├── db/            # データベース関連
│   └── utils/         # ユーティリティ関数
├── types/              # TypeScript型定義
└── constants/          # 定数定義
```

## 🎨 デザインシステム

### カラーパレット
- **プライマリー**: #6F5091 (紫)
- **セカンダリー**: #101820 (ダークグレー)
- **アクセント**: #FF6B6B (赤)
- **成功**: #4ECDC4 (青緑)
- **警告**: #FFE66D (黄)
- **情報**: #4D96FF (青)

### フォント
- **日本語**: Noto Sans JP
- **英語**: Inter
- **アイコン**: Lucide React

## 📋 開発ルール

### コミットメッセージ
Conventional Commitsに従ってください：
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: フォーマット変更
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

### コードスタイル
- ESLint + Prettier設定済み
- pre-commitフックでコード品質を自動チェック
- TypeScript strict mode有効

## 📚 ドキュメント

詳細な設計ドキュメントは`rules/`ディレクトリを参照してください：
- `detailed-requirements.mdc` - 詳細要件定義
- `implementation-plan.mdc` - 実装計画書
- `system-requirements.mdc` - システム要件

### 管理者向けドキュメント
- [`docs/admin-setup.md`](./docs/admin-setup.md) - 管理者アカウント作成・セットアップ手順
- `/admin/disputes` - 争議解決管理画面
- `/admin/invite/[token]` - 管理者招待受諾画面

## 🤝 コントリビューション

1. フィーチャーブランチを作成
2. 変更を実装
3. テストを追加・実行
4. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🔗 関連リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn/ui Documentation](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
