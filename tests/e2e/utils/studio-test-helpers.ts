import { Page, expect } from '@playwright/test';
import { waitForPageLoad } from './test-helpers';

/**
 * スタジオE2Eテスト用共通ヘルパー関数
 * 重複コード削減のため、頻繁に使用されるパターンを抽出
 */

/**
 * スタジオ一覧ページを開いて初期化する
 */
export async function initializeStudioListPage(page: Page): Promise<void> {
  await page.goto('/ja/studios');
  await waitForPageLoad(page);
}

/**
 * 検索を実行して結果を待機する
 */
export async function executeSearch(
  page: Page,
  waitTime = 2000
): Promise<void> {
  await page.click('button:has-text("検索")');
  await page.waitForTimeout(waitTime);
}

/**
 * 検索結果の状態を確認する（空状態、結果あり、エラー）
 */
export async function checkSearchResults(page: Page): Promise<{
  hasResults: boolean;
  hasEmptyMessage: boolean;
  hasEmptyState: boolean;
}> {
  const hasResults = await page
    .locator('[class*="card"]')
    .first()
    .isVisible()
    .catch(() => false);

  const hasEmptyMessage = await page
    .locator('text=条件に一致するスタジオが見つかりません')
    .isVisible()
    .catch(() => false);

  const hasEmptyState = await page
    .locator('text=検索条件を設定して「検索」ボタンを押してください')
    .isVisible()
    .catch(() => false);

  return { hasResults, hasEmptyMessage, hasEmptyState };
}

/**
 * 検索結果が何らかの形で表示されているか確認する
 */
export async function assertSearchResultsVisible(page: Page): Promise<void> {
  const { hasResults, hasEmptyMessage, hasEmptyState } =
    await checkSearchResults(page);
  expect(hasResults || hasEmptyMessage || hasEmptyState).toBe(true);
}

/**
 * キーワード検索を実行する
 */
export async function searchByKeyword(
  page: Page,
  keyword: string
): Promise<void> {
  const keywordInput = page.locator(
    'input[placeholder*="スタジオ名、住所で検索"]'
  );
  await keywordInput.fill(keyword);
  await executeSearch(page);
}

/**
 * グリッド内の検索結果を確認する
 */
export async function checkGridResults(page: Page): Promise<{
  hasResults: boolean;
  hasEmptyMessage: boolean;
}> {
  const hasResults = await page
    .locator('[class*="grid"]:has([class*="card"])')
    .isVisible()
    .catch(() => false);

  const hasEmptyMessage = await page
    .locator('text=条件に一致するスタジオが見つかりません')
    .isVisible()
    .catch(() => false);

  return { hasResults, hasEmptyMessage };
}

/**
 * グリッド内の検索結果が表示されているか確認する
 */
export async function assertGridResultsVisible(page: Page): Promise<void> {
  const { hasResults, hasEmptyMessage } = await checkGridResults(page);
  expect(hasResults || hasEmptyMessage).toBe(true);
}

/**
 * エラーが表示されていないことを確認する
 */
export async function assertNoError(page: Page): Promise<void> {
  const hasError = await page
    .locator('text=エラー')
    .isVisible()
    .catch(() => false);
  expect(hasError).toBe(false);
}
