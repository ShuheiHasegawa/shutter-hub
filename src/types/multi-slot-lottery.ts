/**
 * 複数スロット抽選システムの型定義
 */

import type { PhotoSessionSlot } from './photo-session';

// キャンセルポリシー
export type CancellationPolicy = 'all_or_nothing' | 'partial_ok';

// 重み計算方法
export type WeightCalculationMethod = 'linear' | 'bonus' | 'custom';

// モデル選択範囲
export type ModelSelectionScope = 'per_slot' | 'session_wide';

// チェキ選択範囲
export type ChekiSelectionScope = 'per_slot' | 'total_only';

// グループ状態
export type GroupStatus = 'entered' | 'partially_won' | 'all_won' | 'all_lost';

// スロットエントリー状態
export type SlotEntryStatus = 'entered' | 'won' | 'lost';

// スロットエントリーデータ
export interface SlotEntryData {
  slot_id: string;
  preferred_model_id?: string;
  cheki_unsigned_count: number;
  cheki_signed_count: number;
}

// 複数スロット抽選エントリー作成データ
export interface CreateMultiSlotLotteryEntryData {
  lottery_session_id: string;
  slot_entries: SlotEntryData[];
  cancellation_policy: CancellationPolicy;
  message?: string;
}

// 複数スロット抽選エントリー更新データ（作成データと同じ構造）
export type UpdateMultiSlotLotteryEntryData = CreateMultiSlotLotteryEntryData;

// 抽選グループ
export interface LotteryEntryGroup {
  id: string;
  lottery_session_id: string;
  user_id: string;
  cancellation_policy: CancellationPolicy;
  total_slots_applied: number;
  slots_won: number;
  group_status: GroupStatus;
  update_count: number;
  created_at: string;
  updated_at: string;
}

// スロットエントリー
export interface LotterySlotEntry {
  id: string;
  lottery_session_id: string;
  lottery_entry_group_id: string;
  slot_id: string;
  user_id: string;
  preferred_model_id?: string;
  cheki_unsigned_count: number;
  cheki_signed_count: number;
  lottery_weight: number;
  status: SlotEntryStatus;
  won_at?: string;
  created_at: string;
  updated_at: string;
  slot?: PhotoSessionSlot;
  preferred_model?: {
    id: string;
    display_name: string;
  };
}

// 抽選セッション設定（拡張）
export interface LotterySessionSettings {
  enable_lottery_weight: boolean;
  weight_calculation_method: WeightCalculationMethod;
  weight_multiplier: number;
  enable_model_selection: boolean;
  model_selection_scope: ModelSelectionScope;
  enable_cheki_selection: boolean;
  cheki_selection_scope: ChekiSelectionScope;
}

// 抽選セッション（拡張）
export interface LotterySessionWithSettings {
  id: string;
  photo_session_id: string;
  entry_start_time: string;
  entry_end_time: string;
  lottery_date: string;
  max_winners: number;
  max_entries: number | null;
  status: string;
  enable_lottery_weight: boolean;
  weight_calculation_method: WeightCalculationMethod;
  weight_multiplier: number;
  enable_model_selection: boolean;
  model_selection_scope: ModelSelectionScope;
  enable_cheki_selection: boolean;
  cheki_selection_scope: ChekiSelectionScope;
  created_at: string;
  updated_at: string;
}

// エントリー確認データ
export interface LotteryEntryConfirmation {
  group: LotteryEntryGroup;
  slot_entries: LotterySlotEntry[];
  estimated_probability?: number;
}

// 抽選結果
export interface LotteryResult {
  success: boolean;
  message: string;
  total_winners: number;
  total_entries: number;
  bookings_created?: number;
}

// 集計データ
export interface LotteryStatistics {
  total_entries: number;
  total_groups: number;
  entries_by_slot: Array<{
    slot_id: string;
    slot_number: number;
    entry_count: number;
  }>;
  model_popularity: Array<{
    model_id: string;
    model_name: string;
    selection_count: number;
  }>;
  cheki_summary: {
    total_unsigned: number;
    total_signed: number;
  };
  cancellation_policy_distribution: {
    all_or_nothing: number;
    partial_ok: number;
  };
}
