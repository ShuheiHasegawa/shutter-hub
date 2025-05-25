-- 管理抽選撮影会テーブル
CREATE TABLE admin_lottery_photo_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  entry_start TIMESTAMPTZ NOT NULL,
  entry_end TIMESTAMPTZ NOT NULL,
  selection_deadline TIMESTAMPTZ NOT NULL,
  winners_count INTEGER NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'accepting', 'selecting', 'completed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理抽選エントリーテーブル
CREATE TABLE admin_lottery_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_lottery_photo_session_id UUID REFERENCES admin_lottery_photo_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  application_message TEXT,
  status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'selected', 'rejected')),
  selected_at TIMESTAMPTZ,
  selected_by UUID REFERENCES auth.users(id),
  selection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_lottery_photo_session_id, user_id) -- 重複エントリー防止
);

-- 選出基準テーブル
CREATE TABLE selection_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_lottery_photo_session_id UUID REFERENCES admin_lottery_photo_sessions(id) ON DELETE CASCADE,
  criteria_name TEXT NOT NULL,
  weight INTEGER DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理抽選結果テーブル
CREATE TABLE admin_lottery_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_lottery_photo_session_id UUID REFERENCES admin_lottery_photo_sessions(id) ON DELETE CASCADE,
  selected_at TIMESTAMPTZ NOT NULL,
  total_entries INTEGER NOT NULL,
  winners_selected INTEGER NOT NULL,
  selection_method TEXT DEFAULT 'manual',
  selected_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_admin_lottery_photo_sessions_status ON admin_lottery_photo_sessions(status);
CREATE INDEX idx_admin_lottery_photo_sessions_dates ON admin_lottery_photo_sessions(entry_start, entry_end, selection_deadline);
CREATE INDEX idx_admin_lottery_entries_session_user ON admin_lottery_entries(admin_lottery_photo_session_id, user_id);
CREATE INDEX idx_admin_lottery_entries_status ON admin_lottery_entries(status);
CREATE INDEX idx_admin_lottery_entries_selected_by ON admin_lottery_entries(selected_by);

-- RLS (Row Level Security) 設定
ALTER TABLE admin_lottery_photo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_lottery_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_lottery_results ENABLE ROW LEVEL SECURITY;

-- 管理抽選撮影会のRLSポリシー
CREATE POLICY "管理抽選撮影会は誰でも閲覧可能" ON admin_lottery_photo_sessions
  FOR SELECT USING (true);

CREATE POLICY "管理抽選撮影会は開催者のみ作成・更新可能" ON admin_lottery_photo_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photo_sessions ps 
      WHERE ps.id = admin_lottery_photo_sessions.photo_session_id 
      AND ps.organizer_id = auth.uid()
    )
  );

-- 管理抽選エントリーのRLSポリシー
CREATE POLICY "管理抽選エントリーは誰でも閲覧可能" ON admin_lottery_entries
  FOR SELECT USING (true);

CREATE POLICY "管理抽選エントリーは本人のみ作成可能" ON admin_lottery_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "管理抽選エントリーは本人のみ更新可能（応募メッセージ）" ON admin_lottery_entries
  FOR UPDATE USING (auth.uid() = user_id AND status = 'applied');

CREATE POLICY "管理抽選エントリーは開催者のみ選出可能" ON admin_lottery_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_lottery_photo_sessions alps
      JOIN photo_sessions ps ON ps.id = alps.photo_session_id
      WHERE alps.id = admin_lottery_entries.admin_lottery_photo_session_id 
      AND ps.organizer_id = auth.uid()
    )
  );

-- 選出基準のRLSポリシー
CREATE POLICY "選出基準は誰でも閲覧可能" ON selection_criteria
  FOR SELECT USING (true);

CREATE POLICY "選出基準は開催者のみ作成・更新可能" ON selection_criteria
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_lottery_photo_sessions alps
      JOIN photo_sessions ps ON ps.id = alps.photo_session_id
      WHERE alps.id = selection_criteria.admin_lottery_photo_session_id 
      AND ps.organizer_id = auth.uid()
    )
  );

-- 管理抽選結果のRLSポリシー
CREATE POLICY "管理抽選結果は誰でも閲覧可能" ON admin_lottery_results
  FOR SELECT USING (true);

CREATE POLICY "管理抽選結果は開催者のみ作成可能" ON admin_lottery_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_lottery_photo_sessions alps
      JOIN photo_sessions ps ON ps.id = alps.photo_session_id
      WHERE alps.id = admin_lottery_results.admin_lottery_photo_session_id 
      AND ps.organizer_id = auth.uid()
    )
  );

-- 管理抽選エントリー作成用のストアドプロシージャ
CREATE OR REPLACE FUNCTION create_admin_lottery_entry(
  admin_lottery_session_id UUID,
  user_id UUID,
  message TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  entry_id UUID
) AS $$
DECLARE
  admin_lottery_record admin_lottery_photo_sessions%ROWTYPE;
  new_entry_id UUID;
  current_time TIMESTAMPTZ := NOW();
BEGIN
  -- 管理抽選撮影会の情報を取得
  SELECT * INTO admin_lottery_record 
  FROM admin_lottery_photo_sessions 
  WHERE id = admin_lottery_session_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '管理抽選撮影会が見つかりません', NULL::UUID;
    RETURN;
  END IF;
  
  -- エントリー可能期間かチェック
  IF current_time < admin_lottery_record.entry_start THEN
    RETURN QUERY SELECT false, 'まだエントリー期間ではありません', NULL::UUID;
    RETURN;
  END IF;
  
  IF current_time > admin_lottery_record.entry_end THEN
    RETURN QUERY SELECT false, 'エントリー期間は終了しました', NULL::UUID;
    RETURN;
  END IF;
  
  IF admin_lottery_record.status != 'accepting' THEN
    RETURN QUERY SELECT false, 'エントリーを受け付けていません', NULL::UUID;
    RETURN;
  END IF;
  
  -- 重複エントリーチェック
  IF EXISTS (
    SELECT 1 FROM admin_lottery_entries 
    WHERE admin_lottery_photo_session_id = admin_lottery_session_id 
    AND user_id = create_admin_lottery_entry.user_id
  ) THEN
    RETURN QUERY SELECT false, '既にエントリー済みです', NULL::UUID;
    RETURN;
  END IF;
  
  -- エントリーを作成
  INSERT INTO admin_lottery_entries (
    admin_lottery_photo_session_id,
    user_id,
    application_message,
    status
  ) VALUES (
    admin_lottery_session_id,
    create_admin_lottery_entry.user_id,
    message,
    'applied'
  ) RETURNING id INTO new_entry_id;
  
  RETURN QUERY SELECT true, 'エントリーが完了しました', new_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 応募者選出用のストアドプロシージャ
CREATE OR REPLACE FUNCTION select_admin_lottery_winners(
  admin_lottery_session_id UUID,
  selected_user_ids UUID[],
  selected_by_user_id UUID,
  selection_notes TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  winners_count INTEGER
) AS $$
DECLARE
  admin_lottery_record admin_lottery_photo_sessions%ROWTYPE;
  current_time TIMESTAMPTZ := NOW();
  selected_count INTEGER;
BEGIN
  -- 管理抽選撮影会の情報を取得
  SELECT * INTO admin_lottery_record 
  FROM admin_lottery_photo_sessions 
  WHERE id = admin_lottery_session_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '管理抽選撮影会が見つかりません', 0;
    RETURN;
  END IF;
  
  -- 選出可能かチェック
  IF admin_lottery_record.status != 'selecting' THEN
    RETURN QUERY SELECT false, '選出期間ではありません', 0;
    RETURN;
  END IF;
  
  IF current_time > admin_lottery_record.selection_deadline THEN
    RETURN QUERY SELECT false, '選出期限を過ぎています', 0;
    RETURN;
  END IF;
  
  -- 選出数チェック
  IF array_length(selected_user_ids, 1) > admin_lottery_record.winners_count THEN
    RETURN QUERY SELECT false, '選出数が上限を超えています', 0;
    RETURN;
  END IF;
  
  -- 選出者を更新
  UPDATE admin_lottery_entries 
  SET 
    status = 'selected',
    selected_at = current_time,
    selected_by = selected_by_user_id,
    updated_at = current_time
  WHERE admin_lottery_photo_session_id = admin_lottery_session_id
  AND user_id = ANY(selected_user_ids)
  AND status = 'applied';
  
  GET DIAGNOSTICS selected_count = ROW_COUNT;
  
  -- 非選出者を更新
  UPDATE admin_lottery_entries 
  SET status = 'rejected', updated_at = current_time
  WHERE admin_lottery_photo_session_id = admin_lottery_session_id
  AND user_id != ALL(selected_user_ids)
  AND status = 'applied';
  
  -- 選出結果を記録
  INSERT INTO admin_lottery_results (
    admin_lottery_photo_session_id,
    selected_at,
    total_entries,
    winners_selected,
    selection_method,
    selected_by,
    notes
  ) VALUES (
    admin_lottery_session_id,
    current_time,
    (SELECT COUNT(*) FROM admin_lottery_entries WHERE admin_lottery_photo_session_id = admin_lottery_session_id),
    selected_count,
    'manual',
    selected_by_user_id,
    selection_notes
  );
  
  -- 管理抽選撮影会のステータスを更新
  UPDATE admin_lottery_photo_sessions 
  SET status = 'completed', updated_at = current_time
  WHERE id = admin_lottery_session_id;
  
  RETURN QUERY SELECT true, '選出が完了しました', selected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 応募者統計情報を取得する関数
CREATE OR REPLACE FUNCTION get_admin_lottery_stats(
  admin_lottery_session_id UUID
) RETURNS TABLE (
  total_entries INTEGER,
  selected_count INTEGER,
  rejected_count INTEGER,
  pending_count INTEGER,
  first_time_participants INTEGER,
  repeat_participants INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_entries,
    COUNT(CASE WHEN ale.status = 'selected' THEN 1 END)::INTEGER as selected_count,
    COUNT(CASE WHEN ale.status = 'rejected' THEN 1 END)::INTEGER as rejected_count,
    COUNT(CASE WHEN ale.status = 'applied' THEN 1 END)::INTEGER as pending_count,
    COUNT(CASE WHEN (
      SELECT COUNT(*) FROM bookings b 
      WHERE b.user_id = ale.user_id 
      AND b.status = 'confirmed'
    ) = 0 THEN 1 END)::INTEGER as first_time_participants,
    COUNT(CASE WHEN (
      SELECT COUNT(*) FROM bookings b 
      WHERE b.user_id = ale.user_id 
      AND b.status = 'confirmed'
    ) > 0 THEN 1 END)::INTEGER as repeat_participants
  FROM admin_lottery_entries ale
  WHERE ale.admin_lottery_photo_session_id = get_admin_lottery_stats.admin_lottery_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 