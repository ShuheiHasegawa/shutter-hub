---
name: e2e-test-generator
description: ShutterHub撮影会予約プラットフォーム向けのPlaywrightテスト生成スキル。
  Page Object Modelパターンと既存ヘルパー関数の両方をサポートし、
  PC/SP分離テストを含む高品質なE2Eテストコードを生成する。
---

# E2E Test Generator for ShutterHub

## 役割定義

You are a Playwright Test Generator specialized for ShutterHub photo session booking platform.
You generate high-quality, maintainable E2E test code following ShutterHub's coding standards and patterns.

## 使用条件

このSkillは以下の場合に使用する:
- E2Eテストの新規作成が必要な場合
- 既存テストの拡張・修正が必要な場合
- Page Object Modelパターンに基づくテスト実装が必要な場合
- PC/SP分離テストの実装が必要な場合

## ディレクトリ構造

```
tests/e2e/
├── pages/                    # Page Object Model（新規テストから使用）
│   ├── BasePage.ts          # 共通ベースクラス
│   ├── AuthPage.ts          # 認証ページ
│   └── components/          # 再利用可能コンポーネント
│       └── BaseComponent.ts
├── utils/                    # ヘルパー関数（既存・維持）
│   ├── photo-session-helpers.ts
│   ├── studio-test-helpers.ts
│   └── test-helpers.ts
├── config/                   # テスト設定
│   └── test-users.ts        # テストユーザー情報
└── [category]/              # 機能別テストファイル
    └── *.spec.ts
```

## 要素選択（Locator）優先順位

### Priority 1: data-testid属性（最優先）

```typescript
// 最優先: data-testid属性
page.getByTestId('mobile-filter-button')
page.getByTestId('studio-search-input')
page.getByTestId('studio-load-more')
```

**理由**: 
- UI変更・多言語化に強い
- テスト専用のアンカーポイントで意図が明確
- Playwright Best Practice推奨

**命名規則**: `{component}-{element}-{action}`

**具体例:**
- `mobile-filter-button` (モバイルフィルターボタン)
- `studio-search-input` (スタジオ検索入力)
- `studio-card-123` (スタジオカードID=123)
- `report-reason-spam` (通報理由=spam)
- `mobile-filter-apply` (フィルター適用ボタン)
- `studio-load-more` (もっと見るボタン)

**NG例:**
- `button1` ← 意味不明
- `studioSearchInput` ← キャメルケース（ケバブケース推奨）
- `search` ← 具体性不足

### Priority 2: Semantic Locators

```typescript
// 次優先: セマンティックロケーター
page.getByRole('button', { name: '検索する' })
page.getByLabel('スタジオ名')
page.getByPlaceholder('スタジオ名、住所で検索')
page.getByTitle('スタジオ一覧')
```

**理由**: 実装変更に強く、アクセシビリティも検証できる

### Priority 3: Text-based Locators

```typescript
// 補助: テキストベース
page.getByText('スタジオ一覧')
page.getByText(/スタジオ名.*検索/)
```

**注意**: 多言語化・文言変更に脆弱なため、可能な限りdata-testidを使用する

### 避けるべき例

```typescript
// ❌ クラス名セレクター（ビルド時に変更される可能性）
page.locator("div[class^='Header_title']")

// ❌ XPath（脆弱で保守性が低い）
page.locator("//div[@class='...']")

// ❌ 複雑なCSSセレクター（変更に弱い）
page.locator("div > section > div.card")
```

## 待機処理ルール

### 禁止事項

```typescript
// ❌ 固定待機時間（Flaky testの原因）
await page.waitForTimeout(1000)
await sleep(500)

// ❌ 任意の待機
await new Promise(resolve => setTimeout(resolve, 1000))
```

### 推奨パターン

```typescript
// ✅ 要素表示待機（自動リトライ）
await expect(page.getByRole('heading', { name: 'スタジオ一覧' })).toBeVisible()

// ✅ URL遷移待機
await expect(page).toHaveURL(/\/studios\/\d+/)
await page.waitForURL(/\/studios\/\d+/)

// ✅ APIレスポンス待機
await page.waitForResponse(response => 
  response.url().includes('/api/studios') && response.status() === 200
)

// ✅ ネットワーク完了待機（タイムアウト注意）
await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
  // networkidleがタイムアウトしても続行
})
```

### ローディング状態の処理

```typescript
// ローディング表示の待機パターン
public async waitForLoadingToComplete(): Promise<void> {
  const loadingText = this.page.getByText('読み込み中');
  const isLoadingVisible = await loadingText.isVisible().catch(() => false);
  if (isLoadingVisible) {
    await loadingText.waitFor({ state: 'hidden', timeout: 30000 });
  }
}
```

## Page Object Model（POM）要件

### 基本原則

- **新規テストからPOMを使用**: 既存テストは段階的に移行
- **すべてのPageクラスは`BasePage`を継承**
- **すべてのComponentクラスは`BaseComponent`を継承**
- **静的要素はプロパティとして定義**
- **動的要素は関数として定義**
- **ページ遷移メソッドは新しいPage Objectを返す**

### 実装パターン

#### 1. 静的要素の定義

```typescript
export class StudioListPage extends BasePage {
  // 静的要素はプロパティとして定義（data-testid優先）
  searchInput = this.page.getByTestId('studio-search-input');
  searchButton = this.page.getByRole('button', { name: '検索' });
  resetButton = this.page.getByRole('button', { name: 'リセット' });
  pageTitle = this.page.getByRole('heading', { name: 'スタジオ一覧' });
  mobileFilterButton = this.page.getByTestId('mobile-filter-button');
  mobileFilterApply = this.page.getByTestId('mobile-filter-apply');
  loadMoreButton = this.page.getByTestId('studio-load-more');
}
```

#### 2. 動的要素の定義

```typescript
export class StudioListPage extends BasePage {
  // 動的要素は関数として定義
  studioCard = (studioName: string) =>
    this.page.getByRole('link', { name: studioName });

  filterByPrefecture = (prefecture: string) =>
    this.page.getByRole('combobox').filter({ hasText: prefecture });
}
```

#### 3. ページ遷移メソッド

```typescript
export class StudioListPage extends BasePage {
  async goToStudioDetail(studioId: string): Promise<StudioDetailPage> {
    await this.studioCard(studioId).click();
    await this.page.waitForURL(/\/studios\/\d+/);
    return new StudioDetailPage(this.page, this.isMobile);
  }

  async goToCreateStudio(): Promise<StudioCreatePage> {
    await this.page.getByRole('link', { name: 'スタジオを追加' }).click();
    await this.page.waitForURL(/\/studios\/create/);
    return new StudioCreatePage(this.page, this.isMobile);
  }
}
```

### コンポーネント切り出しの基準

- **ファイルが大きくなってきた場合**: 要素ブロックの大きいものからコンポーネントクラスに切り出す
- **モーダルの場合**: モーダルは画面から独立したコンテキストを持つため、`Modal`サフィックスを付ける
  - 例: `StudioReportModal.ts`, `PhotoSessionBookingModal.ts`

## PC/SP分離テストパターン

### 必須要件

**すべての新規テストはPC/SP分離を実装する**

```typescript
test.describe('機能名', () => {
  // PC版テスト
  test.describe('PC', () => {
    test('正常系: 〇〇', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);
      await studioListPage.open();

      // PC用のセレクター・操作
      await page.getByRole('button', { name: '検索' }).click();
    });
  });

  // SP版テスト
  test.describe('SP', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('正常系: 〇〇', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);
      await studioListPage.open();

      // SP用のセレクター・操作（UIが異なる場合がある）
      await page.getByRole('button', { name: '検索' }).click();
    });
  });
});
```

### ビューポート設定

```typescript
// SPテストのビューポート設定
test.use({ viewport: { width: 375, height: 667 } });

// カスタムビューポートが必要な場合
test.use({ viewport: { width: 768, height: 1024 } }); // タブレット
```

## 認証パターン

### 標準認証（テストユーザー）

```typescript
import { authenticateTestUser } from '../utils/photo-session-helpers';

test.beforeEach(async ({ page }) => {
  // テストユーザーで認証
  await authenticateTestUser(page, 'organizer'); // or 'photographer', 'model'
});
```

### テストユーザー情報

```typescript
import { getTestUser } from '../config/test-users';

const user = getTestUser('organizer');
// user.email, user.password, user.displayName, user.type
```

### 認証パターンの選択

| パターン | ユースケース | 実装方法 |
|---------|------------|---------|
| 未ログイン状態 | サインイン/サインアップのテスト | `authenticateTestUser`を使用しない |
| ログイン済み状態 | 一般的な機能テスト（デフォルト） | `authenticateTestUser(page, 'organizer')` |
| 特定の権限が必要 | 管理者機能、決済フローなど | 適切なユーザータイプを指定 |

## テスト観点表（等価分割・境界値）

### 必須要件

**テストコード実装前に、以下の形式でテスト観点をMarkdown表で提示する**

```markdown
## テスト観点表

| 分類   | テストケース   | 入力値             | 期待結果   | 優先度 |
| ------ | -------------- | ------------------ | ---------- | ------ |
| 正常系 | 有効な入力     | 正常値             | 成功       | 高     |
| 境界値 | 最小値         | 0                  | 成功       | 高     |
| 境界値 | 最大値         | MAX                | 成功       | 高     |
| 境界値 | 最小値-1       | -1                 | エラー     | 中     |
| 境界値 | 最大値+1       | MAX+1              | エラー     | 中     |
| 異常系 | 空文字列       | ""                 | エラー     | 高     |
| 異常系 | null/undefined | null               | エラー     | 高     |
```

### 必須網羅項目

- ✅ **正常系（主要シナリオ）**: 基本的な成功パターン
- ✅ **異常系（バリデーションエラー、例外）**: 失敗系を正常系と同数以上
- ✅ **境界値**: 0, 最小値, 最大値, ±1, 空, NULL
- ✅ **不正な型・形式の入力**: 型エラー、形式エラー
- ✅ **外部依存の失敗**: APIエラー、データベースエラー（該当する場合）

## Given/When/Then形式のコメント

各テストケースには、以下の形式でコメントを付与する:

```typescript
test('正常系: スタジオ検索', async ({ page }) => {
  // Given: 前提条件の設定
  await authenticateTestUser(page, 'organizer');
  const studioListPage = new StudioListPage(page, false);
  await studioListPage.open();

  // When: テスト対象の操作
  await studioListPage.searchInput.fill('東京');
  await studioListPage.searchButton.click();

  // Then: 期待結果の検証
  await expect(studioListPage.pageTitle).toBeVisible();
  await expect(page.getByText('検索結果')).toBeVisible();
});
```

## コード生成優先ルール

### Priority 1: Element Selectors & Robustness (HIGHEST)

- 既存コードパターンから安定したセレクターを使用
- Click before fill パターン（フォーカス確実化）
- Loading状態のハンドリング
- `.first()` や `.nth()` で複数要素に対応

```typescript
// Click before fill パターン
await page.getByLabel('メールアドレス').click();
await page.getByLabel('メールアドレス').fill('test@example.com');
```

### Priority 2: Flow & Navigation from MCP Behavior

- MCPが観測したページフローを信頼
- 実際に動作したナビゲーション順序を採用
- 必要な中間ステップを省略しない

### Priority 3: Values & Test Data

- 既存の定数ファイルを使用（`tests/e2e/config/test-users.ts`）
- MCPで成功した値を適用
- ハードコードではなく定数をimport

```typescript
// ✅ 良い例
import { getTestUser } from '../config/test-users';
const user = getTestUser('organizer');
await page.fill('[name="email"]', user.email);

// ❌ 避けるべき例
await page.fill('[name="email"]', 'test@example.com'); // ハードコード
```

## テスト生成フロー

1. **既存Page Objectの検索（必須）**
   - `tests/e2e/pages/` ディレクトリを検索
   - 既存のPage Objectがあれば再利用

2. **既存ヘルパー関数の確認**
   - `tests/e2e/utils/` ディレクトリを確認
   - 再利用可能なヘルパー関数があれば使用

3. **MCPツールでブラウザ操作を実行**
   - 実際の画面を操作してセレクターを検証
   - フローを確認

4. **テストコード生成**
   - テスト観点表を提示
   - Given/When/Then形式で実装
   - PC/SP分離テストを実装

5. **型チェック検証**
   - `npx tsc --noEmit` で型エラーを確認

## 実装例

### 例1: スタジオ一覧ページのテスト（POM使用）

```typescript
import { test, expect } from '@playwright/test';
import { StudioListPage } from '../pages/StudioListPage';

test.describe('スタジオ一覧機能', () => {
  test.describe('PC', () => {
    test('正常系: キーワード検索', async ({ page }) => {
      const isMobile = false;
      
      // Given: 認証とページ初期化
      await authenticateTestUser(page, 'organizer');
      const studioListPage = new StudioListPage(page, isMobile);
      await studioListPage.open();

      // When: キーワード検索を実行（data-testid優先でセレクタを使用）
      await studioListPage.searchInput.fill('東京');
      await studioListPage.searchButton.click();

      // Then: 検索結果が表示される
      await expect(studioListPage.pageTitle).toBeVisible();
      await expect(page.getByText('検索結果')).toBeVisible();
    });
  });

  test.describe('SP', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('正常系: キーワード検索', async ({ page }) => {
      const isMobile = true;
      
      // Given: 認証とページ初期化
      await authenticateTestUser(page, 'organizer');
      const studioListPage = new StudioListPage(page, isMobile);
      await studioListPage.open();

      // When: キーワード検索を実行（SP用UI）
      await studioListPage.searchInput.fill('東京');
      await studioListPage.searchButton.click();

      // Then: 検索結果が表示される
      await expect(studioListPage.pageTitle).toBeVisible();
    });
  });
});
```

### 例2: ヘルパー関数を使用したテスト（既存パターン）

```typescript
import { test, expect } from '@playwright/test';
import { authenticateTestUser } from '../utils/photo-session-helpers';
import { initializeStudioListPage, searchByKeyword } from '../utils/studio-test-helpers';

test.describe('スタジオ一覧機能', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page, 'organizer');
  });

  test('正常系: キーワード検索', async ({ page }) => {
    // Given: スタジオ一覧ページを開く
    await initializeStudioListPage(page);

    // When: キーワード検索を実行
    await searchByKeyword(page, '東京');

    // Then: 検索結果が表示される
    await expect(page.getByRole('heading', { name: 'スタジオ一覧' })).toBeVisible();
  });
});
```

## 既存ルールとの統合

### test-code-generation.mdcとの整合性

- ✅ テスト観点表（等価分割・境界値）の事前提示を維持
- ✅ Given/When/Then形式のコメントを維持
- ✅ 品質チェックリストを維持

### 新規追加要素

- ✅ PC/SP分離テストの必須化
- ✅ Page Object Model使用の推奨（新規テストから）
- ✅ Locator優先順位の明確化
- ✅ 待機処理ルールの厳格化

## 注意事項

- **既存のヘルパー関数は維持**: `tests/e2e/utils/` の関数は削除しない
- **段階的移行**: 新規テストからPage Object Modelを使用開始
- **既存テストは維持**: 必要に応じて段階的に移行
- **継続的改善**: Skillの内容はテスト実行結果を反映して改善

## 参考資料

- Playwright公式ドキュメント: https://playwright.dev/
- 既存テスト例: `tests/e2e/studios/studio-list.spec.ts`
- テストヘルパー: `tests/e2e/utils/test-helpers.ts`
- テストユーザー設定: `tests/e2e/config/test-users.ts`
- テストコード生成ルール: `.cursor/rules/dev-rules/test-code-generation.mdc`
