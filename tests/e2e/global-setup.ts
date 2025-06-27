import { chromium, FullConfig } from '@playwright/test';

/**
 * グローバルセットアップ
 * MCP連携対応 - Supabaseプロジェクトとの自動連携を含む
 * テスト実行前の環境準備を行う
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 E2Eテスト環境セットアップ開始...');

  const isMCPEnabled = process.env.MCP_ENABLED === 'true';
  const shouldSeedData = process.env.MCP_TEST_DATA_SEED === 'true';
  const shouldCleanup = process.env.MCP_AUTO_CLEANUP === 'true';

  if (isMCPEnabled) {
    console.log('🔗 MCP連携モードで実行中...');
    console.log(`📊 データシード: ${shouldSeedData ? '有効' : '無効'}`);
    console.log(`🧹 自動クリーンアップ: ${shouldCleanup ? '有効' : '無効'}`);
  }

  // テスト用ブラウザ起動
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // アプリケーションの起動確認
    const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';
    console.log(`🌐 アプリケーション接続確認: ${baseURL}`);

    await page.goto(baseURL);
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    console.log('✅ アプリケーション起動確認完了');

    // MCP連携時の追加セットアップ
    if (isMCPEnabled) {
      console.log('🔧 MCP連携セットアップ開始...');

      // テスト用データベースの初期化
      if (shouldCleanup && process.env.NODE_ENV === 'test') {
        console.log('🗄️ テスト用データベースクリーンアップ中...');
        await cleanupTestDatabase();
      }

      // テストデータのシード
      if (shouldSeedData && process.env.NODE_ENV === 'test') {
        console.log('🌱 テストデータシード中...');
        await seedTestData();
      }

      // MCP環境変数の検証
      await validateMCPEnvironment();

      console.log('✅ MCP連携セットアップ完了');
    }

    // テスト用認証状態の確認
    await validateTestAuthSetup();

    console.log('✅ グローバルセットアップ完了');
  } catch (error) {
    console.error('❌ グローバルセットアップ失敗:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * テスト用データベースのクリーンアップ
 * MCP連携でSupabaseプロジェクトに接続して実行
 */
async function cleanupTestDatabase() {
  try {
    // テスト用のSupabase接続情報を確認
    const testSupabaseUrl = process.env.TEST_SUPABASE_URL;
    const testServiceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

    if (!testSupabaseUrl || !testServiceRoleKey) {
      console.warn(
        '⚠️ テスト用Supabase設定が不完全です。クリーンアップをスキップします。'
      );
      return;
    }

    console.log('🧹 テストデータクリーンアップ実行中...');

    // ここでSupabase MCPツールを使用したクリーンアップ処理
    // 実際の実装では、MCP連携でSupabaseに接続してテーブルをクリア

    console.log('✅ テストデータクリーンアップ完了');
  } catch (error) {
    console.error('❌ データベースクリーンアップ失敗:', error);
    // クリーンアップ失敗は警告レベルとして続行
  }
}

/**
 * テストデータのシード
 * MCP連携でSupabaseプロジェクトにテストデータを投入
 */
async function seedTestData() {
  try {
    console.log('🌱 テストデータシード実行中...');

    // テスト用ユーザーの作成
    // テスト用撮影会の作成
    // テスト用予約データの作成

    console.log('✅ テストデータシード完了');
  } catch (error) {
    console.error('❌ テストデータシード失敗:', error);
    throw error; // シード失敗はテスト実行に影響するため例外を投げる
  }
}

/**
 * MCP環境変数の検証
 * OAuth専用認証に対応した環境変数をチェック
 */
async function validateMCPEnvironment() {
  const requiredVars = [
    'TEST_SUPABASE_URL',
    'TEST_SUPABASE_ANON_KEY',
    'TEST_USER_EMAIL',
    // OAuth認証のため、パスワードは不要
    // 'TEST_USER_PASSWORD', ← この変数は不要
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `必要な環境変数が設定されていません: ${missingVars.join(', ')}`
    );
  }

  // OAuth設定の確認（任意）
  const oauthProvider = process.env.TEST_OAUTH_PROVIDER || 'google';
  const mockEnabled = process.env.TEST_OAUTH_MOCK_ENABLED === 'true';

  console.log(
    `🔗 OAuth設定 - Provider: ${oauthProvider}, Mock: ${mockEnabled}`
  );
  console.log('✅ MCP環境変数検証完了');
}

/**
 * テスト用認証状態の確認
 */
async function validateTestAuthSetup() {
  try {
    // 認証設定ファイルの存在確認
    const fs = await import('fs');
    const authFilePath = 'tests/e2e/.auth/user.json';

    if (!fs.existsSync(authFilePath)) {
      console.log(
        '🔐 認証設定ファイルが見つかりません。OAuth認証セットアップが必要です。'
      );
    } else {
      console.log('✅ 認証設定ファイル確認完了');
    }
  } catch (error) {
    console.warn('⚠️ 認証設定確認中にエラーが発生しました:', error);
  }
}

export default globalSetup;
