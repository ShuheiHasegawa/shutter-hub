'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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

interface PendingInvitationsListProps {
  invitations: OrganizerModelInvitationWithProfiles[];
  onDataChanged?: () => void;
  isLoading?: boolean;
}

export function PendingInvitationsList({
  invitations,
  isLoading = false,
}: PendingInvitationsListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300"
          >
            <Clock className="h-3 w-3 mr-1" />
            保留中
          </Badge>
        );
      case 'accepted':
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            承認済み
          </Badge>
        );
      case 'rejected':
        return (
          <Badge
            variant="destructive"
            className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300"
          >
            <XCircle className="h-3 w-3 mr-1" />
            拒否
          </Badge>
        );
      case 'expired':
        return (
          <Badge
            variant="outline"
            className="bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400"
          >
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
        <Mail className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          招待履歴がありません
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
              ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10'
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
                    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {invitation.invitation_message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 拒否理由 */}
                  {invitation.rejection_reason &&
                    invitation.status === 'rejected' && (
                      <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                              拒否理由
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {invitation.rejection_reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* タイムライン */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        招待送信: {formatDateTime(invitation.invited_at)}
                      </span>
                    </div>

                    {invitation.responded_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          回答: {formatDateTime(invitation.responded_at)}
                        </span>
                      </div>
                    )}

                    {invitation.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span
                          className={`text-gray-600 dark:text-gray-400 ${
                            isExpiring(invitation.expires_at)
                              ? 'text-yellow-600 dark:text-yellow-400 font-medium'
                              : ''
                          }`}
                        >
                          期限: {formatDate(invitation.expires_at)}
                          {isExpiring(invitation.expires_at) && (
                            <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                              (まもなく期限切れ)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
