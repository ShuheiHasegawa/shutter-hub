-- Migration: 20251109150422_auto_hide_studio_on_reports
-- Description: 報告数が3件に達したら自動的にスタジオを非表示にするトリガー関数
-- Created: 2025-11-09

-- ========================================================================
-- 報告数チェックと自動非表示関数
-- ========================================================================

CREATE OR REPLACE FUNCTION check_and_hide_studio_on_reports()
RETURNS TRIGGER AS $$
DECLARE
  report_count INTEGER;
BEGIN
  -- 新規報告が追加された場合のみ処理
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- 該当スタジオのpending状態の報告数をカウント
    SELECT COUNT(*) INTO report_count
    FROM studio_reports
    WHERE studio_id = NEW.studio_id
    AND status = 'pending';
    
    -- 報告数が3件以上の場合、自動的に非表示にする
    IF report_count >= 3 THEN
      UPDATE studios
      SET 
        is_hidden = true,
        hidden_reason = '複数の報告により一時的に非表示になっています。',
        hidden_at = NOW()
      WHERE id = NEW.studio_id
      AND is_hidden = false; -- 既に非表示の場合は更新しない
      
      -- ログ出力（オプション）
      RAISE NOTICE 'スタジオ % が報告数 % 件により自動的に非表示になりました', NEW.studio_id, report_count;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- トリガーの作成
-- ========================================================================

-- studio_reportsテーブルにINSERTされたときに自動実行
CREATE TRIGGER trigger_auto_hide_studio_on_reports
  AFTER INSERT ON studio_reports
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION check_and_hide_studio_on_reports();

-- ========================================================================
-- コメント
-- ========================================================================

COMMENT ON FUNCTION check_and_hide_studio_on_reports() IS '報告数が3件に達したら自動的にスタジオを非表示にする関数';

