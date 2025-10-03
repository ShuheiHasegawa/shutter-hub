'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';

// レイアウト用の簡易プロフィール型
export interface SimpleProfile {
  id: string;
  user_type: 'model' | 'photographer' | 'organizer';
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * サイドバー用の軽量プロフィールフック
 * 最小限の情報のみ取得してパフォーマンスを最適化
 */
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<SimpleProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_type, display_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          logger.error('簡易プロフィール取得エラー:', error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (error) {
        logger.error('予期しないエラー（useProfile）:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  return {
    profile,
    loading,
    user,
    // headerコンポーネント用の互換性
    avatarUrl: profile?.avatar_url || undefined,
    displayName: profile?.display_name || undefined,
  };
}
