import { createClient } from '@/lib/supabase/server';
import { AdminDisputeManagement } from '@/components/admin/AdminDisputeManagement';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield } from 'lucide-react';
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">争議管理</h1>
        <p className="text-gray-600 mt-2">
          即座撮影の争議案件を管理・解決します
        </p>
      </div>

      {/* 基本統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-gray-600">総争議件数</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-gray-600">未解決</div>
          <div className="text-2xl font-bold text-orange-600">
            {stats.pending}
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-gray-600">解決済み</div>
          <div className="text-2xl font-bold text-green-600">
            {stats.resolved}
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-gray-600">返金率</div>
          <div className="text-2xl font-bold">{stats.refundRate}%</div>
        </div>
      </div>

      {/* 争議管理コンポーネント */}
      <AdminDisputeManagement initialDisputes={disputes} />
    </div>
  );
}
