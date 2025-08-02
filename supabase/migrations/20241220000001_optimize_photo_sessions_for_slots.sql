-- 撮影会テーブル最適化：スロット必須前提での不要カラム削除
-- max_participants と price_per_person をスロットベースの計算に変更

-- 1. 現在のデータをバックアップ（必要に応じて）
-- CREATE TABLE photo_sessions_backup AS SELECT * FROM photo_sessions;

-- 2. max_participants を計算カラムに変更するためのビュー作成
CREATE OR REPLACE VIEW photo_sessions_with_calculated_values AS
SELECT 
  ps.*,
  -- スロットの合計参加者数を計算
  COALESCE(slot_stats.total_max_participants, 0) as calculated_max_participants,
  -- スロットの平均料金を計算（将来的に使用可能）
  COALESCE(slot_stats.avg_price_per_person, 0) as calculated_avg_price,
  -- スロット数
  COALESCE(slot_stats.slot_count, 0) as slot_count
FROM photo_sessions ps
LEFT JOIN (
  SELECT 
    photo_session_id,
    SUM(max_participants) as total_max_participants,
    AVG(price_per_person) as avg_price_per_person,
    COUNT(*) as slot_count
  FROM photo_session_slots
  WHERE is_active = true
  GROUP BY photo_session_id
) slot_stats ON ps.id = slot_stats.photo_session_id;

-- 3. max_participants を自動計算する関数を作成
CREATE OR REPLACE FUNCTION update_photo_session_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- スロット変更時に撮影会の参加者数を自動更新
  UPDATE photo_sessions
  SET 
    max_participants = (
      SELECT COALESCE(SUM(max_participants), 0)
      FROM photo_session_slots
      WHERE photo_session_id = COALESCE(NEW.photo_session_id, OLD.photo_session_id)
        AND is_active = true
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.photo_session_id, OLD.photo_session_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. スロット変更時の自動更新トリガー
DROP TRIGGER IF EXISTS trigger_update_photo_session_participants ON photo_session_slots;
CREATE TRIGGER trigger_update_photo_session_participants
  AFTER INSERT OR UPDATE OR DELETE ON photo_session_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_session_participants();

-- 5. price_per_person カラムをオプショナルに変更（NULL許可）
-- ※スロットベースでの料金管理のため、撮影会全体の料金は参考値として残す
ALTER TABLE photo_sessions 
ALTER COLUMN price_per_person DROP NOT NULL;

-- 6. 既存データの整合性チェックと修正
-- スロットがある撮影会の max_participants を再計算
UPDATE photo_sessions 
SET max_participants = (
  SELECT COALESCE(SUM(pss.max_participants), 0)
  FROM photo_session_slots pss
  WHERE pss.photo_session_id = photo_sessions.id
    AND pss.is_active = true
)
WHERE EXISTS (
  SELECT 1 FROM photo_session_slots
  WHERE photo_session_id = photo_sessions.id
);

-- 7. コメント追加
COMMENT ON COLUMN photo_sessions.max_participants IS '最大参加者数（スロットから自動計算）';
COMMENT ON COLUMN photo_sessions.price_per_person IS '参考料金（実際の料金はスロットで管理）';
COMMENT ON VIEW photo_sessions_with_calculated_values IS 'スロット情報を含む撮影会ビュー';
COMMENT ON FUNCTION update_photo_session_participants() IS 'スロット変更時の撮影会参加者数自動更新';

-- 8. 必要に応じて旧カラムを削除する場合のコマンド（コメントアウト）
-- ※本格運用前に実行を検討
-- ALTER TABLE photo_sessions DROP COLUMN IF EXISTS max_participants;
-- ALTER TABLE photo_sessions DROP COLUMN IF EXISTS price_per_person;