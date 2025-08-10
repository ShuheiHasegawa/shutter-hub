-- Migration: 049_fix_studio_created_by_null
-- Description: created_byがnullのスタジオ問題を修正し、権限管理を改善
-- Date: 2025-08-10

-- 1. created_byがnullのスタジオを確認
DO $$
DECLARE
    null_created_by_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_created_by_count
    FROM studios 
    WHERE created_by IS NULL;
    
    RAISE NOTICE 'created_byがnullのスタジオ数: %', null_created_by_count;
END $$;

-- 2. 一時的にorganizer権限を持つユーザーを特定
-- 最初のorganizerユーザーを取得して、nullのスタジオに割り当て
DO $$
DECLARE
    first_organizer_id UUID;
    null_studio_count INTEGER;
BEGIN
    -- 最初のorganizerを取得
    SELECT id INTO first_organizer_id
    FROM profiles 
    WHERE user_type = 'organizer'
    LIMIT 1;
    
    IF first_organizer_id IS NOT NULL THEN
        -- created_byがnullのスタジオを更新
        UPDATE studios 
        SET created_by = first_organizer_id,
            updated_at = NOW()
        WHERE created_by IS NULL;
        
        GET DIAGNOSTICS null_studio_count = ROW_COUNT;
        RAISE NOTICE 'updated % studios with organizer id: %', null_studio_count, first_organizer_id;
    ELSE
        RAISE NOTICE 'No organizer found - creating default organizer';
        
        -- organizerが存在しない場合、デフォルトorganizerを作成
        -- 注意: これは本番環境では適切なユーザー情報で置き換える必要があります
        INSERT INTO profiles (id, user_type, display_name, email) 
        VALUES (
            gen_random_uuid(),
            'organizer',
            'System Organizer',
            'system@shutterhub.com'
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- 作成したorganizerのIDを取得して再実行
        SELECT id INTO first_organizer_id
        FROM profiles 
        WHERE user_type = 'organizer'
        LIMIT 1;
        
        UPDATE studios 
        SET created_by = first_organizer_id,
            updated_at = NOW()
        WHERE created_by IS NULL;
        
        GET DIAGNOSTICS null_studio_count = ROW_COUNT;
        RAISE NOTICE 'updated % studios with new organizer id: %', null_studio_count, first_organizer_id;
    END IF;
END $$;

-- 3. 今後のデータ整合性のため、created_byにNOT NULL制約を追加（オプション）
-- 注意: 既存データが修正されてから実行すること
-- ALTER TABLE studios ALTER COLUMN created_by SET NOT NULL;

-- 4. 検証: 修正後の状態を確認
DO $$
DECLARE
    remaining_nulls INTEGER;
    total_studios INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_nulls
    FROM studios 
    WHERE created_by IS NULL;
    
    SELECT COUNT(*) INTO total_studios
    FROM studios;
    
    RAISE NOTICE '修正後 - total studios: %, remaining nulls: %', total_studios, remaining_nulls;
    
    IF remaining_nulls > 0 THEN
        RAISE WARNING 'まだ % 個のスタジオでcreated_byがnullです', remaining_nulls;
    ELSE
        RAISE NOTICE '✅ すべてのスタジオでcreated_byが設定されました';
    END IF;
END $$;

-- 5. スタジオ権限の確認クエリ（ログ用）
SELECT 
    s.id,
    s.name,
    s.created_by,
    p.display_name as creator_name,
    p.user_type as creator_type
FROM studios s
LEFT JOIN profiles p ON s.created_by = p.id
ORDER BY s.created_at DESC
LIMIT 10;

COMMENT ON COLUMN studios.created_by IS 'スタジオ作成者のUUID。RLS権限制御に使用。';
