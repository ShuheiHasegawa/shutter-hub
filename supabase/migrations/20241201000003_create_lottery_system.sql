-- 抽選撮影会テーブル
CREATE TABLE lottery_photo_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  entry_start TIMESTAMPTZ NOT NULL,
  entry_end TIMESTAMPTZ NOT NULL,
  lottery_date TIMESTAMPTZ NOT NULL,
  winners_count INTEGER NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'accepting', 'closed', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 抽選エントリーテーブル
CREATE TABLE lottery_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lottery_photo_session_id UUID REFERENCES lottery_photo_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  application_message TEXT,
  status TEXT DEFAULT 'entered' CHECK (status IN ('entered', 'won', 'lost')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lottery_photo_session_id, user_id) -- 重複エントリー防止
);

-- 抽選結果テーブル
CREATE TABLE lottery_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lottery_photo_session_id UUID REFERENCES lottery_photo_sessions(id) ON DELETE CASCADE,
  drawn_at TIMESTAMPTZ NOT NULL,
  total_entries INTEGER NOT NULL,
  winners_selected INTEGER NOT NULL,
  algorithm_used TEXT DEFAULT 'random',
  seed_value TEXT, -- 抽選の再現性のため
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_lottery_photo_sessions_status ON lottery_photo_sessions(status);
CREATE INDEX idx_lottery_photo_sessions_dates ON lottery_photo_sessions(entry_start, entry_end, lottery_date);
CREATE INDEX idx_lottery_entries_session_user ON lottery_entries(lottery_photo_session_id, user_id);
CREATE INDEX idx_lottery_entries_status ON lottery_entries(status);

-- RLS (Row Level Security) 設定
ALTER TABLE lottery_photo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_results ENABLE ROW LEVEL SECURITY;

-- 抽選撮影会のRLSポリシー
CREATE POLICY "抽選撮影会は誰でも閲覧可能" ON lottery_photo_sessions
  FOR SELECT USING (true);

CREATE POLICY "抽選撮影会は開催者のみ作成・更新可能" ON lottery_photo_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photo_sessions ps 
      WHERE ps.id = lottery_photo_sessions.photo_session_id 
      AND ps.organizer_id = auth.uid()
    )
  );

-- 抽選エントリーのRLSポリシー
CREATE POLICY "抽選エントリーは誰でも閲覧可能" ON lottery_entries
  FOR SELECT USING (true);

CREATE POLICY "抽選エントリーは本人のみ作成可能" ON lottery_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "抽選エントリーは本人のみ更新可能" ON lottery_entries
  FOR UPDATE USING (auth.uid() = user_id);

-- 抽選結果のRLSポリシー
CREATE POLICY "抽選結果は誰でも閲覧可能" ON lottery_results
  FOR SELECT USING (true);

CREATE POLICY "抽選結果は開催者のみ作成可能" ON lottery_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM lottery_photo_sessions lps
      JOIN photo_sessions ps ON ps.id = lps.photo_session_id
      WHERE lps.id = lottery_results.lottery_photo_session_id 
      AND ps.organizer_id = auth.uid()
    )
  );

-- 抽選処理用のストアドプロシージャ
CREATE OR REPLACE FUNCTION conduct_lottery(
  lottery_session_id UUID,
  random_seed TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  winners_count INTEGER,
  total_entries INTEGER
) AS $$
DECLARE
  lottery_record lottery_photo_sessions%ROWTYPE;
  entry_count INTEGER;
  winners_needed INTEGER;
  current_time TIMESTAMPTZ := NOW();
BEGIN
  -- 抽選撮影会の情報を取得
  SELECT * INTO lottery_record 
  FROM lottery_photo_sessions 
  WHERE id = lottery_session_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '抽選撮影会が見つかりません', 0, 0;
    RETURN;
  END IF;
  
  -- 抽選実行可能かチェック
  IF lottery_record.status != 'closed' THEN
    RETURN QUERY SELECT false, '抽選はまだ実行できません', 0, 0;
    RETURN;
  END IF;
  
  IF current_time < lottery_record.lottery_date THEN
    RETURN QUERY SELECT false, '抽選日時になっていません', 0, 0;
    RETURN;
  END IF;
  
  -- エントリー数を取得
  SELECT COUNT(*) INTO entry_count
  FROM lottery_entries
  WHERE lottery_photo_session_id = lottery_session_id
  AND status = 'entered';
  
  winners_needed := LEAST(lottery_record.winners_count, entry_count);
  
  -- ランダムシードを設定（再現性のため）
  IF random_seed IS NOT NULL THEN
    PERFORM setseed(('x' || lpad(substring(random_seed from 1 for 8), 8, '0'))::bit(32)::int / 4294967296.0);
  END IF;
  
  -- 当選者を選出（ランダム）
  WITH random_entries AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
    FROM lottery_entries
    WHERE lottery_photo_session_id = lottery_session_id
    AND status = 'entered'
  )
  UPDATE lottery_entries 
  SET status = 'won', updated_at = current_time
  WHERE id IN (
    SELECT id FROM random_entries WHERE rn <= winners_needed
  );
  
  -- 落選者を更新
  UPDATE lottery_entries 
  SET status = 'lost', updated_at = current_time
  WHERE lottery_photo_session_id = lottery_session_id
  AND status = 'entered';
  
  -- 抽選結果を記録
  INSERT INTO lottery_results (
    lottery_photo_session_id,
    drawn_at,
    total_entries,
    winners_selected,
    algorithm_used,
    seed_value
  ) VALUES (
    lottery_session_id,
    current_time,
    entry_count,
    winners_needed,
    'random',
    random_seed
  );
  
  -- 抽選撮影会のステータスを更新
  UPDATE lottery_photo_sessions 
  SET status = 'completed', updated_at = current_time
  WHERE id = lottery_session_id;
  
  RETURN QUERY SELECT true, '抽選が完了しました', winners_needed, entry_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 抽選エントリー作成用のストアドプロシージャ
CREATE OR REPLACE FUNCTION create_lottery_entry(
  lottery_session_id UUID,
  user_id UUID,
  message TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  entry_id UUID
) AS $$
DECLARE
  lottery_record lottery_photo_sessions%ROWTYPE;
  new_entry_id UUID;
  current_time TIMESTAMPTZ := NOW();
BEGIN
  -- 抽選撮影会の情報を取得
  SELECT * INTO lottery_record 
  FROM lottery_photo_sessions 
  WHERE id = lottery_session_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '抽選撮影会が見つかりません', NULL::UUID;
    RETURN;
  END IF;
  
  -- エントリー可能期間かチェック
  IF current_time < lottery_record.entry_start THEN
    RETURN QUERY SELECT false, 'まだエントリー期間ではありません', NULL::UUID;
    RETURN;
  END IF;
  
  IF current_time > lottery_record.entry_end THEN
    RETURN QUERY SELECT false, 'エントリー期間は終了しました', NULL::UUID;
    RETURN;
  END IF;
  
  IF lottery_record.status != 'accepting' THEN
    RETURN QUERY SELECT false, 'エントリーを受け付けていません', NULL::UUID;
    RETURN;
  END IF;
  
  -- 重複エントリーチェック
  IF EXISTS (
    SELECT 1 FROM lottery_entries 
    WHERE lottery_photo_session_id = lottery_session_id 
    AND user_id = create_lottery_entry.user_id
  ) THEN
    RETURN QUERY SELECT false, '既にエントリー済みです', NULL::UUID;
    RETURN;
  END IF;
  
  -- エントリーを作成
  INSERT INTO lottery_entries (
    lottery_photo_session_id,
    user_id,
    application_message,
    status
  ) VALUES (
    lottery_session_id,
    create_lottery_entry.user_id,
    message,
    'entered'
  ) RETURNING id INTO new_entry_id;
  
  RETURN QUERY SELECT true, 'エントリーが完了しました', new_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 