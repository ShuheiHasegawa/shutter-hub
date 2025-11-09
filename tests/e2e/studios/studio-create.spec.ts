import { test, expect } from '@playwright/test';
import { authenticateTestUser } from '../utils/photo-session-helpers';

test.describe('スタジオ作成機能', () => {
  test.beforeEach(async ({ page }) => {
    // 認証済みユーザーでログイン（誰でもスタジオ作成可能）
    // organizerユーザーでログイン（どのユーザータイプでも可）
    await authenticateTestUser(page, 'organizer');
  });

  test('新規スタジオ作成', async ({ page }) => {
    // 認証後のページ遷移を確実に待機
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // セッションを保持するために、gotoの前に少し待機
    await page.waitForTimeout(500);

    // リダイレクトを許可してページ遷移
    await page.goto('/ja/studios/create', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // 認証チェック：サインインページにリダイレクトされていないか確認
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      // 認証が切れている場合は再認証
      await authenticateTestUser(page, 'organizer');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await page.waitForTimeout(500);
      await page.goto('/ja/studios/create', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
    }

    // フォームが表示されるまで待機
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });

    // 必須フィールドを入力
    await page.fill('input[name="name"]', 'テストスタジオ');
    await page.fill('textarea[name="description"]', 'テスト用スタジオの説明');

    // 都道府県選択（Shadcn/ui Selectコンポーネント - Radix UIベース）
    // プレースホルダー「都道府県を選択」を持つcomboboxを探す
    const prefectureCombobox = page
      .getByRole('combobox')
      .filter({ hasText: /都道府県/ });
    await prefectureCombobox.waitFor({ timeout: 5000 });
    await prefectureCombobox.click();

    // ドロップダウンが開くまで待機（SelectContentのViewportが表示される）
    await page.waitForSelector('[role="listbox"]', { timeout: 5000 });

    // 東京都を選択（SelectItem - role="option"）
    const tokyoOption = page.getByRole('option', {
      name: '東京都',
      exact: true,
    });
    await tokyoOption.waitFor({ timeout: 5000 });
    await tokyoOption.click();

    // 市区町村入力
    await page.fill('input[name="city"]', '渋谷区');

    // 住所入力
    await page.fill('input[name="address"]', '渋谷1-1-1');

    // 料金入力（オプショナル）
    await page.fill('input[name="hourly_rate_min"]', '5000');
    await page.fill('input[name="hourly_rate_max"]', '10000');

    // 作成ボタンをクリック（ActionBarの固定フッターボタン）
    // ActionBarはformの外側にあるため、formの外側のボタンを探す
    // または、固定フッター（fixed bottom）のボタンを直接探す
    const actionBarButton = page
      .locator('div[class*="fixed"][class*="bottom"] button:has-text("保存")')
      .first();
    if ((await actionBarButton.count()) > 0) {
      await actionBarButton.waitFor({ timeout: 5000 });
      await actionBarButton.click();
    } else {
      // フォールバック: formの外側のボタン（最後のボタン）
      const saveButton = page.getByRole('button', { name: '保存' }).last();
      await saveButton.waitFor({ timeout: 5000 });
      await saveButton.click();
    }

    // スタジオ詳細ページにリダイレクトされることを確認（これが成功の証拠）
    await page.waitForURL(/\/studios\/[^\/]+/, { timeout: 10000 });

    // 成功メッセージの確認（複数要素がある場合は最初の要素を確認）
    const successMessage = page
      .getByText('スタジオが作成されました', { exact: false })
      .first();
    await expect(successMessage).toBeVisible({
      timeout: 5000,
    });
  });

  test('必須フィールドの検証', async ({ page }) => {
    // 認証後のページ遷移を確実に待機
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    await page.waitForTimeout(500);
    await page.goto('/ja/studios/create', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // 認証チェック
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      await authenticateTestUser(page, 'organizer');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await page.waitForTimeout(500);
      await page.goto('/ja/studios/create', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
    }

    // フォームが表示されるまで待機
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });

    // 名前なしで送信（ActionBarの固定フッターボタン）
    // ActionBarはformの外側にあるため、formの外側のボタンを探す
    // または、固定フッター（fixed bottom）のボタンを直接探す
    const actionBarButton = page
      .locator('div[class*="fixed"][class*="bottom"] button:has-text("保存")')
      .first();
    if ((await actionBarButton.count()) > 0) {
      await actionBarButton.waitFor({ timeout: 5000 });
      await actionBarButton.click();
    } else {
      // フォールバック: formの外側のボタン（最後のボタン）
      const saveButton = page.getByRole('button', { name: '保存' }).last();
      await saveButton.waitFor({ timeout: 5000 });
      await saveButton.click();
    }

    // バリデーションエラーを確認
    await expect(page.locator('text=スタジオ名は必須です')).toBeVisible({
      timeout: 5000,
    });
  });
});
