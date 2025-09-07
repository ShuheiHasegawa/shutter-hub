'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { StripePaymentForm } from '@/components/subscription/StripePaymentForm';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { CreditCard } from 'lucide-react';
import { type SubscriptionPlan } from '@/app/actions/subscription-management';

/**
 * サブスクリプション決済ページ（Phase 1: Stripe Elements実装）
 */
export default function SubscriptionPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [planInfo, setPlanInfo] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const client_secret = searchParams.get('client_secret');
  const plan_id = searchParams.get('plan_id');

  useEffect(() => {
    async function initializePage() {
      const supabase = createClient();

      // 認証チェック
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/auth/signin');
        return;
      }

      // client_secretが必要
      if (!client_secret) {
        router.push('/subscription?error=missing_payment_info');
        return;
      }

      // プラン情報取得
      if (plan_id) {
        const { data: plan, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', plan_id)
          .single();

        if (planError) {
          setError('プラン情報の取得に失敗しました');
        } else {
          setPlanInfo(plan);
        }
      }

      setIsLoading(false);
    }

    initializePage();
  }, [client_secret, plan_id, router]);

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto py-8 space-y-8">
          <PageTitleHeader
            title="決済情報入力"
            icon={<CreditCard className="h-6 w-6" />}
          />
          <div className="text-center">
            <p>読み込み中...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto py-8 space-y-8">
          <PageTitleHeader
            title="決済情報入力"
            icon={<CreditCard className="h-6 w-6" />}
          />
          <div className="text-center text-red-600">
            <p>{error}</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-8 space-y-8">
        <PageTitleHeader
          title="決済情報入力"
          icon={<CreditCard className="h-6 w-6" />}
        />

        <div className="max-w-md mx-auto">
          <StripePaymentForm
            clientSecret={client_secret!}
            planInfo={planInfo}
          />
        </div>

        {/* Phase 1: 注意書き */}
        <div className="text-center text-sm text-muted-foreground bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
          <p className="font-medium">安全な決済処理</p>
          <p>
            決済情報はStripeによって安全に処理され、
            ShutterHubには保存されません。
          </p>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
