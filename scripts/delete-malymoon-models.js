/**
 * Malymoon（マリームーン）所属モデル削除スクリプト
 *
 * 使用方法:
 * node scripts/delete-malymoon-models.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  console.error('   .env.localファイルに以下を設定してください:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=...');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// メイン処理
// ============================================================================
async function main() {
  console.log('🚀 Malymoon（マリームーン）所属モデル削除開始...\n');

  try {
    // 1. 削除対象のメールアドレスパターン
    const emailPattern = '%.malymoon@malymoon.test';
    console.log(`📋 削除対象: ${emailPattern}\n`);

    // 2. profilesテーブルから該当ユーザーを取得
    console.log('📋 1. 削除対象ユーザーの検索');
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .like('email', emailPattern);

    if (fetchError) {
      console.error('❌ ユーザー検索エラー:', fetchError);
      throw fetchError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('✅ 削除対象のユーザーが見つかりませんでした\n');
      return;
    }

    console.log(`✅ ${profiles.length}名のユーザーが見つかりました\n`);

    // 3. organizer_modelsテーブルから所属関係を削除
    console.log('📋 2. 所属関係の削除');
    const userIds = profiles.map(p => p.id);
    const { error: deleteRelationError } = await supabase
      .from('organizer_models')
      .delete()
      .in('model_id', userIds);

    if (deleteRelationError) {
      console.error('❌ 所属関係削除エラー:', deleteRelationError);
      // エラーでも続行
    } else {
      console.log(`✅ 所属関係の削除完了\n`);
    }

    // 4. profilesテーブルからプロフィールを削除
    console.log('📋 3. プロフィールの削除');
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .in('id', userIds);

    if (deleteProfileError) {
      console.error('❌ プロフィール削除エラー:', deleteProfileError);
      throw deleteProfileError;
    }

    console.log(`✅ ${profiles.length}名のプロフィール削除完了\n`);

    // 5. auth.usersテーブルからユーザーを削除（Admin API使用）
    console.log('📋 4. 認証ユーザーの削除');
    let deletedCount = 0;
    let errorCount = 0;

    for (const profile of profiles) {
      try {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
          profile.id
        );

        if (deleteAuthError) {
          console.error(
            `❌ ${profile.email} の認証ユーザー削除エラー:`,
            deleteAuthError.message
          );
          errorCount++;
        } else {
          console.log(`✅ ${profile.display_name} (${profile.email}) 削除完了`);
          deletedCount++;
        }
      } catch (error) {
        console.error(`❌ ${profile.email} の削除中にエラー:`, error.message);
        errorCount++;
      }
    }

    console.log(
      `\n✅ 認証ユーザー削除完了（成功: ${deletedCount}名、エラー: ${errorCount}名）\n`
    );

    // 6. 結果表示
    console.log('🎉 Malymoon（マリームーン）所属モデル削除完了！\n');
    console.log(`📊 統計:`);
    console.log(`  - 削除対象: ${profiles.length}名`);
    console.log(`  - 削除成功: ${deletedCount}名`);
    if (errorCount > 0) {
      console.log(`  - 削除エラー: ${errorCount}名`);
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
