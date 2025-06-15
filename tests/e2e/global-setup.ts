import { chromium, FullConfig } from '@playwright/test';

/**
 * グローバルセットアップ
 * テスト実行前の環境準備を行う
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 E2Eテスト環境セットアップ開始...');

  // テスト用ブラウザ起動
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // アプリケーションの起動確認
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('✅ アプリケーション起動確認完了');

    // テスト用データベースの初期化
    // 注意: 本番環境では実行しないこと
    if (process.env.NODE_ENV === 'test') {
      console.log('🗄️ テスト用データベース初期化...');
      // データベース初期化処理をここに追加
    }

    console.log('✅ グローバルセットアップ完了');
  } catch (error) {
    console.error('❌ グローバルセットアップ失敗:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
