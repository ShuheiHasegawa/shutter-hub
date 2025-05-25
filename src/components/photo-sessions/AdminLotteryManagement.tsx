'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  getAdminLotteryEntries,
  getAdminLotteryStats,
  selectAdminLotteryWinners,
  updateAdminLotteryPhotoSessionStatus,
} from '@/app/actions/photo-session-admin-lottery';
import type {
  AdminLotteryEntryWithUser,
  AdminLotteryStats,
} from '@/types/database';
import {
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrophyIcon,
  UsersIcon,
  StarIcon,
} from 'lucide-react';
import { formatDateLocalized } from '@/lib/utils/date';
import { useTranslations, useLocale } from 'next-intl';

interface AdminLotteryManagementProps {
  adminLotterySessionId: string;
  organizerId: string;
  winnersCount: number;
  status: 'upcoming' | 'accepting' | 'selecting' | 'completed';
  onSelectionComplete?: () => void;
}

export function AdminLotteryManagement({
  adminLotterySessionId,
  organizerId,
  winnersCount,
  status,
  onSelectionComplete,
}: AdminLotteryManagementProps) {
  const { toast } = useToast();
  const t = useTranslations('adminLottery');
  const tErrors = useTranslations('errors');
  const tSuccess = useTranslations('success');
  const locale = useLocale();

  const [entries, setEntries] = useState<AdminLotteryEntryWithUser[]>([]);
  const [stats, setStats] = useState<AdminLotteryStats | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectionNotes, setSelectionNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    loadData();
  }, [adminLotterySessionId]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      // 応募者一覧を取得
      const entriesResult = await getAdminLotteryEntries(adminLotterySessionId);
      if (entriesResult.success && entriesResult.data) {
        setEntries(entriesResult.data);
      }

      // 統計情報を取得
      const statsResult = await getAdminLotteryStats(adminLotterySessionId);
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleUserSelection = (userId: string, selected: boolean) => {
    if (selected) {
      if (selectedUserIds.length < winnersCount) {
        setSelectedUserIds(prev => [...prev, userId]);
      } else {
        toast({
          title: t('selectionLimitReached'),
          description: t('selectionLimitDescription', { count: winnersCount }),
          variant: 'destructive',
        });
      }
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleStartSelection = async () => {
    try {
      const result = await updateAdminLotteryPhotoSessionStatus(
        adminLotterySessionId,
        'selecting'
      );

      if (result.success) {
        toast({
          title: tSuccess('selectionStarted'),
          description: tSuccess('selectionStartedDescription'),
        });
        await loadData();
      } else {
        toast({
          title: tErrors('title'),
          description: result.error || tErrors('unexpectedError'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('選出開始エラー:', error);
      toast({
        title: tErrors('title'),
        description: tErrors('unexpectedError'),
        variant: 'destructive',
      });
    }
  };

  const handleCompleteSelection = async () => {
    if (selectedUserIds.length === 0) {
      toast({
        title: t('noSelectionMade'),
        description: t('noSelectionMadeDescription'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await selectAdminLotteryWinners(
        adminLotterySessionId,
        selectedUserIds,
        organizerId,
        selectionNotes.trim() || undefined
      );

      if (result.success) {
        toast({
          title: tSuccess('selectionCompleted'),
          description: tSuccess('selectionCompletedDescription', {
            count: result.data?.winners_count || 0,
          }),
        });

        await loadData();
        setSelectedUserIds([]);
        setSelectionNotes('');

        if (onSelectionComplete) {
          onSelectionComplete();
        }
      } else {
        toast({
          title: tErrors('title'),
          description: result.error || tErrors('selectionFailed'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('選出完了エラー:', error);
      toast({
        title: tErrors('title'),
        description: tErrors('unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEntryStatusBadge = (entryStatus: string) => {
    switch (entryStatus) {
      case 'applied':
        return <Badge variant="outline">{t('entryStatus.applied')}</Badge>;
      case 'selected':
        return (
          <Badge variant="default" className="bg-green-500">
            {t('entryStatus.selected')}
          </Badge>
        );
      case 'rejected':
        return <Badge variant="secondary">{t('entryStatus.rejected')}</Badge>;
      default:
        return null;
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'model':
        return <UserIcon className="h-4 w-4" />;
      case 'photographer':
        return <StarIcon className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  if (isLoadingData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計情報 */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              {t('applicationStats')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total_entries}
                </div>
                <div className="text-muted-foreground">{t('totalEntries')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.selected_count}
                </div>
                <div className="text-muted-foreground">
                  {t('selectedCount')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.first_time_participants}
                </div>
                <div className="text-muted-foreground">
                  {t('firstTimeParticipants')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.repeat_participants}
                </div>
                <div className="text-muted-foreground">
                  {t('repeatParticipants')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 選出コントロール */}
      {status === 'accepting' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('startSelection')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {t('startSelectionDescription')}
            </p>
            <Button onClick={handleStartSelection}>
              {t('startSelectionButton')}
            </Button>
          </CardContent>
        </Card>
      )}

      {status === 'selecting' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrophyIcon className="h-5 w-5" />
              {t('selectionControl')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('selectedCount')}: {selectedUserIds.length} / {winnersCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserIds([])}
                disabled={selectedUserIds.length === 0}
              >
                {t('clearSelection')}
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('selectionNotes')} ({t('optional')})
              </label>
              <Textarea
                value={selectionNotes}
                onChange={e => setSelectionNotes(e.target.value)}
                placeholder={t('selectionNotesPlaceholder')}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {selectionNotes.length}/500
              </p>
            </div>

            <Button
              onClick={handleCompleteSelection}
              disabled={isLoading || selectedUserIds.length === 0}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('selectionInProgress')}
                </>
              ) : (
                t('completeSelection')
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 応募者一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            {t('applicantsList')} ({entries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('noApplicants')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map(entry => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {status === 'selecting' && entry.status === 'applied' && (
                        <Checkbox
                          checked={selectedUserIds.includes(entry.user_id)}
                          onCheckedChange={(checked: boolean) =>
                            handleUserSelection(entry.user_id, checked)
                          }
                          disabled={
                            !selectedUserIds.includes(entry.user_id) &&
                            selectedUserIds.length >= winnersCount
                          }
                        />
                      )}

                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.user.avatar_url || undefined} />
                        <AvatarFallback>
                          {entry.user.display_name?.[0] ||
                            entry.user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {entry.user.display_name || entry.user.email}
                          </span>
                          {getUserTypeIcon(entry.user.user_type)}
                          <Badge variant="outline" className="text-xs">
                            {entry.user.user_type}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateLocalized(
                            new Date(entry.created_at),
                            locale
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getEntryStatusBadge(entry.status)}
                      {entry.status === 'selected' && (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      )}
                      {entry.status === 'rejected' && (
                        <XCircleIcon className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>

                  {entry.user.bio && (
                    <div className="text-sm">
                      <span className="font-medium">{t('userBio')}:</span>
                      <p className="text-muted-foreground mt-1">
                        {entry.user.bio}
                      </p>
                    </div>
                  )}

                  {entry.application_message && (
                    <div className="text-sm">
                      <span className="font-medium">
                        {t('applicationMessage')}:
                      </span>
                      <p className="text-muted-foreground mt-1 bg-muted p-2 rounded">
                        {entry.application_message}
                      </p>
                    </div>
                  )}

                  {entry.selected_at && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      {t('selectedAt')}:{' '}
                      {formatDateLocalized(
                        new Date(entry.selected_at),
                        locale,
                        'long'
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
