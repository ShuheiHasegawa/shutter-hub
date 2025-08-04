-- ユーザーハンドルシステムの実装
-- Google認証での新規登録も考慮した一意識別システム

-- pg_trgm拡張の有効化（部分一致検索最適化）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. プロフィールテーブルにusernameフィールドを追加
ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN username_updated_at TIMESTAMP WITH TIME ZONE;

-- 2. usernameのバリデーション制約
ALTER TABLE profiles ADD CONSTRAINT username_format_check 
  CHECK (username IS NULL OR (
    length(username) >= 3 AND 
    length(username) <= 30 AND
    username ~ '^[a-zA-Z0-9_]+$'
  ));

-- 3. 予約語テーブルの作成
CREATE TABLE reserved_usernames (
  username TEXT PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 予約語の挿入
INSERT INTO reserved_usernames (username, reason) VALUES
  ('admin', 'システム管理'),
  ('root', 'システム管理'),
  ('api', 'システム予約'),
  ('www', 'システム予約'),
  ('mail', 'システム予約'),
  ('support', 'サポート関連'),
  ('help', 'サポート関連'),
  ('info', 'サポート関連'),
  ('contact', 'サポート関連'),
  ('team', 'サポート関連'),
  ('staff', 'サポート関連'),
  ('moderator', 'モデレーション'),
  ('official', '公式アカウント'),
  ('null', 'システム予約'),
  ('undefined', 'システム予約'),
  ('user', 'システム予約'),
  ('users', 'システム予約'),
  ('profile', 'システム予約'),
  ('profiles', 'システム予約'),
  ('system', 'システム予約'),
  ('test', 'テスト用'),
  ('demo', 'デモ用'),
  ('example', 'サンプル用');

-- 5. パフォーマンス最適化インデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_username_trgm 
  ON profiles USING gin (username gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_display_name_trgm 
  ON profiles USING gin (display_name gin_trgm_ops);

-- 複合検索用インデックス（パフォーマンス最適化）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_search_composite 
  ON profiles (user_type, is_verified, created_at) 
  WHERE username IS NOT NULL OR display_name IS NOT NULL;

-- username更新時間のインデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_username_updated_at 
  ON profiles (username_updated_at DESC) 
  WHERE username IS NOT NULL;

-- 6. ユーザーハンドル自動生成関数
CREATE OR REPLACE FUNCTION generate_username_suggestions(base_name TEXT, max_suggestions INTEGER DEFAULT 5)
RETURNS TEXT[] AS $$
DECLARE
  suggestions TEXT[] := '{}';
  candidate TEXT;
  counter INTEGER := 1;
  clean_base TEXT;
BEGIN
  -- ベース名のクリーニング（英数字とアンダースコアのみ）
  clean_base := regexp_replace(lower(base_name), '[^a-z0-9_]', '', 'g');
  
  -- 長さの調整（3-20文字）
  IF length(clean_base) < 3 THEN
    clean_base := clean_base || 'user';
  END IF;
  
  IF length(clean_base) > 20 THEN
    clean_base := substring(clean_base from 1 for 20);
  END IF;
  
  -- 元の名前をまず試す
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE username = clean_base
    UNION ALL
    SELECT 1 FROM reserved_usernames WHERE username = clean_base
  ) THEN
    suggestions := array_append(suggestions, clean_base);
  END IF;
  
  -- 数字を付けた候補を生成
  WHILE array_length(suggestions, 1) < max_suggestions AND counter <= 999 LOOP
    candidate := clean_base || counter::TEXT;
    
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE username = candidate
      UNION ALL
      SELECT 1 FROM reserved_usernames WHERE username = candidate
    ) THEN
      suggestions := array_append(suggestions, candidate);
    END IF;
    
    counter := counter + 1;
  END LOOP;
  
  -- ランダムサフィックスでさらに候補を生成
  WHILE array_length(suggestions, 1) < max_suggestions LOOP
    candidate := clean_base || '_' || floor(random() * 9999 + 1000)::TEXT;
    
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE username = candidate
      UNION ALL
      SELECT 1 FROM reserved_usernames WHERE username = candidate
    ) AND candidate != ALL(suggestions) THEN
      suggestions := array_append(suggestions, candidate);
    END IF;
  END LOOP;
  
  RETURN suggestions;
END;
$$ LANGUAGE plpgsql;

-- 7. ユーザーハンドル設定時のトリガー関数
CREATE OR REPLACE FUNCTION update_username_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    NEW.username_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. ユーザーハンドル更新トリガー
DROP TRIGGER IF EXISTS trigger_username_timestamp ON profiles;
CREATE TRIGGER trigger_username_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_username_timestamp();

-- 9. 検索性能向上のためのマテリアライズドビュー
CREATE MATERIALIZED VIEW user_search_index AS
SELECT 
  id,
  username,
  display_name,
  user_type,
  is_verified,
  avatar_url,
  created_at,
  -- 検索重み付きテキスト（usernameを高重要度で設定）
  setweight(to_tsvector('simple', COALESCE(username, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(display_name, '')), 'B') as search_vector
FROM profiles
WHERE username IS NOT NULL OR display_name IS NOT NULL;

-- マテリアライズドビューのインデックス
CREATE INDEX idx_user_search_vector ON user_search_index USING gin(search_vector);
CREATE UNIQUE INDEX idx_user_search_id ON user_search_index (id);

-- 10. マテリアライズドビューの自動更新関数
CREATE OR REPLACE FUNCTION refresh_user_search_index()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_search_index;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 11. プロフィール更新時にマテリアライズドビューを更新するトリガー
DROP TRIGGER IF EXISTS trigger_refresh_search_index ON profiles;
CREATE TRIGGER trigger_refresh_search_index
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_user_search_index();

-- 12. RLSポリシーの設定
-- 既存のプロフィールRLSポリシーを確認・更新
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 予約語テーブルのRLSポリシー
ALTER TABLE reserved_usernames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reserved usernames" ON reserved_usernames
  FOR SELECT USING (true);

-- 13. ユーザーハンドル検証関数
CREATE OR REPLACE FUNCTION validate_username(input_username TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  result := jsonb_build_object('valid', false, 'errors', '[]'::jsonb);
  
  -- 長さチェック
  IF length(input_username) < 3 THEN
    result := jsonb_set(result, '{errors}', 
      (result->'errors') || '["ユーザー名は3文字以上である必要があります"]'::jsonb);
  END IF;
  
  IF length(input_username) > 30 THEN
    result := jsonb_set(result, '{errors}', 
      (result->'errors') || '["ユーザー名は30文字以下である必要があります"]'::jsonb);
  END IF;
  
  -- 文字種チェック
  IF input_username !~ '^[a-zA-Z0-9_]+$' THEN
    result := jsonb_set(result, '{errors}', 
      (result->'errors') || '["ユーザー名は英数字とアンダースコアのみ使用できます"]'::jsonb);
  END IF;
  
  -- 予約語チェック
  IF EXISTS (SELECT 1 FROM reserved_usernames WHERE username = lower(input_username)) THEN
    result := jsonb_set(result, '{errors}', 
      (result->'errors') || '["このユーザー名は予約されています"]'::jsonb);
  END IF;
  
  -- 重複チェック
  IF EXISTS (SELECT 1 FROM profiles WHERE username = lower(input_username)) THEN
    result := jsonb_set(result, '{errors}', 
      (result->'errors') || '["このユーザー名は既に使用されています"]'::jsonb);
  END IF;
  
  -- エラーがない場合は有効
  IF jsonb_array_length(result->'errors') = 0 THEN
    result := jsonb_set(result, '{valid}', 'true'::jsonb);
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. 統合検索関数（username + display_nameでの検索）
CREATE OR REPLACE FUNCTION search_users(
  search_query TEXT,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  user_type TEXT,
  is_verified BOOLEAN,
  avatar_url TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.user_type,
    p.is_verified,
    p.avatar_url,
    ts_rank(ui.search_vector, plainto_tsquery('simple', search_query)) as rank
  FROM profiles p
  JOIN user_search_index ui ON p.id = ui.id
  WHERE 
    ui.search_vector @@ plainto_tsquery('simple', search_query)
    OR p.username ILIKE '%' || search_query || '%'
    OR p.display_name ILIKE '%' || search_query || '%'
  ORDER BY 
    -- @username形式での完全一致を最優先
    CASE WHEN p.username = replace(search_query, '@', '') THEN 1 ELSE 2 END,
    -- 次にusernameでの前方一致
    CASE WHEN p.username ILIKE replace(search_query, '@', '') || '%' THEN 1 ELSE 2 END,
    -- その後は検索ランク
    ts_rank(ui.search_vector, plainto_tsquery('simple', search_query)) DESC,
    -- 最後は作成日時
    p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. マテリアライズドビューの初回リフレッシュ
REFRESH MATERIALIZED VIEW user_search_index;

-- 16. 統計情報の更新
ANALYZE profiles;
ANALYZE reserved_usernames;
ANALYZE user_search_index; 