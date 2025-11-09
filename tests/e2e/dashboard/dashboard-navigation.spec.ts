import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../utils/test-helpers';

test.describe('ダッシュボード機能', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto('/ja/auth/signin');
    await waitForPageLoad(page);

    // サインインページの確認
    await expect(page.getByText('アカウントにサインイン')).toBeVisible({
      timeout: 10000,
    });

    // フォーム要素の存在確認
    const emailField = page.locator('#signin-email');
    const passwordField = page.locator('#signin-password');
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();

    // 認証情報入力
    await emailField.fill('test@example.com');
    await passwordField.fill('password123');

    // Enterキーでフォーム送信
    await passwordField.press('Enter');

    // ログイン後のページ読み込み完了を待機
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // ダッシュボードへのリダイレクトを確認
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('ダッシュボード基本表示', async ({ page }) => {
    // ダッシュボードが表示されることを確認
    await expect(page.locator('text=ダッシュボード')).toBeVisible();

    // サイドバーメニューが表示されることを確認
    await expect(page.locator('nav')).toBeVisible();
  });

  test('サイドバーナビゲーション', async ({ page }) => {
    // スタジオメニューへのナビゲーション
    await page.click('text=スタジオ');
    await expect(page.url()).toContain('studios');

    // プロフィールメニューへのナビゲーション
    await page.click('text=プロフィール');
    await expect(page.url()).toContain('profile');
  });

  test('統計カード表示', async ({ page }) => {
    // 統計カードが3列で表示されることを確認
    const statsCards = page.locator('[data-testid="stats-card"]');
    await expect(statsCards).toBeVisible();

    // 3列レイアウトの確認（grid-cols-3）
    const statsContainer = page.locator(
      '.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3'
    );
    await expect(statsContainer).toBeVisible();
  });
});
