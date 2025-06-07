import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AcceptInvitationForm } from '@/components/admin/AcceptInvitationForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface AdminInvitePageProps {
  params: Promise<{
    token: string;
    locale: string;
  }>;
}

export default async function AdminInvitePage({
  params,
}: AdminInvitePageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/signin?redirect=/admin/invite/' + token);
  }

  // 招待情報を取得
  const { data: invitation, error: inviteError } = await supabase
    .from('admin_invitations')
    .select(
      `
      *,
      invited_by_profile:invited_by(display_name, email)
    `
    )
    .eq('invitation_token', token)
    .eq('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (inviteError || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              招待が無効です
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                この招待リンクは無効または期限切れです。
                招待者に新しい招待を依頼してください。
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 既に管理者権限を持っているかチェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role && ['admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin/disputes');
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'スーパー管理者';
      case 'admin':
        return '管理者';
      default:
        return role;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            管理者招待
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                あなたは以下の権限で管理者に招待されています：
              </p>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">権限レベル</span>
                <span className="text-sm text-primary font-semibold">
                  {getRoleLabel(invitation.role)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">招待者</span>
                <span className="text-sm">
                  {invitation.invited_by_profile?.display_name || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">期限</span>
                <span className="text-sm">
                  {formatDate(invitation.expires_at)}
                </span>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                招待を受諾すると、以下の機能にアクセスできるようになります：
              </p>
              <ul className="mt-2 ml-4 space-y-1 list-disc">
                <li>争議解決システム</li>
                <li>ユーザー管理</li>
                <li>統計ダッシュボード</li>
                {invitation.role === 'super_admin' && <li>他の管理者の管理</li>}
              </ul>
            </div>
          </div>

          <AcceptInvitationForm
            invitationToken={token}
            roleName={getRoleLabel(invitation.role)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
