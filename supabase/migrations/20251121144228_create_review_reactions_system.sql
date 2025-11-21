-- Migration: 20251121144228_create_review_reactions_system
-- Description: review_helpful_votesをreview_reactionsに移行し、絵文字リアクションシステムを実装
-- Date: 2025-11-21

-- 1. review_reactionsテーブルの作成
CREATE TABLE IF NOT EXISTS review_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('photo_session', 'user')),
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('👍', '❤️', '😂', '😮', '😢', '😡')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, review_type, voter_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_review_reactions_review ON review_reactions(review_id, review_type);
CREATE INDEX IF NOT EXISTS idx_review_reactions_voter ON review_reactions(voter_id);
CREATE INDEX IF NOT EXISTS idx_review_reactions_type ON review_reactions(reaction_type);

-- 2. 既存データの移行（review_helpful_votes → review_reactions）
INSERT INTO review_reactions (review_id, review_type, voter_id, reaction_type, created_at)
SELECT 
  review_id,
  review_type,
  voter_id,
  CASE 
    WHEN is_helpful = true THEN '👍'
    WHEN is_helpful = false THEN '😡'
  END as reaction_type,
  created_at
FROM review_helpful_votes
WHERE is_helpful IS NOT NULL
ON CONFLICT (review_id, review_type, voter_id) DO NOTHING;

-- 3. トリガーの削除
DROP TRIGGER IF EXISTS review_helpful_votes_trigger ON review_helpful_votes;

-- 4. トリガー関数の削除（後で新しいシステム用に再作成する可能性があるため、一旦コメントアウト）
-- DROP FUNCTION IF EXISTS trigger_update_helpful_count();

-- 5. リアクション集計ビューの作成
CREATE OR REPLACE VIEW review_reaction_counts AS
SELECT 
  review_id,
  review_type,
  reaction_type,
  COUNT(*) as count
FROM review_reactions
GROUP BY review_id, review_type, reaction_type;

-- 6. RLSポリシーの設定
ALTER TABLE review_reactions ENABLE ROW LEVEL SECURITY;

-- 自分のリアクションは読み取り・作成・更新・削除可能
CREATE POLICY review_reactions_policy ON review_reactions
  FOR ALL
  USING (voter_id = auth.uid())
  WITH CHECK (voter_id = auth.uid());

-- すべてのユーザーがリアクション数を読み取り可能（集計情報）
CREATE POLICY review_reactions_read_policy ON review_reactions
  FOR SELECT
  USING (true);

-- 7. updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_review_reactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_reactions_updated_at_trigger
  BEFORE UPDATE ON review_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_review_reactions_updated_at();

-- 8. コメントの追加
COMMENT ON TABLE review_reactions IS 'レビューへの絵文字リアクション';
COMMENT ON COLUMN review_reactions.review_id IS 'レビューID';
COMMENT ON COLUMN review_reactions.review_type IS 'レビュータイプ（photo_session または user）';
COMMENT ON COLUMN review_reactions.voter_id IS 'リアクションを送信したユーザーID';
COMMENT ON COLUMN review_reactions.reaction_type IS 'リアクションタイプ（👍 ❤️ 😂 😮 😢 😡）';
COMMENT ON VIEW review_reaction_counts IS 'レビューごとのリアクション数集計';


