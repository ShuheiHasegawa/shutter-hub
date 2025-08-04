-- 管理抽選システム
-- 開催者が応募者の中から手動で当選者を選出するシステム

-- 管理抽選撮影会テーブル
CREATE TABLE admin_lottery_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  entry_start_time TIMESTAMPTZ NOT NULL,
  entry_end_time TIMESTAMPTZ NOT NULL,
  selection_deadline TIMESTAMPTZ NOT NULL,
  max_winners INTEGER NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'accepting', 'selecting', 'completed')),
  selection_criteria JSONB DEFAULT '{}', -- 選出基準の設定
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理抽選応募テーブル
CREATE TABLE admin_lottery_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_lottery_session_id UUID REFERENCES admin_lottery_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  application_message TEXT, -- 応募理由・メッセージ
  status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'selected', 'rejected')),
  selected_at TIMESTAMPTZ,
  selected_by UUID REFERENCES auth.users(id),
  selection_reason TEXT, -- 選出理由
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_lottery_session_id, user_id) -- 1セッションにつき1応募
);

-- 選出履歴テーブル
CREATE TABLE admin_lottery_selection_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_lottery_session_id UUID REFERENCES admin_lottery_sessions(id) ON DELETE CASCADE,
  selected_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('select', 'reject', 'undo_select', 'undo_reject')),
  entry_id UUID REFERENCES admin_lottery_entries(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_admin_lottery_sessions_photo_session_id ON admin_lottery_sessions(photo_session_id);
CREATE INDEX idx_admin_lottery_sessions_status ON admin_lottery_sessions(status);
CREATE INDEX idx_admin_lottery_entries_session_id ON admin_lottery_entries(admin_lottery_session_id);
CREATE INDEX idx_admin_lottery_entries_user_id ON admin_lottery_entries(user_id);
CREATE INDEX idx_admin_lottery_entries_status ON admin_lottery_entries(status);
CREATE INDEX idx_admin_lottery_selection_history_session_id ON admin_lottery_selection_history(admin_lottery_session_id);

-- RLS (Row Level Security) 設定
ALTER TABLE admin_lottery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_lottery_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_lottery_selection_history ENABLE ROW LEVEL SECURITY;

-- 管理抽選セッション: 撮影会の主催者のみ作成・管理可能
CREATE POLICY "admin_lottery_sessions_organizer_policy" ON admin_lottery_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photo_sessions ps 
      WHERE ps.id = photo_session_id 
      AND ps.organizer_id = auth.uid()
    )
  );

-- 管理抽選応募: 認証ユーザーは自分の応募のみ作成・閲覧可能
CREATE POLICY "admin_lottery_entries_user_policy" ON admin_lottery_entries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "admin_lottery_entries_insert_policy" ON admin_lottery_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 管理抽選応募: 撮影会主催者は全応募を閲覧・更新可能
CREATE POLICY "admin_lottery_entries_organizer_policy" ON admin_lottery_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_lottery_sessions als
      JOIN photo_sessions ps ON ps.id = als.photo_session_id
      WHERE als.id = admin_lottery_session_id 
      AND ps.organizer_id = auth.uid()
    )
  );

-- 選出履歴: 撮影会主催者のみ閲覧可能
CREATE POLICY "admin_lottery_selection_history_organizer_policy" ON admin_lottery_selection_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_lottery_sessions als
      JOIN photo_sessions ps ON ps.id = als.photo_session_id
      WHERE als.id = admin_lottery_session_id 
      AND ps.organizer_id = auth.uid()
    )
  );

-- 管理抽選実行用ストアドプロシージャ
CREATE OR REPLACE FUNCTION select_admin_lottery_winners(
  session_id UUID,
  entry_ids UUID[],
  selected_by_user_id UUID,
  selection_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  selected_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record admin_lottery_sessions%ROWTYPE;
  entry_record admin_lottery_entries%ROWTYPE;
  current_winners_count INTEGER;
  entry_id UUID;
  selected_count INTEGER := 0;
BEGIN
  -- セッション情報取得
  SELECT * INTO session_record 
  FROM admin_lottery_sessions 
  WHERE id = session_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Admin lottery session not found', 0;
    RETURN;
  END IF;
  
  -- 現在の当選者数を取得
  SELECT COUNT(*) INTO current_winners_count
  FROM admin_lottery_entries
  WHERE admin_lottery_session_id = session_id 
  AND status = 'selected';
  
  -- 各エントリーを処理
  FOREACH entry_id IN ARRAY entry_ids
  LOOP
    -- 最大当選者数チェック
    IF current_winners_count >= session_record.max_winners THEN
      RETURN QUERY SELECT false, 'Maximum winners limit reached', selected_count;
      RETURN;
    END IF;
    
    -- エントリー情報取得
    SELECT * INTO entry_record
    FROM admin_lottery_entries
    WHERE id = entry_id 
    AND admin_lottery_session_id = session_id;
    
    IF FOUND AND entry_record.status = 'applied' THEN
      -- 当選者として選出
      UPDATE admin_lottery_entries
      SET 
        status = 'selected',
        selected_at = NOW(),
        selected_by = selected_by_user_id,
        selection_reason = select_admin_lottery_winners.selection_reason
      WHERE id = entry_id;
      
      -- 選出履歴記録
      INSERT INTO admin_lottery_selection_history (
        admin_lottery_session_id,
        selected_by,
        action_type,
        entry_id,
        reason
      ) VALUES (
        session_id,
        selected_by_user_id,
        'select',
        entry_id,
        select_admin_lottery_winners.selection_reason
      );
      
      selected_count := selected_count + 1;
      current_winners_count := current_winners_count + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT true, 'Winners selected successfully', selected_count;
END;
$$;

-- 管理抽選選出取り消し用ストアドプロシージャ
CREATE OR REPLACE FUNCTION undo_admin_lottery_selection(
  session_id UUID,
  entry_ids UUID[],
  selected_by_user_id UUID,
  reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  undone_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  entry_id UUID;
  undone_count INTEGER := 0;
BEGIN
  -- 各エントリーを処理
  FOREACH entry_id IN ARRAY entry_ids
  LOOP
    -- 選出を取り消し
    UPDATE admin_lottery_entries
    SET 
      status = 'applied',
      selected_at = NULL,
      selected_by = NULL,
      selection_reason = NULL
    WHERE id = entry_id 
    AND admin_lottery_session_id = session_id
    AND status = 'selected';
    
    IF FOUND THEN
      -- 取り消し履歴記録
      INSERT INTO admin_lottery_selection_history (
        admin_lottery_session_id,
        selected_by,
        action_type,
        entry_id,
        reason
      ) VALUES (
        session_id,
        selected_by_user_id,
        'undo_select',
        entry_id,
        reason
      );
      
      undone_count := undone_count + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT true, 'Selections undone successfully', undone_count;
END;
$$; 