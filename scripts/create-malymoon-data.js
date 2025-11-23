/**
 * Malymoon撮影会のテストデータ作成スクリプト
 *
 * 実行方法:
 * node scripts/create-malymoon-data.js                    # 既存ユーザーを使用（デフォルト・推奨）
 * node scripts/create-malymoon-data.js --create-users     # ユーザーを新規作成（時間がかかります）
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
// 1. 運営者アカウント「Malymoon撮影会」
// ============================================================================
const organizerData = {
  email: 'malymoon@shutterhub.test',
  password: 'Malymoon2025!',
  display_name: 'Malymoon撮影会',
  user_type: 'organizer',
  bio: 'Malymoon（マリームーン）は、モデル撮影会を主催する運営会社です。',
  location: '東京都',
  website: 'https://blossomstudio.jp/',
  instagram_handle: 'malymoon_photosession',
  twitter_handle: 'malymoon_ps',
};

// ============================================================================
// 2. モデル4名
// ============================================================================
const modelsData = [
  {
    email: 'gyava@malymoon.test',
    password: 'Model2025!',
    display_name: 'gyava',
    user_type: 'model',
    bio: 'Malymoon所属モデル',
    location: '東京都',
  },
  {
    email: 'raimu@malymoon.test',
    password: 'Model2025!',
    display_name: 'らいむ',
    user_type: 'model',
    bio: 'Malymoon所属モデル',
    location: '東京都',
  },
  {
    email: 'ryokubo@malymoon.test',
    password: 'Model2025!',
    display_name: '緑望',
    user_type: 'model',
    bio: 'Malymoon所属モデル',
    location: '東京都',
  },
  {
    email: 'nanami_urin@malymoon.test',
    password: 'Model2025!',
    display_name: '七海うりん',
    user_type: 'model',
    bio: 'Malymoon所属モデル',
    location: '東京都',
  },
];

// ============================================================================
// 3. テストユーザー（カメラマン）大量作成
// ============================================================================
const prefectures = [
  { name: '東京都', romaji: 'tokyo' },
  { name: '神奈川県', romaji: 'kanagawa' },
  { name: '埼玉県', romaji: 'saitama' },
  { name: '千葉県', romaji: 'chiba' },
  { name: '大阪府', romaji: 'osaka' },
  { name: '京都府', romaji: 'kyoto' },
  { name: '兵庫県', romaji: 'hyogo' },
  { name: '愛知県', romaji: 'aichi' },
  { name: '福岡県', romaji: 'fukuoka' },
  { name: '北海道', romaji: 'hokkaido' },
  { name: '宮城県', romaji: 'miyagi' },
  { name: '広島県', romaji: 'hiroshima' },
];

function generatePhotographers() {
  const photographers = [];
  let counter = 1;

  for (const prefecture of prefectures) {
    for (let i = 1; i <= 20; i++) {
      // 各都道府県20名ずつ
      const num = String(counter).padStart(3, '0');
      photographers.push({
        email: `${prefecture.romaji}_cameraman${num}@shutterhub.test`,
        password: 'Test2025!',
        display_name: `${prefecture.name}_カメラマン${num}`,
        user_type: 'photographer',
        bio: `${prefecture.name}を中心に活動するカメラマン`,
        location: prefecture.name,
        prefecture: prefecture.name,
        number: num,
      });
      counter++;
    }
  }

  return photographers;
}

// ============================================================================
// ユーザー作成関数
// ============================================================================
async function createUser(userData) {
  try {
    console.log(`📝 ${userData.email} を作成中...`);

    // Admin APIを使用してユーザー作成
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // メール確認をスキップ
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
        // 既存ユーザーのIDを取得
        const { data: existingUsers, error: listError } =
          await supabase.auth.admin.listUsers();
        if (listError) {
          console.error(`❌ ユーザー一覧取得エラー:`, listError);
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
        const user = existingUsers?.users?.find(
          u => u.email === userData.email
        );
        if (user) {
          return { userId: user.id, isNew: false };
        }
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
  console.log('🚀 Malymoon撮影会テストデータ作成開始...\n');

  try {
    // 1. 運営者アカウント作成
    console.log('📋 1. 運営者アカウント作成');
    let organizerResult;
    try {
      organizerResult = await createUser(organizerData);
    } catch (error) {
      // 既存ユーザーの場合はprofilesから取得を試みる
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', organizerData.email)
        .single();
      if (profile) {
        organizerResult = { userId: profile.id, isNew: false };
        console.log(`⏭️  既存の運営者アカウントを使用: ${profile.id}`);
      } else {
        console.error('❌ 運営者アカウントの作成に失敗しました');
        throw error;
      }
    }
    if (!organizerResult) {
      console.error('❌ 運営者アカウントの作成に失敗しました');
      process.exit(1);
    }
    const organizerId = organizerResult.userId;
    console.log(`✅ 運営者ID: ${organizerId}\n`);

    // 2. モデルアカウント作成
    console.log('📋 2. モデルアカウント作成');
    const modelIds = [];
    for (const modelData of modelsData) {
      const modelResult = await createUser(modelData);
      if (modelResult) {
        modelIds.push(modelResult.userId);
      }
    }
    console.log(`✅ モデル${modelIds.length}名作成完了\n`);

    // 3. モデルを運営者に所属
    console.log('📋 3. モデルを運営者に所属');
    for (const modelId of modelIds) {
      const { error } = await supabase.from('organizer_models').upsert(
        {
          organizer_id: organizerId,
          model_id: modelId,
          invitation_status: 'accepted',
          status: 'active',
          accepted_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
        },
        { onConflict: 'organizer_id,model_id' }
      );
      if (error) {
        console.error(`❌ モデル所属エラー:`, error);
      }
    }
    console.log(`✅ モデル所属設定完了\n`);

    // 4. スタジオ情報作成
    console.log('📋 4. スタジオ情報作成');
    const { data: studioData, error: studioError } = await supabase
      .from('studios')
      .upsert(
        {
          name: 'Malymoon自社スタジオブロッサム',
          normalized_name: 'malymoon自社スタジオブロッサム',
          address: '東京都',
          normalized_address: '東京都',
          prefecture: '東京都',
          city: '東京都',
          location_hash: 'tokyo_malymoon_blossom',
          description:
            'Malymoonの自社スタジオ。クリスマスや巫女コスチュームなど、様々なテーマの撮影に対応。',
          max_capacity: 100,
          hourly_rate_min: 0,
          hourly_rate_max: 0,
          website_url: 'https://blossomstudio.jp/',
          verification_status: 'verified',
        },
        { onConflict: 'normalized_name,normalized_address' }
      )
      .select()
      .single();

    if (studioError) {
      console.error(`❌ スタジオ作成エラー:`, studioError);
    } else {
      console.log(`✅ スタジオID: ${studioData.id}`);

      // 運営者とスタジオを紐づけ
      const { error: linkError } = await supabase
        .from('organizer_studios')
        .upsert(
          {
            organizer_id: organizerId,
            studio_id: studioData.id,
            relationship_type: 'exclusive',
            priority_level: 5,
            status: 'active',
          },
          { onConflict: 'organizer_id,studio_id' }
        );
      if (linkError) {
        console.error(`❌ スタジオ紐づけエラー:`, linkError);
      } else {
        console.log(`✅ スタジオ紐づけ完了\n`);
      }
    }

    // 5. 撮影会作成
    console.log('📋 5. 撮影会作成');
    const sessionStartTime = new Date('2025-12-13T10:30:00+09:00');
    const sessionEndTime = new Date('2025-12-13T16:00:00+09:00');

    const { data: sessionData, error: sessionError } = await supabase
      .from('photo_sessions')
      .insert({
        organizer_id: organizerId,
        title: '【12/13開催】 Malymoonミニ撮影会',
        description: `Malymoon主催のミニ撮影会です。
出演モデル: gyava、らいむ、緑望、七海うりん

各部20分前から受付開始となります。
各部ラスト15分はチェキタイムとなります。

撮影方法・掲載方法については、各モデルごとに異なりますので、詳細をご確認ください。`,
        location: 'Malymoon自社スタジオブロッサム',
        address: '東京都',
        start_time: sessionStartTime.toISOString(),
        end_time: sessionEndTime.toISOString(),
        max_participants: 50, // 全体の最大参加者数（スロットごとの定員とは別）
        current_participants: 0,
        price_per_person: 9000,
        booking_type: 'lottery',
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
          auto_lottery: false,
        },
        allow_multiple_bookings: true,
        is_published: true,
        payment_timing: 'prepaid',
      })
      .select()
      .single();

    if (sessionError) {
      console.error(`❌ 撮影会作成エラー:`, sessionError);
      throw sessionError;
    }
    console.log(`✅ 撮影会ID: ${sessionData.id}\n`);

    // 6. 抽選セッション作成
    console.log('📋 6. 抽選セッション作成');
    const { data: lotteryData, error: lotteryError } = await supabase
      .from('lottery_sessions')
      .insert({
        photo_session_id: sessionData.id,
        entry_start_time: new Date('2025-11-06T20:00:00+09:00').toISOString(),
        entry_end_time: new Date('2025-11-14T13:00:00+09:00').toISOString(),
        lottery_date: new Date('2025-11-17T21:00:00+09:00').toISOString(),
        max_winners: 50,
        status: 'accepting',
      })
      .select()
      .single();

    if (lotteryError) {
      console.error(`❌ 抽選セッション作成エラー:`, lotteryError);
      throw lotteryError;
    }
    console.log(`✅ 抽選セッションID: ${lotteryData.id}\n`);

    // 7. スロット作成
    console.log('📋 7. スロット作成');
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

    // 8. テストユーザー（カメラマン）取得/作成
    let photographerIds = [];
    let successCount = 0;

    if (createUsers) {
      console.log('📋 8. テストユーザー（カメラマン）大量作成');
      console.log('   ⚠️  この処理は時間がかかります（約240名）\n');
      const photographers = generatePhotographers();
      let skipCount = 0;

      for (const photographer of photographers) {
        try {
          const result = await createUser(photographer);
          if (result) {
            photographerIds.push(result.userId);
            if (result.isNew) {
              successCount++;
            } else {
              skipCount++;
            }
          }
          // レート制限を避けるため、少し待機
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ ${photographer.email} 作成エラー:`, error.message);
        }
      }
      console.log(
        `✅ カメラマン作成完了: 新規${successCount}名、既存${skipCount}名\n`
      );
    } else {
      console.log('📋 8. 既存カメラマンユーザーを取得');
      console.log(
        '   （ユーザー作成をスキップして既存ユーザーを使用します）\n'
      );

      // 既存のカメラマンユーザーを取得
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
          '   --create-usersオプションを付けて実行してユーザーを作成してください'
        );
        throw new Error('既存ユーザーが見つかりません');
      }

      photographerIds = existingPhotographers.map(p => p.id);
      console.log(`✅ 既存カメラマン${photographerIds.length}名を取得\n`);
    }

    // 9. 複数スロット抽選エントリー作成
    console.log('📋 9. 複数スロット抽選エントリー作成');

    // スロット情報を取得
    const { data: slotsData, error: slotsError } = await supabase
      .from('photo_session_slots')
      .select('id, slot_number')
      .eq('photo_session_id', sessionData.id)
      .order('slot_number');

    if (slotsError || !slotsData || slotsData.length === 0) {
      console.error('❌ スロット情報取得エラー:', slotsError);
      throw new Error('スロット情報の取得に失敗しました');
    }

    const slotIds = slotsData.map(s => s.id);
    console.log(`✅ スロット${slotIds.length}個を取得`);

    // エントリー作成（150ユーザー）
    const entryUsers = photographerIds.slice(0, 150);
    let entrySuccessCount = 0;
    let entryErrorCount = 0;

    for (let i = 0; i < entryUsers.length; i++) {
      const userId = entryUsers[i];

      try {
        // ランダムに1-4スロットを選択
        const numSlots = Math.floor(Math.random() * 4) + 1; // 1-4スロット
        const selectedSlotIds = slotIds
          .sort(() => Math.random() - 0.5)
          .slice(0, numSlots);

        // キャンセルポリシーをランダムに選択
        const cancellationPolicy =
          Math.random() > 0.5 ? 'all_or_nothing' : 'partial_ok';

        // エントリーグループを作成
        const { data: groupData, error: groupError } = await supabase
          .from('lottery_entry_groups')
          .insert({
            lottery_session_id: lotteryData.id,
            user_id: userId,
            cancellation_policy: cancellationPolicy,
            total_slots_applied: selectedSlotIds.length,
            group_status: 'entered',
          })
          .select()
          .single();

        if (groupError) {
          // 既にエントリー済みの場合はスキップ
          if (groupError.code === '23505') {
            console.log(`⏭️  ユーザー${i + 1}は既にエントリー済み`);
            continue;
          }
          throw groupError;
        }

        // スロットエントリーを作成
        const slotEntries = selectedSlotIds.map(slotId => ({
          lottery_entry_group_id: groupData.id,
          lottery_session_id: lotteryData.id,
          slot_id: slotId,
          user_id: userId,
          status: 'entered',
          lottery_weight: 1.0,
        }));

        const { error: slotEntriesError } = await supabase
          .from('lottery_slot_entries')
          .insert(slotEntries);

        if (slotEntriesError) {
          throw slotEntriesError;
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
      `✅ 複数スロット抽選エントリー作成完了: 成功${entrySuccessCount}件、エラー${entryErrorCount}件\n`
    );

    console.log('🎉 Malymoon撮影会テストデータ作成完了！\n');
    console.log('📊 作成サマリー:');
    console.log(`  - 運営者: 1名 (${organizerData.email})`);
    console.log(`  - モデル: ${modelIds.length}名`);
    if (createUsers) {
      console.log(`  - カメラマン: ${successCount}名 (新規作成)`);
    } else {
      console.log(
        `  - カメラマン: ${photographerIds.length}名 (既存ユーザー使用)`
      );
    }
    console.log(`  - 撮影会: 1件`);
    console.log(`  - スロット: 4つ`);
    console.log(`  - 複数スロット抽選エントリー: ${entrySuccessCount}グループ`);
    console.log(`\n🔑 ログイン情報:`);
    console.log(`  運営者: ${organizerData.email} / ${organizerData.password}`);
    console.log(`  モデル: gyava@malymoon.test / Model2025!`);
    console.log(`  カメラマン: tokyo_cameraman001@shutterhub.test / Test2025!`);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
