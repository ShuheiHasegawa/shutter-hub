'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  getAdminLotteryEntries,
  selectAdminLotteryWinners,
  undoAdminLotterySelection,
  updateAdminLotterySessionStatus,
} from '@/app/actions/admin-lottery';
import {
  Crown,
  Users,
  MessageSquare,
  XCircle,
  Undo,
  Filter,
  Search,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AdminLotteryEntry {
  id: string;
  admin_lottery_session_id: string;
  user_id: string;
  application_message: string | null;
  status: 'applied' | 'selected' | 'rejected';
  selected_at: string | null;
  selected_by: string | null;
  selection_reason: string | null;
  created_at: string;
  user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    email: string;
  };
}

interface AdminLotterySession {
  id: string;
  photo_session_id: string;
  entry_start_time: string;
  entry_end_time: string;
  selection_deadline: string;
  max_winners: number;
  status: 'upcoming' | 'accepting' | 'selecting' | 'completed';
  selection_criteria: Record<string, unknown>;
}

interface AdminLotteryManagementProps {
  session: AdminLotterySession;
  onStatusUpdate?: () => void;
}

type SortField = 'created_at' | 'display_name' | 'status';
type SortOrder = 'asc' | 'desc';

export function AdminLotteryManagement({
  session,
  onStatusUpdate,
}: AdminLotteryManagementProps) {
  const { toast } = useToast();
  const t = useTranslations('adminLotteryManagement');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const dateLocale = locale === 'ja' ? ja : enUS;

  const [entries, setEntries] = useState<AdminLotteryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<AdminLotteryEntry[]>(
    []
  );
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionReason, setSelectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // エントリー一覧を取得
  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const result = await getAdminLotteryEntries(session.id);

      if (result.error) {
        toast({
          title: tErrors('title'),
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      setEntries(result.data || []);
    } catch (error) {
      console.error('エントリー取得エラー:', error);
      toast({
        title: tErrors('title'),
        description: tErrors('unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [session.id]);

  // フィルタリングとソート
  useEffect(() => {
    let filtered = entries;

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(
        entry =>
          entry.user.display_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          entry.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (entry.application_message &&
            entry.application_message
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
    }

    // ステータスフィルター
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry => entry.status === statusFilter);
    }

    // ソート
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'display_name':
          aValue = a.user.display_name;
          bValue = b.user.display_name;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    setFilteredEntries(filtered);
  }, [entries, searchTerm, statusFilter, sortField, sortOrder]);

  // 当選者選出
  const handleSelectWinners = async () => {
    if (selectedEntries.length === 0) {
      toast({
        title: t('noEntriesSelected'),
        description: t('pleaseSelectEntries'),
        variant: 'destructive',
      });
      return;
    }

    const currentWinners = entries.filter(
      entry => entry.status === 'selected'
    ).length;
    if (currentWinners + selectedEntries.length > session.max_winners) {
      toast({
        title: t('exceedsMaxWinners'),
        description: t('exceedsMaxWinnersDescription', {
          max: session.max_winners,
          current: currentWinners,
          selected: selectedEntries.length,
        }),
        variant: 'destructive',
      });
      return;
    }

    setIsSelecting(true);

    try {
      const result = await selectAdminLotteryWinners({
        session_id: session.id,
        entry_ids: selectedEntries,
        selection_reason: selectionReason.trim() || undefined,
      });

      if (result.error) {
        toast({
          title: tErrors('title'),
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: tCommon('success'),
        description: t('winnersSelected', {
          count: result.data?.selected_count || 0,
        }),
      });

      setSelectedEntries([]);
      setSelectionReason('');
      await fetchEntries();
    } catch (error) {
      console.error('当選者選出エラー:', error);
      toast({
        title: tErrors('title'),
        description: tErrors('unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsSelecting(false);
    }
  };

  // 選出取り消し
  const handleUndoSelection = async (entryIds: string[]) => {
    try {
      const result = await undoAdminLotterySelection({
        session_id: session.id,
        entry_ids: entryIds,
        selection_reason: t('selectionUndone'),
      });

      if (result.error) {
        toast({
          title: tErrors('title'),
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: tCommon('success'),
        description: t('selectionUndone'),
      });

      await fetchEntries();
    } catch (error) {
      console.error('選出取り消しエラー:', error);
      toast({
        title: tErrors('title'),
        description: tErrors('unexpectedError'),
        variant: 'destructive',
      });
    }
  };

  // ステータス更新
  const handleStatusUpdate = async (
    newStatus: AdminLotterySession['status']
  ) => {
    try {
      const result = await updateAdminLotterySessionStatus(
        session.id,
        newStatus
      );

      if (result.error) {
        toast({
          title: tErrors('title'),
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: tCommon('success'),
        description: t('statusUpdated'),
      });

      onStatusUpdate?.();
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      toast({
        title: tErrors('title'),
        description: tErrors('unexpectedError'),
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: AdminLotteryEntry['status']) => {
    switch (status) {
      case 'applied':
        return (
          <Badge variant="default" className="gap-1">
            <Users className="h-3 w-3" />
            {t('status.applied')}
          </Badge>
        );
      case 'selected':
        return (
          <Badge
            variant="default"
            className="gap-1 bg-yellow-500 hover:bg-yellow-600"
          >
            <Crown className="h-3 w-3" />
            {t('status.selected')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t('status.rejected')}
          </Badge>
        );
    }
  };

  const selectedCount = entries.filter(
    entry => entry.status === 'selected'
  ).length;
  const appliedEntries = filteredEntries.filter(
    entry => entry.status === 'applied'
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            {t('selectionOverview')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {entries.length}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('totalApplications')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {selectedCount}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('selectedWinners')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {session.max_winners}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('maxWinners')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {session.max_winners - selectedCount}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('remainingSlots')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* フィルターとソート */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filterAndSort')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('search')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('statusFilter')}
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="applied">{t('status.applied')}</SelectItem>
                  <SelectItem value="selected">
                    {t('status.selected')}
                  </SelectItem>
                  <SelectItem value="rejected">
                    {t('status.rejected')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('sortBy')}
              </label>
              <div className="flex gap-2">
                <Select
                  value={sortField}
                  onValueChange={(value: SortField) => setSortField(value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">
                      {t('applicationDate')}
                    </SelectItem>
                    <SelectItem value="display_name">
                      {t('userName')}
                    </SelectItem>
                    <SelectItem value="status">{t('status.title')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                  }
                >
                  {sortOrder === 'asc' ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <SortDesc className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 一括選出操作 */}
      {appliedEntries.length > 0 && selectedCount < session.max_winners && (
        <Card>
          <CardHeader>
            <CardTitle>{t('bulkSelection')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('selectionReason')} ({t('optional')})
              </label>
              <Textarea
                value={selectionReason}
                onChange={e => setSelectionReason(e.target.value)}
                placeholder={t('selectionReasonPlaceholder')}
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {selectionReason.length}/500
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    disabled={selectedEntries.length === 0 || isSelecting}
                    className="gap-2"
                  >
                    <Crown className="h-4 w-4" />
                    {t('selectWinners')} ({selectedEntries.length})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('confirmSelection')}</DialogTitle>
                    <DialogDescription>
                      {t('confirmSelectionDescription', {
                        count: selectedEntries.length,
                      })}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedEntries([])}
                    >
                      {tCommon('cancel')}
                    </Button>
                    <Button
                      onClick={handleSelectWinners}
                      disabled={isSelecting}
                    >
                      {isSelecting ? t('selecting') : t('confirm')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                onClick={() => setSelectedEntries([])}
                disabled={selectedEntries.length === 0}
              >
                {t('clearSelection')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 応募者一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('applicantsList')} ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noApplicants')}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map(entry => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {entry.status === 'applied' &&
                        selectedCount < session.max_winners && (
                          <Checkbox
                            checked={selectedEntries.includes(entry.id)}
                            onCheckedChange={checked => {
                              if (checked) {
                                setSelectedEntries([
                                  ...selectedEntries,
                                  entry.id,
                                ]);
                              } else {
                                setSelectedEntries(
                                  selectedEntries.filter(id => id !== entry.id)
                                );
                              }
                            }}
                          />
                        )}
                      <Avatar>
                        <AvatarImage src={entry.user.avatar_url || undefined} />
                        <AvatarFallback>
                          {entry.user.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {entry.user.display_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('appliedAt')}:{' '}
                          {format(new Date(entry.created_at), 'PPP HH:mm', {
                            locale: dateLocale,
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(entry.status)}
                      {entry.status === 'selected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUndoSelection([entry.id])}
                          className="gap-1"
                        >
                          <Undo className="h-3 w-3" />
                          {t('undoSelection')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {entry.application_message && (
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {t('applicationMessage')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {entry.application_message}
                      </p>
                    </div>
                  )}

                  {entry.selection_reason && (
                    <div className="bg-yellow-50 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                          {t('selectionReason')}
                        </span>
                      </div>
                      <p className="text-sm text-yellow-700 whitespace-pre-wrap">
                        {entry.selection_reason}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ステータス管理 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sessionStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={session.status === 'accepting' ? 'default' : 'outline'}
              onClick={() => handleStatusUpdate('accepting')}
              disabled={session.status === 'accepting'}
            >
              {t('startAccepting')}
            </Button>
            <Button
              variant={session.status === 'selecting' ? 'default' : 'outline'}
              onClick={() => handleStatusUpdate('selecting')}
              disabled={session.status === 'selecting'}
            >
              {t('startSelecting')}
            </Button>
            <Button
              variant={session.status === 'completed' ? 'default' : 'outline'}
              onClick={() => handleStatusUpdate('completed')}
              disabled={session.status === 'completed'}
            >
              {t('completeSelection')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
