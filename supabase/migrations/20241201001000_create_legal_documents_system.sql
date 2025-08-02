-- 法的文書管理システム（利用規約・プライバシーポリシー・GDPR対応）
-- Phase 1: リリース必須機能

-- =============================================================================
-- 法的文書マスターテーブル
-- =============================================================================

-- 文書タイプのENUM型
CREATE TYPE document_type AS ENUM (
  'terms_of_service',     -- 利用規約
  'privacy_policy',       -- プライバシーポリシー
  'cookie_policy',        -- クッキーポリシー
  'data_processing',      -- データ処理方針
  'gdpr_notice',          -- GDPR通知
  'community_guidelines'  -- コミュニティガイドライン
);

-- 文書ステータスのENUM型
CREATE TYPE document_status AS ENUM (
  'draft',       -- 下書き
  'review',      -- レビュー中
  'approved',    -- 承認済み
  'published',   -- 公開中
  'archived'     -- アーカイブ済み
);

-- 法的文書テーブル
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type document_type NOT NULL,
  version VARCHAR(20) NOT NULL,          -- "1.0", "1.1", "2.0" など
  title TEXT NOT NULL,
  content TEXT NOT NULL,                 -- Markdown形式の本文
  summary TEXT,                          -- 変更点の要約
  language_code VARCHAR(5) NOT NULL DEFAULT 'ja', -- 'ja', 'en' など
  status document_status DEFAULT 'draft',
  
  -- 承認・公開情報
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- 有効期間
  effective_date TIMESTAMPTZ,            -- 有効開始日
  expiry_date TIMESTAMPTZ,               -- 有効終了日（NULL=無期限）
  
  -- メタデータ
  legal_basis TEXT,                      -- 法的根拠（GDPR Article 6など）
  processing_purposes TEXT[],            -- データ処理目的の配列
  data_categories TEXT[],                -- 処理するデータカテゴリ
  retention_period TEXT,                 -- データ保持期間
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- 制約: 同一タイプ・言語・バージョンの組み合わせはユニーク
  UNIQUE(document_type, language_code, version),
  
  -- 制約: ステータスによる必須フィールド
  CHECK (
    CASE 
      WHEN status = 'published' THEN effective_date IS NOT NULL AND published_at IS NOT NULL
      ELSE TRUE
    END
  )
);

-- インデックス作成
CREATE INDEX idx_legal_documents_type_lang ON legal_documents(document_type, language_code);
CREATE INDEX idx_legal_documents_status ON legal_documents(status);
CREATE INDEX idx_legal_documents_effective ON legal_documents(effective_date DESC) WHERE status = 'published';
CREATE INDEX idx_legal_documents_published_at ON legal_documents(published_at DESC);

-- =============================================================================
-- ユーザー同意管理システム
-- =============================================================================

-- ユーザー同意履歴テーブル
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE NOT NULL,
  
  -- 同意情報
  consent_given BOOLEAN NOT NULL,       -- true: 同意, false: 拒否・撤回
  consent_method TEXT NOT NULL,         -- 'registration', 'explicit', 'update' など
  ip_address INET,                      -- 同意時のIPアドレス
  user_agent TEXT,                      -- 同意時のブラウザ情報
  
  -- 同意の詳細
  granular_consents JSONB DEFAULT '{}', -- きめ細かい同意設定 {"marketing": true, "analytics": false}
  withdrawal_reason TEXT,               -- 撤回理由（撤回時）
  
  -- タイムスタンプ
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約: ユーザー×文書の組み合わせで、最新のものを追跡
  -- 新しい同意が生成されると、その文書タイプの古い同意は無効になる
  UNIQUE(user_id, document_id)
);

-- インデックス作成
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_document_id ON user_consents(document_id);
CREATE INDEX idx_user_consents_given ON user_consents(consent_given);
CREATE INDEX idx_user_consents_consented_at ON user_consents(consented_at DESC);

-- =============================================================================
-- GDPR対応データ処理記録
-- =============================================================================

-- データ処理活動記録テーブル（GDPR Article 30対応）
CREATE TABLE data_processing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 処理活動情報
  processing_purpose TEXT NOT NULL,     -- 処理目的
  data_categories TEXT[] NOT NULL,      -- データカテゴリ
  legal_basis TEXT NOT NULL,            -- 法的根拠
  data_controller TEXT DEFAULT 'ShutterHub',
  data_processor TEXT,                  -- 外部プロセッサ（存在する場合）
  
  -- データの流れ
  data_source TEXT,                     -- データの取得元
  data_recipients TEXT[],               -- データ受領者
  third_country_transfers BOOLEAN DEFAULT FALSE,
  safeguards TEXT,                      -- 第三国移転の保護措置
  
  -- データ保護
  retention_period TEXT,               -- 保持期間
  deletion_date TIMESTAMPTZ,           -- 削除予定日
  security_measures TEXT[],            -- セキュリティ対策
  
  -- メタデータ
  system_reference TEXT,               -- システム内参照（table名など）
  automated_decision_making BOOLEAN DEFAULT FALSE,
  profiling BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_data_processing_user_id ON data_processing_records(user_id);
CREATE INDEX idx_data_processing_purpose ON data_processing_records(processing_purpose);
CREATE INDEX idx_data_processing_deletion_date ON data_processing_records(deletion_date) WHERE deletion_date IS NOT NULL;

-- =============================================================================
-- GDPR要求処理システム
-- =============================================================================

-- GDPR要求タイプのENUM型
CREATE TYPE gdpr_request_type AS ENUM (
  'access',         -- データアクセス要求（Article 15）
  'rectification',  -- データ訂正要求（Article 16）
  'erasure',        -- データ削除要求（Article 17）
  'portability',    -- データポータビリティ要求（Article 20）
  'restriction',    -- 処理制限要求（Article 18）
  'objection'       -- 処理への異議（Article 21）
);

-- GDPR要求ステータスのENUM型
CREATE TYPE gdpr_request_status AS ENUM (
  'submitted',      -- 提出済み
  'verified',       -- 本人確認済み
  'processing',     -- 処理中
  'completed',      -- 完了
  'rejected',       -- 拒否
  'cancelled'       -- 取り消し
);

-- GDPR要求テーブル
CREATE TABLE gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_type gdpr_request_type NOT NULL,
  status gdpr_request_status DEFAULT 'submitted',
  
  -- 要求詳細
  request_details TEXT,                 -- 具体的な要求内容
  verification_method TEXT,             -- 本人確認方法
  verification_data JSONB,              -- 本人確認データ（暗号化推奨）
  
  -- 処理情報
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 担当者
  processing_notes TEXT,                -- 処理メモ
  completion_notes TEXT,                -- 完了時のメモ
  rejection_reason TEXT,                -- 拒否理由
  
  -- ファイル関連
  export_file_url TEXT,                 -- エクスポートファイルのURL
  export_file_expires_at TIMESTAMPTZ,   -- エクスポートファイルの有効期限
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- 法的対応時間制限の追跡
  response_due_date TIMESTAMPTZ GENERATED ALWAYS AS (created_at + INTERVAL '30 days') STORED,
  
  CHECK (
    CASE 
      WHEN status = 'completed' THEN completed_at IS NOT NULL
      WHEN status = 'rejected' THEN rejection_reason IS NOT NULL
      ELSE TRUE
    END
  )
);

-- インデックス作成
CREATE INDEX idx_gdpr_requests_user_id ON gdpr_requests(user_id);
CREATE INDEX idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX idx_gdpr_requests_due_date ON gdpr_requests(response_due_date) WHERE status IN ('submitted', 'verified', 'processing');
CREATE INDEX idx_gdpr_requests_assigned_to ON gdpr_requests(assigned_to) WHERE assigned_to IS NOT NULL;

-- =============================================================================
-- データ削除ログ（監査証跡）
-- =============================================================================

-- データ削除ログテーブル
CREATE TABLE data_deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                -- 削除対象ユーザー（CASCADE削除されるためREFERENCESなし）
  gdpr_request_id UUID REFERENCES gdpr_requests(id) ON DELETE SET NULL,
  
  -- 削除情報
  deletion_type TEXT NOT NULL,          -- 'complete', 'anonymization', 'selective'
  deleted_tables TEXT[] NOT NULL,       -- 削除対象テーブル
  deleted_record_counts JSONB NOT NULL, -- {"profiles": 1, "bookings": 5} など
  
  -- 実行情報
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 実行者
  execution_method TEXT NOT NULL,       -- 'manual', 'automated', 'gdpr_request'
  
  -- 技術詳細
  deletion_script TEXT,                 -- 実行されたSQL（可能であれば）
  verification_hash TEXT,               -- 削除の完整性確認ハッシュ
  
  -- メタデータ
  backup_created BOOLEAN DEFAULT FALSE, -- バックアップ作成有無
  backup_location TEXT,                 -- バックアップの場所
  backup_expires_at TIMESTAMPTZ,        -- バックアップ有効期限
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_data_deletion_logs_user_id ON data_deletion_logs(user_id);
CREATE INDEX idx_data_deletion_logs_gdpr_request ON data_deletion_logs(gdpr_request_id);
CREATE INDEX idx_data_deletion_logs_executed_by ON data_deletion_logs(executed_by);
CREATE INDEX idx_data_deletion_logs_created_at ON data_deletion_logs(created_at DESC);

-- =============================================================================
-- RLS (Row Level Security) ポリシー
-- =============================================================================

-- 法的文書の RLS
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

-- 公開されている文書は全員が閲覧可能
CREATE POLICY "Public documents are viewable by everyone" ON legal_documents
  FOR SELECT USING (status = 'published');

-- 管理者は全ての文書を管理可能
CREATE POLICY "Admins can manage all documents" ON legal_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'organizer'
      AND profiles.is_verified = TRUE
    )
  );

-- ユーザー同意の RLS
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の同意履歴のみ閲覧可能
CREATE POLICY "Users can view their own consents" ON user_consents
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分の同意を追加・更新可能
CREATE POLICY "Users can manage their own consents" ON user_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consents" ON user_consents
  FOR UPDATE USING (auth.uid() = user_id);

-- 管理者は全ての同意履歴を閲覧可能
CREATE POLICY "Admins can view all consents" ON user_consents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'organizer'
      AND profiles.is_verified = TRUE
    )
  );

-- データ処理記録の RLS
ALTER TABLE data_processing_records ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータ処理記録のみ閲覧可能
CREATE POLICY "Users can view their own processing records" ON data_processing_records
  FOR SELECT USING (auth.uid() = user_id);

-- 管理者は全ての処理記録を閲覧可能
CREATE POLICY "Admins can manage processing records" ON data_processing_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'organizer'
      AND profiles.is_verified = TRUE
    )
  );

-- GDPR要求の RLS
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のGDPR要求のみ閲覧・作成可能
CREATE POLICY "Users can view their own GDPR requests" ON gdpr_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own GDPR requests" ON gdpr_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 管理者は全てのGDPR要求を管理可能
CREATE POLICY "Admins can manage all GDPR requests" ON gdpr_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'organizer'
      AND profiles.is_verified = TRUE
    )
  );

-- データ削除ログの RLS
ALTER TABLE data_deletion_logs ENABLE ROW LEVEL SECURITY;

-- 管理者のみがデータ削除ログを閲覧可能
CREATE POLICY "Only admins can view deletion logs" ON data_deletion_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'organizer'
      AND profiles.is_verified = TRUE
    )
  );

-- 管理者のみがデータ削除ログを作成可能
CREATE POLICY "Only admins can create deletion logs" ON data_deletion_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'organizer'
      AND profiles.is_verified = TRUE
    )
  );

-- =============================================================================
-- トリガー関数とトリガー
-- =============================================================================

-- updated_at自動更新のトリガー
CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON legal_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_processing_records_updated_at
  BEFORE UPDATE ON data_processing_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_requests_updated_at
  BEFORE UPDATE ON gdpr_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 法的文書公開時の自動タイムスタンプ設定
CREATE OR REPLACE FUNCTION set_published_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- ステータスがpublishedに変更された場合
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = NOW();
    
    -- effective_dateが未設定の場合は現在時刻を設定
    IF NEW.effective_date IS NULL THEN
      NEW.effective_date = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_published_timestamp
  BEFORE UPDATE ON legal_documents
  FOR EACH ROW EXECUTE FUNCTION set_published_timestamp();

-- GDPR要求ステータス変更時の自動タイムスタンプ設定
CREATE OR REPLACE FUNCTION set_gdpr_request_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- 本人確認済みに変更された場合
  IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
    NEW.verified_at = NOW();
  END IF;
  
  -- 完了に変更された場合
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_gdpr_request_timestamps
  BEFORE UPDATE ON gdpr_requests
  FOR EACH ROW EXECUTE FUNCTION set_gdpr_request_timestamps();

-- =============================================================================
-- 初期データ挿入
-- =============================================================================

-- 基本的な法的文書のテンプレートを作成
INSERT INTO legal_documents (
  document_type, version, title, content, language_code, status, 
  effective_date, created_at
) VALUES 
(
  'terms_of_service',
  '1.0',
      'ShutterHub 利用規約',
      '# ShutterHub 利用規約

## 第1条（適用）
本規約は、ShutterHub（以下「本サービス」）の利用条件を定めるものです。

## 第2条（利用登録）
本サービスの利用を希望する方は、本規約に同意の上、利用登録を行うものとします。

## 第3条（禁止事項）
ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。

1. 法令または公序良俗に違反する行為
2. 犯罪行為に関連する行為
3. 本サービスの内容等、本サービスに含まれる著作権、商標権その他の知的財産権を侵害する行為

## 第4条（本サービスの提供の停止等）
当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。

## 第5条（利用制限および登録抹消）
当社は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。

## 第6条（退会）
ユーザーは、当社の定める方法により、いつでも本サービスから退会できるものとします。

## 第7条（保証の否認および免責事項）
当社は、本サービスに事実上または法律上の瑕疵がないことを明示的にも黙示的にも保証しておりません。

## 第8条（サービス内容の変更等）
当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。

## 第9条（利用規約の変更）
当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。

## 第10条（個人情報の取扱い）
当社は、本サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。

## 第11条（通知または連絡）
ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。

## 第12条（権利義務の譲渡の禁止）
ユーザーは、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。

## 第13条（準拠法・裁判管轄）
本規約の解釈にあたっては、日本法を準拠法とします。
本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。

以上

制定日：2024年12月1日',
  'ja',
  'draft',
  NULL,
  NOW()
),
(
  'privacy_policy',
  '1.0', 
      'ShutterHub プライバシーポリシー',
      '# ShutterHub プライバシーポリシー

## 1. 基本方針
ShutterHub（以下「当社」）は、ユーザーの個人情報の重要性を認識し、個人情報の保護に関する法律等の関係法令等を遵守し、お客様の個人情報を適切に取り扱います。

## 2. 個人情報の定義
個人情報とは、個人に関する情報であって、当該情報に含まれる氏名、生年月日その他の記述等により特定の個人を識別することができるもの（他の情報と容易に照合することができ、それにより特定の個人を識別することができることとなるものを含む）をいいます。

## 3. 個人情報の収集
当社は、以下の場合に個人情報を収集することがあります。

### 3.1 収集する情報
- 氏名、メールアドレス、電話番号
- プロフィール情報（職業、自己紹介文等）
- 撮影会参加履歴、予約情報
- ウェブサイトの利用履歴、クッキー情報
- 撮影した写真・画像データ

### 3.2 収集方法
- サービス登録時の入力
- サービス利用時の自動収集
- お問い合わせフォームからの送信
- カメラ・GPS等のデバイス情報

## 4. 個人情報の利用目的
収集した個人情報は、以下の目的で利用します。

### 4.1 サービス提供のため
- アカウント管理・本人認証
- 撮影会の予約管理・参加者調整
- 写真・動画の配信・共有
- カスタマーサポート対応

### 4.2 サービス改善のため
- サービス利用状況の分析
- 新機能開発・改善
- ユーザーエクスペリエンス向上

### 4.3 マーケティング・コミュニケーションのため
- おすすめ撮影会・イベントの案内
- メールマガジンの配信
- キャンペーン・プロモーション情報

## 5. 個人情報の第三者提供
当社は、法令に基づく場合を除き、ご本人の同意なく個人情報を第三者に提供することはありません。

ただし、以下の場合は第三者提供にあたりません：
- 撮影会主催者との必要な情報共有
- 決済サービス提供者との取引情報共有
- サービス運営に必要な外部委託先への提供

## 6. 個人情報の管理
当社は、個人情報の正確性及び安全性確保のために、セキュリティに万全の対策を講じています。

### 6.1 セキュリティ対策
- SSL/TLS暗号化通信
- アクセス制御・認証システム
- 定期的なセキュリティ監査
- 従業員への教育・研修

## 7. 個人情報の開示・訂正・削除
ユーザーは、当社の保有する自己の個人情報について、開示・訂正・削除を求めることができます。

### 7.1 開示請求
- マイページからの確認
- お問い合わせフォームからの請求

### 7.2 訂正・削除請求
- マイページでの編集・削除
- カスタマーサポートへの連絡

## 8. Cookie（クッキー）について
当社のサービスでは、ユーザーの利便性向上のためクッキーを使用しています。

### 8.1 クッキーの利用目的
- ログイン状態の維持
- 利用者の行動分析
- 広告配信の最適化

### 8.2 クッキーの管理
ブラウザ設定により、クッキーの受け入れを拒否することが可能です。ただし、一部機能が制限される場合があります。

## 9. プライバシーポリシーの変更
当社は、必要に応じて本プライバシーポリシーを変更することがあります。変更後のプライバシーポリシーは、本ウェブサイトに掲載したときから効力を生じるものとします。

## 10. お問い合わせ
本プライバシーポリシーに関するお問い合わせは、以下の連絡先までお願いいたします。

ShutterHub カスタマーサポート
Email: support@shutterhub.example.com

## 11. GDPR（EU一般データ保護規則）について
EUにお住まいの方に対しては、GDPRに基づく権利を保障します。

### 11.1 法的根拠
当社は以下の法的根拠に基づいて個人データを処理します：
- 契約の履行（Art. 6(1)(b)）
- 正当な利益（Art. 6(1)(f)）
- 同意（Art. 6(1)(a)）

### 11.2 データ主体の権利
- アクセス権（Art. 15）
- 訂正権（Art. 16）
- 削除権（Art. 17）
- データポータビリティ権（Art. 20）
- 処理の制限権（Art. 18）
- 異議権（Art. 21）

制定日：2024年12月1日
最終更新：2024年12月1日',
  'ja',
  'draft',
  NULL,
  NOW()
);

-- データベース処理記録の初期化（全ユーザー向け）
-- この情報は新規ユーザー登録時に自動生成される想定