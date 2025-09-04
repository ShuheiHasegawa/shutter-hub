import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { PlanSelector } from '@/components/subscription/PlanSelector';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { PageTitleHeader } from '@/components/ui/page-title-header';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'subscription' });

  return {
    title: t('pageTitle') || 'サブスクリプション管理',
    description:
      t('pageDescription') ||
      'ShutterHubのサブスクリプションプランを管理します',
  };
}

/**
 * サブスクリプション管理ページ（Phase 1: 基本実装）
 */
export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: _locale } = await params;
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/signin');
  }

  // ユーザープロフィール取得
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_type, display_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/auth/setup-profile');
  }

  const userType = profile.user_type as 'model' | 'photographer' | 'organizer';

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-8 space-y-8">
        {/* ページヘッダー */}
        <PageTitleHeader
          title="サブスクリプション管理"
          icon={<CreditCard className="h-6 w-6" />}
        />

        {/* 現在のサブスクリプション状況 */}
        <SubscriptionStatus />

        {/* プラン選択 */}
        <PlanSelector userType={userType} />

        {/* Phase 1: 注意書き */}
        <div className="text-center text-sm text-muted-foreground bg-blue-50 p-4 rounded-lg">
          <p className="font-medium">Phase 1: 基本機能実装中</p>
          <p>
            現在は基本的なサブスクリプション機能のみ利用可能です。
            詳細な機能は順次追加予定です。
          </p>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
