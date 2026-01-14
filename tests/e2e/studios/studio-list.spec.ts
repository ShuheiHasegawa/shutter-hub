import { test, expect } from '@playwright/test';
import { authenticateTestUser } from '../utils/photo-session-helpers';
import { StudioListPage } from '../pages/StudioListPage';
import { StudioDetailPage } from '../pages/StudioDetailPage';
import { StudioCreatePage } from '../pages/StudioCreatePage';

/**
 * スタジオ一覧 E2Eテスト（Page Object Model + PC/SP分離）
 *
 * テスト観点表:
 *
 * ## 1. 基本機能テスト（正常系）
 * | Case ID | Input / Precondition | Perspective | Expected Result | PC/SP |
 * |---------|----------------------|-------------|-----------------|-------|
 * | TC-N-01 | ページアクセス | 正常 | タイトル・検索フォーム・ボタンが表示される | 両方 |
 * | TC-N-02 | 検索ボタンクリック（フィルター未設定） | 正常 | スタジオ一覧または空状態が表示される | 両方 |
 * | TC-N-03 | 有効なキーワード入力（例: "スタジオ"） | 正常 | 該当スタジオのみ表示される | 両方 |
 * | TC-N-04 | 都道府県フィルター選択（例: 東京都） | 正常 | 該当スタジオのみ表示される | 両方 |
 * | TC-N-05 | ソートオプション変更（名前順） | 正常 | 順序が変更される | 両方 |
 * | TC-N-06 | 「もっと見る」ボタンクリック | 正常 | 追加スタジオが読み込まれる | 両方 |
 * | TC-N-07 | スタジオカードクリック | 正常 | 詳細ページに遷移 | 両方 |
 * | TC-N-08 | リセットボタンクリック | 正常 | フィルターが初期化される | 両方 |
 * | TC-N-09 | 「新しいスタジオを追加」ボタンクリック | 正常 | 作成ページに遷移 | 両方 |
 *
 * ## 2. 境界値テスト
 * | Case ID | Input / Precondition | Perspective | Expected Result | PC/SP |
 * |---------|----------------------|-------------|-----------------|-------|
 * | TC-B-01 | キーワード: 空文字 ("") | Boundary - 空 | 全てのスタジオが表示される | 両方 |
 * | TC-B-02 | キーワード: 1文字 ("あ") | Boundary - 最小値 | 該当スタジオが表示される | 両方 |
 * | TC-B-03 | キーワード: 100文字 | Boundary - 最大値想定 | 正常に検索実行される | 両方 |
 * | TC-B-04 | キーワード: 特殊文字・記号・絵文字 | Boundary - 特殊入力 | エラーなく処理される | 両方 |
 * | TC-B-05 | 検索結果: 0件 | Boundary - 最小値 | 空状態メッセージが表示される | 両方 |
 *
 * ## 3. 異常系テスト
 * | Case ID | Input / Precondition | Perspective | Expected Result | PC/SP |
 * |---------|----------------------|-------------|-----------------|-------|
 * | TC-A-01 | 存在しないキーワード | 異常 | 空状態メッセージが表示される | 両方 |
 * | TC-A-02 | 検索未実行状態 | 初期状態 | 初期メッセージまたは自動検索結果 | 両方 |
 *
 * ## 4. UI/レスポンシブテスト
 * | Case ID | Input / Precondition | Perspective | Expected Result | PC/SP |
 * |---------|----------------------|-------------|-----------------|-------|
 * | TC-UI-01 | スタジオカード表示確認 | 正常 | 必要情報が表示される | 両方 |
 * | TC-UI-02 | ローディング状態確認 | 正常 | スケルトンまたはローディング表示 | 両方 |
 * | TC-UI-03 | モバイル表示（375px × 667px） | Boundary - 最小ビューポート | レイアウト崩れなし | SP |
 * | TC-UI-04 | デスクトップ表示（1920px × 1080px） | Boundary - 最大ビューポート | 3カラムレイアウト | PC |
 */

test.describe('スタジオ一覧機能', () => {
  // ============================================================================
  // PC版テスト
  // ============================================================================
  test.describe('PC', () => {
    test.beforeEach(async ({ page }) => {
      // Given: テストユーザーで認証する
      await authenticateTestUser(page, 'organizer');
    });

    // ==========================================================================
    // 1. 正常系テスト
    // ==========================================================================

    test('TC-N-01: 正常系 - ページ初期表示', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // Then: ページ初期表示要素が全て表示される
      await studioListPage.assertInitialPageLoaded();
    });

    test('TC-N-02: 正常系 - 検索実行', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 検索ボタンをクリックする
      await studioListPage.executeSearch(3000);

      // Then: スタジオ一覧または空状態が表示される
      await studioListPage.assertSearchResultsVisible();
    });

    test('TC-N-03: 正常系 - キーワード検索', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: キーワードを入力して検索を実行する
      await studioListPage.searchByKeyword('スタジオ');

      // Then: 検索結果が表示される
      await studioListPage.assertGridResultsVisible();
    });

    test('TC-N-04: 正常系 - 都道府県フィルター', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 都道府県を選択して検索を実行する
      await studioListPage.selectPrefecture('東京都');
      await studioListPage.executeSearch(3000);

      // Then: 検索結果が表示される
      const { hasResults, hasEmptyMessage } =
        await studioListPage.getSearchResultsState();
      expect(hasResults || hasEmptyMessage).toBe(true);
    });

    test('TC-N-05: 正常系 - ソート機能', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスし、検索を実行する
      await studioListPage.open();
      await studioListPage.executeSearch();

      // When: ソートオプションを変更する
      await studioListPage.selectSort('名前順（A-Z）');
      await studioListPage.executeSearch();

      // Then: ソートが適用される（検索結果が再表示される）
      await studioListPage.assertGridResultsVisible();
    });

    test('TC-N-06: 正常系 - もっと見る', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスし、検索を実行する
      await studioListPage.open();
      await studioListPage.executeSearch();

      // When: 「もっと見る」ボタンが表示されている場合、クリックする
      const hasLoadMore = await studioListPage.hasLoadMoreButton();

      if (hasLoadMore) {
        await studioListPage.clickLoadMore();

        // Then: 追加のスタジオが読み込まれる
        await expect(
          studioListPage.loadMoreButton.or(studioListPage.emptyMessage)
        ).toBeVisible({ timeout: 5000 });
      } else {
        // ボタンが表示されない場合は、結果が少ないことを確認
        await studioListPage.assertGridResultsVisible();
      }
    });

    test('TC-N-07: 正常系 - スタジオ詳細遷移', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスし、検索を実行する
      await studioListPage.open();
      await studioListPage.executeSearch();

      // When: スタジオカードが存在する場合、クリックする
      const hasCards = await studioListPage.hasStudioCards();

      if (hasCards) {
        await studioListPage.goToStudioDetail(0);

        // Then: スタジオ詳細ページに遷移する
        const studioDetailPage = new StudioDetailPage(page, isMobile);
        await studioDetailPage.assertDetailPageLoaded();
      } else {
        test.skip();
      }
    });

    test('TC-N-08: 正常系 - リセットボタン', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスし、フィルターを設定する
      await studioListPage.open();
      await studioListPage.searchInput.fill('テストキーワード');
      await page.waitForTimeout(500);

      // When: リセットボタンをクリックする
      await studioListPage.resetFilters();

      // Then: フィルターが初期化される
      await studioListPage.assertFiltersReset();
    });

    test('TC-N-09: 正常系 - スタジオ作成ボタン', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 新規作成ボタンをクリックする
      await studioListPage.goToCreateStudio();

      // Then: スタジオ作成ページに遷移する
      const studioCreatePage = new StudioCreatePage(page, isMobile);
      await studioCreatePage.assertCreatePageLoaded();
    });

    // ==========================================================================
    // 2. 境界値テスト
    // ==========================================================================

    test('TC-B-01: 境界値 - キーワード: 空文字', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 空文字で検索を実行する
      await studioListPage.searchByKeyword('');

      // Then: 全てのスタジオまたは空状態が表示される
      await studioListPage.assertGridResultsVisible();
    });

    test('TC-B-02: 境界値 - キーワード: 1文字', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 1文字で検索を実行する
      await studioListPage.searchByKeyword('あ');

      // Then: 該当スタジオが表示される
      await studioListPage.assertGridResultsVisible();
    });

    test('TC-B-03: 境界値 - キーワード: 100文字', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 100文字以上の長文キーワードを入力して検索を実行する
      const longKeyword = 'あ'.repeat(100);
      await studioListPage.searchByKeyword(longKeyword);

      // Then: エラーなく検索が実行される
      await studioListPage.assertNoError();
      await studioListPage.assertGridResultsVisible();
    });

    test('TC-B-04: 境界値 - キーワード: 特殊文字・記号・絵文字', async ({
      page,
    }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 特殊文字・記号・絵文字を含むキーワードを入力して検索を実行する
      const specialKeyword = '!@#$%^&*()_+-=[]{}|;:,.<>?🎉📸';
      await studioListPage.searchByKeyword(specialKeyword);

      // Then: エラーなく処理される
      await studioListPage.assertNoError();
      await studioListPage.assertGridResultsVisible();
    });

    test('TC-B-05: 境界値 - 検索結果: 0件', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 存在しないキーワードで検索を実行する
      await studioListPage.searchByKeyword('存在しないスタジオ名12345');

      // Then: 空状態メッセージが表示される
      await studioListPage.assertEmptyState();
    });

    // ==========================================================================
    // 3. 異常系テスト
    // ==========================================================================

    test('TC-A-01: 異常系 - 存在しないキーワード', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 存在しないキーワードで検索を実行する
      await studioListPage.searchByKeyword('存在しないスタジオ名12345');

      // Then: 空状態メッセージが表示される
      await studioListPage.assertEmptyState();
    });

    test('TC-A-02: 異常系 - 検索未実行状態', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする（検索ボタンを押さない）
      await studioListPage.open();

      // Then: 初期メッセージまたは自動検索結果が表示される
      await page.waitForTimeout(1000);
      await studioListPage.assertSearchResultsVisible();
    });

    // ==========================================================================
    // 4. UI/レスポンシブテスト
    // ==========================================================================

    test('TC-UI-01: UI - スタジオカード表示', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスし、検索を実行する
      await studioListPage.open();
      await studioListPage.executeSearch(3000);

      // When: スタジオカードまたは空状態メッセージが表示されている
      const hasEmptyMessage = await studioListPage.emptyMessage
        .isVisible()
        .catch(() => false);

      if (hasEmptyMessage) {
        test.skip();
        return;
      }

      const hasCards = await studioListPage.hasStudioCards();

      if (hasCards) {
        // Then: カード内に必要な情報が表示される
        await studioListPage.assertStudioCardContent(0);
      } else {
        test.skip();
      }
    });

    test('TC-UI-02: UI - ローディング状態', async ({ page }) => {
      const isMobile = false;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 検索を実行する
      await studioListPage.searchButton.click();

      // Then: ローディングスケルトンまたは結果がすぐに表示される
      await studioListPage.assertLoadingOrResults();
    });

    test('TC-UI-04: UI - デスクトップ表示（1920px × 1080px）', async ({
      page,
    }) => {
      const isMobile = false;

      // Given: デスクトップビューポート（1920px）を設定する
      await page.setViewportSize({ width: 1920, height: 1080 });

      const studioListPage = new StudioListPage(page, isMobile);

      // When: スタジオ一覧ページにアクセスし、検索を実行する
      await studioListPage.open();
      await studioListPage.executeSearch(3000);

      // Then: 3カラムレイアウトで表示される
      const hasCards = await studioListPage.hasStudioCards();

      if (hasCards) {
        await studioListPage.assertThreeColumnLayout();
      } else {
        const hasEmptyMessage = await studioListPage.emptyMessage
          .isVisible()
          .catch(() => false);
        if (hasEmptyMessage) {
          test.skip();
        }
      }
    });
  });

  // ============================================================================
  // SP版テスト
  // ============================================================================
  test.describe('SP', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test.beforeEach(async ({ page }, testInfo) => {
      // タイムアウトを60秒に延長（SP版はビューポート変更によりリソース再読み込みが発生するため）
      testInfo.setTimeout(60000);

      // Given: テストユーザーで認証する
      await authenticateTestUser(page, 'organizer');
    });

    // ==========================================================================
    // 1. 正常系テスト
    // ==========================================================================

    test('TC-N-01: 正常系 - ページ初期表示', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // Then: ページ初期表示要素が全て表示される
      await studioListPage.assertInitialPageLoaded();
    });

    test('TC-N-02: 正常系 - 検索実行', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 検索ボタンをクリックする
      await studioListPage.executeSearch(3000);

      // Then: スタジオ一覧または空状態が表示される
      await studioListPage.assertSearchResultsVisible();
    });

    test('TC-N-03: 正常系 - キーワード検索', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: キーワードを入力して検索を実行する
      await studioListPage.searchByKeyword('スタジオ');

      // Then: 検索結果が表示される
      await studioListPage.assertGridResultsVisible();
    });

    test('TC-N-04: 正常系 - 都道府県フィルター', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 都道府県を選択して検索を実行する
      await studioListPage.selectPrefecture('東京都');
      await studioListPage.executeSearch(3000);

      // Then: 検索結果が表示される
      const { hasResults, hasEmptyMessage } =
        await studioListPage.getSearchResultsState();
      expect(hasResults || hasEmptyMessage).toBe(true);
    });

    test('TC-N-05: 正常系 - ソート機能', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスし、検索を実行する
      await studioListPage.open();
      await studioListPage.executeSearch();

      // When: ソートオプションを変更する
      await studioListPage.selectSort('名前順（A-Z）');
      await studioListPage.executeSearch();

      // Then: ソートが適用される
      await studioListPage.assertGridResultsVisible();
    });

    test('TC-N-06: 正常系 - もっと見る', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスし、検索を実行する
      await studioListPage.open();
      await studioListPage.executeSearch();

      // When: 「もっと見る」ボタンが表示されている場合、クリックする
      const hasLoadMore = await studioListPage.hasLoadMoreButton();

      if (hasLoadMore) {
        await studioListPage.clickLoadMore();

        // Then: 追加のスタジオが読み込まれる
        await expect(
          studioListPage.loadMoreButton.or(studioListPage.emptyMessage)
        ).toBeVisible({ timeout: 5000 });
      } else {
        await studioListPage.assertGridResultsVisible();
      }
    });

    test('TC-N-07: 正常系 - スタジオ詳細遷移', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスし、検索を実行する
      await studioListPage.open();
      await studioListPage.executeSearch();

      // When: スタジオカードが存在する場合、クリックする
      const hasCards = await studioListPage.hasStudioCards();

      if (hasCards) {
        await studioListPage.goToStudioDetail(0);

        // Then: スタジオ詳細ページに遷移する
        const studioDetailPage = new StudioDetailPage(page, isMobile);
        await studioDetailPage.assertDetailPageLoaded();
      } else {
        test.skip();
      }
    });

    test('TC-N-08: 正常系 - リセットボタン', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスし、フィルターを設定する
      await studioListPage.open();
      // SP版ではsearchByKeyword()を使用（シートを開く処理が含まれている）
      await studioListPage.searchByKeyword('テストキーワード');
      await page.waitForTimeout(500);

      // When: リセットボタンをクリックする
      await studioListPage.resetFilters();

      // Then: フィルターが初期化される
      await studioListPage.assertFiltersReset();
    });

    test('TC-N-09: 正常系 - スタジオ作成ボタン', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 新規作成ボタンをクリックする
      await studioListPage.goToCreateStudio();

      // Then: スタジオ作成ページに遷移する
      const studioCreatePage = new StudioCreatePage(page, isMobile);
      await studioCreatePage.assertCreatePageLoaded();
    });

    // ==========================================================================
    // 2. 境界値テスト
    // ==========================================================================

    test('TC-B-01: 境界値 - キーワード: 空文字', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 空文字で検索を実行する
      await studioListPage.searchByKeyword('');

      // Then: 全てのスタジオまたは空状態が表示される
      await studioListPage.assertGridResultsVisible();
    });

    test('TC-B-02: 境界値 - キーワード: 1文字', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 1文字で検索を実行する
      await studioListPage.searchByKeyword('あ');

      // Then: 該当スタジオが表示される
      await studioListPage.assertGridResultsVisible();
    });

    test('TC-B-03: 境界値 - キーワード: 100文字', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 100文字以上の長文キーワードを入力して検索を実行する
      const longKeyword = 'あ'.repeat(100);
      await studioListPage.searchByKeyword(longKeyword);

      // Then: エラーなく検索が実行される
      await studioListPage.assertNoError();
      await studioListPage.assertGridResultsVisible();
    });

    test('TC-B-04: 境界値 - キーワード: 特殊文字・記号・絵文字', async ({
      page,
    }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 特殊文字・記号・絵文字を含むキーワードを入力して検索を実行する
      const specialKeyword = '!@#$%^&*()_+-=[]{}|;:,.<>?🎉📸';
      await studioListPage.searchByKeyword(specialKeyword);

      // Then: エラーなく処理される
      await studioListPage.assertNoError();
      await studioListPage.assertGridResultsVisible();
    });

    test('TC-B-05: 境界値 - 検索結果: 0件', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 存在しないキーワードで検索を実行する
      await studioListPage.searchByKeyword('存在しないスタジオ名12345');

      // Then: 空状態メッセージが表示される
      await studioListPage.assertEmptyState();
    });

    // ==========================================================================
    // 3. 異常系テスト
    // ==========================================================================

    test('TC-A-01: 異常系 - 存在しないキーワード', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 存在しないキーワードで検索を実行する
      await studioListPage.searchByKeyword('存在しないスタジオ名12345');

      // Then: 空状態メッセージが表示される
      await studioListPage.assertEmptyState();
    });

    test('TC-A-02: 異常系 - 検索未実行状態', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする（検索ボタンを押さない）
      await studioListPage.open();

      // Then: 初期メッセージまたは自動検索結果が表示される
      await page.waitForTimeout(1000);
      await studioListPage.assertSearchResultsVisible();
    });

    // ==========================================================================
    // 4. UI/レスポンシブテスト
    // ==========================================================================

    test('TC-UI-01: UI - スタジオカード表示', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスし、検索を実行する
      await studioListPage.open();
      await studioListPage.executeSearch(3000);

      // When: スタジオカードまたは空状態メッセージが表示されている
      const hasEmptyMessage = await studioListPage.emptyMessage
        .isVisible()
        .catch(() => false);

      if (hasEmptyMessage) {
        test.skip();
        return;
      }

      const hasCards = await studioListPage.hasStudioCards();

      if (hasCards) {
        // Then: カード内に必要な情報が表示される
        await studioListPage.assertStudioCardContent(0);
      } else {
        test.skip();
      }
    });

    test('TC-UI-02: UI - ローディング状態', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // When: 検索を実行する
      // SP版ではexecuteSearch()を使用（モバイルフィルターシートを開いて適用）
      await studioListPage.executeSearch();

      // Then: ローディングスケルトンまたは結果がすぐに表示される
      await studioListPage.assertLoadingOrResults();
    });

    test('TC-UI-03: UI - モバイル表示（375px × 667px）', async ({ page }) => {
      const isMobile = true;
      const studioListPage = new StudioListPage(page, isMobile);

      // Given: モバイルビューポート（375px）を設定する（test.useで設定済み）
      // When: スタジオ一覧ページにアクセスする
      await studioListPage.open();

      // Then: レイアウトが崩れずに表示される
      // SP版ではモバイルフィルターボタンが表示される（検索入力はシート内）
      await expect(studioListPage.mobileFilterButton).toBeVisible();

      // 横スクロールが発生しない
      await studioListPage.assertNoHorizontalScroll();
    });
  });
});
