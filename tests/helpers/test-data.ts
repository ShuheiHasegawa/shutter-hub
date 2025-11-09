// テスト用の共通データとヘルパー関数

import { Page } from '@playwright/test';

export const TEST_USERS = {
  photographer: {
    email: 'test@example.com',
    password: 'password123',
    userType: 'photographer',
  },
  organizer: {
    email: 'organizer@example.com',
    password: 'password123',
    userType: 'organizer',
  },
  admin: {
    email: 'admin@example.com',
    password: 'password123',
    userType: 'admin',
  },
} as const;

export const TEST_STUDIOS = {
  existing: {
    id: 'afaa8889-8a04-489e-b10e-3951e460b353',
    name: 'BPM123',
  },
  new: {
    name: 'テストスタジオ',
    description: 'テスト用スタジオの説明',
    address: '東京都渋谷区1-1-1',
    prefecture: '東京都',
    hourlyRateMin: 5000,
    hourlyRateMax: 10000,
  },
} as const;

export async function login(
  page: Page,
  userType: keyof typeof TEST_USERS = 'photographer'
) {
  const user = TEST_USERS[userType];
  await page.goto('/ja/auth/signin');

  // ページ読み込み完了を待機
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  // サインインページの確認
  await page.waitForSelector('#signin-email', { timeout: 10000 });

  // 認証情報入力
  await page.fill('#signin-email', user.email);
  await page.fill('#signin-password', user.password);

  // Enterキーでフォーム送信（より確実）
  await page.locator('#signin-password').press('Enter');

  // ログイン後のページ読み込み完了を待機
  await page.waitForLoadState('networkidle', { timeout: 20000 });

  // ダッシュボードへのリダイレクトを確認
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

export async function createTestStudio(page: Page) {
  await page.goto('/ja/studios/create');

  // ページ読み込み完了を待機
  await page.waitForLoadState('networkidle');

  const studio = TEST_STUDIOS.new;
  await page.fill('input[name="name"]', studio.name);
  await page.fill('textarea[name="description"]', studio.description);

  // 都道府県選択（Selectコンポーネント）
  await page.click('button:has-text("都道府県を選択")');
  await page.click(`text=${studio.prefecture}`);

  // 市区町村入力
  await page.fill('input[name="city"]', '渋谷区');

  // 住所入力
  await page.fill('input[name="address"]', studio.address);

  // 料金入力（オプショナル）
  await page.fill(
    'input[name="hourly_rate_min"]',
    studio.hourlyRateMin.toString()
  );
  await page.fill(
    'input[name="hourly_rate_max"]',
    studio.hourlyRateMax.toString()
  );

  // 作成ボタンをクリック（ActionBarのボタン）
  await page.click('button:has-text("保存")');

  // URLからスタジオIDを取得
  const url = page.url();
  const studioId = url.match(/studios\/([^\/]+)/)?.[1];

  return studioId;
}
