/* eslint-disable no-console */
import { test, expect, Page } from '@playwright/test';
import { waitForPageLoad } from './utils/test-helpers';

/**
 * シンプルな即座撮影テスト（位置情報モック版）
 * Phase 4の動作確認用
 */

test.describe('シンプル即座撮影テスト', () => {
  let clientPage: Page;

  test.beforeEach(async ({ browser }) => {
    clientPage = await browser.newPage();

    // 位置情報のモック設定
    await clientPage.context().grantPermissions(['geolocation']);
    await clientPage
      .context()
      .setGeolocation({ latitude: 35.6762, longitude: 139.6503 }); // 東京駅
  });

  test.afterEach(async () => {
    await clientPage.close();
  });

  test('即座撮影ページの基本アクセス確認', async () => {
    console.log('🎭 即座撮影ページアクセステスト開始');

    // 即座撮影ページにアクセス
    await clientPage.goto('/instant');
    await waitForPageLoad(clientPage);

    // ページタイトル確認
    await expect(clientPage).toHaveTitle(/ShutterHub/);

    // メインタイトルの確認
    await expect(clientPage.locator('h1')).toContainText('今いる場所で');

    console.log('✅ ページアクセス成功');
  });

  test('位置情報許可ボタンのクリック確認', async () => {
    console.log('🎭 位置情報許可テスト開始');

    await clientPage.goto('/instant');
    await waitForPageLoad(clientPage);

    // 位置情報許可ボタンの存在確認
    const locationButton = clientPage.locator(
      'button:has-text("位置情報を許可")'
    );
    await expect(locationButton).toBeVisible({ timeout: 10000 });

    // ボタンクリック
    await locationButton.click();

    // フォーム表示まで待機
    await expect(
      clientPage.locator('button:has-text("ポートレート")')
    ).toBeVisible({ timeout: 15000 });

    console.log('✅ 位置情報許可からフォーム表示まで成功');
  });

  test('フォーム入力の基本確認', async () => {
    console.log('🎭 フォーム入力テスト開始');

    await clientPage.goto('/instant');
    await waitForPageLoad(clientPage);

    // 位置情報許可
    await clientPage.click('button:has-text("位置情報を許可")');

    // フォーム表示まで待機
    await clientPage.waitForSelector('button:has-text("ポートレート")', {
      timeout: 15000,
    });

    // フォーム入力
    await clientPage.click('button:has-text("ポートレート")'); // 撮影タイプ選択
    console.log('📝 撮影タイプ選択完了');

    await clientPage.click('button:has-text("通常")'); // 緊急度選択
    console.log('📝 緊急度選択完了');

    await clientPage.click('button:has-text("30分")'); // 撮影時間選択
    console.log('📝 撮影時間選択完了');

    await clientPage.click('button:has-text("1")'); // 参加人数選択
    console.log('📝 参加人数選択完了');

    await clientPage.fill('input[placeholder*="希望料金"]', '5000'); // 希望料金入力
    console.log('📝 希望料金入力完了');

    await clientPage.fill('#specialRequests', 'シンプルテスト用リクエスト');
    console.log('📝 特別リクエスト入力完了');

    // ゲスト情報入力（必須）
    await clientPage.fill('#guestName', 'テストユーザー');
    await clientPage.fill('#guestPhone', '090-1234-5678');
    await clientPage.fill('#guestEmail', 'test@example.com');
    console.log('📝 ゲスト情報入力完了');

    // 送信ボタンの存在確認（実際のボタンテキストに修正）
    const submitButton = clientPage.locator(
      'button:has-text("撮影リクエストを送信")'
    );
    await expect(submitButton).toBeVisible();

    console.log('✅ フォーム入力確認完了');
  });

  test('Stripe関連API接続テスト', async () => {
    console.log('💳 Stripe API接続テスト開始');

    // 環境変数確認
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.log('⚠️ STRIPE_SECRET_KEY not found, skipping Stripe test');
      test.skip();
      return;
    }

    // 簡単なStripe API呼び出しテスト
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'amount=1000&currency=jpy&payment_method_types[]=card',
    });

    expect(response.status).toBe(200);
    const paymentIntent = await response.json();
    expect(paymentIntent.object).toBe('payment_intent');

    console.log('✅ Stripe API接続成功');
    console.log(`📋 PaymentIntent ID: ${paymentIntent.id}`);

    // クリーンアップ（テスト用PaymentIntentをキャンセル）
    await fetch(
      `https://api.stripe.com/v1/payment_intents/${paymentIntent.id}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
        },
      }
    );

    console.log('🧹 テストPaymentIntentクリーンアップ完了');
  });

  test('MCP連携でのSupabase接続確認', async () => {
    console.log('🗄️ MCP-Supabase接続テスト開始');

    // 基本的なページアクセスでSupabase接続を間接確認
    await clientPage.goto('/instant');
    await waitForPageLoad(clientPage);

    // アラートの内容を確認（情報メッセージは許可）
    const alerts = await clientPage.locator('[role="alert"]').all();
    let hasErrorAlert = false;

    for (const alert of alerts) {
      const alertText = await alert.textContent();
      console.log(`📋 検出されたアラート: "${alertText}"`);

      // 実際のエラーかどうかを内容で判断
      if (
        alertText &&
        (alertText.includes('エラー') ||
          alertText.includes('失敗') ||
          alertText.includes('接続できません') ||
          alertText.includes('問題が発生'))
      ) {
        hasErrorAlert = true;
        break;
      }
    }

    expect(hasErrorAlert).toBe(false);
    console.log('✅ Supabase接続確認完了（重大エラーなし）');
  });
});
