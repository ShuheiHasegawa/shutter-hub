-- 収益計算関数を作成

CREATE OR REPLACE FUNCTION calculate_session_revenue(
  p_photo_session_id UUID,
  p_participants_count INTEGER
) RETURNS JSONB AS $$
DECLARE
  session_record RECORD;
  total_revenue DECIMAL(10,2);
  system_fee_amount DECIMAL(10,2);
  organizer_fee_amount DECIMAL(10,2);
  model_earnings DECIMAL(10,2);
  after_system_fee DECIMAL(10,2);
  result JSONB;
BEGIN
  -- 撮影会情報取得
  SELECT price_per_person, organizer_fee_percentage, system_fee_percentage
  INTO session_record
  FROM photo_sessions
  WHERE id = p_photo_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Photo session not found');
  END IF;

  -- 収益計算
  total_revenue := session_record.price_per_person * p_participants_count;
  system_fee_amount := total_revenue * session_record.system_fee_percentage / 100;
  after_system_fee := total_revenue - system_fee_amount;
  organizer_fee_amount := after_system_fee * session_record.organizer_fee_percentage / 100;
  model_earnings := after_system_fee - organizer_fee_amount;

  -- 収益内訳を保存
  INSERT INTO photo_session_revenue_breakdown (
    photo_session_id,
    total_revenue,
    participants_count,
    system_fee_amount,
    system_fee_percentage,
    organizer_fee_amount,
    organizer_fee_percentage,
    model_earnings
  ) VALUES (
    p_photo_session_id,
    total_revenue,
    p_participants_count,
    system_fee_amount,
    session_record.system_fee_percentage,
    organizer_fee_amount,
    session_record.organizer_fee_percentage,
    model_earnings
  ) ON CONFLICT (photo_session_id) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    participants_count = EXCLUDED.participants_count,
    system_fee_amount = EXCLUDED.system_fee_amount,
    organizer_fee_amount = EXCLUDED.organizer_fee_amount,
    model_earnings = EXCLUDED.model_earnings,
    calculated_at = NOW();

  -- 結果を返す
  result := jsonb_build_object(
    'success', true,
    'total_revenue', total_revenue,
    'system_fee', system_fee_amount,
    'organizer_fee', organizer_fee_amount,
    'model_earnings', model_earnings,
    'breakdown', jsonb_build_object(
      'system_percentage', session_record.system_fee_percentage,
      'organizer_percentage', session_record.organizer_fee_percentage,
      'model_percentage', ROUND((model_earnings / total_revenue * 100)::NUMERIC, 2)
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql; 