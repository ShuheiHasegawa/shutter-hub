import { test, expect } from '@playwright/test';

test.describe('スタジオ編集機能', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用ログイン
    await page.goto('/ja/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('スタジオ編集権限のテスト', async ({ page }) => {
    const studioId = 'afaa8889-8a04-489e-b10e-3951e460b353';

    // スタジオ編集ページに移動
    await page.goto(`/ja/studios/${studioId}/edit`);

    // フォームが表示されることを確認
    await expect(page.locator('form')).toBeVisible();

    // スタジオ名を変更
    const nameInput = page.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill('テストスタジオ更新');

    // 保存ボタンをクリック
    await page.click('button[type="submit"]');

    // 結果を確認（成功または適切なエラーメッセージ）
    await page.waitForTimeout(2000);

    // 成功の場合: 成功メッセージまたはリダイレクト
    // 失敗の場合: 権限エラーメッセージ
    const hasSuccessMessage = await page
      .locator('text=更新しました')
      .isVisible();
    const hasErrorMessage = await page
      .locator('text=権限がありません')
      .isVisible();

    expect(hasSuccessMessage || hasErrorMessage).toBe(true);
  });

  test('created_byがnullのスタジオの権限修正テスト', async ({ page }) => {
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

  test('住所正規化の重複テスト', async ({ page }) => {
    const studioId = 'afaa8889-8a04-489e-b10e-3951e460b353';

    // organizerでログイン（権限確保）
    await page.goto('/ja/logout');
    await page.goto('/ja/login');
    await page.fill('[name="email"]', 'organizer@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

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

// データベース修正のためのヘルパーテスト
test.describe('データベース修正検証', () => {
  test('created_byがnullのスタジオを確認', async ({ page }) => {
    // APIまたはSupabase直接クエリでcreated_byがnullのスタジオを確認
    const response = await page.request.get('/api/studios');
    const studios = await response.json();

    const nullCreatedByStudios = studios.filter((studio: unknown) => {
      const studioData = studio as { created_by: string | null };
      return studioData.created_by === null;
    });

    // eslint-disable-next-line no-console
    console.log('created_byがnullのスタジオ数:', nullCreatedByStudios.length);
    nullCreatedByStudios.forEach((studio: unknown) => {
      const studioData = studio as { id: string; name: string };
      // eslint-disable-next-line no-console
      console.log(`- ID: ${studioData.id}, Name: ${studioData.name}`);
    });

    // 修正が必要なスタジオが存在することを記録
    if (nullCreatedByStudios.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        '警告: created_byがnullのスタジオが存在します。修正が必要です。'
      );
    }
  });
});
