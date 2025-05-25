'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createPhotoSessionBooking } from '@/app/actions/photo-session-booking';
import { canJoinPhotoSession } from '@/lib/photo-sessions';
import type { PhotoSessionWithOrganizer } from '@/types/database';
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  CircleDollarSignIcon,
  UserIcon,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils/date';

interface PhotoSessionBookingFormProps {
  session: PhotoSessionWithOrganizer;
  onBookingSuccess?: () => void;
  onBookingError?: (error: string) => void;
}

export function PhotoSessionBookingForm({
  session,
  onBookingSuccess,
  onBookingError,
}: PhotoSessionBookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [canJoin, setCanJoin] = useState<{
    canJoin: boolean;
    reason: string | null;
  } | null>(null);

  // 参加可能性をチェック
  const checkCanJoin = async () => {
    if (!user) return;

    const result = await canJoinPhotoSession(session.id, user.id);
    setCanJoin(result);
  };

  // 初回チェック
  useState(() => {
    if (user) {
      checkCanJoin();
    }
  });

  const handleBooking = async () => {
    if (!user) {
      toast({
        title: 'ログインが必要です',
        description: '予約するにはログインしてください。',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createPhotoSessionBooking(session.id, user.id);

      if (result.success) {
        toast({
          title: '予約完了！',
          description: '撮影会の予約が完了しました。',
        });

        if (onBookingSuccess) {
          onBookingSuccess();
        }
      } else {
        const errorMessage = result.error || '予約に失敗しました。';
        toast({
          title: '予約失敗',
          description: errorMessage,
          variant: 'destructive',
        });

        if (onBookingError) {
          onBookingError(errorMessage);
        }
      }
    } catch (error) {
      console.error('予約エラー:', error);
      const errorMessage = '予期しないエラーが発生しました。';
      toast({
        title: 'エラー',
        description: errorMessage,
        variant: 'destructive',
      });

      if (onBookingError) {
        onBookingError(errorMessage);
      }
    } finally {
      setIsLoading(false);
      // 予約後に参加可能性を再チェック
      await checkCanJoin();
    }
  };

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);
  const now = new Date();
  const isUpcoming = startDate > now;
  const isOngoing = startDate <= now && endDate > now;
  const isPast = endDate <= now;

  const getStatusBadge = () => {
    if (isPast) {
      return <Badge variant="secondary">終了</Badge>;
    }
    if (isOngoing) {
      return <Badge variant="default">開催中</Badge>;
    }
    if (isUpcoming) {
      return <Badge variant="outline">予定</Badge>;
    }
    return null;
  };

  const getAvailabilityBadge = () => {
    const available = session.max_participants - session.current_participants;
    if (available <= 0) {
      return <Badge variant="destructive">満員</Badge>;
    }
    if (available <= 2) {
      return <Badge variant="secondary">残りわずか</Badge>;
    }
    return <Badge variant="outline">空きあり</Badge>;
  };

  const canBookNow = canJoin?.canJoin && isUpcoming && session.is_published;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{session.title}</CardTitle>
          <div className="flex gap-2">
            {getStatusBadge()}
            {!session.is_published && <Badge variant="outline">非公開</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserIcon className="h-4 w-4" />
          <span>
            主催者: {session.organizer.display_name || session.organizer.email}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {session.description && (
          <p className="text-muted-foreground">{session.description}</p>
        )}

        {/* 撮影会詳細情報 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div>{formatDate(startDate, 'long')}</div>
              <div className="text-muted-foreground">
                {formatTime(startDate)} - {formatTime(endDate)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div>{session.location}</div>
              {session.address && (
                <div className="text-muted-foreground">{session.address}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span>
                {session.current_participants}/{session.max_participants}人
              </span>
              {getAvailabilityBadge()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CircleDollarSignIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {session.price_per_person === 0
                ? '無料'
                : `¥${session.price_per_person.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* 予約ボタンエリア */}
        <div className="border-t pt-4">
          {!user ? (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                予約するにはログインが必要です
              </p>
              <Button variant="outline" disabled>
                ログインしてください
              </Button>
            </div>
          ) : !canJoin ? (
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : canBookNow ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                この撮影会に参加しますか？
              </p>
              <Button
                onClick={handleBooking}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    予約中...
                  </>
                ) : (
                  '予約する'
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">{canJoin.reason}</p>
              <Button variant="outline" disabled>
                予約できません
              </Button>
            </div>
          )}
        </div>

        {/* 注意事項 */}
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
          <p>• 予約は先着順です</p>
          <p>• キャンセルは開始時刻の24時間前まで可能です</p>
          <p>• 当日のキャンセルはキャンセル料が発生する場合があります</p>
        </div>
      </CardContent>
    </Card>
  );
}
