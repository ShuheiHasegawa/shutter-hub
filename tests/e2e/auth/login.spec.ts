import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../utils/test-helpers';

test.describe('認証機能', () => {
  test('正常ログイン', async ({ page }) => {
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

    // ダッシュボードにリダイレクトされることを確認
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.locator('text=ダッシュボード')).toBeVisible();
  });

  test('無効な認証情報でのログイン失敗', async ({ page }) => {
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

    // 無効な認証情報入力
    await emailField.fill('invalid@example.com');
    await passwordField.fill('wrongpassword');

    // Enterキーでフォーム送信
    await passwordField.press('Enter');

    // エラーメッセージが表示されることを確認
    await expect(
      page.locator('text=メールアドレスまたはパスワードが正しくありません')
    ).toBeVisible({ timeout: 5000 });
  });

  test('ログアウト機能', async ({ page }) => {
    // 先にログイン
    await page.goto('/ja/auth/signin');
    await waitForPageLoad(page);

    const emailField = page.locator('#signin-email');
    const passwordField = page.locator('#signin-password');
    await emailField.fill('test@example.com');
    await passwordField.fill('password123');
    await passwordField.press('Enter');

    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // ログアウト
    await page.goto('/ja/logout');

    // ログインページにリダイレクトされることを確認
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
  });
});
