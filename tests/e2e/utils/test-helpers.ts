import { Page, expect } from '@playwright/test';

/**
 * テストヘルパー関数集
 * 共通的なテスト操作を提供
 */

/**
 * ページの読み込み完了を待機する
 */
export async function waitForPageLoad(page: Page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForLoadState('domcontentloaded', { timeout });
}

/**
 * 要素が表示されるまで待機する
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 5000
) {
  const element = page.locator(selector);
  await expect(element).toBeVisible({ timeout });
  return element;
}

/**
 * フォームに入力する
 */
export async function fillForm(page: Page, formData: Record<string, string>) {
  for (const [field, value] of Object.entries(formData)) {
    await page.fill(
      `[name="${field}"], #${field}, [data-testid="${field}"]`,
      value
    );
  }
}

/**
 * 撮影会作成のヘルパー関数
 */
export async function createPhotoSession(
  page: Page,
  sessionData: {
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    price: string;
    capacity: string;
    bookingType?:
      | 'first_come'
      | 'lottery'
      | 'admin_lottery'
      | 'priority'
      | 'waitlist';
  }
) {
  // 撮影会作成ページに移動
  await page.goto('/photo-sessions/create');
  await waitForPageLoad(page);

  // 基本情報入力
  await fillForm(page, {
    title: sessionData.title,
    description: sessionData.description,
    location: sessionData.location,
    price_per_person: sessionData.price,
    max_participants: sessionData.capacity,
  });

  // 日時設定
  await page.fill('[name="date"]', sessionData.date);
  await page.fill('[name="start_time"]', sessionData.time);

  // 予約方式選択
  if (sessionData.bookingType) {
    await page.click(`[value="${sessionData.bookingType}"]`);
  }

  // 作成ボタンクリック
  await page.click('button[type="submit"]');

  // 作成完了の確認
  await page.waitForURL(/\/photo-sessions\/\d+/, { timeout: 10000 });
}

/**
 * 予約処理のヘルパー関数
 */
export async function makeBooking(
  page: Page,
  sessionId: string,
  bookingType: string = 'first_come'
) {
  await page.goto(`/photo-sessions/${sessionId}`);
  await waitForPageLoad(page);

  switch (bookingType) {
    case 'first_come':
      await page.click('button:has-text("予約する")');
      break;
    case 'lottery':
      await page.click('button:has-text("抽選に応募")');
      break;
    case 'admin_lottery':
      await page.click('button:has-text("応募する")');
      break;
    case 'priority':
      await page.click('button:has-text("優先予約")');
      break;
    case 'waitlist':
      await page.click('button:has-text("キャンセル待ちに登録")');
      break;
  }

  // 予約確認
  await expect(page.locator('.toast, [role="alert"]')).toBeVisible({
    timeout: 5000,
  });
}

/**
 * エスクロー決済フローのヘルパー関数
 */
export async function processEscrowPayment(page: Page, bookingId: string) {
  // 決済ページに移動
  await page.goto(`/instant-photo/payment/${bookingId}`);
  await waitForPageLoad(page);

  // テスト用カード情報入力
  await page.fill('[data-testid="card-number"]', '4242424242424242');
  await page.fill('[data-testid="card-expiry"]', '12/25');
  await page.fill('[data-testid="card-cvc"]', '123');

  // 決済実行
  await page.click('button:has-text("決済する")');

  // 決済完了確認
  await expect(page.locator(':has-text("決済が完了しました")')).toBeVisible({
    timeout: 10000,
  });
}

/**
 * 写真配信のヘルパー関数
 */
export async function deliverPhotos(page: Page, bookingId: string) {
  // 配信ページに移動
  await page.goto(`/instant-photo/deliver/${bookingId}`);
  await waitForPageLoad(page);

  // 配信URL入力
  await page.fill('[name="delivery_url"]', 'https://example.com/photos/test');
  await page.fill('[name="access_password"]', 'testpass123');

  // 配信実行
  await page.click('button:has-text("写真を配信")');

  // 配信完了確認
  await expect(page.locator(':has-text("写真を配信しました")')).toBeVisible({
    timeout: 5000,
  });
}

/**
 * 写真受取確認のヘルパー関数
 */
export async function confirmPhotoDelivery(
  page: Page,
  bookingId: string,
  rating: number = 5
) {
  // 受取確認ページに移動
  await page.goto(`/instant-photo/confirm/${bookingId}`);
  await waitForPageLoad(page);

  // 評価選択
  await page.click(`[data-rating="${rating}"]`);

  // 受取確認
  await page.click('button:has-text("受取を確認")');

  // 確認完了
  await expect(page.locator(':has-text("受取を確認しました")')).toBeVisible({
    timeout: 5000,
  });
}

/**
 * 同時アクセステストのヘルパー関数
 */
export async function simulateConcurrentBookings(
  pages: Page[],
  sessionId: string,
  count: number
) {
  const promises = pages.slice(0, count).map(async (page, index) => {
    try {
      await page.goto(`/photo-sessions/${sessionId}`);
      await waitForPageLoad(page);
      await page.click('button:has-text("予約する")');
      return { success: true, index };
    } catch (error) {
      return { success: false, index, error };
    }
  });

  return await Promise.allSettled(promises);
}

/**
 * レスポンシブテストのヘルパー関数
 */
export async function testResponsiveLayout(page: Page, url: string) {
  const viewports = [
    { width: 375, height: 667, name: 'Mobile' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1920, height: 1080, name: 'Desktop' },
  ];

  const results = [];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(url);
    await waitForPageLoad(page);

    // レイアウト崩れチェック
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    results.push({
      viewport: viewport.name,
      hasOverflow,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return results;
}
