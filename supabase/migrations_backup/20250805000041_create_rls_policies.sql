-- 制限的権限設定（パターンA）のRLSポリシー

-- photo_sessions テーブルのRLS設定
-- モデルは自分が出演する撮影会のみ表示、編集は制限

-- 1. モデルが自分の出演撮影会を表示できるポリシー
CREATE POLICY "models_can_view_their_featured_sessions" ON photo_sessions
  FOR SELECT USING (
    featured_model_id = auth.uid() OR 
    organizer_id = auth.uid()
  );

-- 2. モデルの編集権限を制限（重要項目は変更不可）
CREATE POLICY "models_limited_edit_on_featured_sessions" ON photo_sessions
  FOR UPDATE USING (
    featured_model_id = auth.uid() AND
    organizer_id != auth.uid()
  )
  WITH CHECK (
    -- 重要項目の変更を禁止
    NEW.organizer_id = OLD.organizer_id AND
    NEW.featured_model_id = OLD.featured_model_id AND
    NEW.start_time = OLD.start_time AND
    NEW.end_time = OLD.end_time AND
    NEW.price_per_person = OLD.price_per_person AND
    NEW.location = OLD.location AND
    NEW.organizer_fee_percentage = OLD.organizer_fee_percentage AND
    NEW.system_fee_percentage = OLD.system_fee_percentage
  );

-- 3. 収益詳細テーブルのRLS設定
-- 運営者と出演モデルのみ収益詳細を表示可能
CREATE POLICY "revenue_breakdown_view_policy" ON photo_session_revenue_breakdown
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photo_sessions ps 
      WHERE ps.id = photo_session_id 
      AND (ps.organizer_id = auth.uid() OR ps.featured_model_id = auth.uid())
    )
  );

-- 4. 収益詳細の更新は運営者のみ
CREATE POLICY "revenue_breakdown_update_policy" ON photo_session_revenue_breakdown
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM photo_sessions ps 
      WHERE ps.id = photo_session_id 
      AND ps.organizer_id = auth.uid()
    )
  ); 