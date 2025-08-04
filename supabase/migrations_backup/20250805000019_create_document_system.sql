-- 撮影会ドキュメント管理システム
-- Phase 3: ドキュメント管理（同意書、契約書）

-- 撮影会ドキュメントテーブル
CREATE TABLE IF NOT EXISTS photo_session_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('consent', 'contract', 'portrait_rights', 'guidelines', 'other')),
  content TEXT NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ドキュメント署名テーブル
CREATE TABLE IF NOT EXISTS document_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES photo_session_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  signature_data TEXT, -- 将来的な電子署名データ用
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 同じユーザーが同じドキュメントに複数回署名することを防ぐ
  UNIQUE(document_id, user_id)
);

-- ドキュメントテンプレートテーブル（将来拡張用）
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('consent', 'contract', 'portrait_rights', 'guidelines', 'other')),
  content TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_photo_session_documents_session ON photo_session_documents(photo_session_id);
CREATE INDEX IF NOT EXISTS idx_photo_session_documents_type ON photo_session_documents(type);
CREATE INDEX IF NOT EXISTS idx_photo_session_documents_required ON photo_session_documents(is_required);
CREATE INDEX IF NOT EXISTS idx_document_signatures_document ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_user ON document_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signed_at ON document_signatures(signed_at);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(type);
CREATE INDEX IF NOT EXISTS idx_document_templates_public ON document_templates(is_public);

-- ドキュメント署名統計ビュー
CREATE OR REPLACE VIEW document_signature_stats AS
SELECT 
  d.id AS document_id,
  d.photo_session_id,
  d.title,
  d.type,
  d.is_required,
  COALESCE(signature_counts.total_signatures, 0) AS total_signatures,
  COALESCE(participant_counts.total_participants, 0) AS total_participants,
  CASE 
    WHEN COALESCE(participant_counts.total_participants, 0) = 0 THEN 0
    ELSE ROUND(
      (COALESCE(signature_counts.total_signatures, 0)::DECIMAL / 
       COALESCE(participant_counts.total_participants, 0)::DECIMAL) * 100, 2
    )
  END AS signature_percentage
FROM 
  photo_session_documents d
LEFT JOIN (
  SELECT document_id, COUNT(*) as total_signatures 
  FROM document_signatures 
  GROUP BY document_id
) signature_counts ON d.id = signature_counts.document_id
LEFT JOIN (
  SELECT 
    ps.id as photo_session_id,
    COUNT(*) as total_participants
  FROM photo_sessions ps
  LEFT JOIN bookings b ON ps.id = b.photo_session_id
  WHERE b.status = 'confirmed'
  GROUP BY ps.id
) participant_counts ON d.photo_session_id = participant_counts.photo_session_id;

-- 未署名参加者取得関数
CREATE OR REPLACE FUNCTION get_unsigned_participants(document_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  email TEXT,
  booking_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.user_id,
    p.display_name,
    p.email,
    b.id as booking_id
  FROM bookings b
  JOIN profiles p ON b.user_id = p.id
  JOIN photo_session_documents psd ON b.photo_session_id = psd.photo_session_id
  WHERE psd.id = document_id_param
    AND b.status = 'confirmed'
    AND NOT EXISTS (
      SELECT 1 FROM document_signatures ds 
      WHERE ds.document_id = document_id_param 
      AND ds.user_id = b.user_id
    );
END;
$$ LANGUAGE plpgsql;

-- ドキュメント署名完了チェック関数
CREATE OR REPLACE FUNCTION check_required_documents_signed(user_id_param UUID, photo_session_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  required_count INTEGER;
  signed_count INTEGER;
BEGIN
  -- 必須ドキュメント数を取得
  SELECT COUNT(*) INTO required_count
  FROM photo_session_documents
  WHERE photo_session_id = photo_session_id_param
    AND is_required = TRUE;

  -- ユーザーが署名した必須ドキュメント数を取得
  SELECT COUNT(*) INTO signed_count
  FROM photo_session_documents psd
  JOIN document_signatures ds ON psd.id = ds.document_id
  WHERE psd.photo_session_id = photo_session_id_param
    AND psd.is_required = TRUE
    AND ds.user_id = user_id_param;

  -- 全ての必須ドキュメントに署名済みかチェック
  RETURN required_count = signed_count;
END;
$$ LANGUAGE plpgsql;

-- RLSポリシー設定
ALTER TABLE photo_session_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- 撮影会ドキュメントのRLSポリシー
CREATE POLICY "Users can view documents for sessions they participate in" ON photo_session_documents FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.photo_session_id = photo_session_documents.photo_session_id
    AND b.user_id = auth.uid()
    AND b.status IN ('confirmed', 'pending')
  ) OR
  EXISTS (
    SELECT 1 FROM photo_sessions ps
    WHERE ps.id = photo_session_documents.photo_session_id
    AND ps.organizer_id = auth.uid()
  )
);

CREATE POLICY "Organizers can insert documents for their sessions" ON photo_session_documents FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM photo_sessions ps
    WHERE ps.id = photo_session_id
    AND ps.organizer_id = auth.uid()
  )
);

CREATE POLICY "Organizers can update documents for their sessions" ON photo_session_documents FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM photo_sessions ps
    WHERE ps.id = photo_session_id
    AND ps.organizer_id = auth.uid()
  )
);

CREATE POLICY "Organizers can delete documents for their sessions" ON photo_session_documents FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM photo_sessions ps
    WHERE ps.id = photo_session_id
    AND ps.organizer_id = auth.uid()
  )
);

-- ドキュメント署名のRLSポリシー
CREATE POLICY "Users can view signatures for documents they can access" ON document_signatures FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM photo_session_documents psd
    JOIN bookings b ON psd.photo_session_id = b.photo_session_id
    WHERE psd.id = document_signatures.document_id
    AND b.user_id = auth.uid()
    AND b.status IN ('confirmed', 'pending')
  ) OR
  EXISTS (
    SELECT 1 FROM photo_session_documents psd
    JOIN photo_sessions ps ON psd.photo_session_id = ps.id
    WHERE psd.id = document_signatures.document_id
    AND ps.organizer_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own signatures" ON document_signatures FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM photo_session_documents psd
    JOIN bookings b ON psd.photo_session_id = b.photo_session_id
    WHERE psd.id = document_id
    AND b.user_id = auth.uid()
    AND b.status IN ('confirmed', 'pending')
  )
);

CREATE POLICY "Users can update their own signatures" ON document_signatures FOR UPDATE USING (
  auth.uid() = user_id
);

-- ドキュメントテンプレートのRLSポリシー
CREATE POLICY "Users can view public templates" ON document_templates FOR SELECT USING (
  is_public = TRUE OR created_by = auth.uid()
);

CREATE POLICY "Users can insert their own templates" ON document_templates FOR INSERT WITH CHECK (
  auth.uid() = created_by
);

CREATE POLICY "Users can update their own templates" ON document_templates FOR UPDATE USING (
  auth.uid() = created_by
);

CREATE POLICY "Users can delete their own templates" ON document_templates FOR DELETE USING (
  auth.uid() = created_by
);

-- updated_atトリガー
CREATE TRIGGER update_photo_session_documents_updated_at BEFORE UPDATE ON photo_session_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 基本的なドキュメントテンプレートを挿入
INSERT INTO document_templates (name, type, content, description, is_public) VALUES
(
  '基本参加同意書',
  'consent',
  '撮影会参加同意書

私は、以下の条件に同意の上、撮影会に参加いたします。

1. 撮影会の内容について
   - 撮影会の目的と内容を理解し、自己の責任において参加します
   - 撮影中の事故やトラブルについて、主催者に責任を求めません

2. 撮影された写真について
   - 撮影された写真の使用について、主催者の指示に従います
   - 写真の公開範囲について事前に確認し、同意します

3. 参加時の注意事項
   - 体調管理は自己責任で行います
   - 他の参加者への迷惑行為は行いません
   - 主催者の指示に従い、安全に配慮して行動します

4. キャンセルについて
   - やむを得ない事情でキャンセルする場合は、速やかに連絡します
   - キャンセル料については主催者の規定に従います

以上の内容に同意し、撮影会に参加いたします。

署名日：
参加者名：',
  '撮影会参加に関する基本的な同意書テンプレート',
  TRUE
),
(
  '肖像権使用許可書',
  'portrait_rights',
  '肖像権使用許可書

私は、撮影会において撮影された私の肖像について、以下の条件で使用を許可いたします。

1. 使用目的
   - 撮影会の記録・宣伝
   - 主催者のポートフォリオ
   - SNSでの共有（範囲を限定）

2. 使用範囲
   - インターネット上での公開：□ 許可する □ 許可しない
   - 印刷物での使用：□ 許可する □ 許可しない
   - 商用利用：□ 許可する □ 許可しない

3. 使用期間
   - 期間：□ 無期限 □ 1年間 □ その他（　　　　　）

4. その他の条件
   - 写真の加工・編集について：□ 許可する □ 許可しない
   - クレジット表記：□ 必要 □ 不要

私は上記の条件で肖像権の使用を許可いたします。

署名日：
許可者名：',
  '撮影した写真の使用に関する許可書テンプレート',
  TRUE
),
(
  '撮影ガイドライン',
  'guidelines',
  '撮影会ガイドライン

参加者の皆様に安全で楽しい撮影会にしていただくため、以下のガイドラインをお守りください。

【撮影前の準備】
- 体調管理をしっかりと行ってください
- 撮影に適した服装でお越しください
- 必要な機材は事前に確認してください

【撮影中のマナー】
- 他の参加者への配慮を忘れずに
- 撮影場所のルールを守ってください
- 危険な行為は避けてください
- 主催者の指示に従ってください

【写真の取り扱い】
- 撮影した写真の共有は許可を得てから
- 個人情報の保護にご注意ください
- 商用利用は事前に相談してください

【緊急時の対応】
- 事故や体調不良の際は速やかに主催者に連絡
- 緊急連絡先：（主催者の連絡先）

【その他】
- 貴重品の管理は自己責任でお願いします
- 撮影会の様子をSNSに投稿する際は他の参加者への配慮を
- 質問や不明点があれば遠慮なくお声がけください

皆様のご協力により、素晴らしい撮影会にしましょう！',
  '撮影会での注意事項とルールのガイドライン',
  TRUE
);

-- 通知機能との連携（将来実装）
-- ドキュメント署名時の通知トリガー
CREATE OR REPLACE FUNCTION notify_document_signed()
RETURNS TRIGGER AS $$
BEGIN
  -- 主催者に署名完了通知を送信
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  )
  SELECT 
    ps.organizer_id,
    'document_signed',
    'ドキュメントに署名されました',
    psd.title || 'に署名されました',
    jsonb_build_object(
      'document_id', NEW.document_id,
      'photo_session_id', psd.photo_session_id,
      'signer_id', NEW.user_id
    )
  FROM photo_session_documents psd
  JOIN photo_sessions ps ON psd.photo_session_id = ps.id
  WHERE psd.id = NEW.document_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_signed_notification
  AFTER INSERT ON document_signatures
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_signed(); 