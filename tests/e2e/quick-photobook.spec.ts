import { test, expect } from '@playwright/test';
import { authenticateTestUser } from './utils/photo-session-helpers';

test.describe('クイックフォトブック機能', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザー認証（モデル）
    await authenticateTestUser(page, 'model');
  });

  test('フォトブック一覧ページの表示', async ({ page }) => {
    await page.goto('/photobooks/quick');

    // ページタイトル確認
    await expect(page.locator('h1')).toContainText('クイックフォトブック');

    // 新規作成カードの表示確認
    await expect(
      page.locator('text=新しいクイックフォトブックを作成')
    ).toBeVisible();

    // アドバンスド版リンクの確認
    await expect(page.locator('text=アドバンスド版を見る')).toBeVisible();
  });

  test('フォトブック作成フロー', async ({ page }) => {
    await page.goto('/photobooks/quick/create');

    // フォーム要素の確認
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('input[name="max_pages"]')).toBeVisible();

    // プラン制限情報の表示確認
    await expect(page.locator('text=現在のプラン制限')).toBeVisible();

    // フォーム入力
    await page.fill('input[name="title"]', 'テスト用フォトブック');
    await page.fill('textarea[name="description"]', 'E2Eテスト用の説明文');
    await page.fill('input[name="max_pages"]', '5');

    // 作成ボタンクリック
    await page.click('button[type="submit"]');

    // 編集ページへのリダイレクト確認
    await expect(page).toHaveURL(/\/photobooks\/quick\/[^\/]+\/edit/);

    // 作成成功メッセージの確認
    await expect(
      page.locator('text=フォトブックが作成されました')
    ).toBeVisible();
  });

  test('画像アップロード機能', async ({ page }) => {
    // まずフォトブックを作成
    await page.goto('/photobooks/quick/create');
    await page.fill('input[name="title"]', 'アップロードテスト用');
    await page.click('button[type="submit"]');

    // 編集ページで画像アップロード
    await expect(page).toHaveURL(/\/photobooks\/quick\/[^\/]+\/edit/);

    // アップロードエリアの確認
    await expect(page.locator('text=画像をドラッグ&ドロップ')).toBeVisible();

    // ファイル選択（テスト画像）
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/e2e/fixtures/test-image.jpg');

    // アップロード完了の確認
    await expect(page.locator('text=画像を追加しました')).toBeVisible({
      timeout: 10000,
    });

    // 画像カードの表示確認
    await expect(page.locator('[data-testid="image-card"]')).toBeVisible();
  });

  test('画像順番入れ替え機能', async ({ page }) => {
    // フォトブック作成と複数画像アップロード
    await page.goto('/photobooks/quick/create');
    await page.fill('input[name="title"]', '順番テスト用');
    await page.click('button[type="submit"]');

    // 複数画像をアップロード
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      'tests/e2e/fixtures/test-image-1.jpg',
      'tests/e2e/fixtures/test-image-2.jpg',
    ]);

    // アップロード完了待機
    await expect(page.locator('text=2枚の画像を追加しました')).toBeVisible({
      timeout: 15000,
    });

    // 画像カードが2つ表示されることを確認
    await expect(page.locator('[data-testid="image-card"]')).toHaveCount(2);

    // 2番目の画像の上移動ボタンをクリック
    await page
      .locator(
        '[data-testid="image-card"]:nth-child(2) [data-testid="move-up"]'
      )
      .click();

    // 順番変更成功メッセージ
    await expect(page.locator('text=順番の変更')).toBeVisible();
  });

  test('プラン制限のチェック', async ({ page }) => {
    await page.goto('/photobooks/quick');

    // プラン制限情報の表示
    await expect(page.locator('text=現在のプラン制限')).toBeVisible();

    // フリープランの制限表示
    await expect(page.locator('text=5 ページ')).toBeVisible();
    await expect(page.locator('text=3 冊')).toBeVisible();
  });

  test('プレビュー機能', async ({ page }) => {
    // フォトブック作成・画像アップロード
    await page.goto('/photobooks/quick/create');
    await page.fill('input[name="title"]', 'プレビューテスト');
    await page.click('button[type="submit"]');

    // 画像アップロード
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/e2e/fixtures/test-image.jpg');
    await expect(page.locator('text=画像を追加しました')).toBeVisible({
      timeout: 10000,
    });

    // プレビュータブクリック（デスクトップ）
    if (await page.locator('[data-testid="preview-tab"]').isVisible()) {
      await page.click('[data-testid="preview-tab"]');

      // プレビュー表示の確認
      await expect(
        page.locator('[data-testid="photobook-preview"]')
      ).toBeVisible();
    }

    // モバイル用タブの確認
    if (await page.locator('text=プレビュー').isVisible()) {
      await page.click('text=プレビュー');
      await expect(
        page.locator('[data-testid="photobook-preview"]')
      ).toBeVisible();
    }
  });

  test('フォトブック公開・非公開', async ({ page }) => {
    // フォトブック作成
    await page.goto('/photobooks/quick/create');
    await page.fill('input[name="title"]', '公開テスト');
    await page.click('button[type="submit"]');

    // 設定で公開切り替え
    await page.click('text=設定');

    // 公開スイッチを確認
    const publishSwitch = page.locator('[data-testid="publish-switch"]');
    await expect(publishSwitch).toBeVisible();

    // 公開状態に切り替え
    await publishSwitch.click();
    await page.click('text=設定を保存');

    // 保存成功メッセージ
    await expect(page.locator('text=設定を保存しました')).toBeVisible();
  });

  test('レスポンシブ対応', async ({ page }) => {
    // モバイルビューポート設定
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/photobooks/quick');

    // モバイルレイアウトの確認
    await expect(page.locator('.grid-cols-1')).toBeVisible();

    // タブレットビューポート
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.md\\:grid-cols-2')).toBeVisible();

    // デスクトップビューポート
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.locator('.lg\\:grid-cols-3')).toBeVisible();
  });

  test('エラーハンドリング', async ({ page }) => {
    await page.goto('/photobooks/quick/create');

    // 空のタイトルで送信
    await page.click('button[type="submit"]');

    // バリデーションエラーメッセージ
    await expect(page.locator('text=タイトルは必須です')).toBeVisible();

    // 無効なページ数
    await page.fill('input[name="max_pages"]', '0');
    await expect(page.locator('text=最低1ページは必要です')).toBeVisible();

    // 上限を超えたページ数
    await page.fill('input[name="max_pages"]', '20');
    await expect(page.locator('text=最大15ページまでです')).toBeVisible();
  });
});
