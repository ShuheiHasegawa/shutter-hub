# ShutterHub v2 テストガイド

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