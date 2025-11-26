import { test, expect } from '@playwright/test';
import { authenticateTestUser } from '../utils/photo-session-helpers';
import { getTestUser } from '../config/test-users';

// テスト環境用Logger（photo-session-helpers.tsと同じ定義）
/* eslint-disable no-console */
const Logger = {
  info: (message: string) => console.log(`ℹ️ ${message}`),
  error: (message: string) => console.error(`❌ ${message}`),
  warn: (message: string) => console.warn(`⚠️ ${message}`),
};
/* eslint-enable no-console */

// テストタイムアウトを延長（認証処理に時間がかかる場合がある）
test.describe.configure({ timeout: 60000 }); // 60秒

test.describe('認証機能', () => {
  test('正常ログイン（organizer）', async ({ page }) => {
    // 使用する認証情報を確認
    const testUser = getTestUser('organizer');
    Logger.info('🔍 テスト認証情報確認:');
    Logger.info(`   - メールアドレス: ${testUser.email}`);
    Logger.info(
      `   - パスワード: ${testUser.password ? '***（設定済み）' : '❌ 未設定'}`
    );

    // authenticateTestUser関数を使用してログイン
    await authenticateTestUser(page, 'organizer');

    // ダッシュボードまたはプロフィールページに遷移していることを確認
    const currentUrl = page.url();
    expect(
      currentUrl.includes('/dashboard') || currentUrl.includes('/profile')
    ).toBeTruthy();

    // サインインページではないことを確認
    expect(currentUrl.includes('/auth/signin')).toBeFalsy();
  });

  test('正常ログイン（photographer）', async ({ page }) => {
    // 使用する認証情報を確認
    const testUser = getTestUser('photographer');
    Logger.info('🔍 テスト認証情報確認:');
    Logger.info(`   - メールアドレス: ${testUser.email}`);
    Logger.info(
      `   - パスワード: ${testUser.password ? '***（設定済み）' : '❌ 未設定'}`
    );

    // photographerユーザーでログイン
    await authenticateTestUser(page, 'photographer');

    // ダッシュボードまたはプロフィールページに遷移していることを確認
    const currentUrl = page.url();
    expect(
      currentUrl.includes('/dashboard') || currentUrl.includes('/profile')
    ).toBeTruthy();
  });

  test('正常ログイン（model）', async ({ page }) => {
    // 使用する認証情報を確認
    const testUser = getTestUser('model');
    Logger.info('🔍 テスト認証情報確認:');
    Logger.info(`   - メールアドレス: ${testUser.email}`);
    Logger.info(
      `   - パスワード: ${testUser.password ? '***（設定済み）' : '❌ 未設定'}`
    );

    // modelユーザーでログイン
    await authenticateTestUser(page, 'model');

    // ダッシュボードまたはプロフィールページに遷移していることを確認
    const currentUrl = page.url();
    expect(
      currentUrl.includes('/dashboard') || currentUrl.includes('/profile')
    ).toBeTruthy();
  });

  test('無効な認証情報でのログイン失敗', async ({ page }) => {
    await page.goto('/ja/auth/signin', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // サインインページの確認
    await expect(page.getByText('アカウントにサインイン')).toBeVisible({
      timeout: 10000,
    });

    // フォーム要素の存在確認
    const emailField = page.locator('#signin-email');
    const passwordField = page.locator('#signin-password');
    const submitButton = page
      .locator('form button[type="submit"]')
      .or(page.getByRole('button', { name: 'ログイン' }))
      .first();

    await expect(emailField).toBeVisible({ timeout: 10000 });
    await expect(passwordField).toBeVisible({ timeout: 10000 });
    await expect(submitButton).toBeVisible({ timeout: 10000 });

    // 無効な認証情報入力
    await emailField.fill('invalid@example.com');
    await emailField.blur();
    await page.waitForTimeout(300);

    await passwordField.fill('wrongpassword');
    await passwordField.blur();
    await page.waitForTimeout(300);

    // ログインボタンが有効になるまで待機
    await expect(submitButton).toBeEnabled({ timeout: 3000 });

    // フォーム送信
    await passwordField.press('Enter');
    await page.waitForTimeout(1000);

    // エラーメッセージが表示されることを確認
    await expect(
      page.locator('text=メールアドレスまたはパスワードが正しくありません')
    ).toBeVisible({ timeout: 5000 });

    // サインインページに留まっていることを確認
    const currentUrl = page.url();
    expect(currentUrl.includes('/auth/signin')).toBeTruthy();
  });

  test('ログアウト機能', async ({ page }) => {
    // 先にログイン
    await authenticateTestUser(page, 'organizer');

    // ダッシュボードに遷移していることを確認
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    // ログアウト
    await page.goto('/ja/logout', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // ログインページにリダイレクトされることを確認
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
  });

  test('認証後のセッション維持', async ({ page }) => {
    // ログイン
    await authenticateTestUser(page, 'organizer');

    // ダッシュボードに遷移していることを確認
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    // 別のページに移動
    await page.goto('/ja/studios', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // サインインページにリダイレクトされていないことを確認
    const currentUrl = page.url();
    expect(currentUrl.includes('/auth/signin')).toBeFalsy();
  });
});
