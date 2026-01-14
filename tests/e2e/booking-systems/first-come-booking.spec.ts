import { test, expect, Page } from '@playwright/test';
import { authenticateTestUser } from '../utils/photo-session-helpers';
import { waitForPageLoad, generateTestId } from '../utils/test-helpers';
import {
  fillPhotoSessionForm,
  configureSlots,
  publishPhotoSession,
  generatePhotoSessionTestData,
} from '../utils/photo-session-helpers';

/**
 * 先着順予約システム E2Eテスト
 *
 * テスト観点表（test-code-generation.mdc準拠）
 *
 * | Case ID | Input / Precondition | Perspective | Expected Result | Notes |
 * |---------|---------------------|-------------|-----------------|-------|
 * | FC-N-01 | 空席あり、有効な予約 | 正常系 | 予約成功 | - |
 * | FC-N-02 | 複数ユーザー順次予約 | 正常系 | 全員予約成功 | - |
 * | FC-B-01 | 残り1席で5人同時予約 | 境界値 | 1人のみ成功 | 楽観的ロック |
 * | FC-B-02 | 定員=0（満席） | 境界値 | エラー表示 | - |
 * | FC-A-01 | 既に予約済みユーザー | 異常系 | エラー表示 | - |
 * | FC-A-02 | 未認証ユーザー | 異常系 | ログイン要求 | - |
 * | FC-A-03 | 終了済み撮影会 | 異常系 | エラー表示 | - |
 * | FC-W-01 | 満席時キャンセル待ち案内 | 正常系 | キャンセル待ち登録可能 | - |
 */

test.describe('先着順予約システム', () => {
  let organizerPage: Page;
  let userPage: Page;
  let testId: string;

  test.beforeEach(async ({ browser }) => {
    organizerPage = await browser.newPage();
    userPage = await browser.newPage();
    testId = generateTestId('fc');
  });

  test.afterEach(async () => {
    await organizerPage.close();
    await userPage.close();
  });

  test('正常系: 基本的な先着順予約フロー', async () => {
    // Given: 開催者でログインして撮影会を作成
    // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
    await authenticateTestUser(organizerPage, 'organizer');

    const sessionData = generatePhotoSessionTestData('first_come', testId, 1);

    await organizerPage.goto('/ja/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);

    expect(sessionId).toBeTruthy();

    // When: 参加者でログインして予約
    // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
    await authenticateTestUser(userPage, 'model');

    await userPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(userPage);

    // 予約ボタンをクリック
    const bookingButton = userPage.locator(
      'button:has-text("予約する"), button:has-text("予約")'
    );
    await bookingButton.click();

    // 予約確認ダイアログ（存在する場合）
    const confirmButton = userPage.locator(
      'button:has-text("確定"), button:has-text("予約を確定")'
    );
    if ((await confirmButton.count()) > 0) {
      await confirmButton.click();
    }

    // Then: 予約成功の確認
    await expect(
      userPage.locator(
        ':has-text("予約"), :has-text("完了"), :has-text("成功")'
      )
    ).toBeVisible({ timeout: 10000 });

    // 在庫減少の確認
    await userPage.reload();
    await waitForPageLoad(userPage);
    const participantCount = await userPage
      .locator('[data-testid="participant-count"], :has-text("/")')
      .first()
      .textContent();
    // バックトラッキングを避けるため、より明確なパターンを使用
    expect(participantCount).toMatch(/^\d+\/\d+$/);
  });

  test('正常系: 複数ユーザーによる順次予約', async ({ browser }) => {
    // Given: 開催者でログインして撮影会を作成（定員5名）
    // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
    await authenticateTestUser(organizerPage, 'organizer');

    const sessionData = generatePhotoSessionTestData('first_come', testId, 1);
    sessionData.slots[0].maxParticipants = 5;

    await organizerPage.goto('/ja/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);

    // When: 3人のユーザーが順次予約
    const users = ['model', 'photographer'];
    const pages: Page[] = [];

    for (const userType of users) {
      const page = await browser.newPage();
      // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
      await authenticateTestUser(page, userType as 'model' | 'photographer');
      pages.push(page);
    }

    for (const page of pages) {
      await page.goto(`/ja/photo-sessions/${sessionId}`);
      await waitForPageLoad(page);

      const bookingButton = page.locator('button:has-text("予約する")');
      await bookingButton.click();

      await page.waitForTimeout(1000);
    }

    // Then: 全員が予約成功していることを確認
    await organizerPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(organizerPage);

    const participantCount = await organizerPage
      .locator('[data-testid="participant-count"]')
      .textContent();
    expect(participantCount).toContain('2/5');

    // クリーンアップ
    for (const page of pages) {
      await page.close();
    }
  });

  test('境界値: 残り1席で5人同時予約（楽観的ロック）', async ({ browser }) => {
    // Given: 開催者でログインして撮影会を作成（定員1名）
    // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
    await authenticateTestUser(organizerPage, 'organizer');

    const sessionData = generatePhotoSessionTestData('first_come', testId, 1);
    sessionData.slots[0].maxParticipants = 1;

    await organizerPage.goto('/ja/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);

    // When: 5人のユーザーが同時に予約を試行
    const pages: Page[] = [];
    const userTypes: Array<'model' | 'photographer'> = [
      'model',
      'photographer',
      'model',
      'photographer',
      'model',
    ];

    for (const userType of userTypes) {
      const page = await browser.newPage();
      // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
      await authenticateTestUser(page, userType);
      pages.push(page);
    }

    // 同時に予約ボタンをクリック
    const bookingPromises = pages.map(async page => {
      try {
        await page.goto(`/ja/photo-sessions/${sessionId}`);
        await waitForPageLoad(page);
        const bookingButton = page.locator('button:has-text("予約する")');
        await bookingButton.click();
        await page.waitForTimeout(2000);
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    });

    const results = await Promise.allSettled(bookingPromises);

    // Then: 1人のみが予約成功していることを確認
    const successCount = results.filter(
      result => result.status === 'fulfilled' && result.value.success
    ).length;

    expect(successCount).toBe(1);

    // 在庫確認
    await organizerPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(organizerPage);
    const participantCount = await organizerPage
      .locator('[data-testid="participant-count"]')
      .textContent();
    expect(participantCount).toContain('1/1');

    // クリーンアップ
    for (const page of pages) {
      await page.close();
    }
  });

  test('境界値: 満席時の予約エラー表示', async () => {
    // Given: 開催者でログインして撮影会を作成（定員1名）
    // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
    await authenticateTestUser(organizerPage, 'organizer');

    const sessionData = generatePhotoSessionTestData('first_come', testId, 1);
    sessionData.slots[0].maxParticipants = 1;

    await organizerPage.goto('/ja/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);

    // 1人目が予約
    await authenticateTestUser(userPage, 'model');
    await userPage.waitForURL('**/dashboard**', { timeout: 10000 });
    await userPage.waitForTimeout(500);

    await userPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(userPage);

    const bookingButton = userPage.locator('button:has-text("予約する")');
    await bookingButton.click();
    await userPage.waitForTimeout(2000);

    // When: 2人目が予約を試行
    const secondUserPage = await userPage.context().newPage();
    // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
    await authenticateTestUser(secondUserPage, 'photographer');

    await secondUserPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(secondUserPage);

    // Then: 満席表示またはエラーメッセージ
    const fullMessage = secondUserPage.locator(
      ':has-text("満席"), :has-text("定員"), :has-text("予約できません")'
    );
    await expect(fullMessage.first()).toBeVisible({ timeout: 5000 });

    await secondUserPage.close();
  });

  test('異常系: 既に予約済みユーザーの重複予約', async () => {
    // Given: 開催者でログインして撮影会を作成
    // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
    await authenticateTestUser(organizerPage, 'organizer');

    const sessionData = generatePhotoSessionTestData('first_come', testId, 1);

    await organizerPage.goto('/ja/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);

    // 1回目の予約
    // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
    await authenticateTestUser(userPage, 'model');

    await userPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(userPage);

    const bookingButton = userPage.locator('button:has-text("予約する")');
    await bookingButton.click();
    await userPage.waitForTimeout(2000);

    // When: 同じユーザーが再度予約を試行
    await userPage.reload();
    await waitForPageLoad(userPage);

    // Then: 予約済み表示またはエラーメッセージ
    const bookedMessage = userPage.locator(
      ':has-text("予約済み"), :has-text("既に"), :has-text("キャンセル")'
    );
    await expect(bookedMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('正常系: 満席時キャンセル待ち案内', async () => {
    // Given: 開催者でログインして撮影会を作成（定員1名）
    // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
    await authenticateTestUser(organizerPage, 'organizer');

    const sessionData = generatePhotoSessionTestData('first_come', testId, 1);
    sessionData.slots[0].maxParticipants = 1;

    await organizerPage.goto('/ja/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);

    // 1人目が予約
    await authenticateTestUser(userPage, 'model');
    await userPage.waitForURL('**/dashboard**', { timeout: 10000 });
    await userPage.waitForTimeout(500);

    await userPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(userPage);

    const bookingButton = userPage.locator('button:has-text("予約する")');
    await bookingButton.click();
    await userPage.waitForTimeout(2000);

    // When: 2人目が満席の撮影会を確認
    const secondUserPage = await userPage.context().newPage();
    // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
    await authenticateTestUser(secondUserPage, 'photographer');

    await secondUserPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(secondUserPage);

    // Then: キャンセル待ち登録ボタンが表示される
    const waitlistButton = secondUserPage.locator(
      'button:has-text("キャンセル待ち"), button:has-text("待機")'
    );
    await expect(waitlistButton.first()).toBeVisible({ timeout: 5000 });

    await secondUserPage.close();
  });

  test('正常系: 予約キャンセル', async () => {
    // Given: 開催者でログインして撮影会を作成
    // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
    await authenticateTestUser(organizerPage, 'organizer');

    const sessionData = generatePhotoSessionTestData('first_come', testId, 1);

    await organizerPage.goto('/ja/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);

    // 予約
    // 待機処理はauthenticateTestUser内で完結（waitForLoadState + waitForURL）
    await authenticateTestUser(userPage, 'model');

    await userPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(userPage);

    const bookingButton = userPage.locator('button:has-text("予約する")');
    await bookingButton.click();
    await userPage.waitForTimeout(2000);

    // When: 予約をキャンセル
    await userPage.goto('/ja/bookings');
    await waitForPageLoad(userPage);

    const cancelButton = userPage.locator(
      'button:has-text("キャンセル"), [data-testid="cancel-booking"]'
    );
    if ((await cancelButton.count()) > 0) {
      await cancelButton.first().click();

      const confirmButton = userPage.locator(
        'button:has-text("確定"), button:has-text("キャンセルを確定")'
      );
      if ((await confirmButton.count()) > 0) {
        await confirmButton.click();
      }
    }

    // Then: キャンセル成功の確認
    await expect(
      userPage.locator(':has-text("キャンセル"), :has-text("完了")')
    ).toBeVisible({ timeout: 5000 });
  });
});
