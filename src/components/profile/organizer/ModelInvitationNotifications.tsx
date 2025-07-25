'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import {
  getModelInvitationsAction,
  acceptModelInvitationAction,
  rejectModelInvitationAction,
} from '@/app/actions/organizer-model';
import type { OrganizerModelInvitationWithProfiles } from '@/types/organizer-model';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ModelInvitationNotificationsProps {
  className?: string;
}

export function ModelInvitationNotifications({
  className,
}: ModelInvitationNotificationsProps) {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<
    OrganizerModelInvitationWithProfiles[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);

  // 招待一覧を読み込み
  const loadInvitations = async () => {
    logger.info('ModelInvitationNotifications: 招待読み込み開始');
    setIsLoading(true);
    try {
      const result = await getModelInvitationsAction();
      logger.info('ModelInvitationNotifications: 招待読み込み結果', {
        result,
        success: result.success,
        error: result.error,
        data: result.data,
        dataLength: Array.isArray(result.data) ? result.data.length : 0,
      });

      if (result.success) {
        if (Array.isArray(result.data)) {
          setInvitations(result.data);
          logger.info('ModelInvitationNotifications: 招待設定完了', {
            count: result.data.length,
            invitations: result.data,
          });
        } else {
          logger.warn('ModelInvitationNotifications: データが配列ではない', {
            data: result.data,
            type: typeof result.data,
          });
          setInvitations([]);
        }
      } else {
        logger.warn('ModelInvitationNotifications: 招待取得失敗', {
          error: result.error,
        });
        setInvitations([]);
      }
    } catch (error) {
      logger.error('ModelInvitationNotifications: 招待読み込みエラー', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      setInvitations([]);
    } finally {
      setIsLoading(false);
      logger.info('ModelInvitationNotifications: 読み込み完了');
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  // 日付フォーマット
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 期限切れ判定
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

  // 招待を受諾
  const handleAccept = async (invitationId: string) => {
    setActionLoading(prev => ({ ...prev, [invitationId]: true }));

    try {
      const result = await acceptModelInvitationAction(invitationId);

      if (result.success) {
        toast({
          title: '招待を受諾しました',
          description: '運営者との所属関係が確立されました。',
        });
        loadInvitations(); // リロード
      } else {
        toast({
          title: 'エラーが発生しました',
          description: result.error || '招待の受諾に失敗しました。',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'エラーが発生しました',
        description: '招待の受諾に失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [invitationId]: false }));
    }
  };

  // 招待を拒否
  const handleReject = async (invitationId: string) => {
    setActionLoading(prev => ({ ...prev, [invitationId]: true }));

    try {
      const result = await rejectModelInvitationAction(
        invitationId,
        rejectionReason.trim() || undefined
      );

      if (result.success) {
        toast({
          title: '招待を拒否しました',
          description: '拒否理由が運営者に送信されました。',
        });
        setShowRejectDialog(null);
        setRejectionReason('');
        loadInvitations(); // リロード
      } else {
        toast({
          title: 'エラーが発生しました',
          description: result.error || '招待の拒否に失敗しました。',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'エラーが発生しました',
        description: '招待の拒否に失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [invitationId]: false }));
    }
  };

  // ステータスバッジ
  const getStatusBadge = (status: string, expiresAt: string) => {
    if (status === 'pending' && isExpired(expiresAt)) {
      return (
        <Badge
          variant="outline"
          className="bg-gray-100 text-gray-600 border-gray-300"
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          期限切れ
        </Badge>
      );
    }

    switch (status) {
      case 'pending':
        return (
          <Badge
            variant="secondary"
            className={`${
              isExpiring(expiresAt)
                ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                : 'bg-blue-100 text-blue-800 border-blue-300'
            }`}
          >
            <Clock className="h-3 w-3 mr-1" />
            保留中
          </Badge>
        );
      case 'accepted':
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 border-green-300"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            承認済み
          </Badge>
        );
      case 'rejected':
        return (
          <Badge
            variant="destructive"
            className="bg-red-100 text-red-800 border-red-300"
          >
            <XCircle className="h-3 w-3 mr-1" />
            拒否済み
          </Badge>
        );
      default:
        return null;
    }
  };

  // 保留中の招待数
  const pendingInvitations = invitations.filter(
    inv => inv.status === 'pending' && !isExpired(inv.expires_at)
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            運営招待
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 招待がない場合は非表示
  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            運営招待
          </div>
          {pendingInvitations.length > 0 && (
            <Badge variant="destructive">{pendingInvitations.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invitations.map(invitation => (
            <Card
              key={invitation.id}
              className={`${
                invitation.status === 'pending' &&
                isExpiring(invitation.expires_at)
                  ? 'border-yellow-300 bg-yellow-50'
                  : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={invitation.organizer?.avatar_url}
                      alt={invitation.organizer?.display_name}
                    />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-medium truncate">
                        {invitation.organizer?.display_name || 'Unknown'}
                      </h3>
                      {getStatusBadge(invitation.status, invitation.expires_at)}
                    </div>

                    {/* 招待メッセージ */}
                    {invitation.invitation_message && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-700 mb-1">
                              招待メッセージ
                            </p>
                            <p className="text-sm text-blue-600">
                              {invitation.invitation_message}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* タイムライン */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          招待送信: {formatDateTime(invitation.created_at)}
                        </span>
                      </div>

                      {invitation.status === 'pending' &&
                        !isExpired(invitation.expires_at) && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span
                              className={` ${
                                isExpiring(invitation.expires_at)
                                  ? 'text-yellow-600 font-medium'
                                  : ''
                              }`}
                            >
                              期限: {formatDate(invitation.expires_at)}
                              {isExpiring(invitation.expires_at) && (
                                <span className="ml-1 text-yellow-600">
                                  (まもなく期限切れ)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                    </div>

                    {/* アクションボタン */}
                    {invitation.status === 'pending' &&
                      !isExpired(invitation.expires_at) && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => handleAccept(invitation.id)}
                            disabled={actionLoading[invitation.id]}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {actionLoading[invitation.id]
                              ? '承諾中...'
                              : '承諾'}
                          </Button>

                          <Dialog
                            open={showRejectDialog === invitation.id}
                            onOpenChange={open => {
                              if (!open) {
                                setShowRejectDialog(null);
                                setRejectionReason('');
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setShowRejectDialog(invitation.id)
                                }
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                拒否
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>招待を拒否しますか？</DialogTitle>
                                <DialogDescription>
                                  {invitation.organizer?.display_name}
                                  からの招待を拒否します。
                                  任意で拒否理由を入力できます。
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <Label htmlFor="rejection-reason">
                                    拒否理由（任意）
                                  </Label>
                                  <Textarea
                                    id="rejection-reason"
                                    placeholder="拒否理由があれば入力してください..."
                                    value={rejectionReason}
                                    onChange={e =>
                                      setRejectionReason(e.target.value)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowRejectDialog(null);
                                    setRejectionReason('');
                                  }}
                                >
                                  キャンセル
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleReject(invitation.id)}
                                  disabled={actionLoading[invitation.id]}
                                >
                                  {actionLoading[invitation.id]
                                    ? '拒否中...'
                                    : '拒否する'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
