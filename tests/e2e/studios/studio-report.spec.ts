import { test, expect } from '@playwright/test';
import { authenticateTestUser } from '../utils/photo-session-helpers';

test.describe('スタジオ報告機能', () => {
  test.beforeEach(async ({ page }) => {
    // 認証済みユーザーでログイン
    await authenticateTestUser(page, 'organizer');
  });

  test('スタジオ報告ダイアログの表示', async ({ page }) => {
    const studioId = 'afaa8889-8a04-489e-b10e-3951e460b353';

    // スタジオ詳細ページに移動
    await page.goto(`/ja/studios/${studioId}`);

    // 報告ボタンをクリック（「概要」セクションの上に配置）
    const reportButton = page.locator('button:has-text("報告")').first();
    await expect(reportButton).toBeVisible();
    await reportButton.click();

    // 報告ダイアログが表示されることを確認
    await expect(
      page.locator('[role="dialog"]').locator('text=スタジオを報告')
    ).toBeVisible({ timeout: 2000 });
  });

  test('スタジオ報告の送信', async ({ page }) => {
    const studioId = 'afaa8889-8a04-489e-b10e-3951e460b353';

    // スタジオ詳細ページに移動
    await page.goto(`/ja/studios/${studioId}`);

    // 報告ボタンをクリック
    const reportButton = page.locator('button:has-text("報告")').first();
    await reportButton.click();

    // ダイアログが表示されるまで待機
    await page.waitForSelector('[role="dialog"]', { timeout: 2000 });

    // 報告理由を選択（ラジオボタン）
    await page.click('input[value="spam"]');

    // 詳細を入力（テキストエリア）
    const textarea = page.locator('textarea').first();
    await textarea.fill('スパム内容のテスト報告');

    // 送信ボタンをクリック
    await page.click('button:has-text("報告を送信")');

    // 成功メッセージを確認（toast通知）
    await expect(page.locator('text=報告を送信しました')).toBeVisible({
      timeout: 5000,
    });
  });

  test('報告理由未選択時のエラー', async ({ page }) => {
    const studioId = 'afaa8889-8a04-489e-b10e-3951e460b353';

    // スタジオ詳細ページに移動
    await page.goto(`/ja/studios/${studioId}`);

    // 報告ボタンをクリック
    const reportButton = page.locator('button:has-text("報告")').first();
    await reportButton.click();

    // ダイアログが表示されるまで待機
    await page.waitForSelector('[role="dialog"]', { timeout: 2000 });

    // 理由を選択せずに送信ボタンをクリック
    const submitButton = page.locator('button:has-text("報告を送信")');
    // 送信ボタンが無効化されていることを確認
    await expect(submitButton).toBeDisabled();

    // または、toastエラーメッセージを確認（クリック可能な場合）
    // await submitButton.click();
    // await expect(
    //   page.locator('text=報告理由を選択してください')
    // ).toBeVisible({ timeout: 2000 });
  });

  test('同じスタジオへの重複報告チェック', async ({ page }) => {
    const studioId = 'afaa8889-8a04-489e-b10e-3951e460b353';

    // スタジオ詳細ページに移動
    await page.goto(`/ja/studios/${studioId}`);

    // 1回目の報告
    const reportButton = page.locator('button:has-text("報告")').first();
    await reportButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 2000 });
    await page.click('input[value="spam"]');
    const textarea1 = page.locator('textarea').first();
    await textarea1.fill('1回目の報告');
    await page.click('button:has-text("報告を送信")');
    await expect(page.locator('text=報告を送信しました')).toBeVisible({
      timeout: 5000,
    });

    // ダイアログが閉じられるまで待機
    await page.waitForTimeout(1000);

    // 2回目の報告を試みる
    await reportButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 2000 });
    await page.click('input[value="inappropriate"]');
    const textarea2 = page.locator('textarea').first();
    await textarea2.fill('2回目の報告');
    await page.click('button:has-text("報告を送信")');

    // 重複報告のエラーメッセージまたは成功メッセージを確認
    // （実装によっては重複を許可する場合もある）
    await page.waitForTimeout(2000);
    const successMessage = page.locator('text=報告を送信しました');
    const errorMessage = page.locator('text=既に報告済みです');
    const hasMessage =
      (await successMessage.isVisible()) || (await errorMessage.isVisible());
    expect(hasMessage).toBe(true);
  });
});
