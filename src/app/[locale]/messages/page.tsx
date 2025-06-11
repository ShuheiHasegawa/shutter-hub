import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ConversationList } from '@/components/social/ConversationList';
import { MainLayout } from '@/components/layout/main-layout';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('social.messaging');

  return {
    title: t('title'),
    description: t('searchPlaceholder'),
  };
}

export default function MessagesPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="h-[calc(100vh-12rem)] max-h-[800px] border rounded-lg">
          <ConversationList />
        </div>
      </div>
    </MainLayout>
  );
}
