'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ChatWindow } from '@/components/social/ChatWindow';
import { ConversationList } from '@/components/social/ConversationList';
import { MainLayout } from '@/components/layout/main-layout';
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
        console.error('Failed to load conversation:', error);
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
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p>ログインが必要です</p>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p>読み込み中...</p>
        </div>
      </MainLayout>
    );
  }

  if (!conversation) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p>会話が見つかりません</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            メッセージ一覧に戻る
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)] max-h-[800px]">
          {/* デスクトップ用：左側に会話一覧 */}
          <div className="hidden lg:block border rounded-lg">
            <ConversationList showFollowTabs={false} />
          </div>

          {/* チャットウィンドウ */}
          <div className="lg:col-span-2 border rounded-lg">
            <ChatWindow
              conversation={conversation}
              currentUserId={user.id}
              onBack={handleBack}
              showHeader={true}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
