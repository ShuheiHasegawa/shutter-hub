'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ChatWindow } from './ChatWindow';
import {
  MessageCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getConversations } from '@/app/actions/message';
import { ConversationWithUsers, UserWithFollowInfo } from '@/types/social';
import { formatDistanceToNow } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import Link from 'next/link';

interface MessagesLayoutProps {
  initialConversationId?: string;
}

export function MessagesLayout({ initialConversationId }: MessagesLayoutProps) {
  const t = useTranslations('social.messaging');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<ConversationWithUsers[]>(
    []
  );
  const [filteredConversations, setFilteredConversations] = useState<
    ConversationWithUsers[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithUsers | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // URLパラメータから選択された会話IDを取得
  const selectedId = initialConversationId || searchParams.get('id');

  // 会話一覧を取得
  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getConversations();
      // logger.info('loadConversations - Raw result:', result);

      // 各会話の参加者情報をデバッグ
      // result.forEach((conv, index) => {
      //   logger.info(`Conversation ${index}:`, {
      //     id: conv.id,
      //     is_group: conv.is_group,
      //     participant1: conv.participant1,
      //     participant2: conv.participant2,
      //     members: conv.members,
      //   });
      // });

      setConversations(result);
      setFilteredConversations(result);

      // 初期選択された会話を設定
      if (selectedId) {
        const found = result.find(conv => conv.id === selectedId);
        if (found) {
          setSelectedConversation(found);
        }
      }
    } catch (error) {
      logger.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, selectedId, loadConversations]);

  // 他のユーザーを取得（グループ会話対応）
  const getOtherUser = useCallback(
    (conversation: ConversationWithUsers) => {
      // デバッグ情報を追加
      // logger.info('🔍 getOtherUser - conversation:', conversation);
      // logger.info('🔍 getOtherUser - user?.id:', user?.id);
      // logger.info('🔍 getOtherUser - members:', conversation.members);
      // logger.info('🔍 getOtherUser - is_group:', conversation.is_group);
      // logger.info('🔍 getOtherUser - group_name:', conversation.group_name);

      // グループ会話の場合は常にグループ名を表示
      if (conversation.is_group) {
        // logger.info(
        //   '🔍 グループ会話なのでグループ名を返します:',
        //   conversation.group_name
        // );

        // グループ会話では常にグループ名を表示（個人名は表示しない）
        return {
          id: 'group',
          display_name: conversation.group_name || 'グループチャット',
          username: 'group',
          avatar_url: null,
          user_type: 'group',
          bio: null,
          location: null,
          website: null,
          instagram_handle: null,
          twitter_handle: null,
          is_verified: false,
          created_at: new Date().toISOString(),
        } as UserWithFollowInfo;
      }

      // 1対1会話の場合
      let otherUser;
      if (conversation.participant1?.id === user?.id) {
        otherUser = conversation.participant2;
      } else {
        otherUser = conversation.participant1;
      }

      // logger.info('getOtherUser - direct conversation other user:', otherUser);
      return otherUser;
    },
    [user?.id]
  );

  // 検索機能
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const filtered = conversations.filter(conversation => {
      const otherUser = getOtherUser(conversation);
      if (!otherUser) return false;

      const searchLower = searchQuery.toLowerCase();
      const nameMatch = otherUser.display_name
        ?.toLowerCase()
        .includes(searchLower);
      const usernameMatch = otherUser.username
        ?.toLowerCase()
        .includes(searchLower);
      const messageMatch = conversation.last_message?.content
        ?.toLowerCase()
        .includes(searchLower);

      return nameMatch || usernameMatch || messageMatch;
    });

    setFilteredConversations(filtered);
  }, [searchQuery, conversations, getOtherUser]);

  // 相対時間のフォーマット
  const formatRelativeTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: locale === 'ja' ? ja : enUS,
      });
    } catch {
      return '';
    }
  };

  // 会話を選択
  const handleSelectConversation = (conversation: ConversationWithUsers) => {
    setSelectedConversation(conversation);
    // URLを更新（ページリロードなし）
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('id', conversation.id);
    router.replace(newUrl.pathname + newUrl.search, { scroll: false });
  };

  // サイドバーを閉じる
  const handleCloseSidebar = () => {
    setSelectedConversation(null);
    // URLからidパラメータを削除
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('id');
    router.replace(newUrl.pathname + newUrl.search, { scroll: false });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">ログインが必要です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] max-h-[calc(100vh-10rem)] border rounded-lg bg-card overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* 左側：メッセージ一覧サイドバー */}
        <ResizablePanel
          defaultSize={30}
          minSize={20}
          maxSize={50}
          className={cn(
            'transition-all duration-300',
            // PC表示: サイドバー折りたたみ時は非表示
            sidebarCollapsed && 'hidden md:block',
            // スマホ表示: メッセージ選択時は一覧を非表示、PC表示時は常に表示
            selectedConversation && 'hidden md:block'
          )}
        >
          <div className="flex flex-col h-full">
            {/* ヘッダー */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{t('title')}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden md:flex"
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 会話リスト */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  {t('loading')}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? t('noSearchResults') : t('noConversations')}
                  </p>
                  {!searchQuery && (
                    <Button asChild className="mt-4">
                      <Link href="/users/search">
                        {t('startNewConversation')}
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map(conversation => {
                    const otherUser = getOtherUser(conversation);
                    const hasUnread = (conversation.unread_count || 0) > 0;
                    const isSelected =
                      selectedConversation?.id === conversation.id;

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleSelectConversation(conversation)}
                        className={cn(
                          'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                          isSelected && 'bg-muted'
                        )}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage
                                src={otherUser?.avatar_url || undefined}
                                alt={otherUser?.display_name || 'User'}
                              />
                              <AvatarFallback>
                                {otherUser?.display_name?.[0] ||
                                  otherUser?.username?.[0] ||
                                  'U'}
                              </AvatarFallback>
                            </Avatar>
                            {hasUnread && (
                              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p
                                className={cn(
                                  'text-sm truncate',
                                  hasUnread ? 'font-semibold' : 'font-medium'
                                )}
                              >
                                {otherUser?.display_name ||
                                  otherUser?.username ||
                                  'Unknown User'}
                              </p>
                              {conversation.last_message && (
                                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                  {formatRelativeTime(
                                    conversation.last_message.created_at
                                  )}
                                </span>
                              )}
                            </div>

                            {conversation.last_message && (
                              <div className="flex items-center space-x-1 mt-1">
                                {conversation.last_message.sender_id ===
                                  user?.id && (
                                  <div className="flex-shrink-0">
                                    <Check className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                )}
                                <p
                                  className={cn(
                                    'text-sm truncate',
                                    hasUnread
                                      ? 'font-medium'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {conversation.last_message.content}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>

        {/* リサイズハンドル */}
        <ResizableHandle className="hidden md:flex" />

        {/* 右側：チャットエリア */}
        <ResizablePanel
          defaultSize={70}
          className={cn(
            'flex flex-col',
            // スマホ表示: メッセージ未選択時は非表示、PC表示時は常に表示
            !selectedConversation && 'hidden md:flex'
          )}
        >
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUserId={user.id}
              onBack={handleCloseSidebar}
              showHeader={true}
            />
          ) : (
            // PC表示でのみ「メッセージを選択してください」を表示
            <div className="flex-1 hidden md:flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  メッセージを選択してください
                </p>
                <p className="text-muted-foreground">
                  左側の一覧からメッセージを選択して会話を開始します
                </p>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
