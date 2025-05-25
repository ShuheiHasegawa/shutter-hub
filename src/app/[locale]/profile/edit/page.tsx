import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default async function ProfileEditPage() {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/signin');
  }

  // ユーザープロフィール情報を取得
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/auth/setup-profile');
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/profile">
                <ArrowLeft className="h-4 w-4 mr-2" />
                プロフィールに戻る
              </Link>
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="h-8 w-8" />
              プロフィール編集
            </h1>
          </div>
        </div>

        <div className="max-w-2xl">
          <ProfileEditForm profile={profile} />
        </div>
      </div>
    </DashboardLayout>
  );
}
