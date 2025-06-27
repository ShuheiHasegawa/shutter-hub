import { test as setup, expect, Page } from '@playwright/test';

const authFile = 'tests/e2e/.auth/user.json';

/**
 * 認証セットアップ
 * OAuth認証（Google/X/Discord）でテスト用ユーザーでログインし、認証状態を保存する
 * 注意: ShutterHub v2はOAuth専用のため、メール/パスワード認証はサポートしていません
 */
setup('authenticate', async ({ page }) => {
  console.log('🔐 テスト用ユーザー認証開始...');

  // ログインページに移動
  await page.goto('/auth/signin');

  // テスト用認証設定
  const oauthProvider = process.env.TEST_OAUTH_PROVIDER || 'google';
  const mockEnabled = process.env.TEST_OAUTH_MOCK_ENABLED === 'true';

  console.log(
    `🔗 OAuth認証開始 (Provider: ${oauthProvider}, Mock: ${mockEnabled})`
  );

  try {
    if (mockEnabled) {
      // モック認証の実行
      await performMockAuth(page, oauthProvider);
    } else {
      // 実際のOAuth認証の実行
      await performRealOAuth(page, oauthProvider);
    }

    // ログイン成功の確認（ダッシュボードまたはホームページへのリダイレクト）
    await page.waitForURL(/\/(dashboard|home|\/)/, { timeout: 15000 });

    // ユーザーメニューまたはプロフィールアイコンの存在確認
    const userMenu = page.locator(
      '[data-testid="user-menu"], [aria-label*="ユーザー"], [aria-label*="プロフィール"]'
    );
    await expect(userMenu).toBeVisible({ timeout: 10000 });

    console.log('✅ テスト用ユーザー認証完了');

    // 認証状態を保存
    await page.context().storageState({ path: authFile });
  } catch (error) {
    console.error('❌ 認証セットアップ失敗:', error);
    throw new Error(`OAuth認証セットアップに失敗しました: ${error}`);
  }
});

/**
 * モック認証の実行
 * テスト環境でのOAuth認証をシミュレート
 */
async function performMockAuth(page: Page, provider: string) {
  console.log(`🧪 モック認証実行中 (${provider})...`);

  // プロバイダーに応じたボタンをクリック
  const buttonMap = {
    google: 'button:has-text("Googleでサインイン")',
    twitter: 'button:has-text("X (Twitter)でサインイン")',
    discord: 'button:has-text("Discordでサインイン")',
  };

  const buttonSelector = buttonMap[provider as keyof typeof buttonMap];
  if (!buttonSelector) {
    throw new Error(`サポートされていないOAuthプロバイダー: ${provider}`);
  }

  await page.click(buttonSelector);

  // モック認証の場合、実際の外部サービスにリダイレクトされる前に
  // テスト用の認証状態を直接設定する
  // 注意: 実際の実装では、Supabaseのテスト用認証エンドポイントを使用

  console.log(`✅ モック認証完了 (${provider})`);
}

/**
 * 実際のOAuth認証の実行
 * 開発環境での実際のOAuth フローを実行
 */
async function performRealOAuth(page: Page, provider: string) {
  console.log(`🌐 実際のOAuth認証実行中 (${provider})...`);

  // プロバイダーに応じたボタンをクリック
  const buttonMap = {
    google: 'button:has-text("Googleでサインイン")',
    twitter: 'button:has-text("X (Twitter)でサインイン")',
    discord: 'button:has-text("Discordでサインイン")',
  };

  const buttonSelector = buttonMap[provider as keyof typeof buttonMap];
  if (!buttonSelector) {
    throw new Error(`サポートされていないOAuthプロバイダー: ${provider}`);
  }

  await page.click(buttonSelector);

  // OAuth認証フローの処理
  // 注意: 実際の認証では外部サービス（Google/X/Discord）のページに遷移
  // テスト環境では適切なテスト用アカウント設定が必要

  if (provider === 'google') {
    await handleGoogleAuth(page);
  } else if (provider === 'twitter') {
    await handleTwitterAuth(page);
  } else if (provider === 'discord') {
    await handleDiscordAuth(page);
  }

  console.log(`✅ 実際のOAuth認証完了 (${provider})`);
}

/**
 * Google OAuth認証の処理
 */
async function handleGoogleAuth(page: Page) {
  try {
    // Google認証ページでの処理
    // 実際のテスト環境では、テスト用Googleアカウントの設定が必要
    console.log('🔄 Google認証フロー処理中...');

    // Googleの認証ページが表示されるまで待機
    await page.waitForURL(/accounts\.google\.com/, { timeout: 10000 });

    // テスト用アカウントの情報を入力
    // 注意: 実際の実装時にはテスト用Googleアカウントの設定が必要
  } catch (error) {
    console.warn('⚠️ Google OAuth認証をスキップ（テスト環境設定が必要）');
    // モック認証にフォールバック
    throw error;
  }
}

/**
 * X (Twitter) OAuth認証の処理
 */
async function handleTwitterAuth(page: Page) {
  try {
    console.log('🔄 X (Twitter)認証フロー処理中...');

    // X認証ページでの処理
    await page.waitForURL(/twitter\.com/, { timeout: 10000 });
  } catch (error) {
    console.warn('⚠️ X OAuth認証をスキップ（テスト環境設定が必要）');
    throw error;
  }
}

/**
 * Discord OAuth認証の処理
 */
async function handleDiscordAuth(page: Page) {
  try {
    console.log('🔄 Discord認証フロー処理中...');

    // Discord認証ページでの処理
    await page.waitForURL(/discord\.com/, { timeout: 10000 });
  } catch (error) {
    console.warn('⚠️ Discord OAuth認証をスキップ（テスト環境設定が必要）');
    throw error;
  }
}
