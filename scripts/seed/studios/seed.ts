/**
 * スタジオシードデータ投入スクリプト
 * Supabaseにスタジオデータを投入する
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { allStudioSeedData as studioSeedData } from './data';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 必要な環境変数が設定されていません');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

// Admin権限でSupabaseクライアントを作成
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedStudios() {
  console.log('🚀 スタジオシードデータ投入開始...');
  console.log(`📊 投入予定データ件数: ${studioSeedData.length}件`);

  // テストユーザーを取得（created_by用）
  const { data: testUsers, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_type', 'organizer')
    .limit(1);

  if (userError || !testUsers || testUsers.length === 0) {
    console.error('❌ テストユーザーの取得に失敗しました:', userError?.message);
    console.log('💡 organizerタイプのユーザーが存在することを確認してください');
    process.exit(1);
  }

  const createdBy = testUsers[0].id;
  console.log(`✅ 作成者ID: ${createdBy}`);

  // バッチ処理でデータ投入（一度に100件ずつ）
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ name: string; error: string }> = [];

  for (let i = 0; i < studioSeedData.length; i += batchSize) {
    const batch = studioSeedData.slice(i, i + batchSize);
    console.log(
      `\n📦 バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(studioSeedData.length / batchSize)} を処理中...`
    );

    const insertData = batch.map((studio, index) => {
      // location_hashの重複を避けるため、座標を微調整
      // 同じ座標のスタジオが複数ある場合、少しずつずらす
      const latOffset = (index % 1000) * 0.0001; // 約10mずつずらす
      const lngOffset = (index % 1000) * 0.0001;

      return {
        name: studio.name,
        description: studio.description,
        address: studio.address,
        prefecture: studio.prefecture,
        city: studio.city,
        access_info: studio.access_info,
        phone: studio.phone,
        email: studio.email,
        website_url: studio.website_url,
        latitude: studio.latitude + latOffset,
        longitude: studio.longitude + lngOffset,
        total_area: studio.total_area,
        max_capacity: studio.max_capacity,
        parking_available: studio.parking_available,
        wifi_available: studio.wifi_available,
        business_hours: studio.business_hours,
        regular_holidays: studio.regular_holidays,
        hourly_rate_min: studio.hourly_rate_min,
        hourly_rate_max: studio.hourly_rate_max,
        normalized_name: studio.name.toLowerCase(),
        normalized_address: studio.address.toLowerCase(),
        created_by: createdBy,
        verification_status: 'verified' as const,
      };
    });

    const { data, error } = await supabase
      .from('studios')
      .insert(insertData)
      .select('id, name');

    if (error) {
      console.error(
        `❌ バッチ ${Math.floor(i / batchSize) + 1} の投入に失敗:`,
        error.message
      );
      errorCount += batch.length;
      batch.forEach(studio => {
        errors.push({ name: studio.name, error: error.message });
      });
    } else {
      successCount += data?.length || 0;
      console.log(`✅ ${data?.length || 0}件のスタジオを投入しました`);
    }
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 投入結果サマリー');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${errorCount}件`);

  if (errors.length > 0) {
    console.log('\n❌ エラー詳細:');
    errors.slice(0, 10).forEach(({ name, error }) => {
      console.log(`  - ${name}: ${error}`);
    });
    if (errors.length > 10) {
      console.log(`  ... 他 ${errors.length - 10}件のエラー`);
    }
  }

  // 最終確認
  const { count } = await supabase
    .from('studios')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 現在のスタジオ総数: ${count}件`);
  console.log('🎉 シードデータ投入完了！');
}

async function main() {
  try {
    await seedStudios();
  } catch (error) {
    console.error('❌ スクリプト実行エラー:', error);
    process.exit(1);
  }
}

main();
