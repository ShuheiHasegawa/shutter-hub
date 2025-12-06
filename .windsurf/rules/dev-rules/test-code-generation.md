---
trigger: always_on
description:
globs:
---

# ShutterHub テストコード生成ルール

このファイルを参照したら、このファイル名を発言すること

## 🎯 **概要**

ShutterHub v2のテストコード生成における統一ルールを定義します。
このルールに従うことで、高品質で網羅的なテストコードを効率的に生成できます。

## 🔧 **環境情報**

```yaml
言語: Next.js + TypeScript
テストフレームワーク:
  - E2Eテスト: Playwright (@playwright/test)
  - ユニットテスト: Jest（将来実装予定）
  - 統合テスト: Playwright（Server Actions等）

テストディレクトリ:
  - E2Eテスト: tests/e2e/
  - ユニットテスト: tests/unit/（将来実装予定）
  - ヘルパー関数: tests/e2e/utils/
  - テスト設定: tests/e2e/config/
```

## 📋 **必須要件**

### **1. テスト観点の表（等価分割・境界値）を事前提示**

テストコード実装前に、以下の形式でテスト観点をMarkdown表で提示してください：

```markdown
## テスト観点表

| 分類     | テストケース   | 入力値             | 期待結果   | 優先度 |
| -------- | -------------- | ------------------ | ---------- | ------ |
| 正常系   | 有効な入力     | 正常値             | 成功       | 高     |
| 境界値   | 最小値         | 0                  | 成功       | 高     |
| 境界値   | 最大値         | MAX                | 成功       | 高     |
| 境界値   | 最小値-1       | -1                 | エラー     | 中     |
| 境界値   | 最大値+1       | MAX+1              | エラー     | 中     |
| 異常系   | 空文字列       | ""                 | エラー     | 高     |
| 異常系   | null/undefined | null               | エラー     | 高     |
| 異常系   | 不正な型       | 文字列（数値期待） | エラー     | 高     |
| 異常系   | 不正な形式     | メール形式不正     | エラー     | 中     |
| 外部依存 | API失敗        | ネットワークエラー | エラー処理 | 中     |
```

### **2. テストコード実装**

テスト観点表に基づいて、以下の要件を満たすテストコードを実装してください：

#### **必須網羅項目**

- ✅ **正常系（主要シナリオ）**: 基本的な成功パターン
- ✅ **異常系（バリデーションエラー、例外）**: 失敗系を正常系と同数以上
- ✅ **境界値**: 0, 最小値, 最大値, ±1, 空, NULL
- ✅ **不正な型・形式の入力**: 型エラー、形式エラー
- ✅ **外部依存の失敗**: APIエラー、データベースエラー（該当する場合）
- ✅ **例外種別・エラーメッセージの検証**: 適切なエラーメッセージの確認

#### **目標**

- **分岐網羅100%**: すべての分岐をテスト
- **失敗系 ≥ 正常系**: 失敗ケースを十分にテスト
- **境界値テスト**: 境界値とその前後の値をテスト

### **3. Given/When/Then形式のコメント**

各テストケースには、以下の形式でコメントを付与してください：

```typescript
test('テストケース名', async ({ page }) => {
  // Given: 前提条件の設定
  await authenticateTestUser(page, 'organizer');
  await page.goto('/ja/photo-sessions/create');

  // When: テスト対象の操作
  await page.fill('[name="title"]', 'テスト撮影会');
  await page.click('button[type="submit"]');

  // Then: 期待結果の検証
  await expect(page.getByText('撮影会を作成しました')).toBeVisible();
});
```

### **4. 実行コマンドとカバレッジ取得方法**

テストコードの末尾に、以下の情報を記載してください：

````markdown
## 実行方法

### 全テスト実行

```bash
npm run test:e2e
```
````

### 特定のテストファイル実行

```bash
npx playwright test tests/e2e/[カテゴリ]/[ファイル名].spec.ts
```

### デバッグモード実行

```bash
npm run test:e2e:debug
```

### UIモード実行

```bash
npm run test:e2e:ui
```

### カバレッジ取得（将来実装予定）

```bash
# Jestカバレッジ（ユニットテスト）
npm run test:coverage

# Playwrightカバレッジ（E2Eテスト）
# 現在は未対応、将来実装予定
```

````

## 📝 **実装パターン**

### **E2Eテスト（Playwright）**

#### **基本構造**

```typescript
import { test, expect } from '@playwright/test';
import { authenticateTestUser } from '../utils/photo-session-helpers';

test.describe('機能名', () => {
  test.beforeEach(async ({ page }) => {
    // Given: 認証と初期状態の設定
    await authenticateTestUser(page, 'organizer');
  });

  test('正常系: 基本的な成功パターン', async ({ page }) => {
    // Given: 前提条件
    await page.goto('/ja/target-page');

    // When: 操作
    await page.fill('[name="field"]', 'valid-value');
    await page.click('button[type="submit"]');

    // Then: 検証
    await expect(page.getByText('成功メッセージ')).toBeVisible();
  });

  test('異常系: バリデーションエラー', async ({ page }) => {
    // Given: 前提条件
    await page.goto('/ja/target-page');

    // When: 無効な入力
    await page.fill('[name="field"]', '');
    await page.click('button[type="submit"]');

    // Then: エラーメッセージの検証
    await expect(page.getByText('必須項目です')).toBeVisible();
  });

  test('境界値: 最小値', async ({ page }) => {
    // Given: 前提条件
    await page.goto('/ja/target-page');

    // When: 最小値入力
    await page.fill('[name="field"]', '0');

    // Then: 検証
    await expect(page.locator('[name="field"]')).toHaveValue('0');
  });

  test('境界値: 最大値+1（エラー）', async ({ page }) => {
    // Given: 前提条件
    await page.goto('/ja/target-page');

    // When: 最大値+1入力
    await page.fill('[name="field"]', '101'); // 最大値100の場合

    // Then: エラーメッセージの検証
    await expect(page.getByText('最大値は100です')).toBeVisible();
  });
});
````

#### **共通ヘルパーの使用**

```typescript
// tests/e2e/utils/test-helpers.ts の関数を活用
import {
  waitForPageLoad,
  fillForm,
  createPhotoSession,
} from '../utils/test-helpers';

test('ヘルパー関数を使用したテスト', async ({ page }) => {
  // Given: ヘルパー関数で撮影会作成
  await createPhotoSession(page, {
    title: 'テスト撮影会',
    description: '説明',
    date: '2024-12-01',
    time: '14:00',
    location: '東京',
    price: '5000',
    capacity: '10',
  });

  // Then: 作成成功の確認
  await expect(page.url()).toMatch(/\/photo-sessions\/\d+/);
});
```

### **ユニットテスト（将来実装予定）**

```typescript
import { describe, test, expect } from '@jest/globals';
import { validateEmail } from '@/lib/utils/validation';

describe('validateEmail', () => {
  test('正常系: 有効なメールアドレス', () => {
    // Given: 有効なメールアドレス
    const email = 'test@example.com';

    // When: バリデーション実行
    const result = validateEmail(email);

    // Then: 成功を確認
    expect(result).toBe(true);
  });

  test('異常系: 無効なメールアドレス', () => {
    // Given: 無効なメールアドレス
    const email = 'invalid-email';

    // When: バリデーション実行
    const result = validateEmail(email);

    // Then: 失敗を確認
    expect(result).toBe(false);
  });

  test('境界値: 空文字列', () => {
    // Given: 空文字列
    const email = '';

    // When: バリデーション実行
    const result = validateEmail(email);

    // Then: 失敗を確認
    expect(result).toBe(false);
  });
});
```

## 🎯 **テスト観点の具体例**

### **フォームバリデーション**

```markdown
| 分類   | テストケース   | 入力値           | 期待結果 | 優先度 |
| ------ | -------------- | ---------------- | -------- | ------ |
| 正常系 | 有効なタイトル | "撮影会タイトル" | 成功     | 高     |
| 正常系 | 最小文字数     | "撮" (1文字)     | 成功     | 中     |
| 正常系 | 最大文字数     | "A".repeat(100)  | 成功     | 中     |
| 境界値 | 最小文字数-1   | "" (0文字)       | エラー   | 高     |
| 境界値 | 最大文字数+1   | "A".repeat(101)  | エラー   | 高     |
| 異常系 | null           | null             | エラー   | 高     |
| 異常系 | undefined      | undefined        | エラー   | 高     |
| 異常系 | 数値型         | 123              | エラー   | 中     |
| 異常系 | オブジェクト型 | {}               | エラー   | 中     |
```

### **数値入力**

```markdown
| 分類   | テストケース | 入力値 | 期待結果 | 優先度 |
| ------ | ------------ | ------ | -------- | ------ |
| 正常系 | 有効な価格   | 5000   | 成功     | 高     |
| 正常系 | 最小値       | 0      | 成功     | 中     |
| 正常系 | 最大値       | 100000 | 成功     | 中     |
| 境界値 | 最小値-1     | -1     | エラー   | 高     |
| 境界値 | 最大値+1     | 100001 | エラー   | 高     |
| 異常系 | 文字列       | "abc"  | エラー   | 高     |
| 異常系 | 空文字列     | ""     | エラー   | 高     |
| 異常系 | null         | null   | エラー   | 高     |
| 異常系 | 負の数       | -100   | エラー   | 中     |
```

### **日付・時刻入力**

```markdown
| 分類   | テストケース | 入力値       | 期待結果 | 優先度 |
| ------ | ------------ | ------------ | -------- | ------ |
| 正常系 | 有効な日付   | "2024-12-01" | 成功     | 高     |
| 正常系 | 今日の日付   | 今日         | 成功     | 中     |
| 正常系 | 未来の日付   | 1年後        | 成功     | 中     |
| 境界値 | 過去の日付   | 昨日         | エラー   | 高     |
| 境界値 | 無効な日付   | "2024-13-01" | エラー   | 高     |
| 異常系 | 空文字列     | ""           | エラー   | 高     |
| 異常系 | 不正な形式   | "2024/12/01" | エラー   | 中     |
| 異常系 | null         | null         | エラー   | 高     |
```

## 🔍 **テスト品質チェックリスト**

実装完了後、以下のチェックリストで品質を確認してください：

- [ ] テスト観点表が提示されているか
- [ ] 正常系テストが実装されているか
- [ ] 失敗系テストが正常系と同数以上あるか
- [ ] 境界値テスト（0, 最小, 最大, ±1）が実装されているか
- [ ] 空文字列・null・undefinedのテストがあるか
- [ ] 不正な型・形式の入力テストがあるか
- [ ] 外部依存の失敗テストがあるか（該当する場合）
- [ ] 各テストケースにGiven/When/Thenコメントがあるか
- [ ] エラーメッセージの検証があるか
- [ ] 実行コマンドとカバレッジ取得方法が記載されているか
- [ ] テストが独立して実行可能か（他のテストに依存していないか）
- [ ] 適切なタイムアウトが設定されているか
- [ ] テストデータのクリーンアップが行われているか（必要に応じて）

## 📚 **既存テスト構造との整合性**

### **テストユーザー管理**

```typescript
// tests/e2e/config/test-users.ts から取得
import { getTestUser } from '../config/test-users';

const organizer = getTestUser('organizer');
const photographer = getTestUser('photographer');
const model = getTestUser('model');
```

### **認証ヘルパー**

```typescript
// tests/e2e/utils/photo-session-helpers.ts を使用
import { authenticateTestUser } from '../utils/photo-session-helpers';

test.beforeEach(async ({ page }) => {
  await authenticateTestUser(page, 'organizer');
});
```

### **共通ヘルパー関数**

```typescript
// tests/e2e/utils/test-helpers.ts の関数を活用
import {
  waitForPageLoad,
  fillForm,
  createPhotoSession,
  makeBooking,
} from '../utils/test-helpers';
```

## 🚀 **実装フロー**

1. **テスト対象の確認**: 実装コードを確認し、テストすべき機能を特定
2. **テスト観点表の作成**: 等価分割・境界値分析を行い、表を作成
3. **テストコード実装**: Given/When/Then形式でテストを実装
4. **品質チェック**: チェックリストで品質を確認
5. **実行と検証**: テストを実行し、すべてのテストがパスすることを確認

## ⚠️ **注意事項**

- **テストの独立性**: 各テストは他のテストに依存しないよう設計
- **適切なタイムアウト**: 非同期処理には適切なタイムアウトを設定（デフォルト: 10秒）
- **エラーハンドリング**: 期待される失敗も含めてテスト
- **クリーンアップ**: テスト後のデータクリーンアップ（必要に応じて）
- **テストデータ**: 既存のテストユーザー・ヘルパー関数を活用
- **コメント**: Given/When/Then形式のコメントを必ず付与

## 📖 **参考資料**

- **Playwright公式ドキュメント**: https://playwright.dev/
- **既存テスト例**: `tests/e2e/priority-tickets/priority-ticket-management.spec.ts`
- **テストヘルパー**: `tests/e2e/utils/test-helpers.ts`
- **テストユーザー設定**: `tests/e2e/config/test-users.ts`
- **テスト構造ガイド**: `tests/e2e/README.md`

---

このルールに従うことで、高品質で網羅的なテストコードを効率的に生成できます。
