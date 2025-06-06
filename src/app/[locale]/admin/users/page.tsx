import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Shield,
  Users,
  UserPlus,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { getAdminUsers, getAdminInvitations } from '@/app/actions/admin-system';
import Link from 'next/link';

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // 管理者権限チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>認証が必要です</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 管理者権限の確認
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>管理者権限が必要です</AlertDescription>
        </Alert>
      </div>
    );
  }

  // データを取得
  const [adminUsersResult, invitationsResult] = await Promise.all([
    getAdminUsers(),
    getAdminInvitations(),
  ]);

  const adminUsers = adminUsersResult.success
    ? adminUsersResult.data || []
    : [];
  const invitations = invitationsResult.success
    ? invitationsResult.data || []
    : [];

  // 一般ユーザーを取得
  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, created_at, is_verified')
    .order('created_at', { ascending: false })
    .limit(50);

  const regularUsers =
    allUsers?.filter(u => u.role === 'user' || !u.role) || [];
  const pendingInvitations = invitations.filter(inv => !inv.used_at);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="text-gray-600 mt-2">
            プラットフォームのユーザーと管理者の管理
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin">
            <Button variant="outline">← ダッシュボードに戻る</Button>
          </Link>
          {profile.role === 'super_admin' && (
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              管理者を招待
            </Button>
          )}
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理者</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              スーパー管理者:{' '}
              {adminUsers.filter(u => u.role === 'super_admin').length}名
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">一般ユーザー</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regularUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              認証済み: {regularUsers.filter(u => u.is_verified).length}名
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">保留中の招待</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingInvitations.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              期限切れ確認が必要
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              今日の新規登録
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                regularUsers.filter(u => {
                  const today = new Date();
                  const userDate = new Date(u.created_at);
                  return userDate.toDateString() === today.toDateString();
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">新規ユーザー</p>
          </CardContent>
        </Card>
      </div>

      {/* 管理者一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            管理者一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adminUsers.length > 0 ? (
              adminUsers.map(admin => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {admin.display_name || '名前未設定'}
                      </p>
                      <p className="text-sm text-gray-600">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        admin.role === 'super_admin' ? 'default' : 'secondary'
                      }
                    >
                      {admin.role === 'super_admin'
                        ? 'スーパー管理者'
                        : '管理者'}
                    </Badge>
                    {admin.is_verified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-500">
                      {new Date(admin.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                管理者が見つかりません
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 保留中の招待 */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              保留中の管理者招待
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvitations.map(invitation => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-orange-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-gray-600">
                        招待者:{' '}
                        {invitation.invited_by_profile?.display_name || '不明'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant="outline"
                      className="border-orange-200 text-orange-800"
                    >
                      {invitation.role === 'super_admin'
                        ? 'スーパー管理者'
                        : '管理者'}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      期限:{' '}
                      {new Date(invitation.expires_at).toLocaleDateString(
                        'ja-JP'
                      )}
                    </span>
                    <Button variant="outline" size="sm">
                      招待を再送
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最近の一般ユーザー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            最近の一般ユーザー
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {regularUsers.slice(0, 10).length > 0 ? (
              regularUsers.slice(0, 10).map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.display_name || '名前未設定'}
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">一般ユーザー</Badge>
                    {user.is_verified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                ユーザーが見つかりません
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
