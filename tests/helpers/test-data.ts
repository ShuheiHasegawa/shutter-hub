// テスト用の共通データとヘルパー関数

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function login(
  page: any,
  userType: keyof typeof TEST_USERS = 'photographer'
) {
  const user = TEST_USERS[userType];
  await page.goto('/ja/login');
  await page.fill('[name="email"]', user.email);
  await page.fill('[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createTestStudio(page: any) {
  await page.goto('/ja/studios/new');

  const studio = TEST_STUDIOS.new;
  await page.fill('input[name="name"]', studio.name);
  await page.fill('textarea[name="description"]', studio.description);
  await page.fill('input[name="address"]', studio.address);
  await page.selectOption('select[name="prefecture"]', studio.prefecture);
  await page.fill(
    'input[name="hourly_rate_min"]',
    studio.hourlyRateMin.toString()
  );
  await page.fill(
    'input[name="hourly_rate_max"]',
    studio.hourlyRateMax.toString()
  );

  await page.click('button[type="submit"]');

  // URLからスタジオIDを取得
  const url = page.url();
  const studioId = url.match(/studios\/([^\/]+)/)?.[1];

  return studioId;
}
