import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PlanSelector } from '@/components/subscription/PlanSelector';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import { logger } from '@/lib/utils/logger';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
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
  params: { locale: _locale },
}: {
  params: { locale: string };
}) {
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
    <div className="container mx-auto py-8 space-y-8">
      {/* ページヘッダー */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">サブスクリプション管理</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {userType === 'model' &&
            'モデル活動をより充実させるプランをご選択ください'}
          {userType === 'photographer' &&
            'カメラマンとしての活動を支援するプランをご選択ください'}
          {userType === 'organizer' &&
            '撮影会運営を効率化するプランをご選択ください'}
        </p>
      </div>

      {/* 現在のサブスクリプション状況 */}
      <SubscriptionStatus />

      {/* プラン選択 */}
      <PlanSelector
        userType={userType}
        onPlanSelected={planId => {
          // Phase 1では基本的な処理のみ
          logger.info('Plan selected', { planId });
        }}
      />

      {/* Phase 1: 注意書き */}
      <div className="text-center text-sm text-muted-foreground bg-blue-50 p-4 rounded-lg">
        <p className="font-medium">Phase 1: 基本機能実装中</p>
        <p>
          現在は基本的なサブスクリプション機能のみ利用可能です。
          詳細な機能は順次追加予定です。
        </p>
      </div>
    </div>
  );
}
