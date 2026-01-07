-- Migration: 20250106000001_add_invitation_expiry_handler
-- Description: 期限切れ招待を自動的にexpiredステータスに更新する関数を追加
-- Created: 2025-01-06

-- 期限切れ招待を自動的にexpiredステータスに更新する関数
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- expires_atが現在時刻より前で、statusがpendingの招待を更新
  UPDATE organizer_model_invitations
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント追加
COMMENT ON FUNCTION expire_old_invitations() IS '期限切れの招待を自動的にexpiredステータスに更新する関数';
