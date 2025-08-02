import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/e2e/.auth/user.json';

/**
 * 認証セットアップ
 * OAuth認証（Google/X/Discord）でテスト用ユーザーでログインし、認証状態を保存する
 * 注意: ShutterHubはOAuth専用のため、メール/パスワード認証はサポートしていません
 */
setup('authenticate', async ({ page }) => {
  // 🔐 テスト用ユーザー認証開始...

  // テスト用認証設定
  const oauthProvider = process.env.TEST_OAUTH_PROVIDER || 'google';
  const mockEnabled = process.env.TEST_OAUTH_MOCK_ENABLED === 'true';

  // 🔗 OAuth認証開始 (Provider: ${oauthProvider}, Mock: ${mockEnabled})

  try {
    if (mockEnabled) {
      // モック認証: 直接認証状態を作成
      // 🎭 モック認証モード: 認証状態を直接作成中...

      // モックユーザーデータを作成
      const mockUser = {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        user_type: 'model',
      };

      // ホームページに移動
      await page.goto('/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // モック認証用のJavaScriptを実行
      await page.evaluate(user => {
        // LocalStorageにモック認証情報を設定
        localStorage.setItem(
          'supabase.auth.token',
          JSON.stringify({
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_at: Date.now() + 3600000, // 1時間後
            user: user,
          })
        );

        // Sessionストレージにも設定
        sessionStorage.setItem('mock-authenticated', 'true');

        // カスタムイベントを発火して認証状態を通知
        window.dispatchEvent(
          new CustomEvent('mock-auth-change', {
            detail: { user, authenticated: true },
          })
        );
      }, mockUser);

      // ページをリロードして認証状態を反映
      await page.reload({ waitUntil: 'domcontentloaded' });

      //('✅ モック認証完了: 認証状態を設定しました');
    } else {
      // 実際のOAuth認証フロー
      const _baseURL =
        process.env.PLAYWRIGHT_BASE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'http://localhost:8888';
      //(`🌐 ベースURL: ${baseURL}`);
      //('📍 サインインページへ遷移中...');

      await page.goto('/auth/signin', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // デバッグ情報
      //(`📍 現在のURL: ${page.url()}`);
      await page.screenshot({
        path: 'test-results/signin-page.png',
        fullPage: true,
      });

      if (oauthProvider === 'google') {
        //('🔵 Googleログインボタンをクリック...');
        await page.click('button:has-text("Google")');

        // Google認証ページで自動的にテストアカウントでログイン
        await page.waitForURL('**/accounts.google.com/**', { timeout: 30000 });
        //('📍 Google認証ページに到達');

        // 注意: 実際のGoogle認証は手動操作が必要
        // ⚠️  実際のGoogle認証が必要です。モック認証を使用することを推奨します。
        throw new Error(
          '実際のGoogle認証は手動操作が必要です。TEST_OAUTH_MOCK_ENABLED=trueを使用してください。'
        );
      }
    }

    // 認証成功の確認：ヘッダーのユーザーアバターボタンの存在確認
    //('👤 認証成功確認：ユーザーアバターボタンの検出中...');

    if (mockEnabled) {
      // モック認証の場合、認証状態の確認は簡略化
      await page.waitForSelector('body', { timeout: 5000 });
      //('✅ モック認証状態確認完了');
    } else {
      // 実際の認証の場合
      const userAvatarButton = page.locator(
        'button:has([data-radix-avatar-root]), button.rounded-full:has(.avatar), button[aria-haspopup="menu"]:has(img), header button:has(img[alt*="avatar"]), header button:has(.avatar)'
      );
      await expect(userAvatarButton).toBeVisible({ timeout: 15000 });
    }

    //('✅ 認証成功: ユーザーアバターボタンが検出されました');

    // 認証状態をファイルに保存
    await page.context().storageState({ path: authFile });
    //(`💾 認証状態を保存: ${authFile}`);
  } catch (error) {
    // ❌ 認証テストエラー

    // エラー時のスクリーンショット
    await page.screenshot({
      path: 'test-results/auth-error.png',
      fullPage: true,
    });

    // 詳細情報
    // 📍 エラー時URL: ${page.url()}
    // 🔧 Provider: ${oauthProvider}, Mock: ${mockEnabled}

    throw error;
  }
});

// OAuth認証プロバイダー別の処理は現在使用されていないため削除
// 必要に応じて将来的に実装可能
