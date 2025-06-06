import { createClient } from '@/lib/supabase/server';
import { AdminNavigation } from '@/components/admin/AdminNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Shield,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Activity,
} from 'lucide-react';
import { getAdminDisputes, getDisputeStats } from '@/app/actions/admin-dispute';
import { getAdminUsers } from '@/app/actions/admin-system';
import Link from 'next/link';

export default async function AdminDashboardPage() {
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
    .select('role, display_name')
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

  // データを並行取得
  const [disputesResult, statsResult, adminUsersResult] = await Promise.all([
    getAdminDisputes(),
    getDisputeStats(),
    getAdminUsers(),
  ]);

  const disputes = disputesResult.success ? disputesResult.data || [] : [];
  const stats =
    statsResult.success && statsResult.data
      ? statsResult.data
      : {
          total: 0,
          pending: 0,
          resolved: 0,
          avgResolutionTimeHours: 0,
          refundRate: 0,
        };
  const adminUsers = adminUsersResult.success
    ? adminUsersResult.data || []
    : [];

  // プラットフォーム統計を取得
  const { data: platformStats } = await supabase
    .from('profiles')
    .select('role')
    .in('role', ['user', 'admin', 'super_admin']);

  const totalUsers = platformStats?.length || 0;
  const totalPhotographers =
    platformStats?.filter(p => p.role === 'user').length || 0;
  const totalAdmins = adminUsers.length;

  // 今日の活動統計
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const { data: todayBookings } = await supabase
    .from('instant_bookings')
    .select('total_amount')
    .gte('created_at', todayStart.toISOString());

  const todayRevenue =
    todayBookings?.reduce((sum, booking) => sum + booking.total_amount, 0) || 0;
  const todayBookingCount = todayBookings?.length || 0;

  const pendingDisputes = disputes.filter(d => d.status !== 'resolved').length;
  const urgentDisputes = disputes.filter(d => {
    const hoursAgo =
      (new Date().getTime() - new Date(d.created_at).getTime()) /
      (1000 * 60 * 60);
    return hoursAgo > 24 && d.status !== 'resolved';
  }).length;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            管理者ダッシュボード
          </h1>
          <p className="text-gray-600 mt-2">
            ShutterHub v2 プラットフォームの管理・運営
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {profile.role === 'super_admin' ? 'スーパー管理者' : '管理者'}
          </Badge>
          <span className="text-sm text-gray-600">
            {profile.display_name || user.email}
          </span>
        </div>
      </div>

      {/* 緊急アラート */}
      {urgentDisputes > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {urgentDisputes}件の緊急争議案件があります。24時間以上未解決です。
            </span>
            <Link
              href="/admin/disputes"
              className="text-destructive-foreground hover:underline font-medium"
            >
              今すぐ確認 →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* プラットフォーム統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              カメラマン: {totalPhotographers}名
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本日の売上</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{todayRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayBookingCount}件の予約
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未解決争議</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingDisputes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              緊急: {urgentDisputes}件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理者数</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAdmins}</div>
            <p className="text-xs text-muted-foreground mt-1">あなたを含む</p>
          </CardContent>
        </Card>
      </div>

      {/* システム稼働状況 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            システム稼働状況
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">
                  API サーバー
                </p>
                <p className="text-xs text-green-600">正常稼働中</p>
              </div>
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">
                  データベース
                </p>
                <p className="text-xs text-green-600">正常稼働中</p>
              </div>
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">
                  決済システム
                </p>
                <p className="text-xs text-green-600">正常稼働中</p>
              </div>
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 管理者ナビゲーション */}
      <AdminNavigation disputeCount={pendingDisputes} />

      {/* 最近の活動 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              最近の争議案件
            </CardTitle>
          </CardHeader>
          <CardContent>
            {disputes.slice(0, 5).length > 0 ? (
              <div className="space-y-3">
                {disputes.slice(0, 5).map(dispute => (
                  <div
                    key={dispute.id}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {dispute.guest_name} vs {dispute.photographer_name}
                      </p>
                      <p className="text-xs text-gray-600">
                        ¥{dispute.amount.toLocaleString()} - {dispute.issues[0]}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        dispute.status === 'pending'
                          ? 'border-orange-200 text-orange-800'
                          : dispute.status === 'investigating'
                            ? 'border-blue-200 text-blue-800'
                            : dispute.status === 'resolved'
                              ? 'border-green-200 text-green-800'
                              : 'border-red-200 text-red-800'
                      }
                    >
                      {dispute.status}
                    </Badge>
                  </div>
                ))}
                <Link
                  href="/admin/disputes"
                  className="block text-center text-sm text-blue-600 hover:text-blue-800 mt-4"
                >
                  すべての争議を表示 →
                </Link>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                争議案件はありません
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              プラットフォーム統計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">総争議解決件数</span>
                <span className="text-sm font-medium">{stats.resolved}件</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">平均解決時間</span>
                <span className="text-sm font-medium">
                  {stats.avgResolutionTimeHours}時間
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">返金率</span>
                <span className="text-sm font-medium">{stats.refundRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">管理者アカウント</span>
                <span className="text-sm font-medium">
                  {totalAdmins}アカウント
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
