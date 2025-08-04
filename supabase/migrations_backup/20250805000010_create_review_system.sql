-- 評価・レビューシステム
-- 撮影会とユーザーの相互評価システム

-- 撮影会レビューテーブル
CREATE TABLE photo_session_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- 評価項目（1-5段階）
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  organization_rating INTEGER CHECK (organization_rating >= 1 AND organization_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  venue_rating INTEGER CHECK (venue_rating >= 1 AND venue_rating <= 5),
  
  -- レビュー内容
  title VARCHAR(200),
  content TEXT,
  pros TEXT, -- 良かった点
  cons TEXT, -- 改善点
  
  -- メタデータ
  is_anonymous BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- 実際に参加したかの確認
  helpful_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(photo_session_id, reviewer_id) -- 1撮影会につき1レビュー
);

-- ユーザーレビューテーブル（相互評価）
CREATE TABLE user_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- 評価項目（1-5段階）
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  cooperation_rating INTEGER CHECK (cooperation_rating >= 1 AND cooperation_rating <= 5),
  
  -- レビュー内容
  title VARCHAR(200),
  content TEXT,
  
  -- メタデータ
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('organizer', 'participant')),
  reviewee_role TEXT NOT NULL CHECK (reviewee_role IN ('organizer', 'participant')),
  is_anonymous BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(photo_session_id, reviewer_id, reviewee_id) -- 1撮影会につき1ユーザーに1レビュー
);

-- レビュー役立ち評価テーブル
CREATE TABLE review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID, -- photo_session_reviews または user_reviews のID
  review_type TEXT NOT NULL CHECK (review_type IN ('photo_session', 'user')),
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(review_id, review_type, voter_id) -- 1レビューにつき1ユーザー1投票
);

-- レビュー報告テーブル
CREATE TABLE review_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID, -- photo_session_reviews または user_reviews のID
  review_type TEXT NOT NULL CHECK (review_type IN ('photo_session', 'user')),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'fake', 'harassment', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザー評価統計テーブル（集計用）
CREATE TABLE user_rating_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 撮影会主催者としての評価
  organizer_review_count INTEGER DEFAULT 0,
  organizer_avg_rating DECIMAL(3,2) DEFAULT 0,
  organizer_avg_organization DECIMAL(3,2) DEFAULT 0,
  organizer_avg_communication DECIMAL(3,2) DEFAULT 0,
  organizer_avg_value DECIMAL(3,2) DEFAULT 0,
  organizer_avg_venue DECIMAL(3,2) DEFAULT 0,
  
  -- 参加者としての評価
  participant_review_count INTEGER DEFAULT 0,
  participant_avg_rating DECIMAL(3,2) DEFAULT 0,
  participant_avg_punctuality DECIMAL(3,2) DEFAULT 0,
  participant_avg_communication DECIMAL(3,2) DEFAULT 0,
  participant_avg_professionalism DECIMAL(3,2) DEFAULT 0,
  participant_avg_cooperation DECIMAL(3,2) DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 撮影会評価統計テーブル（集計用）
CREATE TABLE photo_session_rating_stats (
  photo_session_id UUID PRIMARY KEY REFERENCES photo_sessions(id) ON DELETE CASCADE,
  
  review_count INTEGER DEFAULT 0,
  avg_overall_rating DECIMAL(3,2) DEFAULT 0,
  avg_organization_rating DECIMAL(3,2) DEFAULT 0,
  avg_communication_rating DECIMAL(3,2) DEFAULT 0,
  avg_value_rating DECIMAL(3,2) DEFAULT 0,
  avg_venue_rating DECIMAL(3,2) DEFAULT 0,
  
  -- 評価分布
  rating_5_count INTEGER DEFAULT 0,
  rating_4_count INTEGER DEFAULT 0,
  rating_3_count INTEGER DEFAULT 0,
  rating_2_count INTEGER DEFAULT 0,
  rating_1_count INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_photo_session_reviews_session_id ON photo_session_reviews(photo_session_id);
CREATE INDEX idx_photo_session_reviews_reviewer_id ON photo_session_reviews(reviewer_id);
CREATE INDEX idx_photo_session_reviews_rating ON photo_session_reviews(overall_rating);
CREATE INDEX idx_photo_session_reviews_status ON photo_session_reviews(status);
CREATE INDEX idx_photo_session_reviews_created_at ON photo_session_reviews(created_at);

CREATE INDEX idx_user_reviews_session_id ON user_reviews(photo_session_id);
CREATE INDEX idx_user_reviews_reviewer_id ON user_reviews(reviewer_id);
CREATE INDEX idx_user_reviews_reviewee_id ON user_reviews(reviewee_id);
CREATE INDEX idx_user_reviews_rating ON user_reviews(overall_rating);
CREATE INDEX idx_user_reviews_status ON user_reviews(status);

CREATE INDEX idx_review_helpful_votes_review ON review_helpful_votes(review_id, review_type);
CREATE INDEX idx_review_helpful_votes_voter ON review_helpful_votes(voter_id);

CREATE INDEX idx_review_reports_review ON review_reports(review_id, review_type);
CREATE INDEX idx_review_reports_status ON review_reports(status);

-- RLS (Row Level Security) 設定
ALTER TABLE photo_session_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rating_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_session_rating_stats ENABLE ROW LEVEL SECURITY;

-- 撮影会レビュー: 認証ユーザーは閲覧可能、レビュアーは自分のレビューのみ編集可能
CREATE POLICY "photo_session_reviews_select_policy" ON photo_session_reviews
  FOR SELECT USING (status = 'published');

CREATE POLICY "photo_session_reviews_insert_policy" ON photo_session_reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "photo_session_reviews_update_policy" ON photo_session_reviews
  FOR UPDATE USING (reviewer_id = auth.uid());

-- ユーザーレビュー: 認証ユーザーは閲覧可能、レビュアーは自分のレビューのみ編集可能
CREATE POLICY "user_reviews_select_policy" ON user_reviews
  FOR SELECT USING (status = 'published');

CREATE POLICY "user_reviews_insert_policy" ON user_reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "user_reviews_update_policy" ON user_reviews
  FOR UPDATE USING (reviewer_id = auth.uid());

-- 役立ち評価: 認証ユーザーのみ投票可能
CREATE POLICY "review_helpful_votes_policy" ON review_helpful_votes
  FOR ALL USING (voter_id = auth.uid());

-- レビュー報告: 認証ユーザーのみ報告可能
CREATE POLICY "review_reports_policy" ON review_reports
  FOR ALL USING (reporter_id = auth.uid());

-- 統計テーブル: 全ユーザー閲覧可能
CREATE POLICY "user_rating_stats_select_policy" ON user_rating_stats
  FOR SELECT USING (true);

CREATE POLICY "photo_session_rating_stats_select_policy" ON photo_session_rating_stats
  FOR SELECT USING (true);

-- 評価統計更新用ストアドプロシージャ
CREATE OR REPLACE FUNCTION update_photo_session_rating_stats(session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO photo_session_rating_stats (photo_session_id)
  VALUES (session_id)
  ON CONFLICT (photo_session_id) DO NOTHING;
  
  UPDATE photo_session_rating_stats
  SET
    review_count = (
      SELECT COUNT(*) FROM photo_session_reviews 
      WHERE photo_session_id = session_id AND status = 'published'
    ),
    avg_overall_rating = (
      SELECT COALESCE(AVG(overall_rating), 0) FROM photo_session_reviews 
      WHERE photo_session_id = session_id AND status = 'published'
    ),
    avg_organization_rating = (
      SELECT COALESCE(AVG(organization_rating), 0) FROM photo_session_reviews 
      WHERE photo_session_id = session_id AND status = 'published' AND organization_rating IS NOT NULL
    ),
    avg_communication_rating = (
      SELECT COALESCE(AVG(communication_rating), 0) FROM photo_session_reviews 
      WHERE photo_session_id = session_id AND status = 'published' AND communication_rating IS NOT NULL
    ),
    avg_value_rating = (
      SELECT COALESCE(AVG(value_rating), 0) FROM photo_session_reviews 
      WHERE photo_session_id = session_id AND status = 'published' AND value_rating IS NOT NULL
    ),
    avg_venue_rating = (
      SELECT COALESCE(AVG(venue_rating), 0) FROM photo_session_reviews 
      WHERE photo_session_id = session_id AND status = 'published' AND venue_rating IS NOT NULL
    ),
    rating_5_count = (
      SELECT COUNT(*) FROM photo_session_reviews 
      WHERE photo_session_id = session_id AND status = 'published' AND overall_rating = 5
    ),
    rating_4_count = (
      SELECT COUNT(*) FROM photo_session_reviews 
      WHERE photo_session_id = session_id AND status = 'published' AND overall_rating = 4
    ),
    rating_3_count = (
      SELECT COUNT(*) FROM photo_session_reviews 
      WHERE photo_session_id = session_id AND status = 'published' AND overall_rating = 3
    ),
    rating_2_count = (
      SELECT COUNT(*) FROM photo_session_reviews 
      WHERE photo_session_id = session_id AND status = 'published' AND overall_rating = 2
    ),
    rating_1_count = (
      SELECT COUNT(*) FROM photo_session_reviews 
      WHERE photo_session_id = session_id AND status = 'published' AND overall_rating = 1
    ),
    updated_at = NOW()
  WHERE photo_session_id = session_id;
END;
$$;

-- ユーザー評価統計更新用ストアドプロシージャ
CREATE OR REPLACE FUNCTION update_user_rating_stats(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_rating_stats (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  UPDATE user_rating_stats
  SET
    -- 主催者としての評価
    organizer_review_count = (
      SELECT COUNT(*) FROM photo_session_reviews psr
      JOIN photo_sessions ps ON ps.id = psr.photo_session_id
      WHERE ps.organizer_id = target_user_id AND psr.status = 'published'
    ),
    organizer_avg_rating = (
      SELECT COALESCE(AVG(psr.overall_rating), 0) FROM photo_session_reviews psr
      JOIN photo_sessions ps ON ps.id = psr.photo_session_id
      WHERE ps.organizer_id = target_user_id AND psr.status = 'published'
    ),
    organizer_avg_organization = (
      SELECT COALESCE(AVG(psr.organization_rating), 0) FROM photo_session_reviews psr
      JOIN photo_sessions ps ON ps.id = psr.photo_session_id
      WHERE ps.organizer_id = target_user_id AND psr.status = 'published' AND psr.organization_rating IS NOT NULL
    ),
    organizer_avg_communication = (
      SELECT COALESCE(AVG(psr.communication_rating), 0) FROM photo_session_reviews psr
      JOIN photo_sessions ps ON ps.id = psr.photo_session_id
      WHERE ps.organizer_id = target_user_id AND psr.status = 'published' AND psr.communication_rating IS NOT NULL
    ),
    organizer_avg_value = (
      SELECT COALESCE(AVG(psr.value_rating), 0) FROM photo_session_reviews psr
      JOIN photo_sessions ps ON ps.id = psr.photo_session_id
      WHERE ps.organizer_id = target_user_id AND psr.status = 'published' AND psr.value_rating IS NOT NULL
    ),
    organizer_avg_venue = (
      SELECT COALESCE(AVG(psr.venue_rating), 0) FROM photo_session_reviews psr
      JOIN photo_sessions ps ON ps.id = psr.photo_session_id
      WHERE ps.organizer_id = target_user_id AND psr.status = 'published' AND psr.venue_rating IS NOT NULL
    ),
    
    -- 参加者としての評価
    participant_review_count = (
      SELECT COUNT(*) FROM user_reviews 
      WHERE reviewee_id = target_user_id AND reviewee_role = 'participant' AND status = 'published'
    ),
    participant_avg_rating = (
      SELECT COALESCE(AVG(overall_rating), 0) FROM user_reviews 
      WHERE reviewee_id = target_user_id AND reviewee_role = 'participant' AND status = 'published'
    ),
    participant_avg_punctuality = (
      SELECT COALESCE(AVG(punctuality_rating), 0) FROM user_reviews 
      WHERE reviewee_id = target_user_id AND reviewee_role = 'participant' AND status = 'published' AND punctuality_rating IS NOT NULL
    ),
    participant_avg_communication = (
      SELECT COALESCE(AVG(communication_rating), 0) FROM user_reviews 
      WHERE reviewee_id = target_user_id AND reviewee_role = 'participant' AND status = 'published' AND communication_rating IS NOT NULL
    ),
    participant_avg_professionalism = (
      SELECT COALESCE(AVG(professionalism_rating), 0) FROM user_reviews 
      WHERE reviewee_id = target_user_id AND reviewee_role = 'participant' AND status = 'published' AND professionalism_rating IS NOT NULL
    ),
    participant_avg_cooperation = (
      SELECT COALESCE(AVG(cooperation_rating), 0) FROM user_reviews 
      WHERE reviewee_id = target_user_id AND reviewee_role = 'participant' AND status = 'published' AND cooperation_rating IS NOT NULL
    ),
    
    updated_at = NOW()
  WHERE user_id = target_user_id;
END;
$$;

-- トリガー関数: レビュー作成・更新時に統計を更新
CREATE OR REPLACE FUNCTION trigger_update_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'photo_session_reviews' THEN
    PERFORM update_photo_session_rating_stats(NEW.photo_session_id);
    
    -- 主催者の統計も更新
    PERFORM update_user_rating_stats((
      SELECT organizer_id FROM photo_sessions WHERE id = NEW.photo_session_id
    ));
  ELSIF TG_TABLE_NAME = 'user_reviews' THEN
    PERFORM update_user_rating_stats(NEW.reviewee_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- トリガー作成
CREATE TRIGGER photo_session_reviews_stats_trigger
  AFTER INSERT OR UPDATE ON photo_session_reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_update_rating_stats();

CREATE TRIGGER user_reviews_stats_trigger
  AFTER INSERT OR UPDATE ON user_reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_update_rating_stats();

-- 役立ち評価更新用トリガー関数
CREATE OR REPLACE FUNCTION trigger_update_helpful_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.review_type = 'photo_session' THEN
      UPDATE photo_session_reviews 
      SET helpful_count = helpful_count + CASE WHEN NEW.is_helpful THEN 1 ELSE 0 END
      WHERE id = NEW.review_id;
    ELSIF NEW.review_type = 'user' THEN
      UPDATE user_reviews 
      SET helpful_count = helpful_count + CASE WHEN NEW.is_helpful THEN 1 ELSE 0 END
      WHERE id = NEW.review_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.review_type = 'photo_session' THEN
      UPDATE photo_session_reviews 
      SET helpful_count = helpful_count + CASE WHEN NEW.is_helpful THEN 1 ELSE -1 END - CASE WHEN OLD.is_helpful THEN 1 ELSE -1 END
      WHERE id = NEW.review_id;
    ELSIF NEW.review_type = 'user' THEN
      UPDATE user_reviews 
      SET helpful_count = helpful_count + CASE WHEN NEW.is_helpful THEN 1 ELSE -1 END - CASE WHEN OLD.is_helpful THEN 1 ELSE -1 END
      WHERE id = NEW.review_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.review_type = 'photo_session' THEN
      UPDATE photo_session_reviews 
      SET helpful_count = helpful_count - CASE WHEN OLD.is_helpful THEN 1 ELSE 0 END
      WHERE id = OLD.review_id;
    ELSIF OLD.review_type = 'user' THEN
      UPDATE user_reviews 
      SET helpful_count = helpful_count - CASE WHEN OLD.is_helpful THEN 1 ELSE 0 END
      WHERE id = OLD.review_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 役立ち評価トリガー作成
CREATE TRIGGER review_helpful_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON review_helpful_votes
  FOR EACH ROW EXECUTE FUNCTION trigger_update_helpful_count(); 