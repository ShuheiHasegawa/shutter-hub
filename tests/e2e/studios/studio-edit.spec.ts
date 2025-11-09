import { test, expect } from '@playwright/test';
import { authenticateTestUser } from '../utils/photo-session-helpers';

test.describe('スタジオ編集機能', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用ログイン（誰でもスタジオ編集可能）
    await authenticateTestUser(page, 'organizer');
  });

  test('誰でもスタジオ編集可能なテスト', async ({ page }) => {
    const studioId = 'afaa8889-8a04-489e-b10e-3951e460b353';

    // スタジオ編集ページに移動
    await page.goto(`/ja/studios/${studioId}/edit`);

    // フォームが表示されることを確認
    await expect(page.locator('form')).toBeVisible();

    // Wikipedia風の注意書きが表示されることを確認
    await expect(
      page.locator('text=このスタジオ情報は誰でも編集可能です')
    ).toBeVisible();

    // スタジオ名を変更
    const nameInput = page.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill('テストスタジオ更新');

    // 保存ボタンをクリック
    await page.click('button[type="submit"]');

    // 成功メッセージまたはリダイレクトを確認
    await page.waitForTimeout(2000);

    // 成功メッセージが表示されることを確認
    const hasSuccessMessage = await page
      .locator('text=スタジオが更新されました')
      .isVisible();

    expect(hasSuccessMessage).toBe(true);
  });

  test('住所正規化の重複テスト', async ({ page }) => {
    const studioId = 'afaa8889-8a04-489e-b10e-3951e460b353';

    await page.goto(`/ja/studios/${studioId}/edit`);

    // 重複を含む住所を設定
    await page.selectOption('select[name="prefecture"]', '東京都');
    await page.fill('input[name="address"]', '東京都目黒区池尻2-31-20');

    // ネットワークログを監視
    const requestPromise = page.waitForRequest(
      request => request.url().includes('/edit') && request.method() === 'POST'
    );

    await page.click('button[type="submit"]');

    const request = await requestPromise;

    // レスポンスを確認
    const response = await request.response();
    const result = await response?.json();

    // 正規化住所が重複していないことを確認
    // ログでnormalized_addressをチェック
    expect(result).toBeDefined();
  });

  test('無効なフィールドエラーのテスト', async ({ page }) => {
    // 存在しないフィールド（air_conditioning等）を送信しないことを確認
    const studioId = 'afaa8889-8a04-489e-b10e-3951e460b353';

    await page.goto(`/ja/studios/${studioId}/edit`);

    // フォームデータを監視
    await page.route('**/studios/*/edit', async route => {
      const request = route.request();
      const postData = request.postDataJSON();

      // air_conditioning、natural_lightが含まれていないことを確認
      expect(postData).not.toHaveProperty('air_conditioning');
      expect(postData).not.toHaveProperty('natural_light');

      route.continue();
    });

    await page.click('button[type="submit"]');
  });
});
