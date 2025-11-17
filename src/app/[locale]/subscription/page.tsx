import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { PlanSelector } from '@/components/subscription/PlanSelector';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { getUserWithProfile } from '@/lib/auth/server';

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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { locale: _locale } = await params;
  const { success, error: urlError } = await searchParams;

  try {
    const userWithProfile = await getUserWithProfile();
    if (!userWithProfile) {
      redirect('/auth/signin');
    }

    const { profile } = userWithProfile;
    const userType = profile.user_type as
      | 'model'
      | 'photographer'
      | 'organizer';

    return (
      <AuthenticatedLayout>
        <div className="container mx-auto py-8 space-y-8">
          {/* ページヘッダー */}
          <PageTitleHeader
            title="サブスクリプション管理"
            icon={<CreditCard className="h-6 w-6" />}
          />

          {/* 成功・エラーメッセージ */}
          {success === 'payment_completed' && (
            <div className="text-center p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
              <p className="font-medium">🎉 決済が完了しました！</p>
              <p className="text-sm">サブスクリプションが有効になりました。</p>
            </div>
          )}

          {urlError && (
            <div className="text-center p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
              <p className="font-medium">❌ エラーが発生しました</p>
              <p className="text-sm">{decodeURIComponent(urlError)}</p>
            </div>
          )}

          {/* 現在のサブスクリプション状況 */}
          <SubscriptionStatus />

          {/* プラン選択 */}
          <PlanSelector userType={userType} />
        </div>
      </AuthenticatedLayout>
    );
  } catch {
    redirect('/auth/signin');
  }
}
