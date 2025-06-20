'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Search, Users, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getConversations } from '@/app/actions/message';
import { ConversationWithUsers, ConversationFilter } from '@/types/social';
import { formatDistanceToNow } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface ConversationListProps {
  className?: string;
  showFollowTabs?: boolean;
  defaultTab?: 'all' | 'followers' | 'following';
}

export function ConversationList({
  className,
  showFollowTabs = true,
  defaultTab = 'all',
}: ConversationListProps) {
  const t = useTranslations('social.messaging');
  const locale = useLocale();
  const [conversations, setConversations] = useState<ConversationWithUsers[]>(
    []
  );
  const [filteredConversations, setFilteredConversations] = useState<
    ConversationWithUsers[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(true);

  // 会話一覧を取得
  const loadConversations = async (filter: ConversationFilter = {}) => {
    setLoading(true);
    try {
      const result = await getConversations(filter);
      setConversations(result);
      setFilteredConversations(result);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初回ロード（すべての会話を取得）
  useEffect(() => {
    loadConversations(); // フィルターなしで全ての会話を取得
  }, []);

  // 検索フィルタリング
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const filtered = conversations.filter(conversation => {
      const participant1Name = conversation.participant1?.display_name || '';
      const participant2Name = conversation.participant2?.display_name || '';
      const groupName = conversation.group_name || '';
      const lastMessageContent = conversation.last_message?.content || '';

      return (
        participant1Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        participant2Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lastMessageContent.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  // タブ変更時の処理
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as typeof activeTab);
    // TODO: フォロー・フォロワー関係でのフィルタリング実装
    // 現在は全ての会話を表示
  };

  // 会話の相手ユーザーを取得
  const getOtherUser = (
    conversation: ConversationWithUsers,
    currentUserId?: string
  ) => {
    if (conversation.is_group) {
      return null; // グループの場合は別処理
    }

    if (conversation.participant1_id === currentUserId) {
      return conversation.participant2;
    }
    return conversation.participant1;
  };

  // メッセージの既読状態アイコン
  const getReadStatusIcon = (
    message: { sender_id: string },
    isOwnMessage: boolean
  ) => {
    if (!isOwnMessage) return null;

    // TODO: 実際の既読状態を取得して判定
    const isRead = Math.random() > 0.5; // 仮の実装

    if (isRead) {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
    return <Check className="h-3 w-3 text-gray-400" />;
  };

  // 相対時間のフォーマット
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: locale === 'ja' ? ja : enUS,
    });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* ヘッダー */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">{t('title')}</h2>
        </div>

        {/* 検索バー */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* フォロー関係タブ */}
      {showFollowTabs && (
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="border-b"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">{t('tabs.all')}</TabsTrigger>
            <TabsTrigger value="followers">{t('tabs.followers')}</TabsTrigger>
            <TabsTrigger value="following">{t('tabs.following')}</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

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
                <Link href="/users/search">{t('startNewConversation')}</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map(conversation => {
              const otherUser = getOtherUser(conversation);
              const hasUnread = (conversation.unread_count || 0) > 0;

              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="block hover:bg-muted/50 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* アバター */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={otherUser?.avatar_url || undefined}
                            alt={otherUser?.display_name || ''}
                          />
                          <AvatarFallback>
                            {conversation.is_group ? (
                              <Users className="h-6 w-6" />
                            ) : (
                              otherUser?.display_name
                                ?.charAt(0)
                                .toUpperCase() || 'U'
                            )}
                          </AvatarFallback>
                        </Avatar>

                        {/* オンライン状態（将来実装） */}
                        {conversation.is_online && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                        )}
                      </div>

                      {/* 会話情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3
                            className={cn(
                              'font-medium truncate',
                              hasUnread && 'font-semibold'
                            )}
                          >
                            {conversation.is_group
                              ? conversation.group_name
                              : otherUser?.display_name || t('unknownUser')}
                          </h3>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {conversation.last_message && (
                              <>
                                {getReadStatusIcon(
                                  conversation.last_message,
                                  conversation.last_message.sender_id ===
                                    otherUser?.id
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(
                                    conversation.last_message_at
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          {/* 最後のメッセージ */}
                          <p
                            className={cn(
                              'text-sm text-muted-foreground truncate',
                              hasUnread && 'text-foreground font-medium'
                            )}
                          >
                            {conversation.last_message?.content ||
                              t('noMessages')}
                          </p>

                          {/* 未読バッジ */}
                          {hasUnread && (
                            <Badge
                              variant="default"
                              className="rounded-full px-2 min-w-5 h-5 text-xs"
                            >
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
