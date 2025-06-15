# E2Eテスト環境ガイド

## 概要

ShutterHub v2では、複雑な予約システム（5種類）とエスクロー決済システムの品質保証のため、Playwrightを使用した包括的なE2Eテスト環境を構築しています。

## 🎯 テスト対象機能

### 1. 予約システム（5種類）
- **先着順予約**: 基本フロー、同時アクセス競合状態、満席時キャンセル待ち案内
- **抽選予約**: 応募から結果発表、抽選処理実行と結果通知
- **管理抽選**: 開催者手動選出、応募者検索・フィルタリング
- **優先予約**: ユーザーランク別アクセス制御、優先チケット使用
- **キャンセル待ち**: 自動繰り上げ処理、期限付き繰り上げ当選

### 2. エスクロー決済システム
- **即座撮影リクエスト〜決済**: ゲストユーザーリクエスト、カメラマン受諾、エスクロー決済
- **写真撮影〜配信**: 撮影開始・完了、写真配信、受取確認
- **争議・問題解決**: クライアント争議申請、管理者争議解決、自動確認システム
- **決済システム統合**: Stripeエラーハンドリング、返金処理、手数料計算

### 3. リアルタイム機能
- 在庫更新リアルタイム反映
- 通知システム配信
- 同時アクセス処理

## 🛠️ 技術構成

### テスト環境
- **テストフレームワーク**: Playwright
- **ブラウザエンジン**: Chromium、Firefox、Webkit
- **デバイス**: デスクトップ、モバイル（Pixel 5、iPhone 12）
- **言語**: TypeScript

### ファイル構成
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
│   ├── .auth/                     # 認証状態保存
│   └── fixtures/                  # テストデータ
playwright.config.ts               # Playwright設定
```

## 🚀 テスト実行方法

### 基本実行
```bash
# 全テスト実行
npm run test:e2e

# UIモード（デバッグ用）
npm run test:e2e:ui

# ヘッドレスモード（CI用）
npm run test:e2e:headless

# レポート表示
npm run test:e2e:report
```

### 個別テスト実行
```bash
# 予約システムのみ
npm run test:e2e:booking

# エスクロー決済のみ
npm run test:e2e:escrow

# 特定のテストファイル
npx playwright test booking-systems.spec.ts

# 特定のテストケース
npx playwright test -g "先着順予約"
```

### デバッグモード
```bash
# デバッグモード（ブラウザ表示）
npm run test:e2e:debug

# 特定のテストをデバッグ
npx playwright test booking-systems.spec.ts --debug

# ステップ実行
npx playwright test --headed --slowMo=1000
```

## 🔧 設定とカスタマイズ

### Playwright設定（playwright.config.ts）
```typescript
// 主要設定項目
{
  testDir: './tests/e2e',
  timeout: 60000,           // テストタイムアウト
  retries: 2,               // 失敗時リトライ回数
  workers: 4,               // 並列実行数
  reporter: [
    ['html'],               // HTMLレポート
    ['json', { outputFile: 'test-results.json' }]
  ],
  projects: [
    { name: 'chromium' },   // Chrome
    { name: 'firefox' },    # Firefox
    { name: 'webkit' },     # Safari
    { name: 'Mobile Chrome' },
    { name: 'Mobile Safari' }
  ]
}
```

### 環境変数
```bash
# テスト用環境変数（.env.test）
NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key
STRIPE_SECRET_KEY=your_test_stripe_key
```

## 📝 テストヘルパー関数

### 主要ヘルパー関数（test-helpers.ts）
```typescript
// ページ読み込み・要素待機
waitForPageLoad(page, timeout?)
waitForElement(page, selector, timeout?)
waitForText(page, text, timeout?)

// フォーム操作
fillForm(page, formData)
submitForm(page, formSelector?)

// 撮影会・予約操作
createPhotoSession(page, sessionData)
bookPhotoSession(page, sessionId, bookingData)
cancelBooking(page, bookingId)

// エスクロー決済フロー
processEscrowPayment(page, paymentData)
deliverPhotos(page, deliveryData)
confirmDelivery(page, confirmationData)

// 同時アクセステスト
simulateConcurrentBookings(page, sessionId, userCount)

// レスポンシブテスト
testResponsiveLayout(page, breakpoints)
```

## 🧪 テストケース詳細

### 予約システムテスト（booking-systems.spec.ts）

#### 先着順予約テスト
```typescript
test('先着順予約 - 基本フロー', async ({ page }) => {
  // 撮影会作成 → 予約 → 確認の完全フロー
});

test('先着順予約 - 同時アクセス競合', async ({ page }) => {
  // 複数ユーザーの同時予約処理
});
```

#### 抽選予約テスト
```typescript
test('抽選予約 - 応募から結果発表', async ({ page }) => {
  // 抽選応募 → 抽選実行 → 結果通知
});
```

### エスクロー決済テスト（escrow-payment.spec.ts）

#### 決済フローテスト
```typescript
test('エスクロー決済 - 完全フロー', async ({ page }) => {
  // リクエスト → マッチング → 決済 → 配信 → 確認
});

test('争議解決フロー', async ({ page }) => {
  // 争議申請 → 管理者介入 → 解決
});
```

## 🔍 デバッグとトラブルシューティング

### よくある問題と解決法

#### 1. テストタイムアウト
```bash
# 原因: ネットワーク遅延、重い処理
# 解決: タイムアウト時間を延長
npx playwright test --timeout=120000
```

#### 2. 要素が見つからない
```typescript
// 原因: 動的コンテンツの読み込み待ち不足
// 解決: 適切な待機処理
await page.waitForSelector('[data-testid="booking-form"]');
await page.waitForLoadState('networkidle');
```

#### 3. 認証エラー
```bash
# 原因: 認証状態の不整合
# 解決: 認証状態をクリア
rm -rf tests/e2e/.auth
npm run test:e2e:auth-setup
```

#### 4. データベース状態の不整合
```typescript
// 原因: テスト間のデータ競合
// 解決: 適切なクリーンアップ
await cleanupTestData(page);
```

### デバッグ用ツール

#### 1. スクリーンショット撮影
```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```

#### 2. ページHTML保存
```typescript
await page.locator('html').innerHTML();
```

#### 3. ネットワークログ
```typescript
page.on('response', response => {
  console.log(`${response.status()} ${response.url()}`);
});
```

#### 4. コンソールログ監視
```typescript
page.on('console', msg => {
  console.log('PAGE LOG:', msg.text());
});
```

## 📊 テストレポートと分析

### HTMLレポート
```bash
# レポート生成・表示
npm run test:e2e:report
# ブラウザで test-results/index.html が開く
```

### CI/CD統合
```yaml
# GitHub Actions例
- name: Run E2E Tests
  run: npm run test:e2e:ci
- name: Upload test results
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## 🔄 継続的改善

### テストメンテナンス
1. **定期的なテストレビュー**: 月1回、テストケースの有効性確認
2. **フレイキーテスト対応**: 不安定なテストの特定・修正
3. **パフォーマンス監視**: テスト実行時間の監視・最適化
4. **カバレッジ向上**: 新機能追加時のテストケース追加

### 新機能テスト追加手順
1. 機能仕様の確認
2. テストケース設計
3. テストヘルパー関数の拡張
4. テスト実装
5. レビュー・統合

## 📚 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [ShutterHub v2 開発ルール](../rules/dev-rules/)
- [システム要件定義](../rules/system-requirements.mdc)

## 🤝 サポート

テストに関する質問や問題が発生した場合：
1. このドキュメントのトラブルシューティングを確認
2. Playwright公式ドキュメントを参照
3. 開発チームに相談

---

**最終更新**: 2024年12月1日  
**ドキュメント管理者**: 開発チーム 