/**
 * E2Eテスト用ユーザー作成スクリプト
 * Supabase Admin APIを使用して正しい手順でテストユーザーを作成
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 必要な環境変数が設定されていません');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

// Admin权限でSupabaseクライアントを作成
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testUsers = [
  {
    email: 'e2e-organizer@example.com',
    password: 'E2ETestPassword123!',
    user_metadata: {
      full_name: 'E2Eテスト主催者',
      user_type: 'organizer',
    },
  },
  {
    email: 'e2e-photographer@example.com',
    password: 'E2ETestPassword123!',
    user_metadata: {
      full_name: 'E2Eテストフォトグラファー',
      user_type: 'photographer',
    },
  },
  {
    email: 'e2e-model@example.com',
    password: 'E2ETestPassword123!',
    user_metadata: {
      full_name: 'E2Eテストモデル',
      user_type: 'model',
    },
  },
];

async function createTestUsers() {
  console.log('🚀 E2Eテストユーザー作成開始...');

  for (const userData of testUsers) {
    try {
      console.log(`📝 ${userData.email} を作成中...`);

      // Admin APIを使用してユーザー作成
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          user_metadata: userData.user_metadata,
          email_confirm: true, // メール確認をスキップ
        });

      if (authError) {
        console.error(
          `❌ ${userData.email} 認証ユーザー作成エラー:`,
          authError.message
        );
        continue;
      }

      console.log(`✅ ${userData.email} 認証ユーザー作成完了`);

      // プロフィール作成
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: userData.email,
        display_name: userData.user_metadata.full_name,
        user_type: userData.user_metadata.user_type,
        username: userData.email.split('@')[0].replace('e2e-', 'e2e_'),
        bio: `E2Eテスト専用の${userData.user_metadata.user_type}アカウントです。`,
      });

      if (profileError) {
        console.error(
          `❌ ${userData.email} プロフィール作成エラー:`,
          profileError.message
        );
      } else {
        console.log(`✅ ${userData.email} プロフィール作成完了`);
      }
    } catch (error) {
      console.error(
        `❌ ${userData.email} 作成中に予期しないエラー:`,
        error.message
      );
    }
  }

  console.log('🎉 E2Eテストユーザー作成完了！');
}

async function verifyTestUsers() {
  console.log('🔍 作成されたテストユーザーの確認...');

  for (const userData of testUsers) {
    try {
      // 認証テスト
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: userData.email,
          password: userData.password,
        });

      if (signInError) {
        console.error(
          `❌ ${userData.email} ログインテスト失敗:`,
          signInError.message
        );
      } else {
        console.log(`✅ ${userData.email} ログインテスト成功`);

        // サインアウト
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error(
        `❌ ${userData.email} ログインテスト中にエラー:`,
        error.message
      );
    }
  }
}

async function main() {
  try {
    await createTestUsers();
    console.log('\n' + '='.repeat(50) + '\n');
    await verifyTestUsers();
  } catch (error) {
    console.error('❌ スクリプト実行エラー:', error.message);
    process.exit(1);
  }
}

// スクリプト実行
main();
