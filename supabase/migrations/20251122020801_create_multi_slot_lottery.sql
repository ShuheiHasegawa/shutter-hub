-- Migration: 20251122020801_create_multi_slot_lottery
-- Description: 複数スロット抽選システムのデータベーススキーマ作成
-- Created: 2025-11-22
-- Includes: スロット別抽選エントリー、抽選グループ、lottery_sessions拡張

-- =============================================================================
-- 1. lottery_sessionsテーブルの拡張
-- =============================================================================

-- 複数スロット抽選設定を追加
ALTER TABLE lottery_sessions
  ADD COLUMN IF NOT EXISTS enable_lottery_weight BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS weight_calculation_method TEXT DEFAULT 'linear' 
    CHECK (weight_calculation_method IN ('linear', 'bonus', 'custom')),
  ADD COLUMN IF NOT EXISTS weight_multiplier DECIMAL(10, 2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS enable_model_selection BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS model_selection_scope TEXT DEFAULT 'per_slot'
    CHECK (model_selection_scope IN ('per_slot', 'session_wide')),
  ADD COLUMN IF NOT EXISTS enable_cheki_selection BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cheki_selection_scope TEXT DEFAULT 'total_only'
    CHECK (cheki_selection_scope IN ('per_slot', 'total_only'));

-- =============================================================================
-- 2. 抽選グループテーブル（新規作成）
-- =============================================================================

-- 同一ユーザーの複数スロットエントリーをグループ化
CREATE TABLE lottery_entry_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lottery_session_id UUID REFERENCES lottery_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cancellation_policy TEXT NOT NULL DEFAULT 'partial_ok'
    CHECK (cancellation_policy IN ('all_or_nothing', 'partial_ok')),
  total_slots_applied INTEGER NOT NULL DEFAULT 0,
  slots_won INTEGER DEFAULT 0,
  group_status TEXT DEFAULT 'entered'
    CHECK (group_status IN ('entered', 'partially_won', 'all_won', 'all_lost')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lottery_session_id, user_id)
);

-- =============================================================================
-- 3. スロット別抽選エントリーテーブル（新規作成）
-- =============================================================================

-- スロットごとのエントリーを管理
CREATE TABLE lottery_slot_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lottery_session_id UUID REFERENCES lottery_sessions(id) ON DELETE CASCADE NOT NULL,
  lottery_entry_group_id UUID REFERENCES lottery_entry_groups(id) ON DELETE CASCADE NOT NULL,
  slot_id UUID REFERENCES photo_session_slots(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  preferred_model_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cheki_unsigned_count INTEGER DEFAULT 0 CHECK (cheki_unsigned_count >= 0),
  cheki_signed_count INTEGER DEFAULT 0 CHECK (cheki_signed_count >= 0),
  lottery_weight DECIMAL(10, 4) DEFAULT 1.0,
  status TEXT DEFAULT 'entered'
    CHECK (status IN ('entered', 'won', 'lost')),
  won_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lottery_session_id, slot_id, user_id)
);

-- =============================================================================
-- 4. インデックス作成
-- =============================================================================

-- lottery_entry_groups
CREATE INDEX idx_lottery_entry_groups_lottery_session 
  ON lottery_entry_groups(lottery_session_id);
CREATE INDEX idx_lottery_entry_groups_user 
  ON lottery_entry_groups(user_id);
CREATE INDEX idx_lottery_entry_groups_status 
  ON lottery_entry_groups(group_status);

-- lottery_slot_entries
CREATE INDEX idx_lottery_slot_entries_lottery_session 
  ON lottery_slot_entries(lottery_session_id);
CREATE INDEX idx_lottery_slot_entries_entry_group 
  ON lottery_slot_entries(lottery_entry_group_id);
CREATE INDEX idx_lottery_slot_entries_slot 
  ON lottery_slot_entries(slot_id);
CREATE INDEX idx_lottery_slot_entries_user 
  ON lottery_slot_entries(user_id);
CREATE INDEX idx_lottery_slot_entries_status 
  ON lottery_slot_entries(status);
CREATE INDEX idx_lottery_slot_entries_preferred_model 
  ON lottery_slot_entries(preferred_model_id) 
  WHERE preferred_model_id IS NOT NULL;

-- =============================================================================
-- 5. 更新タイムスタンプトリガー
-- =============================================================================

-- lottery_entry_groups
CREATE TRIGGER update_lottery_entry_groups_updated_at 
  BEFORE UPDATE ON lottery_entry_groups 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- lottery_slot_entries
CREATE TRIGGER update_lottery_slot_entries_updated_at 
  BEFORE UPDATE ON lottery_slot_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. Row Level Security (RLS) ポリシー設定
-- =============================================================================

-- lottery_entry_groups
ALTER TABLE lottery_entry_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "抽選グループは誰でも閲覧可能" 
  ON lottery_entry_groups FOR SELECT USING (true);

CREATE POLICY "抽選グループは本人のみ作成・更新可能" 
  ON lottery_entry_groups FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "抽選グループは主催者が閲覧可能" 
  ON lottery_entry_groups FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lottery_sessions ls
      JOIN photo_sessions ps ON ps.id = ls.photo_session_id
      WHERE ls.id = lottery_entry_groups.lottery_session_id
      AND ps.organizer_id = auth.uid()
    )
  );

-- lottery_slot_entries
ALTER TABLE lottery_slot_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "スロットエントリーは誰でも閲覧可能" 
  ON lottery_slot_entries FOR SELECT USING (true);

CREATE POLICY "スロットエントリーは本人のみ作成・更新可能" 
  ON lottery_slot_entries FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "スロットエントリーは主催者が閲覧可能" 
  ON lottery_slot_entries FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lottery_sessions ls
      JOIN photo_sessions ps ON ps.id = ls.photo_session_id
      WHERE ls.id = lottery_slot_entries.lottery_session_id
      AND ps.organizer_id = auth.uid()
    )
  );

-- =============================================================================
-- 7. コメント追加
-- =============================================================================

COMMENT ON TABLE lottery_entry_groups IS '複数スロット抽選エントリーのグループ管理';
COMMENT ON COLUMN lottery_entry_groups.cancellation_policy IS 'キャンセルポリシー: all_or_nothing=全落選時のみキャンセル, partial_ok=部分当選でも参加';
COMMENT ON COLUMN lottery_entry_groups.group_status IS 'グループ全体の状態: entered=エントリー中, partially_won=部分当選, all_won=全当選, all_lost=全落選';

COMMENT ON TABLE lottery_slot_entries IS 'スロットごとの抽選エントリー';
COMMENT ON COLUMN lottery_slot_entries.preferred_model_id IS '推しモデルID（organizer_modelsから選択）';
COMMENT ON COLUMN lottery_slot_entries.cheki_unsigned_count IS 'チェキサインなし枚数';
COMMENT ON COLUMN lottery_slot_entries.cheki_signed_count IS 'チェキサインあり枚数';
COMMENT ON COLUMN lottery_slot_entries.lottery_weight IS '抽選重み（応募数に応じて自動計算）';

COMMENT ON COLUMN lottery_sessions.enable_lottery_weight IS '応募数による当選確率調整の有効化';
COMMENT ON COLUMN lottery_sessions.weight_calculation_method IS '重み計算方法: linear=線形, bonus=ボーナス, custom=カスタム';
COMMENT ON COLUMN lottery_sessions.weight_multiplier IS '重み倍率（運営者が設定）';
COMMENT ON COLUMN lottery_sessions.enable_model_selection IS '推しモデル選択機能の有効化';
COMMENT ON COLUMN lottery_sessions.model_selection_scope IS 'モデル選択範囲: per_slot=スロットごと, session_wide=撮影会全体';
COMMENT ON COLUMN lottery_sessions.enable_cheki_selection IS 'チェキ選択機能の有効化';
COMMENT ON COLUMN lottery_sessions.cheki_selection_scope IS 'チェキ選択範囲: per_slot=スロットごと, total_only=合計のみ';


