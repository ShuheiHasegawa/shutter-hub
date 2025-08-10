import { test, expect } from '@playwright/test';

test.describe('スタジオ作成機能', () => {
  test.beforeEach(async ({ page }) => {
    // organizerでログイン（スタジオ作成権限必要）
    await page.goto('/ja/login');
    await page.fill('[name="email"]', 'organizer@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('新規スタジオ作成', async ({ page }) => {
    await page.goto('/ja/studios/new');

    // 必須フィールドを入力
    await page.fill('input[name="name"]', 'テストスタジオ');
    await page.fill('textarea[name="description"]', 'テスト用スタジオの説明');
    await page.fill('input[name="address"]', '東京都渋谷区1-1-1');
    await page.selectOption('select[name="prefecture"]', '東京都');
    await page.fill('input[name="hourly_rate_min"]', '5000');
    await page.fill('input[name="hourly_rate_max"]', '10000');

    // 作成ボタンをクリック
    await page.click('button[type="submit"]');

    // 成功メッセージまたはリダイレクトを確認
    await expect(page.locator('text=作成しました')).toBeVisible({
      timeout: 5000,
    });
  });

  test('必須フィールドの検証', async ({ page }) => {
    await page.goto('/ja/studios/new');

    // 名前なしで送信
    await page.click('button[type="submit"]');

    // バリデーションエラーを確認
    await expect(page.locator('text=スタジオ名は必須です')).toBeVisible();
  });
});
