'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Users,
  MapPin,
  Calendar,
  Clock,
  Camera,
  FileImage,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ChatWindow } from '@/components/social/ChatWindow';
import { ConversationWithUsers } from '@/types/social';
import {
  createGroupConversation,
  sendMessage,
  addGroupMembers,
} from '@/app/actions/message';

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

interface PhotoSessionInfo {
  title: string;
  date: string;
  location: string;
  organizer_name: string;
  participant_count: number;
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
  const [sessionInfo, setSessionInfo] = useState<PhotoSessionInfo | null>(null);

  // 権限チェック
  const isOrganizer = currentUserId === organizerId;
  const isParticipant = participants.some(p => p.user_id === currentUserId);
  const hasAccess = isOrganizer || isParticipant;

  useEffect(() => {
    if (hasAccess) {
      checkExistingGroupChat();
      loadSessionInfo();
    }
  }, [sessionId, hasAccess, sessionTitle]);

  const loadSessionInfo = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('photo_sessions')
        .select(
          `
          title,
          date,
          location,
          organizer:organizer_id(display_name)
        `
        )
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      setSessionInfo({
        title: data.title,
        date: data.date,
        location: data.location,
        organizer_name:
          (data.organizer as { display_name?: string })?.display_name || '不明',
        participant_count: participants.length,
      });
    } catch (error) {
      console.error('Session info load error:', error);
    }
  };

  const checkExistingGroupChat = async () => {
    try {
      const supabase = createClient();

      // 撮影会専用グループチャットを検索
      const { data: existingConversation, error } = await supabase
        .from('conversations')
        .select(
          `
          *,
          conversation_members!inner(user_id, role, is_active)
        `
        )
        .eq('is_group', true)
        .eq('group_name', `${sessionTitle} - 撮影会チャット`)
        .eq('conversation_members.user_id', currentUserId)
        .eq('conversation_members.is_active', true)
        .single();

      if (!error && existingConversation) {
        // 既存のグループチャットが見つかった場合
        const conversationWithUsers: ConversationWithUsers = {
          ...existingConversation,
          members: [],
        };
        setConversation(conversationWithUsers);
      }
    } catch (error) {
      console.error('Check existing group chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPhotoSessionGroupChat = async () => {
    if (!hasAccess) return;

    setCreating(true);
    try {
      // 確定参加者のユーザーIDを取得
      const confirmedParticipants = participants
        .filter(p => p.status === 'confirmed')
        .map(p => p.user_id);

      // 主催者も含める
      const allMemberIds = Array.from(
        new Set([organizerId, ...confirmedParticipants])
      );

      const groupName = `${sessionTitle} - 撮影会チャット`;
      const groupDescription = `${sessionDate} ${sessionLocation}で開催される撮影会の専用チャットです。`;

      const result = await createGroupConversation(
        groupName,
        groupDescription,
        allMemberIds.filter(id => id !== currentUserId) // 自分以外を指定
      );

      if (result.success && result.data) {
        const newConversation = result.data as ConversationWithUsers;
        setConversation(newConversation);

        // 撮影会情報を自動共有
        await sharePhotoSessionInfo(newConversation.id);

        toast.success(t('groupChatCreated'));
      } else {
        toast.error(result.message || t('errorCreatingGroupChat'));
      }
    } catch (error) {
      console.error('Create group chat error:', error);
      toast.error(t('errorCreatingGroupChat'));
    } finally {
      setCreating(false);
    }
  };

  const sharePhotoSessionInfo = async (conversationId: string) => {
    if (!sessionInfo) return;

    const infoMessage = `📸 撮影会情報
📅 日時: ${sessionInfo.date}
📍 場所: ${sessionInfo.location}
👥 参加者: ${sessionInfo.participant_count}名
🎯 主催者: ${sessionInfo.organizer_name}

皆さん、よろしくお願いします！`;

    await sendMessage({
      conversation_id: conversationId,
      content: infoMessage,
      message_type: 'system',
    });
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
      console.error('Add new participants error:', error);
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
                <Button
                  onClick={createPhotoSessionGroupChat}
                  disabled={creating}
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

      {/* 撮影会情報共有 */}
      {sessionInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {t('sessionInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{sessionInfo.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{sessionInfo.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {sessionInfo.participant_count}名参加
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t('organizer')}: {sessionInfo.organizer_name}
                </span>
              </div>
            </div>

            {conversation && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">{t('quickActions')}</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <MapPin className="h-3 w-3 mr-1" />
                    {t('shareLocation')}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Clock className="h-3 w-3 mr-1" />
                    {t('setReminder')}
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileImage className="h-3 w-3 mr-1" />
                    {t('sharePhotos')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 撮影後の作品交換（将来実装） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {t('photoSharing')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t('photoSharingComingSoon')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
