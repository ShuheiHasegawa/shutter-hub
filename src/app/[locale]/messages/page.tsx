import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ConversationList } from '@/components/social/ConversationList';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social.messaging');

  return {
    title: t('title'),
    description: t('searchPlaceholder'),
  };
}

export default function MessagesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">メッセージ</h1>
          <p className="text-muted-foreground">
            会話を管理し、新しい会話を開始します
          </p>
        </div>

        <div className="h-[calc(100vh-16rem)] border rounded-lg bg-card">
          <ConversationList />
        </div>
      </div>
    </DashboardLayout>
  );
}
