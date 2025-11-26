/**
 * Malymoon管理抽選撮影会のテストデータ作成スクリプト
 *
 * 実行方法:
 * node scripts/create-admin-lottery-malymoon.js                    # 既存ユーザーを使用（デフォルト・推奨）
 * node scripts/create-admin-lottery-malymoon.js --create-users     # ユーザーを新規作成（時間がかかります）
 *
 * 環境変数:
 * - NEXT_PUBLIC_SUPABASE_URL: SupabaseプロジェクトURL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase Service Role Key（Admin API用）
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// コマンドライン引数を解析
const args = process.argv.slice(2);
const createUsers = args.includes('--create-users'); // デフォルトはfalse（既存ユーザーを使用）

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ 環境変数が設定されていません');
  console.error(
    'NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください'
  );
  process.exit(1);
}

// Admin API用のSupabaseクライアント
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// ユーザー作成関数（既存スクリプトから再利用）
// ============================================================================
async function createUser(userData) {
  try {
    console.log(`📝 ${userData.email} を作成中...`);

    // Admin APIを使用してユーザー作成
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.display_name,
          user_type: userData.user_type,
        },
      });

    if (authError) {
      // 既に存在する場合はスキップ
      if (
        authError.message.includes('already registered') ||
        authError.message.includes('email_exists') ||
        authError.code === 'email_exists'
      ) {
        console.log(`⏭️  ${userData.email} は既に存在します`);
        // profilesテーブルから直接取得を試みる
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userData.email)
          .single();
        if (profile) {
          return { userId: profile.id, isNew: false };
        }
        return null;
      }
      throw authError;
    }

    console.log(`✅ ${userData.email} 認証ユーザー作成完了`);

    // プロフィール作成
    const profileData = {
      id: authData.user.id,
      email: userData.email,
      display_name: userData.display_name,
      user_type: userData.user_type,
      bio: userData.bio || null,
      location: userData.location || null,
      website: userData.website || null,
      instagram_handle: userData.instagram_handle || null,
      twitter_handle: userData.twitter_handle || null,
      username: userData.email.split('@')[0],
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (profileError) {
      console.error(
        `❌ ${userData.email} プロフィール作成エラー:`,
        profileError
      );
      throw profileError;
    }

    console.log(`✅ ${userData.email} プロフィール作成完了`);
    return { userId: authData.user.id, isNew: true };
  } catch (error) {
    console.error(`❌ ${userData.email} 作成中にエラー:`, error.message);
    throw error;
  }
}

// ============================================================================
// メイン処理
// ============================================================================
async function main() {
  console.log('🚀 Malymoon管理抽選撮影会テストデータ作成開始...\n');

  try {
    // 1. 運営者アカウント取得
    console.log('📋 1. 運営者アカウント取得');
    const { data: organizerProfile, error: organizerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'malymoon@shutterhub.test')
      .single();

    if (organizerError || !organizerProfile) {
      console.error('❌ 運営者アカウントが見つかりません');
      console.error(
        '   先に scripts/create-malymoon-data.js を実行してください'
      );
      process.exit(1);
    }
    const organizerId = organizerProfile.id;
    console.log(`✅ 運営者ID: ${organizerId}\n`);

    // 2. スタジオ情報取得
    console.log('📋 2. スタジオ情報取得');
    const { data: studioData, error: studioError } = await supabase
      .from('studios')
      .select('id')
      .ilike('name', '%Malymoon%ブロッサム%')
      .limit(1)
      .single();

    if (studioError || !studioData) {
      console.error('❌ スタジオ情報が見つかりません');
      console.error(
        '   先に scripts/create-malymoon-data.js を実行してください'
      );
      process.exit(1);
    }
    console.log(`✅ スタジオID: ${studioData.id}\n`);

    // 3. モデル情報取得
    console.log('📋 3. モデル情報取得');
    const { data: modelsData, error: modelsError } = await supabase
      .from('profiles')
      .select('id')
      .in('email', [
        'gyava@malymoon.test',
        'raimu@malymoon.test',
        'ryokubo@malymoon.test',
        'nanami_urin@malymoon.test',
      ]);

    if (modelsError || !modelsData || modelsData.length === 0) {
      console.error('❌ モデル情報が見つかりません');
      console.error(
        '   先に scripts/create-malymoon-data.js を実行してください'
      );
      process.exit(1);
    }
    const modelIds = modelsData.map(m => m.id);
    console.log(`✅ モデル${modelIds.length}名を取得\n`);

    // 4. 撮影会作成（管理抽選）
    console.log('📋 4. 撮影会作成（管理抽選）');
    const sessionStartTime = new Date('2025-12-13T10:30:00+09:00');
    const sessionEndTime = new Date('2025-12-13T16:00:00+09:00');

    const { data: sessionData, error: sessionError } = await supabase
      .from('photo_sessions')
      .insert({
        organizer_id: organizerId,
        title: '【12/13開催】 Malymoonミニ撮影会 - 管理抽選',
        description: `Malymoon主催のミニ撮影会です（管理抽選方式）。
出演モデル: gyava、らいむ、緑望、七海うりん

各部20分前から受付開始となります。
各部ラスト15分はチェキタイムとなります。

撮影方法・掲載方法については、各モデルごとに異なりますので、詳細をご確認ください。`,
        location: 'Malymoon自社スタジオブロッサム',
        address: '東京都',
        start_time: sessionStartTime.toISOString(),
        end_time: sessionEndTime.toISOString(),
        max_participants: 200, // 全体の最大参加者数（スロットごとの定員とは別）
        current_participants: 0,
        price_per_person: 9000,
        booking_type: 'admin_lottery',
        booking_settings: {
          application_start_time: new Date(
            '2025-11-06T20:00:00+09:00'
          ).toISOString(),
          application_end_time: new Date(
            '2025-11-14T13:00:00+09:00'
          ).toISOString(),
          lottery_date_time: new Date(
            '2025-11-17T21:00:00+09:00'
          ).toISOString(),
        },
        allow_multiple_bookings: true,
        is_published: true,
        payment_timing: 'prepaid',
        session_type: 'joint', // 合同撮影会
      })
      .select()
      .single();

    if (sessionError) {
      console.error(`❌ 撮影会作成エラー:`, sessionError);
      throw sessionError;
    }
    console.log(`✅ 撮影会ID: ${sessionData.id}\n`);

    // 5. モデルを撮影会に紐づけ
    console.log('📋 5. モデルを撮影会に紐づけ');
    const modelInserts = modelIds.map((modelId, index) => ({
      photo_session_id: sessionData.id,
      model_id: modelId,
      fee_amount: 0, // 合同撮影会なので0
      display_order: index,
    }));

    const { error: modelsLinkError } = await supabase
      .from('photo_session_models')
      .insert(modelInserts);

    if (modelsLinkError) {
      console.error(`❌ モデル紐づけエラー:`, modelsLinkError);
    } else {
      console.log(`✅ モデル${modelIds.length}名を紐づけ完了\n`);
    }

    // 6. スタジオを撮影会に紐づけ
    console.log('📋 6. スタジオを撮影会に紐づけ');
    const { error: studioLinkError } = await supabase
      .from('photo_session_studios')
      .insert({
        photo_session_id: sessionData.id,
        studio_id: studioData.id,
        usage_start_time: sessionStartTime.toISOString(),
        usage_end_time: sessionEndTime.toISOString(),
      });

    if (studioLinkError) {
      console.error(`❌ スタジオ紐づけエラー:`, studioLinkError);
    } else {
      console.log(`✅ スタジオ紐づけ完了\n`);
    }

    // 7. 管理抽選セッション作成
    console.log('📋 7. 管理抽選セッション作成');
    const { data: adminLotteryData, error: adminLotteryError } = await supabase
      .from('admin_lottery_sessions')
      .insert({
        photo_session_id: sessionData.id,
        entry_start_time: new Date('2025-11-06T20:00:00+09:00').toISOString(),
        entry_end_time: new Date('2025-11-14T13:00:00+09:00').toISOString(),
        selection_deadline: new Date('2025-11-17T21:00:00+09:00').toISOString(),
        max_selections: 200, // 最大選択数
        status: 'accepting', // エントリー受付中
        // 複数スロット抽選設定（オプション）
        enable_lottery_weight: true,
        weight_calculation_method: 'linear',
        weight_multiplier: 1.0,
        enable_model_selection: true,
        model_selection_scope: 'per_slot',
        enable_cheki_selection: true,
        cheki_selection_scope: 'total_only',
      })
      .select()
      .single();

    if (adminLotteryError) {
      console.error(`❌ 管理抽選セッション作成エラー:`, adminLotteryError);
      throw adminLotteryError;
    }
    console.log(`✅ 管理抽選セッションID: ${adminLotteryData.id}\n`);

    // 8. スロット作成
    console.log('📋 8. スロット作成');
    const slots = [
      {
        slot_number: 1,
        start_time: new Date('2025-12-13T10:30:00+09:00').toISOString(),
        end_time: new Date('2025-12-13T11:30:00+09:00').toISOString(),
        costume_description: 'クリスマスコスチューム',
        max_participants: 50,
      },
      {
        slot_number: 2,
        start_time: new Date('2025-12-13T12:00:00+09:00').toISOString(),
        end_time: new Date('2025-12-13T13:00:00+09:00').toISOString(),
        costume_description: '巫女コスチューム',
        max_participants: 50,
      },
      {
        slot_number: 3,
        start_time: new Date('2025-12-13T13:30:00+09:00').toISOString(),
        end_time: new Date('2025-12-13T14:30:00+09:00').toISOString(),
        costume_description: 'クリスマスコスチューム',
        max_participants: 50,
      },
      {
        slot_number: 4,
        start_time: new Date('2025-12-13T15:00:00+09:00').toISOString(),
        end_time: new Date('2025-12-13T16:00:00+09:00').toISOString(),
        costume_description: 'モデルセレクトコスチューム',
        max_participants: 50,
      },
    ];

    for (const slot of slots) {
      const { error: slotError } = await supabase
        .from('photo_session_slots')
        .insert({
          photo_session_id: sessionData.id,
          slot_number: slot.slot_number,
          start_time: slot.start_time,
          end_time: slot.end_time,
          price_per_person: 9000,
          max_participants: slot.max_participants,
          current_participants: 0,
          costume_description: slot.costume_description,
          break_duration_minutes: 30,
          is_active: true,
        });
      if (slotError) {
        console.error(`❌ スロット${slot.slot_number}作成エラー:`, slotError);
      }
    }
    console.log(`✅ スロット4つ作成完了\n`);

    // 9. テストユーザー（カメラマン）取得/作成
    let photographerIds = [];

    if (createUsers) {
      console.log('📋 9. テストユーザー（カメラマン）作成');
      console.log('   ⚠️  この処理は時間がかかります\n');
      // 簡易的に既存ユーザーを使用することを推奨
      console.log('   ⚠️  既存ユーザーを使用することを推奨します\n');
    }

    console.log('📋 9. 既存カメラマンユーザーを取得');
    const { data: existingPhotographers, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_type', 'photographer')
      .like('email', '%@shutterhub.test')
      .limit(150);

    if (fetchError) {
      console.error('❌ 既存ユーザー取得エラー:', fetchError);
      throw fetchError;
    }

    if (!existingPhotographers || existingPhotographers.length === 0) {
      console.error('❌ 既存のカメラマンユーザーが見つかりません');
      console.error(
        '   先に scripts/create-malymoon-data.js を実行してユーザーを作成してください'
      );
      throw new Error('既存ユーザーが見つかりません');
    }

    photographerIds = existingPhotographers.map(p => p.id);
    console.log(`✅ 既存カメラマン${photographerIds.length}名を取得\n`);

    // 10. 管理抽選エントリー作成
    console.log('📋 10. 管理抽選エントリー作成');

    // エントリー作成（120ユーザー）
    const entryUsers = photographerIds.slice(0, 120);
    let entrySuccessCount = 0;
    let entryErrorCount = 0;

    for (let i = 0; i < entryUsers.length; i++) {
      const userId = entryUsers[i];

      try {
        // ランダムな応募メッセージを生成
        const messages = [
          'よろしくお願いします！',
          '参加希望です。',
          'ぜひ参加させてください。',
          '楽しみにしています！',
          null, // メッセージなしも含める
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];

        // 管理抽選エントリーを作成
        const { error: entryError } = await supabase
          .from('admin_lottery_entries')
          .insert({
            admin_lottery_session_id: adminLotteryData.id,
            user_id: userId,
            message: message,
            status: 'applied', // 応募済み
          });

        if (entryError) {
          // 既にエントリー済みの場合はスキップ
          if (entryError.code === '23505') {
            console.log(`⏭️  ユーザー${i + 1}は既にエントリー済み`);
            continue;
          }
          throw entryError;
        }

        entrySuccessCount++;

        // 進捗表示（10件ごと）
        if ((i + 1) % 10 === 0) {
          console.log(`  ${i + 1}/${entryUsers.length}件処理完了...`);
        }

        // レート制限を避けるため、少し待機
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(
          `❌ ユーザー${i + 1}エントリー作成エラー:`,
          error.message
        );
        entryErrorCount++;
      }
    }

    console.log(
      `✅ 管理抽選エントリー作成完了: 成功${entrySuccessCount}件、エラー${entryErrorCount}件\n`
    );

    console.log('🎉 Malymoon管理抽選撮影会テストデータ作成完了！\n');
    console.log('📊 作成サマリー:');
    console.log(`  - 運営者: Malymoon撮影会`);
    console.log(`  - モデル: ${modelIds.length}名`);
    console.log(`  - 撮影会: 1件（管理抽選方式）`);
    console.log(`  - スロット: 4つ`);
    console.log(`  - 管理抽選エントリー: ${entrySuccessCount}件`);
    console.log(`\n🔗 撮影会URL:`);
    console.log(`   /photo-sessions/${sessionData.id}`);
    console.log(`\n🔑 ログイン情報:`);
    console.log(`  運営者: malymoon@shutterhub.test / Malymoon2025!`);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
