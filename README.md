# ShutterHub

撮影会予約システム - モデル、カメラマン、撮影会運営者をつなぐ統合型プラットフォーム

## 🎯 概要

ShutterHubは、撮影業界の三者（モデル、カメラマン、運営者）をつなぐ革新的なプラットフォームです。従来の撮影会予約システムに加え、「即座撮影リクエスト機能」により「撮影業界のUber」として展開します。

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

## 📊 パフォーマンス監視・ログ出力システム

ShutterHub v2では、開発効率とパフォーマンス最適化のために統合されたログ出力・監視システムを提供しています。

### 🎯 システム概要

#### **統合クエリラッパー**
- **ファイル**: `src/lib/supabase/query-wrapper.ts`
- **監視システム**: `src/lib/utils/query-performance-monitor.ts`
- **機能**: 全てのSupabaseクエリを統一的に監視・ログ出力
- **利点**: 実行時間、成功/失敗率、キャッシュヒット率の自動追跡

```typescript
// 使用例
import { executeQuery, executeParallelQueries } from '@/lib/supabase/query-wrapper';

// 単一クエリ
const profile = await executeQuery('fetchProfile', 
  (supabase) => supabase.from('profiles').select('*').eq('id', userId).single()
);

// 並列クエリ
const results = await executeParallelQueries({
  profile: { operation: 'fetchProfile', queryBuilder: (supabase) => ... },
  stats: { operation: 'fetchStats', queryBuilder: (supabase) => ... }
});
```

#### **リアルタイムパフォーマンスダッシュボード**
- **ファイル**: `src/components/dev/performance-dashboard.tsx`
- **表示位置**: 画面右下（開発環境のみ）
- **機能**: API呼び出し統計、レスポンス時間、成功率をリアルタイム表示

#### **ログレベル別出力**
```typescript
import { logger } from '@/lib/utils/logger';

// 開発時のデバッグ情報
logger.info('処理開始', { userId, timestamp: new Date().toISOString() });

// 警告レベル（重要な状態変化）
logger.warn('重複実行検出', { operation: 'fetchData', userId });

// エラーレベル（問題発生時）
logger.error('API呼び出し失敗', error, { context: 'userProfile' });
```

### 🔧 開発者向け活用方法

#### **1. パフォーマンス問題の特定**
- ダッシュボードで遅いクエリを即座に特定
- 重複実行やN+1問題の自動検出
- キャッシュ効率の可視化

#### **2. デバッグ効率化**
```bash
# 開発環境でのログ有効化
export NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=true
npm run dev

# ログ出力例
🔄 [ProfilePage] loadOrganizerModels called
🚨 [ServerAction] getOrganizersOfModelAction CALLED
✅ [QueryWrapper] executeQuery completed: fetchProfile (245ms)
```

#### **3. 本番環境での監視**
- 環境変数 `NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=false` で詳細ログを自動抑制
- 重要なエラーのみ本番ログに出力
- パフォーマンス統計は継続収集

### 📈 監視対象メトリクス

| メトリクス | 説明 | 活用方法 |
|-----------|------|----------|
| **API呼び出し回数** | 総実行回数・成功/失敗数 | 重複実行の検出 |
| **レスポンス時間** | 平均・最小・最大時間 | パフォーマンスボトルネック特定 |
| **キャッシュヒット率** | SWRキャッシュの効率性 | キャッシュ戦略最適化 |
| **エラー率** | 失敗したクエリの割合 | 信頼性向上 |

### 🛠️ カスタマイズ方法

#### **新しいクエリの監視追加**
```typescript
// 既存のuseProfile.tsパターンに従う
async function fetchCustomData(id: string) {
  return await executeQuery<CustomData>(
    'fetchCustomData',  // 操作名（ダッシュボードで表示）
    (supabase) => supabase.from('custom_table').select('*').eq('id', id),
    { detailed: true }  // 詳細ログ有効
  );
}
```

#### **コンポーネントレベル監視**
```typescript
// UserScheduleManager.tsx のキャッシングパターンを参考
const cacheRef = useRef<{ userId: string; data: unknown; timestamp: number } | null>(null);
const CACHE_TTL = 60000; // 60秒

// 重複実行防止ロジック
if (cacheRef.current && cacheRef.current.userId === userId && 
    Date.now() - cacheRef.current.timestamp < CACHE_TTL) {
  logger.info('Using cached data');
  return cacheRef.current.data;
}
```

### 🎯 トラブルシューティング

#### **よくある問題と解決法**
1. **POST連続実行**: `useEffect` 依存配列の見直し、`useRef` フラグによる重複防止
2. **React Strict Mode**: 開発環境での二重実行を考慮した実装
3. **SWRキャッシュ競合**: 適切なキー設計と `dedupingInterval` 設定

#### **デバッグ手順**
1. パフォーマンスダッシュボードで異常値を確認
2. ログ出力で実行フローを追跡
3. `query-wrapper.ts` の統計情報で根本原因を特定
4. キャッシング戦略で最適化

このシステムにより、開発効率の向上とパフォーマンス問題の早期発見が可能になります。

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

# E2Eテスト
npm run test:e2e           # 全E2Eテスト実行
npm run test:e2e:ui        # UIモード（デバッグ用）
npm run test:e2e:headed    # ヘッドレスモード無効（デバッグ用）
npm run test:e2e:debug     # デバッグモード
npm run test:e2e:report    # テストレポート表示

# 機能別E2Eテスト
npm run test:auth          # 認証・権限管理テスト
npm run test:studios       # スタジオ機能テスト
npm run test:dashboard     # ダッシュボード機能テスト
npm run test:instant       # 即座撮影機能テスト
npm run test:dev           # 開発・デバッグ用テスト
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
│   └── studio/         # スタジオ関連
├── hooks/              # カスタムフック
├── lib/                # ユーティリティ・設定
│   ├── auth/          # 認証ライブラリ
│   ├── db/            # データベース関連
│   └── utils/         # ユーティリティ関数
├── types/              # TypeScript型定義
└── constants/          # 定数定義
tests/
├── e2e/                # E2Eテスト
│   ├── auth/          # 認証・権限管理テスト
│   ├── studios/       # スタジオ機能テスト
│   ├── dashboard/     # ダッシュボード機能テスト
│   ├── instant/       # 即座撮影機能テスト
│   └── dev/           # 開発・デバッグ用テスト
└── helpers/           # 共通テストヘルパー
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

### 技術者向けドキュメント
- [`tests/e2e/README.md`](./tests/e2e/README.md) - E2Eテスト構造・実行ガイド
- [`docs/e2e-testing.md`](./docs/e2e-testing.md) - E2Eテスト環境ガイド
- [`docs/admin-setup.md`](./docs/admin-setup.md) - 管理者アカウント作成・セットアップ手順
- [`docs/migration-guide.md`](./docs/migration-guide.md) - データベースマイグレーションガイド
- [`docs/i18n-implementation.md`](./docs/i18n-implementation.md) - 多言語化実装ガイド
- [`docs/ui-implementation.md`](./docs/ui-implementation.md) - UI実装ガイド

### 管理者向けドキュメント
- `/admin/disputes` - 争議解決管理画面
- `/admin/invite/[token]` - 管理者招待受諾画面

## 🤝 コントリビューション

1. フィーチャーブランチを作成
2. 変更を実装
3. テストを追加・実行
4. プルリクエストを作成

## 📋 定数管理

プロジェクトの固定データは`src/constants/`に一元化されています：

- **`japan.ts`** - 都道府県、地域区分、主要都市
- **`studio.ts`** - スタジオ関連の設備カテゴリ、評価項目、ソートオプション
- **`common.ts`** - アプリ共通の設定、バリデーション、ファイル制限

### 使用例

```typescript
// 個別ファイルから直接インポート（推奨）
import { PREFECTURES } from '@/constants/japan';
import { VALIDATION } from '@/constants/common';
import { STUDIO_SORT_OPTIONS } from '@/constants/studio';

// 都道府県選択
PREFECTURES.map(pref => ({ value: pref, label: pref }))

// バリデーション
z.string().min(VALIDATION.name.minLength).max(VALIDATION.name.maxLength)

// ソートオプション
STUDIO_SORT_OPTIONS.map(option => ({ value: option.value, label: option.label }))
```

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🔗 関連リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn/ui Documentation](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
