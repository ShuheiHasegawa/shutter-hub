'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Send,
  Paperclip,
  MoreVertical,
  ArrowLeft,
  Phone,
  Video,
  Check,
  CheckCheck,
  X,
  Image,
  File,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  sendMessage,
  getConversationMessages,
  markMessagesAsRead,
} from '@/app/actions/message';
import {
  ConversationWithUsers,
  MessageWithUser,
  SendMessageRequest,
} from '@/types/social';
import { formatDistanceToNow } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { formatFileSize, isImageFile } from '@/lib/storage/message-files';

interface ChatWindowProps {
  conversation: ConversationWithUsers;
  currentUserId: string;
  className?: string;
  onBack?: () => void;
  showHeader?: boolean;
}

export function ChatWindow({
  conversation,
  currentUserId,
  className,
  onBack,
  showHeader = true,
}: ChatWindowProps) {
  const t = useTranslations('social.messaging');
  const locale = useLocale();
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 相手ユーザーを取得
  const otherUser = conversation.is_group
    ? null
    : conversation.participant1_id === currentUserId
      ? conversation.participant2
      : conversation.participant1;

  // メッセージ一覧を取得
  const loadMessages = async () => {
    setLoading(true);
    try {
      const result = await getConversationMessages(conversation.id);
      setMessages(result.reverse()); // 古い順に並べ替え

      // 未読メッセージを既読にする
      await markMessagesAsRead(conversation.id);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error(t('errorLoadingMessages'));
    } finally {
      setLoading(false);
    }
  };

  // 初回ロードと会話変更時
  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  // 新しいメッセージが追加されたら最下部にスクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 最下部にスクロール
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ファイル選択処理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // ファイル添付ボタンクリック
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  // ファイル削除
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // メッセージ送信
  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || sending) return;

    const messageContent = messageText.trim();
    const fileToSend = selectedFile;

    setMessageText('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSending(true);

    try {
      const request: SendMessageRequest = {
        conversation_id: conversation.id,
        content:
          messageContent || (fileToSend ? `[ファイル] ${fileToSend.name}` : ''),
        message_type: fileToSend
          ? fileToSend.type.startsWith('image/')
            ? 'image'
            : 'file'
          : 'text',
        file: fileToSend || undefined,
      };

      const result = await sendMessage(request);

      if (result.success && result.data) {
        // 送信したメッセージを即座に表示（楽観的更新）
        const newMessage: MessageWithUser = {
          ...(result.data as MessageWithUser),
          sender: {
            id: currentUserId,
            display_name: '', // 現在のユーザー情報で更新
            avatar_url: null,
            user_type: 'model', // 仮の値
            bio: null,
            location: null,
            website: null,
            instagram_handle: null,
            twitter_handle: null,
            is_verified: false,
            created_at: new Date().toISOString(),
          },
        };

        setMessages(prev => [...prev, newMessage]);
      } else {
        toast.error(result.message || t('errorSendingMessage'));
        setMessageText(messageContent); // 元に戻す
        setSelectedFile(fileToSend); // ファイルも元に戻す
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error(t('errorSendingMessage'));
      setMessageText(messageContent); // 元に戻す
      setSelectedFile(fileToSend); // ファイルも元に戻す
    } finally {
      setSending(false);
    }
  };

  // Enterキーでメッセージ送信
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // メッセージの時間フォーマット
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) {
      return date.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInDays === 1) {
      return t('yesterday');
    } else {
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: locale === 'ja' ? ja : enUS,
      });
    }
  };

  // 既読アイコンの表示
  const getReadStatusIcon = (message: MessageWithUser) => {
    if (message.sender_id !== currentUserId) return null;

    // TODO: 実際の既読状態を確認
    const isRead = Math.random() > 0.5; // 仮の実装

    if (isRead) {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
    return <Check className="h-3 w-3 text-gray-400" />;
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* ヘッダー */}
      {showHeader && (
        <div className="flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={otherUser?.avatar_url || undefined}
                alt={otherUser?.display_name || ''}
              />
              <AvatarFallback>
                {conversation.is_group
                  ? conversation.group_name?.charAt(0).toUpperCase()
                  : otherUser?.display_name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">
                {conversation.is_group
                  ? conversation.group_name
                  : otherUser?.display_name || t('unknownUser')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {/* TODO: オンライン状態表示 */}
                {t('lastSeen')}
              </p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled>
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" disabled>
              <Video className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>{t('viewProfile')}</DropdownMenuItem>
                <DropdownMenuItem disabled>
                  {t('clearHistory')}
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-destructive">
                  {t('blockUser')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* メッセージエリア */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">{t('loadingMessages')}</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">{t('noMessages')}</p>
              <p className="text-sm text-muted-foreground">
                {t('startConversation')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isOwn = message.sender_id === currentUserId;
              const showAvatar =
                !isOwn &&
                (index === 0 ||
                  messages[index - 1]?.sender_id !== message.sender_id);
              const showTimestamp =
                index === 0 ||
                new Date(message.created_at).getTime() -
                  new Date(messages[index - 1]?.created_at).getTime() >
                  5 * 60 * 1000; // 5分以上間隔

              return (
                <div key={message.id}>
                  {/* タイムスタンプ */}
                  {showTimestamp && (
                    <div className="text-center text-xs text-muted-foreground mb-2">
                      {formatMessageTime(message.created_at)}
                    </div>
                  )}

                  {/* メッセージ */}
                  <div
                    className={cn(
                      'flex gap-2 max-w-[80%]',
                      isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    )}
                  >
                    {/* アバター */}
                    {showAvatar && !isOwn && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage
                          src={message.sender.avatar_url || undefined}
                          alt={message.sender.display_name || ''}
                        />
                        <AvatarFallback className="text-xs">
                          {message.sender.display_name
                            ?.charAt(0)
                            .toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* メッセージバブル */}
                    <div
                      className={cn(
                        'flex flex-col gap-1',
                        !showAvatar && !isOwn && 'ml-10'
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-2xl px-3 py-2 break-words',
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {/* ファイル表示 */}
                        {message.file_url && (
                          <div className="mb-2">
                            {message.message_type === 'image' ? (
                              <div className="relative">
                                <img
                                  src={message.file_url}
                                  alt={message.file_name || 'Image'}
                                  className="max-w-xs max-h-64 rounded-lg cursor-pointer"
                                  onClick={() =>
                                    window.open(message.file_url, '_blank')
                                  }
                                />
                                {message.file_name && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {message.file_name}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-background/10 rounded-lg">
                                <File className="h-4 w-4" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {message.file_name || 'ファイル'}
                                  </p>
                                  {message.file_size && (
                                    <p className="text-xs text-muted-foreground">
                                      {formatFileSize(message.file_size)}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    window.open(message.file_url, '_blank')
                                  }
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowLeft className="h-3 w-3 rotate-180" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* テキストコンテンツ */}
                        {message.content && (
                          <p className="text-sm">{message.content}</p>
                        )}
                      </div>

                      {/* メッセージ状態 */}
                      <div
                        className={cn(
                          'flex items-center gap-1 text-xs text-muted-foreground',
                          isOwn ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <span>
                          {new Date(message.created_at).toLocaleTimeString(
                            locale === 'ja' ? 'ja-JP' : 'en-US',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </span>
                        {isOwn && getReadStatusIcon(message)}
                        {message.is_edited && (
                          <span className="text-muted-foreground">
                            {t('edited')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* メッセージ入力エリア */}
      <div className="p-4 border-t bg-background">
        {/* ファイルプレビュー */}
        {selectedFile && (
          <div className="mb-3 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              {isImageFile(selectedFile.type) ? (
                <Image className="h-4 w-4" />
              ) : (
                <File className="h-4 w-4" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* ファイル添付ボタン */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAttachClick}
            disabled={sending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* 隠しファイル入力 */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.txt,.doc,.docx"
            className="hidden"
          />

          <div className="flex-1 flex gap-2">
            <Input
              placeholder={t('typeMessage')}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={(!messageText.trim() && !selectedFile) || sending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
