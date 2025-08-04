-- Migration: Fix user_id ambiguity errors
-- Description: Fix column reference ambiguity in trigger functions
-- Created: 2024-12-01

-- Fix フォローシステム関連の曖昧性エラー
CREATE OR REPLACE FUNCTION initialize_user_preferences(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO user_follow_stats (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Fix SNSシステム関連の曖昧性エラー
CREATE OR REPLACE FUNCTION initialize_timeline_preferences(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO timeline_preferences (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$; 