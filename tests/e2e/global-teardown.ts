/**
 * グローバルティアダウン
 * テスト実行後のクリーンアップを行う
 */
async function globalTeardown() {
  console.log('🧹 E2Eテスト環境クリーンアップ開始...');

  try {
    // テスト用データのクリーンアップ
    if (process.env.NODE_ENV === 'test') {
      console.log('🗄️ テスト用データクリーンアップ...');
      // テストデータの削除処理をここに追加
    }

    // 一時ファイルの削除
    console.log('📁 一時ファイルクリーンアップ...');
    // 一時ファイル削除処理をここに追加

    console.log('✅ グローバルティアダウン完了');
  } catch (error) {
    console.error('❌ グローバルティアダウン失敗:', error);
    // エラーが発生してもテストは継続
  }
}

export default globalTeardown;
