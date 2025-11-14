'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
          <Badge variant="secondary" className="brand-warning">
            <Clock className="h-3 w-3 mr-1" />
            保留中
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="secondary" className="brand-success">
            <CheckCircle className="h-3 w-3 mr-1" />
            承認済み
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="secondary" className="brand-error">
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
      <div className="text-center py-12">
        <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium text-foreground">
          招待履歴がありません
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          「新規招待」タブからモデルを招待してみましょう
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invitations.map(invitation => (
        <Card
          key={invitation.id}
          className={`hover:shadow-md transition-shadow ${
            invitation.status === 'pending' && isExpiring(invitation.expires_at)
              ? 'border-brand-warning bg-brand-warning/10'
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
                    <div className="mb-3 p-3 bg-brand-info/10 border border-brand-info/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 brand-info mt-0.5 flex-shrink-0" />
                        <p className="text-sm brand-info">
                          {invitation.invitation_message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 拒否理由 */}
                  {invitation.rejection_reason &&
                    invitation.status === 'rejected' && (
                      <div className="mb-3 p-3 bg-brand-error/10 border border-brand-error/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 brand-error mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium brand-error mb-1">
                              拒否理由
                            </p>
                            <p className="text-sm brand-error">
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

                    {invitation.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span
                          className={`text-muted-foreground ${
                            isExpiring(invitation.expires_at)
                              ? 'brand-warning font-medium'
                              : ''
                          }`}
                        >
                          期限:{' '}
                          <FormattedDateTime
                            value={new Date(invitation.expires_at)}
                            format="date-short"
                          />
                          {isExpiring(invitation.expires_at) && (
                            <span className="ml-1 brand-warning">
                              (まもなく期限切れ)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              {invitation.status === 'pending' && (
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
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="brand-error"
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
