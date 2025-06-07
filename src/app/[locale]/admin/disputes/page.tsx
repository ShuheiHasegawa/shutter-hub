import { createClient } from '@/lib/supabase/server';
import { AdminDisputeManagement } from '@/components/admin/AdminDisputeManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { getAdminDisputes, getDisputeStats } from '@/app/actions/admin-dispute';

export default async function AdminDisputesPage({
  params,
}: {
  params: Promise<{
    locale: string;
  }>;
}) {
  // paramsを使用しない場合でも、Next.js 15では必要
  await params;

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

  if (profile?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>管理者権限が必要です</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 争議データと統計を取得
  const [disputesResult, statsResult] = await Promise.all([
    getAdminDisputes(),
    getDisputeStats(),
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">争議管理</h1>
          <p className="text-gray-600 mt-2">
            即座撮影の争議案件を管理・解決します
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          管理者モード
        </Badge>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総争議件数</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未解決</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">解決済み</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.resolved}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均解決時間</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgResolutionTimeHours}h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">返金率</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.refundRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* 争議管理コンポーネント */}
      <AdminDisputeManagement initialDisputes={disputes} />

      {/* クイックアクション */}
      <Card>
        <CardHeader>
          <CardTitle>クイックアクション</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="text-lg font-semibold text-orange-600">
                緊急案件
              </div>
              <div className="text-sm text-gray-600">24時間以上未解決</div>
              <div className="text-2xl font-bold mt-2">
                {
                  disputes.filter(d => {
                    const hoursAgo =
                      (new Date().getTime() -
                        new Date(d.created_at).getTime()) /
                      (1000 * 60 * 60);
                    return hoursAgo > 24 && d.status !== 'resolved';
                  }).length
                }
              </div>
            </div>
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="text-lg font-semibold text-blue-600">
                高額案件
              </div>
              <div className="text-sm text-gray-600">1万円以上の争議</div>
              <div className="text-2xl font-bold mt-2">
                {
                  disputes.filter(
                    d => d.amount > 10000 && d.status !== 'resolved'
                  ).length
                }
              </div>
            </div>
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="text-lg font-semibold text-purple-600">
                調査中
              </div>
              <div className="text-sm text-gray-600">現在調査中の案件</div>
              <div className="text-2xl font-bold mt-2">
                {disputes.filter(d => d.status === 'investigating').length}
              </div>
            </div>
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="text-lg font-semibold text-green-600">
                本日解決
              </div>
              <div className="text-sm text-gray-600">今日解決した案件</div>
              <div className="text-2xl font-bold mt-2">
                {
                  disputes.filter(d => {
                    if (!d.resolved_at) return false;
                    const resolvedDate = new Date(d.resolved_at);
                    const today = new Date();
                    return resolvedDate.toDateString() === today.toDateString();
                  }).length
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
