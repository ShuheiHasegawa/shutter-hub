'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ChatWindow } from '@/components/social/ChatWindow';
import { ConversationWithUsers } from '@/types/social';
import {
  createGroupConversation,
  addGroupMembers,
} from '@/app/actions/message';
import { useRouter } from 'next/navigation';

interface PhotoSessionGroupChatProps {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  sessionLocation: string;
  organizerId: string;
  currentUserId: string;
  participants: Array<{
    id: string;
    user_id: string;
    status: string;
    user: {
      id: string;
      display_name: string;
      avatar_url?: string;
    };
  }>;
}

export function PhotoSessionGroupChat({
  sessionId,
  sessionTitle,
  sessionDate,
  sessionLocation,
  organizerId,
  currentUserId,
  participants,
}: PhotoSessionGroupChatProps) {
  const t = useTranslations('photoSessions.groupChat');
  const [conversation, setConversation] =
    useState<ConversationWithUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const router = useRouter();

  // 権限チェック
  const isOrganizer = currentUserId === organizerId;
  const isParticipant = participants.some(p => p.user_id === currentUserId);
  const hasAccess = isOrganizer || isParticipant;

  useEffect(() => {
    if (hasAccess) {
      checkExistingGroupChat();
    }
  }, [sessionId, hasAccess, sessionTitle]);

  const checkExistingGroupChat = async () => {
    try {
      const supabase = createClient();

      // まず撮影会専用グループチャットを検索（sessionIdベースとsessionTitleベースの両方をチェック）
      const { data: conversations, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('is_group', true)
        .or(
          `group_name.eq.${sessionId} - 撮影会チャット,group_name.eq.${sessionTitle} - 撮影会チャット`
        );

      if (conversationError) {
        // テーブルが存在しない場合は警告のみ表示
        if (conversationError.code === '42P01') {
          logger.warn(
            'メッセージシステムのテーブルが存在しません。マイグレーションが必要です。'
          );
          setLoading(false);
          return;
        }
        // RLSポリシーエラーの場合
        if (conversationError.code === '42P17') {
          logger.warn(
            'RLSポリシーエラーが発生しました。ポリシーの修正が必要です。'
          );
          setLoading(false);
          return;
        }
        // 500 Internal Server Errorやその他のエラー
        logger.warn(
          'グループチャット機能でエラーが発生しました:',
          conversationError
        );
        setLoading(false);
        return;
      }

      if (conversations && conversations.length > 0) {
        const conversation = conversations[0];

        // 現在のユーザーがメンバーかチェック
        const { data: membership, error: memberError } = await supabase
          .from('conversation_members')
          .select('*')
          .eq('conversation_id', conversation.id)
          .eq('user_id', currentUserId)
          .eq('is_active', true)
          .maybeSingle();

        if (memberError) {
          // メンバーシップチェックでエラーが発生した場合は警告のみ
          if (memberError.code === '406') {
            logger.warn('メンバーシップデータが見つかりませんでした');
          } else {
            logger.warn(
              'メンバーシップチェックでエラーが発生しました:',
              memberError
            );
          }
        } else if (membership) {
          // 既存のグループチャットが見つかった場合
          const conversationWithUsers: ConversationWithUsers = {
            ...conversation,
            members: [],
          };
          setConversation(conversationWithUsers);
        }
      }
    } catch (error) {
      logger.error('Check existing group chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPhotoSessionGroupChat = async () => {
    if (!hasAccess) return;

    // 確定参加者のユーザーIDを取得
    const confirmedParticipants = participants
      .filter(p => p.status === 'confirmed')
      .map(p => p.user_id);

    // 参加者がいない場合の処理
    if (confirmedParticipants.length === 0) {
      toast.error(
        'まだ参加者がいません。参加者が確定してからグループチャットを作成してください。'
      );
      return;
    }

    setCreating(true);
    try {
      const groupName = `${sessionId} - 撮影会チャット`;
      const groupDescription = `${sessionTitle}（${sessionDate} ${sessionLocation}）の専用チャットです。`;

      // 主催者以外のメンバーIDを渡す（createGroupConversationで主催者は自動で追加される）
      const memberIds = confirmedParticipants;

      const result = await createGroupConversation(
        groupName,
        groupDescription,
        memberIds
      );

      if (result.success && result.data) {
        toast.success('グループチャットを作成しました');
        // チャットページにリダイレクト
        router.push(`/messages/${result.data.id}`);
      } else {
        toast.error(result.message || 'グループチャットの作成に失敗しました');
      }
    } catch (error) {
      logger.error('Group creation failed:', error);
      toast.error('グループチャットの作成中にエラーが発生しました');
    } finally {
      setCreating(false);
    }
  };

  const addNewParticipants = async () => {
    if (!conversation || !isOrganizer) return;

    try {
      // 新しく確定した参加者を取得
      const currentMemberIds = conversation.members?.map(m => m.user_id) || [];
      const newParticipantIds = participants
        .filter(
          p => p.status === 'confirmed' && !currentMemberIds.includes(p.user_id)
        )
        .map(p => p.user_id);

      if (newParticipantIds.length === 0) {
        toast.info(t('noNewParticipants'));
        return;
      }

      const result = await addGroupMembers(conversation.id, newParticipantIds);

      if (result.success) {
        toast.success(
          t('newParticipantsAdded', { count: newParticipantIds.length })
        );
        // 会話情報を再読み込み
        checkExistingGroupChat();
      } else {
        toast.error(result.message || t('errorAddingParticipants'));
      }
    } catch (error) {
      logger.error('Add new participants error:', error);
      toast.error(t('errorAddingParticipants'));
    }
  };

  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('accessDenied')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (showChat && conversation) {
    return (
      <Card className="h-[600px]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {conversation.group_name}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChat(false)}
            >
              {t('backToInfo')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-5rem)]">
          <ChatWindow
            conversation={conversation}
            currentUserId={currentUserId}
            showHeader={false}
            className="h-full border-0"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* グループチャット情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t('photoSessionGroupChat')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!conversation ? (
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-medium">{t('noGroupChatYet')}</h3>
                <p className="text-muted-foreground">
                  {t('groupChatDescription')}
                </p>
              </div>

              {isOrganizer && (
                <>
                  <Button
                    onClick={createPhotoSessionGroupChat}
                    disabled={
                      creating ||
                      participants.filter(p => p.status === 'confirmed')
                        .length === 0
                    }
                    className="w-full max-w-sm"
                  >
                    {creating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t('creating')}
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        {t('createGroupChat')}
                      </>
                    )}
                  </Button>
                  {participants.filter(p => p.status === 'confirmed').length ===
                    0 && (
                    <p className="text-sm text-orange-600 mt-2">
                      ※ 参加者が確定してからグループチャットを作成できます
                    </p>
                  )}
                </>
              )}

              {!isOrganizer && (
                <p className="text-sm text-muted-foreground">
                  {t('waitForOrganizerToCreate')}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{conversation.group_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {conversation.group_description}
                  </p>
                </div>
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {conversation.members?.length || 0}名
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setShowChat(true)} className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t('openChat')}
                </Button>

                {isOrganizer && (
                  <Button variant="outline" onClick={addNewParticipants}>
                    <Users className="h-4 w-4 mr-2" />
                    {t('addParticipants')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
