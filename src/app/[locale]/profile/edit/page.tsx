'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { BackButton } from '@/components/ui/back-button';
import { User } from 'lucide-react';
import type { Profile } from '@/types/database';

export default function ProfileEditPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        // ユーザープロフィール情報を取得
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('プロフィール取得エラー:', profileError);
          return;
        }

        setProfile(profileData);
      } catch (error) {
        console.error('プロフィール取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">プロフィールを読み込み中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-muted-foreground">
              プロフィールが見つかりません
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton href="/profile" ariaLabel="プロフィールに戻る" />
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="h-8 w-8" />
              プロフィール編集
            </h1>
          </div>
        </div>

        <ProfileEditForm profile={profile} />
      </div>
    </DashboardLayout>
  );
}
