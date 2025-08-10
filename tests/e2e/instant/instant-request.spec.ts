import { test, expect } from '@playwright/test';

test.describe('即座撮影リクエスト機能', () => {
  test('即座撮影リクエスト基本フロー', async ({ page }) => {
    await page.goto('/ja/instant');

    // ページが読み込まれることを確認
    await expect(page.locator('h1')).toContainText('即座撮影');

    // ゲスト機能のテスト（認証なしでアクセス可能）
    await expect(page.locator('text=リクエスト')).toBeVisible();
  });

  test('カメラマン一覧表示', async ({ page }) => {
    await page.goto('/ja/instant');

    // カメラマンカードが表示されることを確認
    const photographerCards = page.locator('[data-testid="photographer-card"]');

    // 少なくとも1つのカードが表示されることを期待
    await expect(photographerCards.first()).toBeVisible({ timeout: 10000 });
  });
});
