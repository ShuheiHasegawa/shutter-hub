'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { OrganizerModelInvitationWithProfiles } from '@/types/organizer-model';
import { cancelModelInvitationAction } from '@/app/actions/organizer-model';
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useState } from 'react';
import { FormattedDateTime } from '@/components/ui/formatted-display';

interface PendingInvitationsListProps {
  invitations: OrganizerModelInvitationWithProfiles[];
  onDataChanged?: () => void;
  isLoading?: boolean;
}

export function PendingInvitationsList({
  invitations,
  isLoading = false,
  onDataChanged,
}: PendingInvitationsListProps) {
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );

  const handleCancelInvitation = async (invitationId: string) => {
    setActionLoading(prev => ({ ...prev, [invitationId]: true }));

    try {
      const result = await cancelModelInvitationAction(invitationId);

      if (result.success) {
        toast({
          title: '招待を取り消しました',
          description:
            'モデルへの招待が正常に取り消されました。新しく招待を送信できます。',
        });

        // データ更新
        onDataChanged?.();
      } else {
        toast({
          title: 'エラーが発生しました',
          description: result.error || '招待の取り消しに失敗しました。',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'エラーが発生しました',
        description: '招待の取り消しに失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [invitationId]: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-warning/10 text-warning border-warning/30">
            <Clock className="h-3 w-3 mr-1" />
            保留中
          </Badge>
        );
      case 'accepted':
        return (
          <Badge className="bg-success/10 text-success border-success/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            承認済み
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-error/10 text-error border-error/30">
            <XCircle className="h-3 w-3 mr-1" />
            拒否
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            期限切れ
          </Badge>
        );
      default:
        return null;
    }
  };

  const isExpiring = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const hoursUntilExpiry =
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // 既存データがある場合はスケルトンローディングを表示しない（チカチカ防止）
  if (isLoading && invitations.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="招待履歴がありません"
        description="「新規招待」タブからモデルを招待してみましょう"
        wrapped={false}
      />
    );
  }

  return (
    <div className="space-y-4">
      {invitations.map(invitation => (
        <Card
          key={invitation.id}
          className={`hover:shadow-md transition-shadow ${
            invitation.status === 'pending' && isExpiring(invitation.expires_at)
              ? 'border-warning/30 bg-warning/10'
              : ''
          }`}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              {/* 招待情報 */}
              <div className="flex items-start space-x-4 flex-1">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={invitation.model_profile?.avatar_url}
                    alt={invitation.model_profile?.display_name}
                  />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                      {invitation.model_profile?.display_name || 'Unknown'}
                    </h3>
                    {getStatusBadge(invitation.status)}
                  </div>

                  {/* 招待メッセージ */}
                  {invitation.invitation_message && (
                    <div className="mb-3 p-3 bg-info/10 border border-info/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-info">
                          {invitation.invitation_message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 拒否理由 */}
                  {invitation.rejection_reason &&
                    invitation.status === 'rejected' && (
                      <div className="mb-3 p-3 bg-error/10 border border-error/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-error mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-error mb-1">
                              拒否理由
                            </p>
                            <p className="text-sm text-error">
                              {invitation.rejection_reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* タイムライン */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        招待送信:{' '}
                        <FormattedDateTime
                          value={
                            new Date(
                              invitation.invited_at || invitation.created_at
                            )
                          }
                          format="datetime-short"
                        />
                      </span>
                    </div>

                    {invitation.responded_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          回答:{' '}
                          <FormattedDateTime
                            value={new Date(invitation.responded_at)}
                            format="datetime-short"
                          />
                        </span>
                      </div>
                    )}

                    {(invitation.status === 'pending' ||
                      invitation.status === 'expired') && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span
                          className={`text-muted-foreground ${
                            invitation.status === 'expired' ||
                            isExpired(invitation.expires_at)
                              ? 'text-error font-medium'
                              : isExpiring(invitation.expires_at)
                                ? 'text-warning font-medium'
                                : ''
                          }`}
                        >
                          期限:{' '}
                          <FormattedDateTime
                            value={new Date(invitation.expires_at)}
                            format="date-short"
                          />
                          {invitation.status === 'expired' ||
                          isExpired(invitation.expires_at) ? (
                            <span className="ml-1 text-error">(期限切れ)</span>
                          ) : isExpiring(invitation.expires_at) ? (
                            <span className="ml-1 text-warning">
                              (まもなく期限切れ)
                            </span>
                          ) : null}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              {invitation.status === 'pending' &&
                !isExpired(invitation.expires_at) && (
                  <div className="flex gap-2 mt-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={actionLoading[invitation.id]}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {actionLoading[invitation.id]
                            ? '取消中...'
                            : '招待を取り消し'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            招待を取り消しますか？
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {invitation.model_profile?.display_name ||
                              'このモデル'}
                            への招待を取り消します。
                            <br />
                            この操作は元に戻すことができません。
                            <br />
                            必要に応じて、後で新しい招待を送信できます。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleCancelInvitation(invitation.id)
                            }
                            className="bg-error text-error-foreground hover:bg-error/90"
                          >
                            招待を取り消し
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
