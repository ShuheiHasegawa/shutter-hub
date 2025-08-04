-- instant_photo_requestsテーブルのstatus制約に'delivered'ステータスを追加
-- 写真配信完了後の状態管理のために必要

-- 既存の制約を削除
ALTER TABLE instant_photo_requests 
DROP CONSTRAINT instant_photo_requests_status_check;

-- 新しい制約を追加（'delivered'を含む）
ALTER TABLE instant_photo_requests 
ADD CONSTRAINT instant_photo_requests_status_check 
CHECK (status IN ('pending', 'matched', 'in_progress', 'completed', 'delivered', 'cancelled', 'expired'));

-- コメント追加
COMMENT ON COLUMN instant_photo_requests.status IS 'リクエストのステータス: pending(待機中), matched(マッチング済み), in_progress(撮影中), completed(撮影完了), delivered(写真配信済み), cancelled(キャンセル), expired(期限切れ)'; 