import { test, expect } from '@playwright/test';

test.describe('権限管理機能', () => {
  test('created_byがnullのスタジオの権限修正テスト', async ({ page }) => {
    // テスト用ログイン
    await page.goto('/ja/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // まず、created_byがnullのスタジオを確認
    const response = await page.request.get(
      '/api/studios/afaa8889-8a04-489e-b10e-3951e460b353'
    );
    const studio = await response.json();

    // eslint-disable-next-line no-console
    console.log('スタジオ情報:', studio);

    // created_byがnullの場合の対処を確認
    if (studio.created_by === null) {
      // eslint-disable-next-line no-console
      console.log('created_byがnullのスタジオが見つかりました');

      // この場合、organizerまたは管理者のみ編集可能であることを確認
      await page.goto(`/ja/studios/${studio.id}/edit`);

      // 権限エラーが表示されることを確認（photographerユーザーの場合）
      await expect(page.locator('text=権限がありません')).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('organizerユーザーでの編集権限テスト', async ({ page }) => {
    // organizerでログイン
    await page.goto('/ja/logout');
    await page.goto('/ja/login');
    await page.fill('[name="email"]', 'organizer@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    const studioId = 'afaa8889-8a04-489e-b10e-3951e460b353';
    await page.goto(`/ja/studios/${studioId}/edit`);

    // organizerは編集可能であることを確認
    await expect(page.locator('form')).toBeVisible();

    const nameInput = page.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill('Organizer更新テスト');

    await page.click('button[type="submit"]');

    // 成功メッセージを確認
    await expect(page.locator('text=更新しました')).toBeVisible({
      timeout: 5000,
    });
  });

  test('スタジオ作成者での編集権限テスト', async ({ page }) => {
    // テスト用ログイン
    await page.goto('/ja/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 新しいスタジオを作成してテスト
    await page.goto('/ja/studios/new');

    // スタジオ作成
    await page.fill('input[name="name"]', '権限テスト用スタジオ');
    await page.fill('textarea[name="description"]', 'テスト用の説明');
    await page.fill('input[name="address"]', '東京都渋谷区1-1-1');
    await page.selectOption('select[name="prefecture"]', '東京都');
    await page.click('button[type="submit"]');

    // 作成成功を確認
    await expect(page.locator('text=作成しました')).toBeVisible({
      timeout: 5000,
    });

    // 作成したスタジオのIDを取得（URLから）
    const url = page.url();
    const studioId = url.match(/studios\/([^\/]+)/)?.[1];

    if (studioId) {
      // 作成者として編集可能であることを確認
      await page.goto(`/ja/studios/${studioId}/edit`);

      const nameInput = page.locator('input[name="name"]');
      await nameInput.clear();
      await nameInput.fill('作成者による更新テスト');

      await page.click('button[type="submit"]');

      // 成功メッセージを確認
      await expect(page.locator('text=更新しました')).toBeVisible({
        timeout: 5000,
      });
    }
  });
});
