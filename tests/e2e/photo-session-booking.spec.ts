import { test, expect, Page } from '@playwright/test';
import {
  generatePhotoSessionTestData,
  fillPhotoSessionForm,
  configureSlots,
  publishPhotoSession,
  verifyPaymentScreen,
  authenticateTestUser,
  cleanupPhotoSession,
} from './utils/photo-session-helpers';
import { waitForPageLoad } from './utils/test-helpers';
import Logger from '../../src/lib/logger';

/**
 * Phase 6: 公開・枠選択・予約完了フローE2Eテスト
 * スロットベース予約システム + 決済画面表示まで
 */

test.describe('撮影会予約フロー完全テスト', () => {
  let organizerPage: Page;
  let participantPage: Page;
  let createdSessionIds: string[] = [];

  test.beforeEach(async ({ browser }) => {
    organizerPage = await browser.newPage();
    participantPage = await browser.newPage();
    createdSessionIds = [];
  });

  test.afterEach(async () => {
    // テストデータクリーンアップ
    for (const sessionId of createdSessionIds) {
      await cleanupPhotoSession(organizerPage, sessionId);
    }
    await Promise.all([organizerPage.close(), participantPage.close()]);
  });

  test('先着順予約: 完全フロー（決済画面表示まで）', async () => {
    const testId = `first-come-booking-${Date.now()}`;
    Logger.info(`🚀 先着順予約完全フローテスト開始: ${testId}`);

    // === Phase 1: 撮影会作成（主催者側） ===
    await authenticateTestUser(organizerPage, 'organizer');
    await organizerPage.goto('/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    const sessionData = generatePhotoSessionTestData('first_come', testId);
    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);
    createdSessionIds.push(sessionId);

    Logger.info(`📅 撮影会作成完了: ${sessionId}`);

    // === Phase 2: 予約申込み（参加者側） ===
    await authenticateTestUser(participantPage, 'model');

    // 撮影会一覧から選択
    await participantPage.goto('/photo-sessions');
    await waitForPageLoad(participantPage);
    await participantPage.click(`[data-testid="session-${sessionId}"]`);

    // スロット選択画面確認
    await expect(participantPage.locator('h1')).toContainText(
      sessionData.title
    );
    await expect(
      participantPage.locator('[data-testid="booking-type-badge"]')
    ).toContainText('先着順');

    // 最初のスロットを選択
    await participantPage.click('[data-testid="slot-0-select"]');
    await participantPage.waitForSelector('[data-testid="booking-form"]', {
      timeout: 10000,
    });

    // 参加者情報入力
    await participantPage.fill('#participantName', 'E2Eテスト参加者');
    await participantPage.fill(
      '#participantEmail',
      'e2e-participant-test@example.com'
    );
    await participantPage.fill('#participantPhone', '090-1111-2222');
    await participantPage.fill(
      '#specialRequests',
      'E2Eテスト用の特別リクエストです'
    );

    // 予約申込み
    await participantPage.click('button:has-text("予約を申し込む")');

    // === Phase 3: 決済画面確認 ===
    await verifyPaymentScreen(participantPage);

    Logger.info(`✅ 先着順予約完全フローテスト成功`);
  });

  test('抽選方式予約: 申込み〜抽選待ち状態確認', async () => {
    const testId = `lottery-booking-${Date.now()}`;
    Logger.info(`🎰 抽選方式予約テスト開始: ${testId}`);

    // === Phase 1: 抽選方式撮影会作成 ===
    await authenticateTestUser(organizerPage, 'organizer');
    await organizerPage.goto('/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    const sessionData = generatePhotoSessionTestData('lottery', testId);
    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);

    // 抽選設定
    await organizerPage.fill(
      '[data-testid="entry-period-start"]',
      '2024-02-01'
    );
    await organizerPage.fill('[data-testid="entry-period-end"]', '2024-02-07');
    await organizerPage.fill('[data-testid="lottery-date"]', '2024-02-08');

    const sessionId = await publishPhotoSession(organizerPage);
    createdSessionIds.push(sessionId);

    Logger.info(`🎰 抽選方式撮影会作成完了: ${sessionId}`);

    // === Phase 2: 抽選申込み ===
    await authenticateTestUser(participantPage, 'model');
    await participantPage.goto(`/photo-sessions/${sessionId}`);
    await waitForPageLoad(participantPage);

    // 抽選方式の表示確認
    await expect(
      participantPage.locator('[data-testid="booking-type-badge"]')
    ).toContainText('抽選');
    await expect(
      participantPage.locator('[data-testid="entry-period"]')
    ).toBeVisible();
    await expect(
      participantPage.locator('[data-testid="lottery-info"]')
    ).toBeVisible();

    // スロット選択と抽選申込み
    await participantPage.click('[data-testid="slot-0-select"]');
    await participantPage.waitForSelector('[data-testid="lottery-form"]', {
      timeout: 10000,
    });

    await participantPage.fill('#participantName', 'E2E抽選テスト参加者');
    await participantPage.fill('#participantEmail', 'e2e-lottery@example.com');
    await participantPage.fill('#participantPhone', '090-3333-4444');

    await participantPage.click('button:has-text("抽選に申し込む")');

    // === Phase 3: 抽選待ち状態確認 ===
    await participantPage.waitForSelector('text=抽選申込みが完了しました', {
      timeout: 10000,
    });
    await expect(
      participantPage.locator('[data-testid="lottery-status"]')
    ).toContainText('抽選待ち');
    await expect(
      participantPage.locator('[data-testid="lottery-result-date"]')
    ).toBeVisible();

    Logger.info(`✅ 抽選方式予約テスト成功`);
  });

  test('優先予約方式: ランクベース予約フロー', async () => {
    const testId = `priority-booking-${Date.now()}`;
    Logger.info(`⭐ 優先予約方式テスト開始: ${testId}`);

    // === Phase 1: 優先予約撮影会作成 ===
    await authenticateTestUser(organizerPage, 'organizer');
    await organizerPage.goto('/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    const sessionData = generatePhotoSessionTestData('priority', testId);
    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);

    // 優先予約設定
    await organizerPage.selectOption('[data-testid="min-rank"]', 'bronze');
    await organizerPage.check('[data-testid="priority-tickets-enabled"]');

    const sessionId = await publishPhotoSession(organizerPage);
    createdSessionIds.push(sessionId);

    Logger.info(`⭐ 優先予約撮影会作成完了: ${sessionId}`);

    // === Phase 2: 優先予約申込み ===
    await authenticateTestUser(participantPage, 'model');
    await participantPage.goto(`/photo-sessions/${sessionId}`);
    await waitForPageLoad(participantPage);

    // 優先予約の表示確認
    await expect(
      participantPage.locator('[data-testid="booking-type-badge"]')
    ).toContainText('優先予約');
    await expect(
      participantPage.locator('[data-testid="rank-requirements"]')
    ).toBeVisible();
    await expect(
      participantPage.locator('[data-testid="priority-info"]')
    ).toBeVisible();

    // ランク確認と予約申込み
    await participantPage.click('[data-testid="slot-0-select"]');
    await participantPage.waitForSelector(
      '[data-testid="priority-booking-form"]',
      { timeout: 10000 }
    );

    // ユーザーランク表示確認
    await expect(
      participantPage.locator('[data-testid="user-rank"]')
    ).toBeVisible();

    await participantPage.fill('#participantName', 'E2E優先予約テスト参加者');
    await participantPage.fill('#participantEmail', 'e2e-priority@example.com');
    await participantPage.fill('#participantPhone', '090-5555-6666');

    await participantPage.click('button:has-text("優先予約を申し込む")');

    // === Phase 3: 決済画面確認（優先料金） ===
    await verifyPaymentScreen(participantPage);

    // 優先予約料金の確認
    await expect(
      participantPage.locator('[data-testid="priority-fee"]')
    ).toBeVisible();

    Logger.info(`✅ 優先予約方式テスト成功`);
  });

  test('管理抽選方式: 手動選考システム', async () => {
    const testId = `admin-lottery-${Date.now()}`;
    Logger.info(`👨‍💼 管理抽選方式テスト開始: ${testId}`);

    // === Phase 1: 管理抽選撮影会作成 ===
    await authenticateTestUser(organizerPage, 'organizer');
    await organizerPage.goto('/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    const sessionData = generatePhotoSessionTestData('admin_lottery', testId);
    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);

    // 管理抽選設定
    await organizerPage.fill(
      '[data-testid="application-period-start"]',
      '2024-02-01'
    );
    await organizerPage.fill(
      '[data-testid="application-period-end"]',
      '2024-02-14'
    );
    await organizerPage.fill(
      '[data-testid="selection-criteria"]',
      'E2Eテスト用選考基準：撮影経験・ポートフォリオ重視'
    );

    const sessionId = await publishPhotoSession(organizerPage);
    createdSessionIds.push(sessionId);

    Logger.info(`👨‍💼 管理抽選撮影会作成完了: ${sessionId}`);

    // === Phase 2: 応募申込み ===
    await authenticateTestUser(participantPage, 'model');
    await participantPage.goto(`/photo-sessions/${sessionId}`);
    await waitForPageLoad(participantPage);

    // 管理抽選の表示確認
    await expect(
      participantPage.locator('[data-testid="booking-type-badge"]')
    ).toContainText('管理抽選');
    await expect(
      participantPage.locator('[data-testid="selection-criteria"]')
    ).toBeVisible();
    await expect(
      participantPage.locator('[data-testid="application-period"]')
    ).toBeVisible();

    // 応募フォーム入力
    await participantPage.click('[data-testid="slot-0-select"]');
    await participantPage.waitForSelector(
      '[data-testid="admin-lottery-form"]',
      { timeout: 10000 }
    );

    await participantPage.fill('#participantName', 'E2E管理抽選テスト参加者');
    await participantPage.fill(
      '#participantEmail',
      'e2e-admin-lottery@example.com'
    );
    await participantPage.fill('#participantPhone', '090-7777-8888');
    await participantPage.fill(
      '#applicationReason',
      'E2Eテスト用応募理由：テスト撮影の品質向上に貢献したいです'
    );
    await participantPage.fill(
      '#portfolioUrl',
      'https://example.com/e2e-portfolio'
    );

    await participantPage.click('button:has-text("応募する")');

    // === Phase 3: 応募完了状態確認 ===
    await participantPage.waitForSelector('text=応募が完了しました', {
      timeout: 10000,
    });
    await expect(
      participantPage.locator('[data-testid="application-status"]')
    ).toContainText('審査中');
    await expect(
      participantPage.locator('[data-testid="selection-date"]')
    ).toBeVisible();

    Logger.info(`✅ 管理抽選方式テスト成功`);
  });

  test('複数スロット同時予約テスト', async () => {
    const testId = `multi-slot-${Date.now()}`;
    Logger.info(`🕒 複数スロット同時予約テスト開始: ${testId}`);

    // === Phase 1: 複数スロット撮影会作成 ===
    await authenticateTestUser(organizerPage, 'organizer');
    await organizerPage.goto('/photo-sessions/create');
    await waitForPageLoad(organizerPage);

    const sessionData = generatePhotoSessionTestData('first_come', testId);
    // 4つのスロットを設定
    sessionData.slots = [
      {
        startTime: '10:00',
        endTime: '11:00',
        maxParticipants: 3,
        pricePerPerson: 4000,
        description: '第1枠',
      },
      {
        startTime: '11:30',
        endTime: '12:30',
        maxParticipants: 3,
        pricePerPerson: 4000,
        description: '第2枠',
      },
      {
        startTime: '13:30',
        endTime: '14:30',
        maxParticipants: 3,
        pricePerPerson: 4500,
        description: '第3枠',
      },
      {
        startTime: '15:00',
        endTime: '16:00',
        maxParticipants: 2,
        pricePerPerson: 5000,
        description: '第4枠（少人数）',
      },
    ];

    await fillPhotoSessionForm(organizerPage, sessionData);
    await configureSlots(organizerPage, sessionData.slots);
    const sessionId = await publishPhotoSession(organizerPage);
    createdSessionIds.push(sessionId);

    Logger.info(`🕒 複数スロット撮影会作成完了: ${sessionId}`);

    // === Phase 2: 各スロットの予約可能性確認 ===
    await authenticateTestUser(participantPage, 'model');
    await participantPage.goto(`/photo-sessions/${sessionId}`);
    await waitForPageLoad(participantPage);

    // 全スロットの表示確認
    for (let i = 0; i < sessionData.slots.length; i++) {
      await expect(
        participantPage.locator(`[data-testid="slot-${i}"]`)
      ).toBeVisible();
      await expect(
        participantPage.locator(`[data-testid="slot-${i}-select"]`)
      ).toBeEnabled();
    }

    // === Phase 3: 最後のスロット（少人数枠）を予約 ===
    await participantPage.click('[data-testid="slot-3-select"]');
    await participantPage.waitForSelector('[data-testid="booking-form"]', {
      timeout: 10000,
    });

    await participantPage.fill(
      '#participantName',
      'E2E複数スロットテスト参加者'
    );
    await participantPage.fill(
      '#participantEmail',
      'e2e-multi-slot@example.com'
    );
    await participantPage.fill('#participantPhone', '090-9999-0000');

    await participantPage.click('button:has-text("予約を申し込む")');

    // === Phase 4: 高価格スロットの決済画面確認 ===
    await verifyPaymentScreen(participantPage);

    // 選択したスロットの情報確認
    await expect(
      participantPage.locator('[data-testid="payment-slot-info"]')
    ).toContainText('第4枠（少人数）');
    await expect(
      participantPage.locator('[data-testid="payment-amount"]')
    ).toContainText('5000');

    Logger.info(`✅ 複数スロット同時予約テスト成功`);
  });
});
