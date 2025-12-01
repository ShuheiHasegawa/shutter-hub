/**
 * Malymoon（マリームーン）所属モデル作成スクリプト
 *
 * 使用方法:
 * node scripts/create-malymoon-models.js                    # 既存ユーザーを使用（デフォルト・推奨）
 * node scripts/create-malymoon-models.js --create-users     # ユーザーを新規作成（時間がかかります）
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
// 1. 運営者アカウント「Malymoon撮影会」（既存）
// ============================================================================
const organizerData = {
  email: 'malymoon@shutterhub.test',
  password: 'Malymoon2025!',
  display_name: 'Malymoon撮影会',
  user_type: 'organizer',
  bio: 'Malymoon（マリームーン）は、モデル撮影会を主催する運営会社です。',
  location: '東京都',
  instagram_handle: 'malymoon_photosession',
  twitter_handle: 'malymoon_ps',
};

// ============================================================================
// 2. Malymoon（マリームーン）所属モデル一覧（重複除去済み）
// ============================================================================
const malymoonModelsData = [
  {
    email: 'zumi@malymoon.test',
    password: 'Model2025!',
    display_name: 'ズミ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'daruma@malymoon.test',
    password: 'Model2025!',
    display_name: 'だるま',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'sakurai@malymoon.test',
    password: 'Model2025!',
    display_name: '尊みを感じて桜井',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'sisuru@malymoon.test',
    password: 'Model2025!',
    display_name: 'シスル',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'suzura@malymoon.test',
    password: 'Model2025!',
    display_name: 'すずら',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'tsukumi_tsukune@malymoon.test',
    password: 'Model2025!',
    display_name: '月海つくね',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'reira@malymoon.test',
    password: 'Model2025!',
    display_name: 'レイラ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'kamomiru@malymoon.test',
    password: 'Model2025!',
    display_name: 'カモミール',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'suenaga_miyu@malymoon.test',
    password: 'Model2025!',
    display_name: '末永みゆ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'kipi@malymoon.test',
    password: 'Model2025!',
    display_name: 'kipi',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'dekamori_takane@malymoon.test',
    password: 'Model2025!',
    display_name: '凸守たかね',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'shiki@malymoon.test',
    password: 'Model2025!',
    display_name: 'し季',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'kureha_rio@malymoon.test',
    password: 'Model2025!',
    display_name: '紅羽りお',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'honda_yuho@malymoon.test',
    password: 'Model2025!',
    display_name: '本田夕歩',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'narukami_nagone@malymoon.test',
    password: 'Model2025!',
    display_name: '鳴上なごね',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'hoshina_haru@malymoon.test',
    password: 'Model2025!',
    display_name: '星名はる',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'yuzuriha_kureha@malymoon.test',
    password: 'Model2025!',
    display_name: '楪くれは',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'himemiya_mahore@malymoon.test',
    password: 'Model2025!',
    display_name: '姫宮まほれ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'himeno_hinano@malymoon.test',
    password: 'Model2025!',
    display_name: '姫野ひなの',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'kosugi_reiko@malymoon.test',
    password: 'Model2025!',
    display_name: '小杉怜子',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'sakurai_ririka@malymoon.test',
    password: 'Model2025!',
    display_name: '佐倉井りりか',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'inuno_karin@malymoon.test',
    password: 'Model2025!',
    display_name: '犬乃かりん',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'morimoto_shiona@malymoon.test',
    password: 'Model2025!',
    display_name: '森本栞菜',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'kobayashi_yumeka@malymoon.test',
    password: 'Model2025!',
    display_name: '小林夢叶',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'suzuno_riko@malymoon.test',
    password: 'Model2025!',
    display_name: '涼乃莉子',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'miyawaki_ayaka@malymoon.test',
    password: 'Model2025!',
    display_name: '宮脇あやか',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'mitani_ayako@malymoon.test',
    password: 'Model2025!',
    display_name: '三谷綾子',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'koori_ria@malymoon.test',
    password: 'Model2025!',
    display_name: '小織りあ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'hayakawa_nagisa@malymoon.test',
    password: 'Model2025!',
    display_name: '早川渚紗',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'maika@malymoon.test',
    password: 'Model2025!',
    display_name: 'まいか',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'usaki@malymoon.test',
    password: 'Model2025!',
    display_name: '宇咲',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'kaminami_rina@malymoon.test',
    password: 'Model2025!',
    display_name: '神南りな',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'tsuki_nagisa@malymoon.test',
    password: 'Model2025!',
    display_name: '月なぎさ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'himana_riku@malymoon.test',
    password: 'Model2025!',
    display_name: '姫奈りく',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'kosaka_kotomi@malymoon.test',
    password: 'Model2025!',
    display_name: '高坂琴水',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'kanade_reika@malymoon.test',
    password: 'Model2025!',
    display_name: '奏怜花',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'sugaya_natsuko@malymoon.test',
    password: 'Model2025!',
    display_name: '菅谷夏子',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'rena@malymoon.test',
    password: 'Model2025!',
    display_name: 'れな',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'nishi@malymoon.test',
    password: 'Model2025!',
    display_name: '西',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'pan_runarifu@malymoon.test',
    password: 'Model2025!',
    display_name: 'パン・ルナリーフィ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'sakurai_moe@malymoon.test',
    password: 'Model2025!',
    display_name: 'さくらいもえ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'takasaki_aiko@malymoon.test',
    password: 'Model2025!',
    display_name: '高崎愛生',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'noa@malymoon.test',
    password: 'Model2025!',
    display_name: 'のあ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'hazuki_kanon@malymoon.test',
    password: 'Model2025!',
    display_name: '葉月花音',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'senbokutani_hanna@malymoon.test',
    password: 'Model2025!',
    display_name: '仙北谷ハンナ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'kurosaki_ria@malymoon.test',
    password: 'Model2025!',
    display_name: '黒崎りあ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'shiozawa_misaki@malymoon.test',
    password: 'Model2025!',
    display_name: '塩澤みさき',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'natsume_nodoka@malymoon.test',
    password: 'Model2025!',
    display_name: '夏目のどか',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'kasho_roshieru@malymoon.test',
    password: 'Model2025!',
    display_name: '火将ロシエル',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'namae_wa_mada_nai@malymoon.test',
    password: 'Model2025!',
    display_name: '名前はまだない。',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'fuwaru@malymoon.test',
    password: 'Model2025!',
    display_name: 'ふわる',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'nekoda_ashu@malymoon.test',
    password: 'Model2025!',
    display_name: '猫田あしゅ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'furuhama_aoi@malymoon.test',
    password: 'Model2025!',
    display_name: '古浜あおい',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'hinakami_mio@malymoon.test',
    password: 'Model2025!',
    display_name: 'ひなかみお',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'nanase_akane@malymoon.test',
    password: 'Model2025!',
    display_name: '七瀬あかね',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'amane_hina@malymoon.test',
    password: 'Model2025!',
    display_name: 'あまねひな',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'hyakuri_yuri@malymoon.test',
    password: 'Model2025!',
    display_name: '百莉ゆり',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'yoha@malymoon.test',
    password: 'Model2025!',
    display_name: '世は',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'yamohachiko@malymoon.test',
    password: 'Model2025!',
    display_name: 'やもはちこ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'aoba_moguta@malymoon.test',
    password: 'Model2025!',
    display_name: '蒼羽もぐ汰',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'abu@malymoon.test',
    password: 'Model2025!',
    display_name: 'あぶ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
  {
    email: 'nagisa@malymoon.test',
    password: 'Model2025!',
    display_name: 'なぎさ',
    user_type: 'model',
    bio: 'Malymoon（マリームーン）所属モデル。',
    location: '東京都',
  },
];

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
    // usernameは英数字とアンダースコアのみ（ドットをアンダースコアに変換）
    const baseUsername = userData.email.split('@')[0].replace(/\./g, '_');
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
      username: baseUsername,
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
  console.log('🚀 Malymoon（マリームーン）モデル作成開始...\n');

  try {
    // 1. 運営者アカウント確認
    console.log('📋 1. 運営者アカウント確認');
    const { data: organizerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', organizerData.email)
      .single();

    if (!organizerProfile) {
      console.error('❌ 運営者アカウントが見つかりません');
      console.error(
        '   先に scripts/create-malymoon-data.js を実行してください'
      );
      process.exit(1);
    }
    const organizerId = organizerProfile.id;
    console.log(`✅ 運営者ID: ${organizerId}\n`);

    // 2. モデルアカウント作成
    const shouldCreateUsers = process.argv.includes('--create-users');
    console.log(`📋 2. モデルアカウント${shouldCreateUsers ? '作成' : '確認'}`);
    const modelIds = [];
    let createdCount = 0;
    let existingCount = 0;

    for (const modelData of malymoonModelsData) {
      if (shouldCreateUsers) {
        const modelResult = await createUser(modelData);
        if (modelResult) {
          modelIds.push(modelResult.userId);
          if (modelResult.isNew) {
            createdCount++;
          } else {
            existingCount++;
          }
        }
      } else {
        // 既存ユーザーを確認
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', modelData.email)
          .single();
        if (profile) {
          modelIds.push(profile.id);
          existingCount++;
        }
      }
    }

    if (shouldCreateUsers) {
      console.log(
        `✅ モデル${modelIds.length}名処理完了（新規: ${createdCount}名、既存: ${existingCount}名）\n`
      );
    } else {
      console.log(
        `✅ モデル${modelIds.length}名確認完了（既存: ${existingCount}名）\n`
      );
      if (modelIds.length === 0) {
        console.log(
          '⚠️  モデルが見つかりませんでした。--create-users オプションで作成してください。\n'
        );
      }
    }

    // 3. モデルを運営者に所属
    if (modelIds.length > 0) {
      console.log('📋 3. モデルを運営者に所属');
      let linkedCount = 0;
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
        } else {
          linkedCount++;
        }
      }
      console.log(`✅ モデル${linkedCount}名の所属設定完了\n`);
    }

    // 4. 結果表示
    console.log('🎉 Malymoon（マリームーン）モデル作成完了！\n');
    console.log(`📊 統計:`);
    console.log(`  - 運営者: ${organizerData.display_name}`);
    console.log(`  - モデル数: ${modelIds.length}名`);
    if (shouldCreateUsers) {
      console.log(`  - 新規作成: ${createdCount}名`);
      console.log(`  - 既存: ${existingCount}名`);
    }
    console.log(`\n🔐 ログイン情報:`);
    console.log(`  運営者: ${organizerData.email} / ${organizerData.password}`);
    console.log(`  モデル: [email]@malymoon.test / Model2025!`);
    console.log(
      `\n📝 Malymoon（マリームーン）所属モデル一覧（${malymoonModelsData.length}名）:`
    );
    malymoonModelsData.forEach((model, index) => {
      console.log(`  ${index + 1}. ${model.display_name} (${model.email})`);
    });
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
