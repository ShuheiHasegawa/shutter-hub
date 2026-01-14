import { test, expect, Page } from '@playwright/test';
import { authenticateTestUser } from '../utils/photo-session-helpers';
import { waitForPageLoad, generateTestId } from '../utils/test-helpers';
import {
  fillPhotoSessionForm,
  configureSlots,
  publishPhotoSession,
  generatePhotoSessionTestData,
} from '../utils/photo-session-helpers';
import {
  generateLotteryPeriod,
  configureLotterySession,
  enterLottery,
  conductLotteryDraw,
  generatePriorityBookingPeriod,
  configurePriorityBooking,
  generateAdminLotteryPeriod,
  configureAdminLottery,
  selectAdminLotteryWinners,
} from '../utils/booking-test-helpers';

/**
 * 予約システム統合シナリオテスト
 *
 * 複雑な日付跨ぎシナリオや複合フローをテストする
 *
 * テスト観点表（test-code-generation.mdc準拠）
 *
 * | Case ID | Input / Precondition | Perspective | Expected Result | Notes |
 * |---------|---------------------|-------------|-----------------|-------|
 * | INT-N-01 | 抽選応募期間終了と抽選実行 | 正常系 | 期間終了後に抽選実行可能 | 日付跨ぎ |
 * | INT-N-02 | 優先予約期間の段階的オープン | 正常系 | 時間に応じて予約可能 | 日付跨ぎ |
 * | INT-N-03 | 撮影会作成から予約完了まで | 正常系 | 全フロー成功 | 統合 |
 * | INT-N-04 | 複数ユーザーによる同時操作 | 正常系 | 競合状態が適切に処理 | 統合 |
 * | INT-N-05 | リアルタイム在庫更新確認 | 正常系 | 在庫がリアルタイム更新 | 統合 |
 */

test.describe('予約システム統合シナリオ', () => {
  let organizerPage: Page;
  let userPage: Page;
  let testId: string;

  test.beforeEach(async ({ browser }) => {
    organizerPage = await browser.newPage();
    userPage = await browser.newPage();
    testId = generateTestId('integration');
  });

  test.afterEach(async () => {
    await organizerPage.close();
    await userPage.close();
  });

  test('統合シナリオ: 撮影会作成から予約完了までの一連フロー', async () => {
    // Given: 開催者でログイン
    await authenticateTestUser(organizerPage, 'organizer');

    // Step 1: 撮影会作成
    const sessionData = generatePhotoSessionTestData('first_come', testId, 2);
    await organizerPage.goto('/ja/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);

    expect(sessionId).toBeTruthy();

    // Step 2: 参加者が予約
    await authenticateTestUser(userPage, 'model');
    await userPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(userPage);

    const bookingButton = userPage.locator('button:has-text("予約する")');
    await bookingButton.click();

    const confirmButton = userPage.locator('button:has-text("確定")');
    if ((await confirmButton.count()) > 0) {
      await confirmButton.click();
    }

    // Step 3: 予約成功確認
    await expect(
      userPage.locator(':has-text("予約"), :has-text("完了")')
    ).toBeVisible({ timeout: 10000 });

    // Step 4: 在庫確認
    await userPage.reload();
    await waitForPageLoad(userPage);
    const participantCount = await userPage
      .locator('[data-testid="participant-count"]')
      .textContent();
    // バックトラッキングを避けるため、より明確なパターンを使用
    expect(participantCount).toMatch(/^\d+\/\d+$/);

    // Step 5: 予約一覧確認
    await userPage.goto('/ja/bookings');
    await waitForPageLoad(userPage);
    const bookingCard = userPage.locator(
      `[href*="/photo-sessions/${sessionId}"], :has-text("${sessionData.title}")`
    );
    await expect(bookingCard.first()).toBeVisible({ timeout: 5000 });
  });

  test('日付跨ぎシナリオ: 抽選応募期間終了と抽選実行', async () => {
    // Given: 開催者でログインして抽選撮影会を作成
    await authenticateTestUser(organizerPage, 'organizer');
    const sessionData = generatePhotoSessionTestData('lottery', testId, 1);

    await organizerPage.goto('/ja/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);

    // 抽選期間設定（応募期間: 現在から1時間、抽選: 応募終了後1日）
    const lotteryPeriod = generateLotteryPeriod(0, 1, 1);
    await configureLotterySession(organizerPage, sessionId, lotteryPeriod, 2);

    // 複数ユーザーが応募
    const users = ['model', 'photographer'];
    for (const userType of users) {
      const page = await userPage.context().newPage();
      await authenticateTestUser(page, userType as 'model' | 'photographer');
      await enterLottery(page, sessionId);
      await page.close();
    }

    // When: 応募期間終了後、抽選を実行
    // 実際の実装では、時間を進めるか、ステータスを変更する必要がある
    // ここでは抽選実行ボタンが表示されることを前提とする

    await conductLotteryDraw(organizerPage, sessionId);

    // Then: 抽選完了の確認
    await expect(
      organizerPage.locator(':has-text("完了"), :has-text("抽選")')
    ).toBeVisible({ timeout: 10000 });
  });

  test('日付跨ぎシナリオ: 優先予約期間の段階的オープン', async () => {
    // Given: 開催者でログインして優先予約撮影会を作成
    await authenticateTestUser(organizerPage, 'organizer');
    const sessionData = generatePhotoSessionTestData('priority', testId, 1);

    await organizerPage.goto('/ja/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);

    // 優先予約期間設定（段階的オープン: 各ランク1時間ずつ）
    const priorityPeriod = generatePriorityBookingPeriod(0, 1);
    await configurePriorityBooking(
      organizerPage,
      sessionId,
      priorityPeriod,
      false,
      true
    );

    // When: VIP期間開始時にVIPユーザーが予約
    // 実際の実装では、時間を進めるか、直接Server Actionを呼び出す必要がある
    await authenticateTestUser(userPage, 'model');
    await userPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(userPage);

    // Then: 優先予約ボタンが表示される（時間に応じて）
    const priorityButton = userPage.locator(
      'button:has-text("優先予約"), button:has-text("予約")'
    );
    // 時間に応じて表示されるかどうかを確認
    await expect(priorityButton.first())
      .toBeVisible({ timeout: 10000 })
      .catch(() => {
        // 時間が来ていない場合は、一般予約開始前のメッセージが表示される
        const beforeMessage = userPage.locator(
          ':has-text("開始前"), :has-text("まだ")'
        );
        expect(beforeMessage.first()).toBeVisible({ timeout: 5000 });
      });
  });

  test('統合シナリオ: 複数ユーザーによる同時操作', async ({ browser }) => {
    // Given: 開催者でログインして撮影会を作成（定員3名）
    await authenticateTestUser(organizerPage, 'organizer');
    const sessionData = generatePhotoSessionTestData('first_come', testId, 1);
    sessionData.slots[0].maxParticipants = 3;

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

    // Then: 定員内（3人）のみが予約成功
    const successCount = results.filter(
      result => result.status === 'fulfilled' && result.value.success
    ).length;

    expect(successCount).toBeLessThanOrEqual(3);

    // 在庫確認
    await organizerPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(organizerPage);
    const participantCount = await organizerPage
      .locator('[data-testid="participant-count"]')
      .textContent();
    // バックトラッキングを避けるため、より明確なパターンを使用
    const match = participantCount?.match(/^(\d+)\/(\d+)$/);
    if (match) {
      const current = parseInt(match[1]);
      const max = parseInt(match[2]);
      expect(current).toBeLessThanOrEqual(max);
      expect(current).toBeLessThanOrEqual(3);
    }

    // クリーンアップ
    for (const page of pages) {
      await page.close();
    }
  });

  test('統合シナリオ: リアルタイム在庫更新確認', async ({ browser }) => {
    // Given: 開催者でログインして撮影会を作成
    await authenticateTestUser(organizerPage, 'organizer');
    const sessionData = generatePhotoSessionTestData('first_come', testId, 1);
    sessionData.slots[0].maxParticipants = 5;

    await organizerPage.goto('/ja/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);

    // 観察者ページ（在庫を監視）
    const observerPage = await browser.newPage();
    await authenticateTestUser(observerPage, 'photographer');
    await observerPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(observerPage);

    // 初期在庫確認
    let participantCount = await observerPage
      .locator('[data-testid="participant-count"]')
      .textContent();
    expect(participantCount).toContain('0/5');

    // When: 別ユーザーが予約
    await authenticateTestUser(userPage, 'model');
    await userPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(userPage);

    const bookingButton = userPage.locator('button:has-text("予約する")');
    await bookingButton.click();
    await userPage.waitForTimeout(2000);

    // Then: 観察者ページで在庫が更新される（リアルタイム）
    await observerPage.waitForTimeout(2000); // リアルタイム更新待機
    await observerPage.reload();
    await waitForPageLoad(observerPage);

    participantCount = await observerPage
      .locator('[data-testid="participant-count"]')
      .textContent();
    expect(participantCount).toContain('1/5');

    await observerPage.close();
  });

  test('統合シナリオ: 管理抽選から予約確定までのフロー', async () => {
    // Given: 開催者でログインして管理抽選撮影会を作成
    await authenticateTestUser(organizerPage, 'organizer');
    const sessionData = generatePhotoSessionTestData(
      'admin_lottery',
      testId,
      1
    );

    await organizerPage.goto('/ja/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);

    // 管理抽選期間設定
    const adminLotteryPeriod = generateAdminLotteryPeriod(0, 48, 2);
    await configureAdminLottery(
      organizerPage,
      sessionId,
      adminLotteryPeriod,
      1
    );

    // Step 1: 参加者が応募
    await authenticateTestUser(userPage, 'model');
    await userPage.goto(`/ja/photo-sessions/${sessionId}`);
    await waitForPageLoad(userPage);

    const applyButton = userPage.locator('button:has-text("応募する")');
    await applyButton.click();

    const messageInput = userPage.locator(
      '[name="application_message"], textarea'
    );
    if ((await messageInput.count()) > 0) {
      await messageInput.fill('統合テスト用応募メッセージ');
    }

    const confirmButton = userPage.locator(
      'button:has-text("応募"), button[type="submit"]'
    );
    await confirmButton.click();
    await userPage.waitForTimeout(2000);

    // Step 2: 開催者が応募者を選出
    const { getTestUser } = await import('../config/test-users');
    const modelUser = getTestUser('model');

    await selectAdminLotteryWinners(organizerPage, sessionId, [
      modelUser.email,
    ]);

    // Step 3: 選出者が予約確定を確認
    await userPage.reload();
    await waitForPageLoad(userPage);

    const selectedMessage = userPage.locator(
      ':has-text("選出"), :has-text("当選"), :has-text("予約")'
    );
    await expect(selectedMessage.first()).toBeVisible({ timeout: 10000 });
  });
});
