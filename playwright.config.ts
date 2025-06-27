import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュール対応で__dirname相当を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MCP連携時のテスト環境設定読み込み
if (process.env.MCP_ENABLED === 'true') {
  dotenv.config({ path: path.resolve(__dirname, 'tests/e2e/.env.test') });
}

/**
 * ShutterHub v2 E2Eテスト設定
 * MCP連携対応 - Supabaseプロジェクトとの自動連携に対応
 * 複雑な予約システム、エスクロー決済、リアルタイム機能の自動テストに対応
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* 並列実行設定 - MCP環境では制御された並列実行 */
  fullyParallel: !process.env.MCP_ENABLED,
  /* CI環境での失敗時リトライ */
  retries: process.env.CI
    ? 2
    : process.env.PLAYWRIGHT_RETRIES
      ? parseInt(process.env.PLAYWRIGHT_RETRIES)
      : 0,
  /* 並列ワーカー数 - MCP環境では1つに制限 */
  workers:
    process.env.MCP_ENABLED === 'true'
      ? 1
      : process.env.CI
        ? 1
        : process.env.PLAYWRIGHT_WORKERS
          ? parseInt(process.env.PLAYWRIGHT_WORKERS)
          : undefined,
  /* レポート設定 */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    // MCP連携時は詳細ログも出力
    ...(process.env.MCP_ENABLED === 'true' ? [['line'] as const] : []),
  ],
  /* 共通設定 */
  use: {
    /* ベースURL - MCP環境対応（動的ポート検出）*/
    baseURL:
      process.env.MCP_ENABLED === 'true'
        ? process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002' // MCPモードではポート3002
        : process.env.PLAYWRIGHT_BASE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          'http://localhost:3000',
    /* スクリーンショット設定 */
    screenshot:
      (process.env.PLAYWRIGHT_SCREENSHOT as 'off' | 'only-on-failure' | 'on') ||
      'only-on-failure',
    /* ビデオ録画設定 */
    video:
      (process.env.PLAYWRIGHT_VIDEO as
        | 'off'
        | 'on'
        | 'retain-on-failure'
        | 'on-first-retry') || 'retain-on-failure',
    /* トレース設定 */
    trace:
      (process.env.PLAYWRIGHT_TRACE as
        | 'off'
        | 'on'
        | 'retain-on-failure'
        | 'on-first-retry') || 'on-first-retry',
    /* タイムアウト設定 - MCP環境では余裕を持った設定 */
    actionTimeout: process.env.MCP_ENABLED === 'true' ? 20000 : 10000,
    navigationTimeout: process.env.MCP_ENABLED === 'true' ? 60000 : 30000,
    /* ヘッドレス設定 */
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    /* MCP環境用の追加設定 */
    extraHTTPHeaders:
      process.env.MCP_ENABLED === 'true'
        ? {
            'X-Test-Environment': 'mcp',
            'X-Test-Cleanup': process.env.MCP_AUTO_CLEANUP || 'true',
          }
        : {},
  },

  /* プロジェクト設定 */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        // MCP環境では詳細ログを有効化
        trace: process.env.MCP_ENABLED === 'true' ? 'on' : 'on-first-retry',
      },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
        // MCP環境用の追加設定
        viewport:
          process.env.MCP_ENABLED === 'true'
            ? { width: 1280, height: 720 }
            : devices['Desktop Chrome'].viewport,
      },
      dependencies: ['setup'],
    },
    // MCP環境では主要ブラウザのみテスト
    ...(process.env.MCP_ENABLED !== 'true'
      ? [
          {
            name: 'firefox',
            use: {
              ...devices['Desktop Firefox'],
              storageState: 'tests/e2e/.auth/user.json',
            },
            dependencies: ['setup'],
          },
          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
              storageState: 'tests/e2e/.auth/user.json',
            },
            dependencies: ['setup'],
          },
        ]
      : []),
    /* モバイルテスト - MCP環境では簡略化 */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    ...(process.env.MCP_ENABLED !== 'true'
      ? [
          {
            name: 'Mobile Safari',
            use: {
              ...devices['iPhone 12'],
              storageState: 'tests/e2e/.auth/user.json',
            },
            dependencies: ['setup'],
          },
        ]
      : []),
  ],

  /* 開発サーバー設定 - MCP環境対応 */
  webServer:
    process.env.MCP_ENABLED === 'true'
      ? undefined
      : {
          command: 'npm run dev',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },

  /* テスト結果ディレクトリ */
  outputDir: 'test-results/',

  /* グローバル設定 - MCP連携対応 */
  globalSetup: path.resolve(__dirname, './tests/e2e/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, './tests/e2e/global-teardown.ts'),

  /* テストタイムアウト設定 */
  timeout: process.env.PLAYWRIGHT_TIMEOUT
    ? parseInt(process.env.PLAYWRIGHT_TIMEOUT)
    : 45000, // MCP環境を考慮してデフォルトタイムアウトを延長
  expect: {
    timeout: process.env.MCP_ENABLED === 'true' ? 15000 : 5000,
  },

  /* MCP環境用のテストディレクトリ制限 */
  ...(process.env.MCP_TEST_ENVIRONMENT === 'true' && {
    testIgnore: ['**/performance/**', '**/stress/**', '**/load/**'],
  }),
});
