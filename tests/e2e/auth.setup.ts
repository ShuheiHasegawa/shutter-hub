import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/e2e/.auth/user.json';

/**
 * 認証セットアップ
 * テスト用ユーザーでログインし、認証状態を保存する
 */
setup('authenticate', async ({ page }) => {
  console.log('🔐 テスト用ユーザー認証開始...');

  // ログインページに移動
  await page.goto('/auth/signin');

  // テスト用認証情報
  const testEmail = process.env.TEST_USER_EMAIL || 'test@shutterhub.app';
  const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';

  try {
    // メール認証フォームの入力
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    // ログインボタンクリック
    await page.click('button[type="submit"]');

    // ログイン成功の確認（ダッシュボードまたはホームページへのリダイレクト）
    await page.waitForURL(/\/(dashboard|home|\/)/, { timeout: 10000 });

    // ユーザーメニューまたはプロフィールアイコンの存在確認
    const userMenu = page.locator(
      '[data-testid="user-menu"], [aria-label*="ユーザー"], [aria-label*="プロフィール"]'
    );
    await expect(userMenu).toBeVisible({ timeout: 5000 });

    console.log('✅ テスト用ユーザー認証完了');

    // 認証状態を保存
    await page.context().storageState({ path: authFile });
  } catch (error) {
    console.error('❌ 認証セットアップ失敗:', error);

    // 代替認証方法: OAuth認証（Google）
    console.log('🔄 OAuth認証を試行...');
    try {
      await page.goto('/auth/signin');
      await page.click(
        'button:has-text("Googleでログイン"), button:has-text("Google")'
      );

      // OAuth認証フローは実際のテスト環境では設定が必要
      // ここではモック認証またはテスト用OAuth設定を使用

      await page.waitForURL(/\/(dashboard|home|\/)/, { timeout: 15000 });
      await page.context().storageState({ path: authFile });

      console.log('✅ OAuth認証完了');
    } catch (oauthError) {
      console.error('❌ OAuth認証も失敗:', oauthError);
      throw new Error('認証セットアップに失敗しました');
    }
  }
});
