/**
 * 抽選実行済みデータのリセットと新しいエントリーデータ作成スクリプト
 *
 * 実行方法:
 * node scripts/reset-and-create-lottery-entries.js
 *
 * 環境変数:
 * - NEXT_PUBLIC_SUPABASE_URL: SupabaseプロジェクトURL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase Service Role Key（Admin API用）
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    const photoSessionId = '272d6c06-bf0c-421b-80fd-cb3fadb78a5f';

    console.log('🚀 抽選データリセット＆エントリー再作成開始...\n');

    // 1. 抽選セッションIDを取得
    const { data: lotterySession, error: lotteryError } = await supabase
      .from('lottery_sessions')
      .select('id, photo_session_id')
      .eq('photo_session_id', photoSessionId)
      .single();

    if (lotteryError || !lotterySession) {
      console.error('❌ 抽選セッション取得エラー:', lotteryError);
      throw new Error('抽選セッションが見つかりません');
    }

    console.log(`✅ 抽選セッションID: ${lotterySession.id}\n`);

    // 2. 既存データの削除
    console.log('🗑️  既存データの削除開始...');

    // 2-1. 予約データを削除
    const { error: bookingsDeleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('photo_session_id', photoSessionId);

    if (bookingsDeleteError) {
      console.error('⚠️  予約データ削除エラー:', bookingsDeleteError);
    } else {
      console.log('✅ 予約データを削除しました');
    }

    // 2-2. スロットエントリーを削除
    const { error: slotEntriesDeleteError } = await supabase
      .from('lottery_slot_entries')
      .delete()
      .eq('lottery_session_id', lotterySession.id);

    if (slotEntriesDeleteError) {
      console.error(
        '⚠️  スロットエントリー削除エラー:',
        slotEntriesDeleteError
      );
    } else {
      console.log('✅ スロットエントリーを削除しました');
    }

    // 2-3. エントリーグループを削除
    const { error: groupsDeleteError } = await supabase
      .from('lottery_entry_groups')
      .delete()
      .eq('lottery_session_id', lotterySession.id);

    if (groupsDeleteError) {
      console.error('⚠️  エントリーグループ削除エラー:', groupsDeleteError);
    } else {
      console.log('✅ エントリーグループを削除しました');
    }

    // 2-4. 撮影会とスロットの参加者数をリセット
    const { error: sessionResetError } = await supabase
      .from('photo_sessions')
      .update({ current_participants: 0 })
      .eq('id', photoSessionId);

    if (sessionResetError) {
      console.error('⚠️  撮影会参加者数リセットエラー:', sessionResetError);
    } else {
      console.log('✅ 撮影会参加者数をリセットしました');
    }

    const { error: slotsResetError } = await supabase
      .from('photo_session_slots')
      .update({ current_participants: 0 })
      .eq('photo_session_id', photoSessionId);

    if (slotsResetError) {
      console.error('⚠️  スロット参加者数リセットエラー:', slotsResetError);
    } else {
      console.log('✅ スロット参加者数をリセットしました');
    }

    // 2-5. 抽選セッションの状態をリセット
    const now = new Date();
    const entryStartTime = new Date(now);
    entryStartTime.setDate(entryStartTime.getDate() - 1); // 1日前から
    const entryEndTime = new Date(now);
    entryEndTime.setDate(entryEndTime.getDate() + 7); // 7日後まで
    const lotteryDate = new Date(now);
    lotteryDate.setDate(lotteryDate.getDate() + 7); // 7日後に抽選

    const { error: lotteryResetError } = await supabase
      .from('lottery_sessions')
      .update({
        status: 'accepting',
        entry_start_time: entryStartTime.toISOString(),
        entry_end_time: entryEndTime.toISOString(),
        lottery_date: lotteryDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', lotterySession.id);

    if (lotteryResetError) {
      console.error('⚠️  抽選セッションリセットエラー:', lotteryResetError);
    } else {
      console.log('✅ 抽選セッションをリセットしました（状態: accepting）\n');
    }

    // 3. スロットIDを取得
    const { data: slotsData, error: slotsError } = await supabase
      .from('photo_session_slots')
      .select('id, slot_number')
      .eq('photo_session_id', photoSessionId)
      .order('slot_number');

    if (slotsError || !slotsData || slotsData.length === 0) {
      console.error('❌ スロット情報取得エラー:', slotsError);
      throw new Error('スロット情報の取得に失敗しました');
    }

    const slotIds = slotsData.map(s => s.id);
    console.log(`✅ スロット${slotIds.length}個を取得:`, slotIds);

    // 4. カメラマンユーザーIDを取得
    const { data: photographers, error: photographersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_type', 'photographer')
      .like('email', '%@shutterhub.test')
      .limit(150);

    if (photographersError || !photographers || photographers.length === 0) {
      console.error('❌ カメラマンユーザー取得エラー:', photographersError);
      throw new Error('カメラマンユーザーの取得に失敗しました');
    }

    const photographerIds = photographers.map(p => p.id);
    console.log(`✅ カメラマン${photographerIds.length}名を取得\n`);

    // 5. エントリー作成
    console.log('📋 エントリー作成開始...');
    let entrySuccessCount = 0;
    let entryErrorCount = 0;

    for (let i = 0; i < photographerIds.length; i++) {
      const userId = photographerIds[i];

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
            lottery_session_id: lotterySession.id,
            user_id: userId,
            cancellation_policy: cancellationPolicy,
            total_slots_applied: selectedSlotIds.length,
            group_status: 'entered',
            update_count: 0,
          })
          .select()
          .single();

        if (groupError) {
          // 既にエントリー済みの場合はスキップ
          if (groupError.code === '23505') {
            continue;
          }
          throw groupError;
        }

        // スロットエントリーを作成
        const slotEntries = selectedSlotIds.map(slotId => ({
          lottery_entry_group_id: groupData.id,
          lottery_session_id: lotterySession.id,
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
          console.log(`  ${i + 1}/${photographerIds.length}件処理完了...`);
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
      `\n✅ エントリー作成完了: 成功${entrySuccessCount}件、エラー${entryErrorCount}件\n`
    );

    // 6. 最終確認
    const { count: finalGroups } = await supabase
      .from('lottery_entry_groups')
      .select('*', { count: 'exact', head: true })
      .eq('lottery_session_id', lotterySession.id);

    const { count: finalSlotEntries } = await supabase
      .from('lottery_slot_entries')
      .select('*', { count: 'exact', head: true })
      .eq('lottery_session_id', lotterySession.id);

    const { data: finalLotterySession } = await supabase
      .from('lottery_sessions')
      .select('status, entry_start_time, entry_end_time')
      .eq('id', lotterySession.id)
      .single();

    console.log('📊 最終結果:');
    console.log(`  - エントリーグループ: ${finalGroups}件`);
    console.log(`  - スロットエントリー: ${finalSlotEntries}件`);
    console.log(`  - 抽選セッション状態: ${finalLotterySession?.status}`);
    console.log(
      `  - エントリー期間: ${new Date(finalLotterySession?.entry_start_time).toLocaleString('ja-JP')} ～ ${new Date(finalLotterySession?.entry_end_time).toLocaleString('ja-JP')}`
    );
    console.log('\n🎉 テストデータ再作成完了！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
