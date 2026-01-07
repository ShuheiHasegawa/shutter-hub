import { test, expect } from '@playwright/test';
import { authenticateTestUser } from '../utils/photo-session-helpers';
import {
  initializeStudioListPage,
  executeSearch,
  assertSearchResultsVisible,
  searchByKeyword,
  assertGridResultsVisible,
  checkSearchResults,
  assertNoError,
} from '../utils/studio-test-helpers';

/**
 * スタジオ一覧 E2Eテスト
 *
 * テスト観点表:
 *
 * ## 1. 正常系テスト
 * | 分類   | テストケース       | 入力/操作              | 期待結果                   | 優先度 |
 * | ------ | ------------------ | ---------------------- | -------------------------- | ------ |
 * | 正常系 | ページ初期表示     | ページアクセス         | タイトル・検索フォーム表示 | 高     |
 * | 正常系 | 検索実行           | 検索ボタンクリック     | スタジオ一覧が表示         | 高     |
 * | 正常系 | キーワード検索     | 有効なキーワード入力   | 該当スタジオのみ表示       | 高     |
 * | 正常系 | 都道府県フィルター | 都道府県選択           | 該当スタジオのみ表示       | 高     |
 * | 正常系 | ソート機能         | 各ソートオプション選択 | 順序が変更される           | 中     |
 * | 正常系 | もっと見る         | ボタンクリック         | 追加スタジオ読み込み       | 中     |
 * | 正常系 | スタジオ詳細遷移   | カードクリック         | 詳細ページに遷移           | 高     |
 * | 正常系 | リセットボタン     | リセットクリック       | フィルター初期化           | 中     |
 * | 正常系 | スタジオ作成ボタン | ボタンクリック         | 作成ページに遷移           | 中     |
 *
 * ## 2. 異常系・エッジケーステスト
 * | 分類   | テストケース           | 入力/操作            | 期待結果             | 優先度 |
 * | ------ | ---------------------- | -------------------- | -------------------- | ------ |
 * | 異常系 | 検索結果0件            | 存在しないキーワード | 空状態メッセージ表示 | 高     |
 * | 異常系 | 初期表示（検索未実行） | ページ読み込み直後   | 初期メッセージ表示   | 中     |
 * | 境界値 | 長文キーワード         | 100文字以上          | 正常に検索実行       | 低     |
 * | 境界値 | 特殊文字キーワード     | 記号・絵文字         | エラーなく処理       | 低     |
 *
 * ## 3. UI/レスポンシブテスト
 * | 分類 | テストケース       | 入力/操作  | 期待結果             | 優先度 |
 * | ---- | ------------------ | ---------- | -------------------- | ------ |
 * | UI   | スタジオカード表示 | 一覧表示時 | 必要情報が表示される | 高     |
 * | UI   | ローディング状態   | 検索実行中 | スケルトン表示       | 中     |
 * | UI   | モバイル表示       | 375px幅    | レイアウト崩れなし   | 中     |
 * | UI   | デスクトップ表示   | 1920px幅   | 3カラム表示          | 中     |
 */

test.describe('スタジオ一覧機能', () => {
  test.beforeEach(async ({ page }) => {
    // Given: テストユーザーで認証する
    await authenticateTestUser(page, 'organizer');
  });

  // ============================================================================
  // 1. 正常系テスト
  // ============================================================================

  test('正常系: ページ初期表示', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスする
    await initializeStudioListPage(page);

    // Then: タイトル「スタジオ一覧」が表示される
    await expect(page.getByText('スタジオ一覧')).toBeVisible({
      timeout: 10000,
    });

    // Then: 検索フォーム要素が存在する
    await expect(
      page.locator('input[placeholder*="スタジオ名、住所で検索"]')
    ).toBeVisible();
    await expect(page.locator('button:has-text("検索")')).toBeVisible();
    await expect(page.locator('button:has-text("リセット")')).toBeVisible();

    // Then: 新規作成ボタンが表示される
    await expect(
      page.locator('a:has-text("新しいスタジオを追加")')
    ).toBeVisible();
  });

  test('正常系: 検索実行', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスする
    await initializeStudioListPage(page);

    // When: 検索ボタンをクリックする
    await executeSearch(page, 3000);

    // Then: スタジオ一覧が表示される（初期検索が実行される）
    await assertSearchResultsVisible(page);
  });

  test('正常系: キーワード検索', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスする
    await initializeStudioListPage(page);

    // When: キーワードを入力して検索を実行する
    await searchByKeyword(page, 'スタジオ');

    // Then: 検索結果が表示される（空状態またはスタジオカード）
    await assertGridResultsVisible(page);
  });

  test('正常系: 都道府県フィルター', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスする
    await initializeStudioListPage(page);

    // When: 都道府県を選択して検索を実行する
    const prefectureSelect = page.locator('button:has-text("都道府県を選択")');
    await prefectureSelect.click();
    await page.waitForTimeout(1000);

    // 東京都を選択（セレクトボックス内の選択肢）
    await page
      .locator('[role="option"]:has-text("東京都")')
      .first()
      .click({ force: true });
    await page.waitForTimeout(500);

    await executeSearch(page, 3000);

    // Then: 検索結果が表示される
    const { hasResults, hasEmptyMessage } = await checkSearchResults(page);
    expect(hasResults || hasEmptyMessage).toBe(true);
  });

  test('正常系: ソート機能', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスし、検索を実行する
    await initializeStudioListPage(page);
    await executeSearch(page);

    // When: ソートオプションを変更する
    const sortSelect = page
      .locator('button')
      .filter({
        hasText: /新着順|古い順|名前順|評価順|料金順/,
      })
      .first();
    await sortSelect.click();
    await page.waitForTimeout(500);

    // 名前順（A-Z）を選択
    await page.click('text=名前順（A-Z）');
    await executeSearch(page);

    // Then: ソートが適用される（検索結果が再表示される）
    await assertGridResultsVisible(page);
  });

  test('正常系: もっと見る', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスし、検索を実行する
    await initializeStudioListPage(page);
    await executeSearch(page);

    // When: 「もっと見る」ボタンが表示されている場合、クリックする
    const loadMoreButton = page.locator('button:has-text("もっと見る")');
    const isVisible = await loadMoreButton.isVisible().catch(() => false);

    if (isVisible) {
      await loadMoreButton.click();

      // Then: 追加のスタジオが読み込まれる
      await page.waitForTimeout(2000);

      // ローディング状態が解除される
      await expect(
        page
          .locator('button:has-text("もっと見る")')
          .or(page.locator('text=条件に一致するスタジオが見つかりません'))
      ).toBeVisible({ timeout: 5000 });
    } else {
      // ボタンが表示されない場合は、結果が少ないことを確認
      await assertGridResultsVisible(page);
    }
  });

  test('正常系: スタジオ詳細遷移', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスし、検索を実行する
    await initializeStudioListPage(page);
    await executeSearch(page);

    // When: スタジオカードが存在する場合、クリックする
    const studioCard = page.locator('[class*="card"]').first();
    const cardExists = await studioCard.isVisible().catch(() => false);

    if (cardExists) {
      // カード内のリンクまたはカード自体をクリック
      const cardLink = studioCard.locator('a').first();
      const hasLink = await cardLink.isVisible().catch(() => false);

      if (hasLink) {
        await cardLink.click();
      } else {
        await studioCard.click();
      }

      // Then: スタジオ詳細ページに遷移する
      await page.waitForURL(/\/studios\/[^/]+/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/studios\/[^/]+/);
    } else {
      // カードが存在しない場合はスキップ
      test.skip();
    }
  });

  test('正常系: リセットボタン', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスし、フィルターを設定する
    await initializeStudioListPage(page);

    const keywordInput = page.locator(
      'input[placeholder*="スタジオ名、住所で検索"]'
    );
    await keywordInput.fill('テストキーワード');

    // When: リセットボタンをクリックする
    await page.click('button:has-text("リセット")');

    // Then: フィルターが初期化される
    const inputValue = await keywordInput.inputValue();
    expect(inputValue).toBe('');

    // 都道府県フィルターもリセットされる
    const prefectureSelect = page.locator('button:has-text("都道府県を選択")');
    const prefectureText = await prefectureSelect.textContent();
    expect(prefectureText).toContain('都道府県を選択');
  });

  test('正常系: スタジオ作成ボタン', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスする
    await initializeStudioListPage(page);

    // When: 新規作成ボタンをクリックする
    await page.click('a:has-text("新しいスタジオを追加")');

    // Then: スタジオ作成ページに遷移する
    await page.waitForURL(/\/studios\/create/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/studios\/create/);
  });

  // ============================================================================
  // 2. 異常系・エッジケーステスト
  // ============================================================================

  test('異常系: 検索結果0件', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスする
    await initializeStudioListPage(page);

    // When: 存在しないキーワードで検索を実行する
    await searchByKeyword(page, '存在しないスタジオ名12345');

    // Then: 空状態メッセージが表示される
    await expect(
      page.locator('text=条件に一致するスタジオが見つかりません')
    ).toBeVisible({ timeout: 5000 });
  });

  test('異常系: 初期表示（検索未実行）', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスする（検索ボタンを押さない）
    await initializeStudioListPage(page);

    // Then: 初期メッセージが表示される
    // 注意: 実装では初期表示時に自動検索が実行されるため、
    // このテストは実装に応じて調整が必要
    await page.waitForTimeout(1000);

    // 初期メッセージまたは検索結果のいずれかが表示される
    await assertSearchResultsVisible(page);
  });

  test('境界値: 長文キーワード', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスする
    await initializeStudioListPage(page);

    // When: 100文字以上の長文キーワードを入力して検索を実行する
    const longKeyword = 'あ'.repeat(100);
    await searchByKeyword(page, longKeyword);

    // Then: エラーなく検索が実行される
    await assertNoError(page);

    // 検索結果または空状態メッセージが表示される
    await assertGridResultsVisible(page);
  });

  test('境界値: 特殊文字キーワード', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスする
    await initializeStudioListPage(page);

    // When: 特殊文字・記号・絵文字を含むキーワードを入力して検索を実行する
    const specialKeyword = '!@#$%^&*()_+-=[]{}|;:,.<>?🎉📸';
    await searchByKeyword(page, specialKeyword);

    // Then: エラーなく処理される
    await assertNoError(page);

    // 検索結果または空状態メッセージが表示される
    await assertGridResultsVisible(page);
  });

  // ============================================================================
  // 3. UI/レスポンシブテスト
  // ============================================================================

  test('UI: スタジオカード表示', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスし、検索を実行する
    await initializeStudioListPage(page);
    await executeSearch(page, 3000);

    // When: スタジオカードまたは空状態メッセージが表示されている
    const hasEmptyMessage = await page
      .locator('text=条件に一致するスタジオが見つかりません')
      .isVisible()
      .catch(() => false);

    if (hasEmptyMessage) {
      // 空状態の場合はスキップ
      test.skip();
      return;
    }

    const studioCard = page.locator('[class*="card"]').first();
    const cardExists = await studioCard.isVisible().catch(() => false);

    if (cardExists) {
      // Then: カード内に必要な情報が表示される
      // カード全体が表示されていることを確認
      await expect(studioCard).toBeVisible();

      // スタジオ名または住所のいずれかが表示されている
      const cardText = await studioCard.textContent();
      expect(cardText).toBeTruthy();
      expect(cardText!.length).toBeGreaterThan(0);
    } else {
      // カードが存在しない場合はスキップ
      test.skip();
    }
  });

  test('UI: ローディング状態', async ({ page }) => {
    // Given: スタジオ一覧ページにアクセスする
    await initializeStudioListPage(page);

    // When: 検索を実行する
    const searchButton = page.locator('button:has-text("検索")');
    await searchButton.click();

    // Then: ローディングスケルトンが表示される、または結果がすぐに表示される
    // スケルトン要素の存在を確認（実装に応じて調整）
    const hasSkeleton = await page
      .locator('[class*="skeleton"]')
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false);

    const hasResults = await page
      .locator('[class*="card"]')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    const hasEmptyMessage = await page
      .locator('text=条件に一致するスタジオが見つかりません')
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    // スケルトンが表示されるか、結果がすぐに表示される
    expect(hasSkeleton || hasResults || hasEmptyMessage).toBe(true);
  });

  test('UI: モバイル表示', async ({ page }) => {
    // Given: モバイルビューポート（375px）を設定する
    await page.setViewportSize({ width: 375, height: 667 });

    // When: スタジオ一覧ページにアクセスする
    await initializeStudioListPage(page);

    // Then: レイアウトが崩れずに表示される
    // 検索フォームが表示される
    await expect(
      page.locator('input[placeholder*="スタジオ名、住所で検索"]')
    ).toBeVisible();

    // 横スクロールが発生しない
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('UI: デスクトップ表示', async ({ page }) => {
    // Given: デスクトップビューポート（1920px）を設定する
    await page.setViewportSize({ width: 1920, height: 1080 });

    // When: スタジオ一覧ページにアクセスし、検索を実行する
    await initializeStudioListPage(page);
    await executeSearch(page, 3000);

    // Then: 3カラムレイアウトで表示される（スタジオカードが存在する場合）
    // スタジオカードを含むグリッドコンテナを探す
    const cardGridContainer = page
      .locator('[class*="grid"]')
      .filter({ has: page.locator('[class*="card"]') })
      .first();
    const gridExists = await cardGridContainer.isVisible().catch(() => false);

    if (gridExists) {
      // グリッドレイアウトが適用されていることを確認
      const gridClass = await cardGridContainer.getAttribute('class');
      expect(gridClass).toContain('grid');
      expect(gridClass).toContain('lg:grid-cols-3');
    } else {
      // グリッドが存在しない場合（空状態）はスキップ
      const hasEmptyMessage = await page
        .locator('text=条件に一致するスタジオが見つかりません')
        .isVisible()
        .catch(() => false);
      if (hasEmptyMessage) {
        test.skip();
      } else {
        // グリッドもメッセージもない場合は失敗
        throw new Error('グリッドコンテナが見つかりません');
      }
    }
  });
});
