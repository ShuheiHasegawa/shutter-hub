import { test, expect, Page } from '@playwright/test';
import { waitForPageLoad } from './utils/test-helpers';

/**
 * エスクロー決済システム包括テスト
 * 即座撮影リクエストからエスクロー決済、写真配信、受取確認までの完全フロー
 */

test.describe('エスクロー決済システム包括テスト', () => {
  let clientPage: Page;
  let photographerPage: Page;
  let adminPage: Page;

  test.beforeEach(async ({ browser }) => {
    // クライアント用ページ
    clientPage = await browser.newPage();

    // カメラマン用ページ
    photographerPage = await browser.newPage();
    await photographerPage.goto('/auth/signin');

    // 管理者用ページ
    adminPage = await browser.newPage();
    await adminPage.goto('/auth/signin');
  });

  test.afterEach(async () => {
    await clientPage.close();
    await photographerPage.close();
    await adminPage.close();
  });

  test.describe('即座撮影リクエスト〜決済フロー', () => {
    test('ゲストユーザーによる即座撮影リクエスト', async () => {
      // ゲストユーザーとして即座撮影ページにアクセス
      await clientPage.goto('/instant-photo');
      await waitForPageLoad(clientPage);

      // 位置情報許可の確認
      await clientPage.click('button:has-text("位置情報を許可")');

      // 即座撮影リクエストフォーム入力
      await clientPage.fill('[data-testid="request-type"]', 'portrait');
      await clientPage.fill('[data-testid="duration"]', '30');
      await clientPage.fill('[data-testid="budget"]', '8000');
      await clientPage.fill(
        '[data-testid="special-requests"]',
        'E2Eテスト用リクエスト'
      );

      // リクエスト送信
      await clientPage.click('button:has-text("カメラマンを探す")');

      // リクエスト送信完了の確認
      await expect(
        clientPage.locator(':has-text("リクエストを送信しました")')
      ).toBeVisible();

      // マッチング待機画面の確認
      await expect(
        clientPage.locator('[data-testid="matching-status"]')
      ).toBeVisible();
    });

    test('カメラマンによるリクエスト受諾', async () => {
      // カメラマンダッシュボードに移動
      await photographerPage.goto('/photographer/dashboard');
      await waitForPageLoad(photographerPage);

      // オンライン状態に設定
      await photographerPage.click('[data-testid="go-online"]');
      await expect(
        photographerPage.locator(':has-text("オンライン")')
      ).toBeVisible();

      // 新規リクエスト通知の確認
      await expect(
        photographerPage.locator('[data-testid="new-request-notification"]')
      ).toBeVisible();

      // リクエスト詳細確認
      await photographerPage.click('[data-testid="view-request"]');
      await waitForPageLoad(photographerPage);

      // リクエスト受諾
      await photographerPage.click('button:has-text("リクエストを受諾")');

      // 受諾完了の確認
      await expect(
        photographerPage.locator(':has-text("リクエストを受諾しました")')
      ).toBeVisible();

      // マッチング成立の確認
      await expect(
        photographerPage.locator('[data-testid="match-established"]')
      ).toBeVisible();
    });

    test('エスクロー決済処理', async () => {
      // 決済ページへの自動遷移確認
      await clientPage.waitForURL(/\/instant-photo\/payment\/\d+/, {
        timeout: 10000,
      });
      await waitForPageLoad(clientPage);

      // 決済詳細の確認
      await expect(
        clientPage.locator('[data-testid="payment-amount"]')
      ).toBeVisible();
      await expect(
        clientPage.locator('[data-testid="escrow-explanation"]')
      ).toBeVisible();

      // Stripe決済フォーム入力
      await clientPage.fill('[data-testid="card-number"]', '4242424242424242');
      await clientPage.fill('[data-testid="card-expiry"]', '12/25');
      await clientPage.fill('[data-testid="card-cvc"]', '123');
      await clientPage.fill('[data-testid="cardholder-name"]', 'Test User');

      // 決済実行
      await clientPage.click('button:has-text("決済する")');

      // 決済完了の確認
      await expect(
        clientPage.locator(':has-text("決済が完了しました")')
      ).toBeVisible({ timeout: 15000 });

      // エスクロー状態の確認
      await expect(
        clientPage.locator('[data-testid="escrow-status"]')
      ).toContainText('決済完了');
    });
  });

  test.describe('写真撮影〜配信フロー', () => {
    test('撮影開始〜完了プロセス', async () => {
      // カメラマンによる撮影開始
      await photographerPage.goto('/photographer/active-session');
      await waitForPageLoad(photographerPage);

      await photographerPage.click('button:has-text("撮影を開始")');
      await expect(
        photographerPage.locator(':has-text("撮影中")')
      ).toBeVisible();

      // 撮影完了
      await photographerPage.click('button:has-text("撮影を完了")');
      await expect(
        photographerPage.locator(':has-text("撮影が完了しました")')
      ).toBeVisible();

      // 配信ページへの自動遷移
      await photographerPage.waitForURL(/\/instant-photo\/deliver\/\d+/, {
        timeout: 5000,
      });
    });

    test('写真配信プロセス', async () => {
      // 配信ページでの写真アップロード
      await photographerPage.goto('/instant-photo/deliver/test-booking-id');
      await waitForPageLoad(photographerPage);

      // 配信方法選択（外部サービス）
      await photographerPage.selectOption(
        '[data-testid="delivery-method"]',
        'external'
      );

      // 外部サービス情報入力
      await photographerPage.fill(
        '[data-testid="delivery-url"]',
        'https://firestorage.jp/download/test123'
      );
      await photographerPage.fill(
        '[data-testid="access-password"]',
        'testpass123'
      );
      await photographerPage.fill(
        '[data-testid="download-instructions"]',
        'パスワードを入力してダウンロードしてください'
      );

      // 配信実行
      await photographerPage.click('button:has-text("写真を配信")');

      // 配信完了の確認
      await expect(
        photographerPage.locator(':has-text("写真を配信しました")')
      ).toBeVisible();

      // クライアントへの通知確認
      await expect(
        clientPage.locator('[data-testid="delivery-notification"]')
      ).toBeVisible();
    });

    test('写真受取確認プロセス', async () => {
      // 受取確認ページへの遷移
      await clientPage.goto('/instant-photo/confirm/test-booking-id');
      await waitForPageLoad(clientPage);

      // 配信情報の確認
      await expect(
        clientPage.locator('[data-testid="delivery-details"]')
      ).toBeVisible();
      await expect(
        clientPage.locator('[data-testid="download-link"]')
      ).toBeVisible();

      // 写真ダウンロード確認
      await clientPage.click('[data-testid="download-link"]');

      // 評価入力
      await clientPage.click('[data-rating="5"]');
      await clientPage.fill(
        '[data-testid="review-text"]',
        'とても素晴らしい撮影でした！'
      );

      // 受取確認
      await clientPage.click('button:has-text("受取を確認")');

      // 確認完了
      await expect(
        clientPage.locator(':has-text("受取を確認しました")')
      ).toBeVisible();

      // エスクロー解除の確認
      await expect(
        clientPage.locator('[data-testid="escrow-status"]')
      ).toContainText('完了');
    });
  });

  test.describe('争議・問題解決フロー', () => {
    test('クライアントによる争議申請', async () => {
      // 受取確認ページで争議申請
      await clientPage.goto('/instant-photo/confirm/test-booking-id');
      await waitForPageLoad(clientPage);

      await clientPage.click('button:has-text("問題を報告")');

      // 争議理由選択
      await clientPage.selectOption(
        '[data-testid="dispute-reason"]',
        'quality_issue'
      );
      await clientPage.fill(
        '[data-testid="dispute-description"]',
        '写真の品質に問題があります'
      );

      // 争議申請
      await clientPage.click('button:has-text("争議を申請")');

      // 申請完了の確認
      await expect(
        clientPage.locator(':has-text("争議を申請しました")')
      ).toBeVisible();

      // エスクロー状態の確認
      await expect(
        clientPage.locator('[data-testid="escrow-status"]')
      ).toContainText('争議中');
    });

    test('管理者による争議解決', async () => {
      // 管理者ダッシュボードで争議確認
      await adminPage.goto('/admin/disputes');
      await waitForPageLoad(adminPage);

      // 新規争議の確認
      await expect(
        adminPage.locator('[data-testid="new-dispute"]')
      ).toBeVisible();

      // 争議詳細確認
      await adminPage.click('[data-testid="view-dispute"]');
      await waitForPageLoad(adminPage);

      // 証拠確認・判定
      await adminPage.fill(
        '[data-testid="resolution-notes"]',
        '写真品質を確認し、部分返金を決定'
      );
      await adminPage.selectOption(
        '[data-testid="resolution-type"]',
        'partial_refund'
      );
      await adminPage.fill('[data-testid="refund-amount"]', '4000');

      // 解決実行
      await adminPage.click('button:has-text("解決を実行")');

      // 解決完了の確認
      await expect(
        adminPage.locator(':has-text("争議を解決しました")')
      ).toBeVisible();

      // 関係者への通知確認
      await expect(
        clientPage.locator('[data-testid="dispute-resolved-notification"]')
      ).toBeVisible();
      await expect(
        photographerPage.locator(
          '[data-testid="dispute-resolved-notification"]'
        )
      ).toBeVisible();
    });

    test('自動確認システム（72時間経過）', async () => {
      // 時間経過シミュレーション（テスト環境では短縮）
      await clientPage.goto('/instant-photo/confirm/test-booking-id');
      await waitForPageLoad(clientPage);

      // 自動確認タイマーの確認
      await expect(
        clientPage.locator('[data-testid="auto-confirm-timer"]')
      ).toBeVisible();

      // 時間経過後の自動確認（モック）
      await clientPage.evaluate(() => {
        // テスト環境での時間経過シミュレーション
        window.dispatchEvent(new CustomEvent('auto-confirm-triggered'));
      });

      // 自動確認の実行確認
      await expect(
        clientPage.locator(':has-text("自動的に受取が確認されました")')
      ).toBeVisible();

      // エスクロー解除の確認
      await expect(
        clientPage.locator('[data-testid="escrow-status"]')
      ).toContainText('自動完了');
    });
  });

  test.describe('決済システム統合テスト', () => {
    test('Stripe決済エラーハンドリング', async () => {
      await clientPage.goto('/instant-photo/payment/test-booking-id');
      await waitForPageLoad(clientPage);

      // 無効なカード情報でテスト
      await clientPage.fill('[data-testid="card-number"]', '4000000000000002'); // Stripe テスト用エラーカード
      await clientPage.fill('[data-testid="card-expiry"]', '12/25');
      await clientPage.fill('[data-testid="card-cvc"]', '123');

      await clientPage.click('button:has-text("決済する")');

      // エラーメッセージの確認
      await expect(
        clientPage.locator('[data-testid="payment-error"]')
      ).toBeVisible();
      await expect(
        clientPage.locator(':has-text("カードが拒否されました")')
      ).toBeVisible();
    });

    test('返金処理テスト', async () => {
      // 管理者による返金処理
      await adminPage.goto('/admin/payments');
      await waitForPageLoad(adminPage);

      // 返金対象の決済選択
      await adminPage.click('[data-testid="refund-payment"]');

      // 返金金額入力
      await adminPage.fill('[data-testid="refund-amount"]', '8000');
      await adminPage.fill('[data-testid="refund-reason"]', 'E2Eテスト返金');

      // 返金実行
      await adminPage.click('button:has-text("返金を実行")');

      // 返金完了の確認
      await expect(
        adminPage.locator(':has-text("返金が完了しました")')
      ).toBeVisible();

      // Stripe側での返金確認（モック）
      await expect(
        adminPage.locator('[data-testid="stripe-refund-id"]')
      ).toBeVisible();
    });

    test('手数料計算・分配テスト', async () => {
      // 決済完了後の手数料計算確認
      await adminPage.goto('/admin/analytics');
      await waitForPageLoad(adminPage);

      // 手数料統計の確認
      await expect(
        adminPage.locator('[data-testid="platform-fee-stats"]')
      ).toBeVisible();
      await expect(
        adminPage.locator('[data-testid="stripe-fee-stats"]')
      ).toBeVisible();

      // カメラマンへの支払い予定確認
      await expect(
        adminPage.locator('[data-testid="photographer-payout"]')
      ).toBeVisible();
    });
  });

  test.describe('パフォーマンス・負荷テスト', () => {
    test('同時決済処理テスト', async ({ browser }) => {
      // 複数ユーザーでの同時決済
      const pages = await Promise.all(
        Array(5)
          .fill(null)
          .map(() => browser.newPage())
      );

      const paymentPromises = pages.map(async (page, index) => {
        await page.goto('/instant-photo/payment/test-booking-' + index);
        await waitForPageLoad(page);

        await page.fill('[data-testid="card-number"]', '4242424242424242');
        await page.fill('[data-testid="card-expiry"]', '12/25');
        await page.fill('[data-testid="card-cvc"]', '123');

        await page.click('button:has-text("決済する")');

        return page.waitForSelector(':has-text("決済が完了しました")', {
          timeout: 15000,
        });
      });

      // 全ての決済が成功することを確認
      const results = await Promise.allSettled(paymentPromises);
      const successCount = results.filter(
        result => result.status === 'fulfilled'
      ).length;

      expect(successCount).toBe(5);

      // ページクリーンアップ
      await Promise.all(pages.map(page => page.close()));
    });

    test('大量データ処理テスト', async () => {
      // 大量の決済履歴表示テスト
      await adminPage.goto('/admin/payments?limit=1000');
      await waitForPageLoad(adminPage);

      // ページ読み込み時間の確認
      const loadTime = await adminPage.evaluate(() => {
        return (
          performance.timing.loadEventEnd - performance.timing.navigationStart
        );
      });

      expect(loadTime).toBeLessThan(3000); // 3秒以内

      // データ表示の確認
      await expect(
        adminPage.locator('[data-testid="payment-list"]')
      ).toBeVisible();
    });
  });
});
