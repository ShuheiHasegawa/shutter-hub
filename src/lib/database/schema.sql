-- ShutterHub v2 データベーススキーマ
-- 基本的なテーブル設計

-- ユーザータイプ列挙型
CREATE TYPE user_type AS ENUM ('model', 'photographer', 'organizer');

-- ユーザープロフィールテーブル
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  user_type user_type NOT NULL,
  bio TEXT,
  location TEXT,
  website TEXT,
  instagram_handle TEXT,
  twitter_handle TEXT,
  phone TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- プロフィール更新時のタイムスタンプ自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 撮影会テーブル
CREATE TABLE photo_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 1,
  current_participants INTEGER DEFAULT 0,
  price_per_person INTEGER NOT NULL, -- 円単位
  image_urls TEXT[],
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_photo_sessions_updated_at 
  BEFORE UPDATE ON photo_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 予約テーブル
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(photo_session_id, user_id)
);

CREATE TRIGGER update_bookings_updated_at 
  BEFORE UPDATE ON bookings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) ポリシー設定

-- プロフィールテーブルのRLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 自分のプロフィールは読み書き可能
CREATE POLICY "Users can view and edit own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- 他のユーザーのプロフィールは読み取り専用
CREATE POLICY "Users can view other profiles" ON profiles
  FOR SELECT USING (true);

-- 撮影会テーブルのRLS
ALTER TABLE photo_sessions ENABLE ROW LEVEL SECURITY;

-- 公開された撮影会は誰でも閲覧可能
CREATE POLICY "Anyone can view published photo sessions" ON photo_sessions
  FOR SELECT USING (is_published = true);

-- 主催者は自分の撮影会を管理可能
CREATE POLICY "Organizers can manage own photo sessions" ON photo_sessions
  FOR ALL USING (auth.uid() = organizer_id);

-- 予約テーブルのRLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の予約を管理可能
CREATE POLICY "Users can manage own bookings" ON bookings
  FOR ALL USING (auth.uid() = user_id);

-- 主催者は自分の撮影会の予約を閲覧可能
CREATE POLICY "Organizers can view bookings for their sessions" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photo_sessions 
      WHERE photo_sessions.id = bookings.photo_session_id 
      AND photo_sessions.organizer_id = auth.uid()
    )
  );

-- インデックス作成
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);
CREATE INDEX idx_photo_sessions_organizer_id ON photo_sessions(organizer_id);
CREATE INDEX idx_photo_sessions_start_time ON photo_sessions(start_time);
CREATE INDEX idx_photo_sessions_location ON photo_sessions(location);
CREATE INDEX idx_photo_sessions_is_published ON photo_sessions(is_published);
CREATE INDEX idx_bookings_photo_session_id ON bookings(photo_session_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status); 