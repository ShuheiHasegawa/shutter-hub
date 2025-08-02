# ShutterHub v2 E2Eテスト利用ガイド

## 📋 **概要**

このドキュメントはShutterHub v2のE2Eテスト運用ルールとガイドラインを定めています。
Playwrightを使用したEnd-to-Endテストの作成・実行・保守に関する標準的な手順を記載します。

---

## 🎯 **E2Eテストの目的**

### **主要目標**
- **品質保証**: リリース前の完全な動作確認
- **回帰テスト**: 新機能追加時の既存機能影響確認  
- **ユーザー体験検証**: 実際のユーザーフローの動作確認
- **CI/CD統合**: 自動品質チェックによる開発効率向上

### **対象システム**
- 撮影会作成・管理フロー
- 予約・決済システム  
- 即座撮影リクエスト機能
- ユーザー認証・プロフィール管理

---

## 🔐 **テストユーザー管理**

### **専用テストアカウント**

以下のE2E専用テストアカウントが利用可能です：

| ユーザータイプ | メールアドレス | パスワード | 用途 |
|---------------|---------------|-----------|------|
| **主催者** | `e2e-organizer@example.com` | `E2ETestPassword123!` | 撮影会作成・管理テスト |
| **フォトグラファー** | `e2e-photographer@example.com` | `E2ETestPassword123!` | 撮影応募・参加テスト |
| **モデル** | `e2e-model@example.com` | `E2ETestPassword123!` | 撮影予約・参加テスト |

### **テストアカウント利用ルール**

#### **✅ 使用可能な操作**
- 撮影会作成・編集・削除
- 予約・キャンセル操作
- プロフィール編集
- メッセージ送受信
- テストデータの作成・変更

#### **❌ 禁止事項**  
- 本番ユーザーへの影響を与える操作
- 実際の決済処理（テスト決済のみ）
- テストアカウント情報の外部共有
- パスワード変更（共有アカウントのため）

#### **🧹 クリーンアップ**
- テスト実行後の自動データ削除
- 週次での手動データクリーンアップ
- テスト用撮影会の定期削除

---

## 🚀 **E2Eテスト実行方法**

### **基本実行コマンド**

```bash
# 全E2Eテスト実行
npm run test:e2e

# ヘッドレスモードで実行（ブラウザ表示なし）
npm run test:e2e

# ブラウザを表示してテスト実行
npm run test:e2e:headed

# デバッグモード（ステップ実行）
npm run test:e2e:debug

# UIモード（インタラクティブ）
npm run test:e2e:ui
```

### **MCP連携テスト実行**

```bash
# MCP環境でのテスト実行（推奨）
npm run test:e2e:mcp

# MCP環境 + ブラウザ表示
npm run test:e2e:mcp:headed

# MCP環境 + デバッグモード
npm run test:e2e:mcp:debug
```

### **個別テストファイル実行**

```bash
# 撮影会作成フローのみ
npx playwright test tests/e2e/photo-session-creation.spec.ts

# 予約・決済フローのみ  
npx playwright test tests/e2e/photo-session-booking.spec.ts

# 即座撮影フローのみ
npx playwright test tests/e2e/enhanced-escrow-payment.spec.ts
```

---

## 📁 **テストファイル構造**

### **ディレクトリ構成**

```
tests/e2e/
├── auth.setup.ts                    # 認証セットアップ
├── utils/                           # ヘルパー関数
│   ├── test-helpers.ts              # 共通ヘルパー
│   └── photo-session-helpers.ts     # 撮影会専用ヘルパー
├── fixtures/                       # テストデータ
│   ├── test-photo-1.jpg            # テスト用画像
│   └── dispute-evidence.jpg        # 争議用証拠画像
├── photo-session-creation.spec.ts  # 撮影会作成フロー
├── photo-session-booking.spec.ts   # 予約・決済フロー  
├── enhanced-escrow-payment.spec.ts # エスクロー決済フロー
└── simple-instant-photo.spec.ts    # 即座撮影基本テスト
```

### **命名規則**

#### **テストファイル**
- `*.spec.ts` - メインテストファイル
- `*.setup.ts` - セットアップ・準備処理
- `*-helpers.ts` - ヘルパー関数群

#### **テストケース**
- **機能別グループ**: `test.describe('撮影会作成フロー', () => {})`
- **具体的テスト**: `test('first_come方式: 作成→公開→完全フロー', async () => {})`
- **期待結果明記**: `test('エラー時の表示確認', async () => {})`

---

## 🛠 **テスト作成ガイドライン**

### **基本原則**

#### **1. 可読性重視**
```typescript
// ✅ Good: 明確な目的
test('主催者が先着順撮影会を作成して公開できる', async ({ page }) => {
  // テスト内容
});

// ❌ Bad: 曖昧な目的
test('基本テスト', async ({ page }) => {
  // テスト内容  
});
```

#### **2. 独立性確保**
```typescript
// ✅ Good: 各テストで独立したデータ作成
test.beforeEach(async () => {
  const testData = generatePhotoSessionTestData('first_come', testId);
});

// ❌ Bad: 前テストのデータに依存
test('2番目のテスト', async ({ page }) => {
  // 前のテストで作成されたデータを使用
});
```

#### **3. Logger使用**
```typescript
// ✅ Good: 構造化ログ
Logger.info(`📝 撮影会フォーム入力開始: ${data.title}`);
Logger.info(`✅ ${userType}認証完了`);

// ❌ Bad: console.log
console.log('テスト開始');
```

### **セレクター使用ルール**

#### **優先順位**
1. **data-testid属性** (最優先)
2. **固有ID** (`#signin-email`)
3. **テキストベース** (`button:has-text("ログイン")`)
4. **CSS クラス** (最後の手段)

```typescript
// ✅ 推奨順序
await page.click('[data-testid="submit-button"]');      // 1. data-testid
await page.fill('#signin-email', email);                // 2. 固有ID  
await page.click('button:has-text("ログイン")');        // 3. テキスト
await page.click('.btn-primary');                       // 4. CSS (非推奨)
```

### **待機とタイムアウト**

```typescript
// ✅ 明示的な待機
await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
await page.waitForURL('**/dashboard');

// ✅ カスタム待機関数使用
await waitForPageLoad(page);

// ❌ 固定時間待機
await page.waitForTimeout(5000); // 避ける
```

---

## 🔧 **トラブルシューティング**

### **よくある問題と解決方法**

#### **1. 要素が見つからない (TimeoutError)**

**症状**: `page.click: Timeout exceeded`
```bash
TimeoutError: page.click: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('#email')
```

**解決方法**:
1. **セレクター確認**: ブラウザ開発者ツールで実際の要素を確認
2. **待機追加**: `waitForSelector`で要素の表示を待機
3. **Screenshot確認**: `test-results/`内のスクリーンショット確認

```typescript
// 修正例
await page.waitForSelector('#signin-email', { timeout: 10000 });
await page.fill('#signin-email', email);
```

#### **2. 認証エラー**

**症状**: ログイン後にダッシュボードが表示されない

**解決方法**:
1. **テストユーザー存在確認**: DBでユーザーの存在を確認
2. **パスワード確認**: 正しいパスワードを使用
3. **認証後URL確認**: 実際のリダイレクト先を確認

#### **3. テストデータ競合**

**症状**: 前回のテストデータが残っている

**解決方法**:
1. **クリーンアップ確認**: `test.afterEach`でのデータ削除
2. **ユニークID使用**: タイムスタンプベースのテストID
3. **手動クリーンアップ**: 必要に応じてDB直接クリーンアップ

---

## 📊 **テスト結果とレポート**

### **レポート確認方法**

```bash
# HTMLレポート表示
npx playwright show-report

# 特定テストのトレース確認  
npx playwright show-trace test-results/[テスト名]/trace.zip
```

### **CI/CD統合**

#### **GitHub Actions**
- **自動実行**: mainブランチへのpush時
- **並列実行**: 複数ブラウザでの同時テスト
- **結果通知**: Slack/Email通知（設定済み）

#### **品質ゲート**
- **成功率**: 90%以上で合格
- **実行時間**: 15分以内
- **リトライ**: 失敗時最大2回自動リトライ

---

## 🗓 **保守・運用ルール**

### **定期メンテナンス**

#### **週次作業**
- [ ] テストユーザーのデータクリーンアップ
- [ ] 失敗テストの分析・修正
- [ ] パフォーマンス指標の確認

#### **月次作業**  
- [ ] Playwright・依存関係の更新
- [ ] テストカバレッジの確認・改善
- [ ] 新機能対応テストの追加

#### **リリース前**
- [ ] 全E2Eテストの完全実行
- [ ] クリティカルパステストの手動確認
- [ ] パフォーマンステストの実行

### **緊急時対応**

#### **E2Eテスト障害時**
1. **即座の影響確認**: リリースブロックの判断
2. **原因特定**: ログ・スクリーンショット分析
3. **一時回避**: 問題テストの無効化
4. **根本修正**: 問題解決後のテスト復旧

---

## 📚 **参考資料**

### **関連ドキュメント**
- [Playwright公式ドキュメント](https://playwright.dev/)
- [テスト戦略ガイド](../test-strategy.md)
- [CI/CD設定ガイド](./github-actions-setup.md)

### **内部リソース**
- **Supabase MCP**: 専用データベース操作
- **Stripe MCP**: テスト決済処理
- **Logger システム**: 構造化ログ出力

---

## ✅ **チェックリスト**

### **新規テスト作成時**
- [ ] 適切な命名規則に従っている
- [ ] 独立したテストデータを使用
- [ ] Logger を使用した適切なログ出力
- [ ] クリーンアップ処理を実装
- [ ] 適切なタイムアウト設定

### **テスト実行前**
- [ ] 開発サーバーが起動している
- [ ] テストユーザーが正常に利用可能
- [ ] 必要な環境変数が設定済み
- [ ] MCP連携が正常に動作

### **リリース前確認**
- [ ] 全E2Eテストが成功
- [ ] 新機能のテストケースを追加
- [ ] パフォーマンスに影響なし
- [ ] CI/CDパイプラインが正常動作

---

**最終更新**: 2025年8月2日  
**次回レビュー予定**: 2025年9月2日  
**担当者**: ShutterHub開発チーム