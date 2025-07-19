-- 前回作成した複雑なテーブル群を削除
-- 多モデル対応の複雑な実装を元に戻す

-- 1. photo_session_slot_models テーブルを削除
DROP TABLE IF EXISTS photo_session_slot_models;

-- 2. photo_session_models テーブルを削除  
DROP TABLE IF EXISTS photo_session_models;

-- 3. 関連する関数を削除
DROP FUNCTION IF EXISTS create_multi_model_photo_session;
DROP FUNCTION IF EXISTS invite_models_to_session;
DROP FUNCTION IF EXISTS find_model_by_display_name;
DROP FUNCTION IF EXISTS find_model_by_identifier;
DROP FUNCTION IF EXISTS search_model_suggestions;

-- 4. 関連するRLSポリシーを削除（テーブルが存在しない場合はエラーになるが無視）
-- photo_session_models のポリシー
-- photo_session_slot_models のポリシー

-- 5. 関連するインデックスを削除（テーブル削除で自動削除される）
-- idx_photo_session_models_session_id
-- idx_photo_session_models_model_id  
-- idx_photo_session_slot_models_slot_id
-- idx_photo_session_slot_models_model_id

-- 作業完了確認
SELECT 'Complex tables cleanup completed successfully' as status; 