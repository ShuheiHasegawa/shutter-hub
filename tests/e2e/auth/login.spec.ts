import { test, expect } from '@playwright/test';

test.describe('認証機能', () => {
  test('正常ログイン', async ({ page }) => {
    await page.goto('/ja/login');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // ダッシュボードにリダイレクトされることを確認
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=ダッシュボード')).toBeVisible();
  });

  test('無効な認証情報でのログイン失敗', async ({ page }) => {
    await page.goto('/ja/login');

    await page.fill('[name="email"]', 'invalid@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=認証に失敗')).toBeVisible();
  });

  test('ログアウト機能', async ({ page }) => {
    // 先にログイン
    await page.goto('/ja/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // ログアウト
    await page.goto('/ja/logout');

    // ログインページにリダイレクトされることを確認
    await page.waitForURL('**/login');
  });
});
