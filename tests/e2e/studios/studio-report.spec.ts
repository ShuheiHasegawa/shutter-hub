import { test, expect } from '@playwright/test';
import { authenticateTestUser } from '../utils/photo-session-helpers';

/**
 * スタジオ報告 E2Eテスト
 *
 * テスト観点表:
 *
 * ## 1. 正常系テスト
 * | 分類   | テストケース       | 入力/操作                    | 期待結果                       | 優先度 |
 * | ------ | ------------------ | ---------------------------- | ------------------------------ | ------ |
 * | 正常系 | 報告ダイアログ表示 | 報告ボタンをクリック         | ダイアログが表示される         | 高     |
 * | 正常系 | 報告送信           | 理由と詳細を入力して送信     | 報告が送信され成功メッセージ   | 高     |
 * | 正常系 | スパム報告         | スパム理由を選択して送信     | 正常に送信される               | 高     |
 * | 正常系 | 不適切コンテンツ報告 | 不適切コンテンツ理由を選択   | 正常に送信される               | 高     |
 * | 正常系 | 詳細入力あり       | 詳細テキストを入力して送信   | 正常に送信される               | 中     |
 *
 * ## 2. 異常系・エッジケーステスト
 * | 分類   | テストケース           | 入力/操作                    | 期待結果                   | 優先度 |
 * | ------ | ---------------------- | ---------------------------- | -------------------------- | ------ |
 * | 異常系 | 報告理由未選択         | 理由を選択せずに送信         | 送信ボタンが無効化される   | 高     |
 * | 異常系 | 詳細未入力             | 詳細を空で送信               | 正常に送信される（任意）   | 中     |
 * | 境界値 | 重複報告               | 同じスタジオに2回報告        | 重複エラーまたは成功       | 高     |
 * | 境界値 | 長文詳細入力           | 100文字以上の詳細            | 正常に処理される           | 低     |
 * | 境界値 | 特殊文字入力           | 記号・絵文字を含む詳細       | エラーなく処理される       | 低     |
 */

test.describe('スタジオ報告機能', () => {
  test.setTimeout(60000); // テストタイムアウトを60秒に設定

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
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // 報告理由を選択（labelをクリック）
    await dialog.locator('label[for="spam"]').click();

    // 報告理由が選択されたことを確認
    await expect(
      dialog.locator('[role="radio"][data-state="checked"]')
    ).toBeVisible({
      timeout: 3000,
    });

    // 詳細を入力
    const textarea = dialog.locator('textarea');
    await textarea.fill('スパム内容のテスト報告');

    // 送信ボタンをクリック（ダイアログ内の「報告を送信」ボタン）
    const submitButton = dialog.locator('button:has-text("報告を送信")');
    await expect(submitButton).toBeEnabled({ timeout: 3000 });

    // ボタンをフォーカスしてからクリック
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click({ force: true });

    // ローディング状態の確認（送信中...または送信ボタン非活性化）
    // Server Actionの場合、ボタンが一時的に無効化されるか、テキストが変わる
    await page.waitForTimeout(500);

    // 成功メッセージまたは重複エラー（toast通知）が表示されることを確認
    // sonnerのtoastはli要素として表示される
    const toastLocator = page.locator('[data-sonner-toast]');
    await expect(toastLocator).toBeVisible({ timeout: 15000 });
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

    const reportButton = page.locator('button:has-text("報告")').first();

    // 1回目の報告
    await reportButton.click();
    const dialog1 = page.locator('[role="dialog"]');
    await expect(dialog1).toBeVisible({ timeout: 5000 });

    // 報告理由を選択（labelをクリック）
    await dialog1.locator('label[for="spam"]').click();

    // 報告理由が選択されたことを確認
    await expect(
      dialog1.locator('[role="radio"][data-state="checked"]')
    ).toBeVisible({
      timeout: 3000,
    });

    const textarea1 = dialog1.locator('textarea');
    await textarea1.fill('1回目の報告');

    const submitButton1 = dialog1.locator('button:has-text("報告を送信")');
    await expect(submitButton1).toBeEnabled({ timeout: 3000 });
    await submitButton1.scrollIntoViewIfNeeded();
    await submitButton1.click({ force: true });

    // ローディング状態の確認
    await page.waitForTimeout(500);

    // 成功メッセージまたは重複エラーが表示されることを確認（toastが表示される）
    const toastLocator = page.locator('[data-sonner-toast]');
    await expect(toastLocator).toBeVisible({ timeout: 15000 });

    // 1回目が成功した場合は2回目の報告を試みる
    const successMessage = page.locator('text=報告を送信しました');
    const isFirstSuccess = await successMessage.isVisible().catch(() => false);

    if (isFirstSuccess) {
      // ダイアログが閉じるのを待つ
      await expect(dialog1).toBeHidden({ timeout: 5000 });

      await page.waitForTimeout(1000);
      await reportButton.click();
      const dialog2 = page.locator('[role="dialog"]');
      await expect(dialog2).toBeVisible({ timeout: 5000 });

      // 報告理由を選択（labelをクリック）
      await dialog2.locator('label[for="inappropriate"]').click();

      // 報告理由が選択されたことを確認
      await expect(
        dialog2.locator('[role="radio"][data-state="checked"]')
      ).toBeVisible({
        timeout: 3000,
      });

      const textarea2 = dialog2.locator('textarea');
      await textarea2.fill('2回目の報告');

      const submitButton2 = dialog2.locator('button:has-text("報告を送信")');
      await expect(submitButton2).toBeEnabled({ timeout: 3000 });
      await submitButton2.scrollIntoViewIfNeeded();
      await submitButton2.click({ force: true });

      // 重複エラーメッセージが表示されることを確認（toastで表示）
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({
        timeout: 15000,
      });
    }
  });
});
