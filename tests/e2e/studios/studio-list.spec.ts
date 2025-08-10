import { test, expect } from '@playwright/test';

test.describe('スタジオ一覧機能', () => {
  test('スタジオ一覧の表示', async ({ page }) => {
    await page.goto('/ja/studios');

    // スタジオカードが表示されることを確認
    await expect(
      page.locator('[data-testid="studio-card"]').first()
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test('スタジオ検索機能', async ({ page }) => {
    await page.goto('/ja/studios');

    // 検索フィールドがある場合のテスト
    const searchInput = page.locator('input[placeholder*="検索"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('テスト');
      await page.keyboard.press('Enter');

      // 検索結果の確認
      await page.waitForTimeout(1000);
      // 検索結果に応じたアサーションを追加
    }
  });

  test('都道府県フィルター', async ({ page }) => {
    await page.goto('/ja/studios');

    // 都道府県フィルターがある場合のテスト
    const prefectureFilter = page.locator('select[name="prefecture"]');
    if (await prefectureFilter.isVisible()) {
      await prefectureFilter.selectOption('東京都');
      await page.waitForTimeout(1000);

      // フィルター結果の確認
      // 東京都のスタジオのみ表示されることを確認
    }
  });
});
