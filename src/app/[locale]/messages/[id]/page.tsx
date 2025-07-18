'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ChatWindow } from '@/components/social/ChatWindow';
import { ConversationList } from '@/components/social/ConversationList';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { getConversations } from '@/app/actions/message';
import { ConversationWithUsers } from '@/types/social';

export default function ChatPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [conversation, setConversation] =
    useState<ConversationWithUsers | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConversation = async () => {
      if (!user || !id) return;

      try {
        const conversations = await getConversations();
        const foundConversation = conversations.find(conv => conv.id === id);

        if (foundConversation) {
          setConversation(foundConversation);
        } else {
          // 会話が見つからない場合はメッセージ一覧に戻る
          router.push('/messages');
        }
      } catch (error) {
        logger.error('Failed to load conversation:', error);
        router.push('/messages');
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [id, user, router]);

  const handleBack = () => {
    router.push('/messages');
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <p>ログインが必要です</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <p>読み込み中...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!conversation) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <p>会話が見つかりません</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            メッセージ一覧に戻る
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">チャット</h1>
          <p className="text-muted-foreground">メッセージを送受信します</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
          {/* デスクトップ用：左側に会話一覧 */}
          <div className="hidden lg:block border rounded-lg bg-card">
            <ConversationList showFollowTabs={false} />
          </div>

          {/* チャットウィンドウ */}
          <div className="lg:col-span-2 border rounded-lg bg-card">
            <ChatWindow
              conversation={conversation}
              currentUserId={user.id}
              onBack={handleBack}
              showHeader={true}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
