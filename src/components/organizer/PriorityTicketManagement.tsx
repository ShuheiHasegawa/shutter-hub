'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Ticket,
  UserPlus,
  Trash2,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';
import {
  createPriorityTicket,
  getPriorityTicketsByOrganizer,
  deletePriorityTicket,
  type PriorityTicket,
} from '@/app/actions/photo-session-priority';
import { searchUsers } from '@/app/actions/username';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import { useLocale } from 'next-intl';
import { UserProfileDisplay } from '@/components/ui/user-profile-display';
import Link from 'next/link';

interface TicketWithUser extends PriorityTicket {
  user?: {
    display_name: string | null;
    avatar_url: string | null;
    username?: string | null;
  };
  issued_by_user?: {
    display_name: string | null;
  };
  photo_session?: {
    id: string;
    title: string;
  } | null;
}

interface UserSearchResult {
  id: string;
  username: string | null;
  display_name: string;
  user_type?: string;
  is_verified?: boolean;
  avatar_url: string | null;
}

export function PriorityTicketManagement() {
  const locale = useLocale();
  const [tickets, setTickets] = useState<TicketWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);

  // チケット配布フォームの状態
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // チケット一覧を取得
  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const result = await getPriorityTicketsByOrganizer();
      if (result.success && result.data) {
        setTickets(result.data as TicketWithUser[]);
      } else {
        toast.error(result.error || 'チケットの取得に失敗しました');
      }
    } catch (error) {
      logger.error('チケット取得エラー:', error);
      toast.error('チケットの取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザー検索（デバウンス付き）
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(searchQuery, 10);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        logger.error('ユーザー検索エラー:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 外部クリックで検索結果を閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // チケット配布
  const handleGrantTicket = async () => {
    if (!selectedUser) {
      toast.error('ユーザーを選択してください');
      return;
    }

    if (!expiresAt) {
      toast.error('有効期限を設定してください');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createPriorityTicket({
        user_id: selectedUser.id,
        ticket_type: 'general',
        expires_at: expiresAt,
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success('優先チケットを配布しました');
        // フォームをリセット
        setSelectedUser(null);
        setSearchQuery('');
        setExpiresAt('');
        setNotes('');
        setSearchResults([]);
        setShowSearchResults(false);
        // チケット一覧を再取得
        await loadTickets();
      } else {
        toast.error(result.error || 'チケットの配布に失敗しました');
      }
    } catch (error) {
      logger.error('チケット配布エラー:', error);
      toast.error('チケットの配布中にエラーが発生しました');
    } finally {
      setIsCreating(false);
    }
  };

  // チケット削除
  const handleDeleteTicket = async (ticketId: string) => {
    try {
      const result = await deletePriorityTicket(ticketId);
      if (result.success) {
        toast.success('優先チケットを削除しました');
        await loadTickets();
      } else {
        toast.error(result.error || 'チケットの削除に失敗しました');
      }
    } catch (error) {
      logger.error('チケット削除エラー:', error);
      toast.error('チケットの削除中にエラーが発生しました');
    } finally {
      setShowDeleteDialog(null);
    }
  };

  // 有効期限のデフォルト値（30日後）
  useEffect(() => {
    if (!expiresAt) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setExpiresAt(defaultDate.toISOString().slice(0, 16));
    }
  }, []);

  const isTicketExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const isTicketUsed = (ticket: TicketWithUser) => {
    return ticket.used_at !== null;
  };

  // 統計情報
  const stats = {
    total: tickets.length,
    active: tickets.filter(
      t => !isTicketUsed(t) && !isTicketExpired(t.expires_at)
    ).length,
    used: tickets.filter(t => isTicketUsed(t)).length,
    expired: tickets.filter(
      t => !isTicketUsed(t) && isTicketExpired(t.expires_at)
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">配布総数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold brand-success">{stats.active}</p>
              <p className="text-sm text-muted-foreground">有効</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">
                {stats.used}
              </p>
              <p className="text-sm text-muted-foreground">使用済み</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold brand-error">{stats.expired}</p>
              <p className="text-sm text-muted-foreground">期限切れ</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* チケット配布フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            優先チケットを配布
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            配布したチケットは、あなたが主催する今後のどの撮影会でも使用できます
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ユーザー検索・選択 */}
          <div className="space-y-2">
            <Label>ユーザーを検索</Label>
            <div ref={searchContainerRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ユーザー名または@usernameで検索..."
                  className="pl-10"
                  onFocus={() => {
                    if (searchQuery.trim().length >= 2) {
                      setShowSearchResults(true);
                    }
                  }}
                />
              </div>

              {/* 検索結果ドロップダウン */}
              {showSearchResults && searchResults.length > 0 && (
                <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-2 space-y-1">
                      {searchResults.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedUser(user);
                            setSearchQuery(
                              user.display_name || user.username || ''
                            );
                            setShowSearchResults(false);
                          }}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {(user.display_name || user.username || 'U')
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.display_name || user.username}
                            </p>
                            {user.username && (
                              <p className="text-xs text-muted-foreground truncate">
                                @{user.username}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              )}

              {isSearching && (
                <p className="text-sm text-muted-foreground mt-2">検索中...</p>
              )}

              {searchQuery.trim().length >= 2 &&
                !isSearching &&
                searchResults.length === 0 &&
                showSearchResults && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ユーザーが見つかりませんでした
                  </p>
                )}
            </div>

            {/* 選択されたユーザー表示 */}
            {selectedUser && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                <UserProfileDisplay
                  user={{
                    id: selectedUser.id,
                    display_name: selectedUser.display_name,
                    avatar_url: selectedUser.avatar_url,
                    user_type: selectedUser.user_type,
                    is_verified: selectedUser.is_verified,
                  }}
                  size="sm"
                  showRole={true}
                  showVerified={true}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(null);
                    setSearchQuery('');
                  }}
                >
                  解除
                </Button>
              </div>
            )}
          </div>

          {/* 有効期限 */}
          <div className="space-y-2">
            <Label htmlFor="expires_at">有効期限</Label>
            <Input
              id="expires_at"
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              この期限までに、あなたが主催するどの撮影会でも使用できます
            </p>
          </div>

          {/* メモ */}
          <div className="space-y-2">
            <Label htmlFor="notes">メモ（任意）</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="チケットに関するメモを入力..."
              rows={3}
            />
          </div>

          {/* 配布ボタン */}
          <Button
            onClick={handleGrantTicket}
            disabled={!selectedUser || !expiresAt || isCreating}
            className="w-full"
            variant="cta"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {isCreating ? '配布中...' : 'チケットを配布'}
          </Button>
        </CardContent>
      </Card>

      {/* 配布済みチケット一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            配布済みチケット一覧 ({tickets.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              配布済みのチケットはありません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザー</TableHead>
                    <TableHead>有効期限</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>使用先撮影会</TableHead>
                    <TableHead>メモ</TableHead>
                    <TableHead>配布日時</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map(ticket => {
                    const expired = ticket.expires_at
                      ? isTicketExpired(ticket.expires_at)
                      : false;
                    const used = isTicketUsed(ticket);

                    return (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          {ticket.user ? (
                            <UserProfileDisplay
                              user={{
                                id: ticket.user_id,
                                display_name: ticket.user.display_name,
                                avatar_url: ticket.user.avatar_url,
                              }}
                              size="sm"
                              showRole={false}
                              showVerified={false}
                            />
                          ) : (
                            <span className="text-muted-foreground">
                              ユーザー情報なし
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {ticket.expires_at ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {formatDateLocalized(
                                  new Date(ticket.expires_at),
                                  locale,
                                  'short'
                                )}{' '}
                                {formatTimeLocalized(
                                  new Date(ticket.expires_at),
                                  locale
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              未設定
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {used ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <Badge variant="secondary">使用済み</Badge>
                              </>
                            ) : expired ? (
                              <>
                                <XCircle className="h-4 w-4 text-red-600" />
                                <Badge variant="destructive">期限切れ</Badge>
                              </>
                            ) : (
                              <Badge variant="outline">有効</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {ticket.photo_session_id && ticket.used_at ? (
                            <Link
                              href={`/${locale}/photo-sessions/${ticket.photo_session_id}`}
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              撮影会を表示
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              未使用
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {ticket.notes ? (
                            <p className="text-sm text-muted-foreground max-w-xs truncate">
                              {ticket.notes}
                            </p>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {ticket.created_at ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDateLocalized(
                                new Date(ticket.created_at),
                                locale,
                                'short'
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setShowDeleteDialog(ticket.id ?? null)
                            }
                            disabled={used}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <AlertDialog
        open={showDeleteDialog !== null}
        onOpenChange={() => setShowDeleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>チケットを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。チケットを削除すると、ユーザーは優先予約できなくなります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (showDeleteDialog) {
                  handleDeleteTicket(showDeleteDialog);
                }
              }}
            >
              削除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
