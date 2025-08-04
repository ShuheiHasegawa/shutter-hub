-- 一括撮影会作成関数を作成

CREATE OR REPLACE FUNCTION create_bulk_photo_sessions(
  p_organizer_id UUID,
  p_session_template JSONB,
  p_models JSONB,
  p_slots JSONB
) RETURNS JSONB AS $$
DECLARE
  session_ids UUID[] := '{}';
  session_id UUID;
  group_id UUID := gen_random_uuid();
  model_record JSONB;
  slot_record JSONB;
  result JSONB;
BEGIN
  -- モデルごとにループして撮影会作成
  FOR model_record IN SELECT * FROM jsonb_array_elements(p_models)
  LOOP
    -- 撮影会を作成
    INSERT INTO photo_sessions (
      organizer_id,
      featured_model_id,
      bulk_group_id,
      title,
      description,
      location,
      address,
      start_time,
      end_time,
      max_participants,
      price_per_person,
      booking_type,
      organizer_fee_percentage,
      system_fee_percentage,
      is_published
    ) VALUES (
      p_organizer_id,
      (model_record->>'model_id')::UUID,
      group_id,
      (p_session_template->>'title')::TEXT,
      (p_session_template->>'description')::TEXT,
      (p_session_template->>'location')::TEXT,
      (p_session_template->>'address')::TEXT,
      (p_session_template->>'start_time')::TIMESTAMP WITH TIME ZONE,
      (p_session_template->>'end_time')::TIMESTAMP WITH TIME ZONE,
      (p_session_template->>'max_participants')::INTEGER,
      (model_record->>'fee')::DECIMAL,
      (p_session_template->>'booking_type')::TEXT,
      20.00,
      5.00,
      (p_session_template->>'is_published')::BOOLEAN
    ) RETURNING id INTO session_id;

    -- スロットを作成
    FOR slot_record IN SELECT * FROM jsonb_array_elements(p_slots)
    LOOP
      INSERT INTO photo_session_slots (
        photo_session_id,
        slot_number,
        start_time,
        end_time,
        break_duration_minutes,
        price_per_person,
        max_participants,
        discount_type,
        discount_value,
        is_active
      ) VALUES (
        session_id,
        (slot_record->>'slot_number')::INTEGER,
        (slot_record->>'start_time')::TIME,
        (slot_record->>'end_time')::TIME,
        COALESCE((slot_record->>'break_duration_minutes')::INTEGER, 15),
        (model_record->>'fee')::DECIMAL,
        (slot_record->>'max_participants')::INTEGER,
        'none',
        0,
        true
      );
    END LOOP;

    session_ids := array_append(session_ids, session_id);
  END LOOP;

  -- 結果を返す
  result := jsonb_build_object(
    'success', true,
    'bulk_group_id', group_id,
    'session_ids', to_jsonb(session_ids),
    'sessions_created', array_length(session_ids, 1)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql; 