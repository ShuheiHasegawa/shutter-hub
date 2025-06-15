import { test, expect, Page } from '@playwright/test';
import {
  waitForPageLoad,
  createPhotoSession,
  makeBooking,
  simulateConcurrentBookings,
} from './utils/test-helpers';

/**
 * 予約システム包括テスト
 * 5種類の予約システムの完全自動テスト
 */

test.describe('予約システム包括テスト', () => {
  let organizerPage: Page;
  let userPage: Page;

  test.beforeEach(async ({ browser }) => {
    // 開催者用ページ
    organizerPage = await browser.newPage();
    await organizerPage.goto('/auth/signin');

    // 参加者用ページ
    userPage = await browser.newPage();
    await userPage.goto('/auth/signin');
  });

  test.afterEach(async () => {
    await organizerPage.close();
    await userPage.close();
  });

  test.describe('先着順予約システム', () => {
    test('基本的な先着順予約フロー', async () => {
      // 撮影会作成
      await createPhotoSession(organizerPage, {
        title: 'E2Eテスト先着順撮影会',
        description: 'テスト用の先着順撮影会です',
        date: '2024-12-15',
        time: '14:00',
        location: 'テストスタジオ',
        price: '5000',
        capacity: '5',
        bookingType: 'first_come',
      });

      // 撮影会IDを取得
      const url = organizerPage.url();
      const sessionId = url.match(/\/photo-sessions\/(\d+)/)?.[1];
      expect(sessionId).toBeTruthy();

      // 参加者による予約
      await makeBooking(userPage, sessionId!, 'first_come');

      // 予約成功の確認
      await expect(
        userPage.locator(':has-text("予約が完了しました")')
      ).toBeVisible();

      // 在庫減少の確認
      await userPage.reload();
      await waitForPageLoad(userPage);
      const participantCount = await userPage
        .locator('[data-testid="participant-count"]')
        .textContent();
      expect(participantCount).toContain('1/5');
    });

    test('同時アクセス競合状態テスト', async ({ browser }) => {
      // 撮影会作成（定員2名）
      await createPhotoSession(organizerPage, {
        title: 'E2E同時アクセステスト',
        description: '同時アクセステスト用',
        date: '2024-12-15',
        time: '15:00',
        location: 'テストスタジオ',
        price: '3000',
        capacity: '2',
        bookingType: 'first_come',
      });

      const url = organizerPage.url();
      const sessionId = url.match(/\/photo-sessions\/(\d+)/)?.[1];

      // 5つのブラウザページで同時予約を試行
      const pages = await Promise.all(
        Array(5)
          .fill(null)
          .map(() => browser.newPage())
      );

      const results = await simulateConcurrentBookings(pages, sessionId!, 5);

      // 成功した予約は2件のみであることを確認
      const successCount = results.filter(
        result => result.status === 'fulfilled' && result.value.success
      ).length;

      expect(successCount).toBe(2);

      // ページクリーンアップ
      await Promise.all(pages.map(page => page.close()));
    });

    test('満席時のキャンセル待ち自動案内', async () => {
      // 定員1名の撮影会作成
      await createPhotoSession(organizerPage, {
        title: 'E2E満席テスト',
        description: '満席テスト用',
        date: '2024-12-15',
        time: '16:00',
        location: 'テストスタジオ',
        price: '4000',
        capacity: '1',
        bookingType: 'first_come',
      });

      const url = organizerPage.url();
      const sessionId = url.match(/\/photo-sessions\/(\d+)/)?.[1];

      // 1件目の予約（成功）
      await makeBooking(userPage, sessionId!, 'first_come');

      // 2件目の予約試行（キャンセル待ち案内）
      const secondUserPage = await userPage.context().newPage();
      await secondUserPage.goto(`/photo-sessions/${sessionId}`);
      await waitForPageLoad(secondUserPage);

      // 満席表示の確認
      await expect(secondUserPage.locator(':has-text("満席")')).toBeVisible();

      // キャンセル待ちボタンの確認
      await expect(
        secondUserPage.locator('button:has-text("キャンセル待ちに登録")')
      ).toBeVisible();

      await secondUserPage.close();
    });
  });

  test.describe('抽選予約システム', () => {
    test('抽選応募から結果発表までのフロー', async () => {
      // 抽選撮影会作成
      await createPhotoSession(organizerPage, {
        title: 'E2E抽選撮影会',
        description: '抽選テスト用撮影会',
        date: '2024-12-20',
        time: '14:00',
        location: 'テストスタジオ',
        price: '6000',
        capacity: '3',
        bookingType: 'lottery',
      });

      const url = organizerPage.url();
      const sessionId = url.match(/\/photo-sessions\/(\d+)/)?.[1];

      // 抽選応募期間の設定確認
      await expect(
        organizerPage.locator('[data-testid="lottery-period"]')
      ).toBeVisible();

      // 参加者による抽選応募
      await makeBooking(userPage, sessionId!, 'lottery');

      // 応募完了の確認
      await expect(
        userPage.locator(':has-text("抽選に応募しました")')
      ).toBeVisible();

      // 応募状況の確認
      await userPage.reload();
      await waitForPageLoad(userPage);
      await expect(userPage.locator(':has-text("応募中")')).toBeVisible();
    });

    test('抽選処理の実行と結果通知', async () => {
      // 抽選撮影会作成
      await createPhotoSession(organizerPage, {
        title: 'E2E抽選処理テスト',
        description: '抽選処理テスト用',
        date: '2024-12-21',
        time: '15:00',
        location: 'テストスタジオ',
        price: '5500',
        capacity: '2',
        bookingType: 'lottery',
      });

      const url = organizerPage.url();
      const sessionId = url.match(/\/photo-sessions\/(\d+)/)?.[1];

      // 複数ユーザーで応募
      await makeBooking(userPage, sessionId!, 'lottery');

      // 開催者による抽選実行
      await organizerPage.goto(`/photo-sessions/${sessionId}/manage`);
      await waitForPageLoad(organizerPage);

      await organizerPage.click('button:has-text("抽選を実行")');

      // 抽選完了の確認
      await expect(
        organizerPage.locator(':has-text("抽選が完了しました")')
      ).toBeVisible();

      // 結果確認
      await userPage.reload();
      await waitForPageLoad(userPage);

      // 当選または落選の表示確認
      const resultElement = userPage.locator('[data-testid="lottery-result"]');
      await expect(resultElement).toBeVisible();

      const resultText = await resultElement.textContent();
      expect(resultText).toMatch(/(当選|落選)/);
    });
  });

  test.describe('管理抽選システム', () => {
    test('開催者による手動選出フロー', async () => {
      // 管理抽選撮影会作成
      await createPhotoSession(organizerPage, {
        title: 'E2E管理抽選撮影会',
        description: '管理抽選テスト用',
        date: '2024-12-22',
        time: '16:00',
        location: 'テストスタジオ',
        price: '7000',
        capacity: '3',
        bookingType: 'admin_lottery',
      });

      const url = organizerPage.url();
      const sessionId = url.match(/\/photo-sessions\/(\d+)/)?.[1];

      // 参加者による応募
      await makeBooking(userPage, sessionId!, 'admin_lottery');

      // 開催者による応募者管理画面確認
      await organizerPage.goto(`/photo-sessions/${sessionId}/admin-lottery`);
      await waitForPageLoad(organizerPage);

      // 応募者一覧の確認
      await expect(
        organizerPage.locator('[data-testid="applicant-list"]')
      ).toBeVisible();

      // 応募者選出
      await organizerPage.click('[data-testid="select-applicant"]');
      await organizerPage.fill(
        '[data-testid="selection-reason"]',
        'テスト選出理由'
      );
      await organizerPage.click('button:has-text("選出する")');

      // 選出完了の確認
      await expect(
        organizerPage.locator(':has-text("選出が完了しました")')
      ).toBeVisible();

      // 参加者側での選出結果確認
      await userPage.reload();
      await waitForPageLoad(userPage);
      await expect(
        userPage.locator(':has-text("選出されました")')
      ).toBeVisible();
    });

    test('応募者検索・フィルタリング機能', async () => {
      // 管理抽選撮影会作成
      await createPhotoSession(organizerPage, {
        title: 'E2E応募者管理テスト',
        description: '応募者管理テスト用',
        date: '2024-12-23',
        time: '14:00',
        location: 'テストスタジオ',
        price: '6500',
        capacity: '5',
        bookingType: 'admin_lottery',
      });

      const url = organizerPage.url();
      const sessionId = url.match(/\/photo-sessions\/(\d+)/)?.[1];

      // 管理画面での検索・フィルタリング機能確認
      await organizerPage.goto(`/photo-sessions/${sessionId}/admin-lottery`);
      await waitForPageLoad(organizerPage);

      // 検索機能テスト
      await organizerPage.fill(
        '[data-testid="applicant-search"]',
        'テストユーザー'
      );
      await organizerPage.click('[data-testid="search-button"]');

      // フィルタリング機能テスト
      await organizerPage.selectOption(
        '[data-testid="status-filter"]',
        'pending'
      );

      // 結果表示の確認
      await expect(
        organizerPage.locator('[data-testid="filtered-results"]')
      ).toBeVisible();
    });
  });

  test.describe('優先予約システム', () => {
    test('ユーザーランク別アクセス制御', async () => {
      // 優先予約撮影会作成
      await createPhotoSession(organizerPage, {
        title: 'E2E優先予約撮影会',
        description: '優先予約テスト用',
        date: '2024-12-24',
        time: '15:00',
        location: 'テストスタジオ',
        price: '8000',
        capacity: '4',
        bookingType: 'priority',
      });

      const url = organizerPage.url();
      const sessionId = url.match(/\/photo-sessions\/(\d+)/)?.[1];

      // 優先予約設定の確認
      await organizerPage.goto(
        `/photo-sessions/${sessionId}/priority-settings`
      );
      await waitForPageLoad(organizerPage);

      // 段階的予約開始時間の設定
      await organizerPage.fill('[data-testid="platinum-start-time"]', '10:00');
      await organizerPage.fill('[data-testid="gold-start-time"]', '11:00');
      await organizerPage.fill('[data-testid="silver-start-time"]', '12:00');
      await organizerPage.fill('[data-testid="general-start-time"]', '13:00');

      await organizerPage.click('button:has-text("設定を保存")');

      // 設定保存の確認
      await expect(
        organizerPage.locator(':has-text("優先予約設定を保存しました")')
      ).toBeVisible();
    });

    test('優先チケット使用フロー', async () => {
      // 優先予約撮影会作成
      await createPhotoSession(organizerPage, {
        title: 'E2E優先チケットテスト',
        description: '優先チケットテスト用',
        date: '2024-12-25',
        time: '16:00',
        location: 'テストスタジオ',
        price: '7500',
        capacity: '3',
        bookingType: 'priority',
      });

      const url = organizerPage.url();
      const sessionId = url.match(/\/photo-sessions\/(\d+)/)?.[1];

      // 参加者による優先予約
      await userPage.goto(`/photo-sessions/${sessionId}`);
      await waitForPageLoad(userPage);

      // 優先チケット使用確認
      const hasTicket = await userPage
        .locator('[data-testid="priority-ticket"]')
        .isVisible();

      if (hasTicket) {
        await userPage.click('button:has-text("優先チケットを使用")');
        await expect(
          userPage.locator(':has-text("優先チケットを使用しました")')
        ).toBeVisible();
      }

      // 通常予約フロー
      await makeBooking(userPage, sessionId!, 'priority');
    });
  });

  test.describe('キャンセル待ちシステム', () => {
    test('自動繰り上げ処理フロー', async () => {
      // キャンセル待ち対応撮影会作成
      await createPhotoSession(organizerPage, {
        title: 'E2Eキャンセル待ちテスト',
        description: 'キャンセル待ちテスト用',
        date: '2024-12-26',
        time: '14:00',
        location: 'テストスタジオ',
        price: '5500',
        capacity: '2',
        bookingType: 'first_come',
      });

      const url = organizerPage.url();
      const sessionId = url.match(/\/photo-sessions\/(\d+)/)?.[1];

      // 定員まで予約を埋める
      await makeBooking(userPage, sessionId!, 'first_come');

      // 2人目のユーザーでキャンセル待ち登録
      const waitlistUserPage = await userPage.context().newPage();
      await waitlistUserPage.goto(`/photo-sessions/${sessionId}`);
      await waitForPageLoad(waitlistUserPage);

      await waitlistUserPage.click('button:has-text("キャンセル待ちに登録")');
      await expect(
        waitlistUserPage.locator(':has-text("キャンセル待ちに登録しました")')
      ).toBeVisible();

      // 1人目のユーザーがキャンセル
      await userPage.goto(`/bookings`);
      await waitForPageLoad(userPage);
      await userPage.click('[data-testid="cancel-booking"]');
      await userPage.click('button:has-text("キャンセルを確定")');

      // 自動繰り上げ通知の確認（リアルタイム）
      await waitlistUserPage.waitForTimeout(2000); // 自動処理待機
      await waitlistUserPage.reload();
      await waitForPageLoad(waitlistUserPage);

      await expect(
        waitlistUserPage.locator(':has-text("繰り上げ当選")')
      ).toBeVisible();

      await waitlistUserPage.close();
    });

    test('期限付き繰り上げ当選システム', async () => {
      // キャンセル待ち設定の確認
      await organizerPage.goto('/photo-sessions/create');
      await waitForPageLoad(organizerPage);

      // キャンセル待ち設定
      await organizerPage.click('[data-testid="enable-waitlist"]');
      await organizerPage.fill('[data-testid="response-deadline"]', '24'); // 24時間
      await organizerPage.selectOption('[data-testid="auto-cancel"]', 'true');

      // 設定保存の確認
      await expect(
        organizerPage.locator('[data-testid="waitlist-settings"]')
      ).toBeVisible();
    });
  });

  test.describe('リアルタイム機能テスト', () => {
    test('在庫更新のリアルタイム反映', async ({ browser }) => {
      // 撮影会作成
      await createPhotoSession(organizerPage, {
        title: 'E2Eリアルタイムテスト',
        description: 'リアルタイム更新テスト用',
        date: '2024-12-27',
        time: '15:00',
        location: 'テストスタジオ',
        price: '6000',
        capacity: '5',
        bookingType: 'first_come',
      });

      const url = organizerPage.url();
      const sessionId = url.match(/\/photo-sessions\/(\d+)/)?.[1];

      // 2つ目のブラウザページで同じ撮影会を表示
      const observerPage = await browser.newPage();
      await observerPage.goto(`/photo-sessions/${sessionId}`);
      await waitForPageLoad(observerPage);

      // 初期在庫確認
      let participantCount = await observerPage
        .locator('[data-testid="participant-count"]')
        .textContent();
      expect(participantCount).toContain('0/5');

      // 1人目が予約
      await makeBooking(userPage, sessionId!, 'first_come');

      // リアルタイム更新の確認（WebSocket通知）
      await observerPage.waitForTimeout(1000); // リアルタイム更新待機

      participantCount = await observerPage
        .locator('[data-testid="participant-count"]')
        .textContent();
      expect(participantCount).toContain('1/5');

      await observerPage.close();
    });

    test('通知システムのリアルタイム配信', async () => {
      // 通知センターの確認
      await userPage.goto('/dashboard');
      await waitForPageLoad(userPage);

      // 通知ベルアイコンの確認
      await expect(
        userPage.locator('[data-testid="notification-bell"]')
      ).toBeVisible();

      // 新規通知の受信確認
      await userPage.click('[data-testid="notification-bell"]');
      await expect(
        userPage.locator('[data-testid="notification-list"]')
      ).toBeVisible();
    });
  });
});
