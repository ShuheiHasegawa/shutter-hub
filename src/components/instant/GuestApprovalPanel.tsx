'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Camera,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Star,
  User,
} from 'lucide-react';
import {
  approvePhotographer,
  rejectPhotographer,
  checkPhotographerTimeout,
  getInstantPhotoRequest,
} from '@/app/actions/instant-photo';
import { FormattedPrice } from '@/components/ui/formatted-display';
import type { InstantPhotoRequest } from '@/types/instant-photo';

interface GuestApprovalPanelProps {
  request: InstantPhotoRequest;
  photographer?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
    average_rating?: number;
    bio?: string;
  };
  onApproved?: () => void;
  onRejected?: () => void;
}

export function GuestApprovalPanel({
  request,
  photographer,
  onApproved,
  onRejected,
}: GuestApprovalPanelProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // タイムアウトまでの残り時間を計算
  useEffect(() => {
    if (!request.photographer_timeout_at) return;

    const updateTimeRemaining = () => {
      const timeoutAt = new Date(request.photographer_timeout_at!);
      const now = new Date();
      const diff = timeoutAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining(0);
        // タイムアウト処理を実行
        handleTimeout();
      } else {
        setTimeRemaining(Math.floor(diff / 1000)); // 秒単位
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [request.photographer_timeout_at]);

  // タイムアウト処理
  const handleTimeout = async () => {
    try {
      await checkPhotographerTimeout(request.id);
      // リクエストを再取得して最新状態を反映
      const result = await getInstantPhotoRequest(request.id);
      if (result.success && result.data) {
        // 親コンポーネントに通知（必要に応じて）
        if (onRejected) {
          onRejected();
        }
      }
    } catch (error) {
      logger.error('タイムアウト処理エラー:', error);
    }
  };

  // フォトグラファーを承認
  const handleApprove = async () => {
    if (!request.pending_photographer_id) return;

    setIsApproving(true);
    setError(null);

    try {
      const result = await approvePhotographer(
        request.id,
        request.pending_photographer_id
      );

      if (result.success) {
        logger.info('フォトグラファー承認成功');
        if (onApproved) {
          onApproved();
        }
        // 決済ページに遷移（booking IDを使用）
        const bookingId = result.data?.bookingId;
        if (bookingId) {
          window.location.href = `/instant/payment/${bookingId}`;
        } else {
          // booking IDが取得できない場合は、リクエスト詳細ページをリロード
          window.location.reload();
        }
      } else {
        setError(result.error || '承認処理に失敗しました');
      }
    } catch (error) {
      logger.error('承認処理エラー:', error);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsApproving(false);
    }
  };

  // フォトグラファーを拒否
  const handleReject = async () => {
    if (!request.pending_photographer_id) return;

    setIsRejecting(true);
    setError(null);

    try {
      const result = await rejectPhotographer(
        request.id,
        request.pending_photographer_id
      );

      if (result.success) {
        logger.info('フォトグラファー拒否成功');
        if (onRejected) {
          onRejected();
        }
        // リクエストを再取得して最新状態を反映
        window.location.reload();
      } else {
        setError(result.error || '拒否処理に失敗しました');
      }
    } catch (error) {
      logger.error('拒否処理エラー:', error);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsRejecting(false);
    }
  };

  // 残り時間をフォーマット
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}分${secs}秒`;
  };

  if (
    request.status !== 'photographer_accepted' ||
    !request.pending_photographer_id
  ) {
    return null;
  }

  return (
    <Card className="border-l-4 border-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          フォトグラファーからの受諾
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* タイムアウト警告 */}
        {timeRemaining !== null && timeRemaining > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              承認期限まで残り:{' '}
              <strong>{formatTimeRemaining(timeRemaining)}</strong>
            </AlertDescription>
          </Alert>
        )}

        {timeRemaining === 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              承認期限が過ぎました。リクエストは再度オープンされました。
            </AlertDescription>
          </Alert>
        )}

        {/* フォトグラファー情報 */}
        {photographer && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {photographer.avatar_url ? (
                <img
                  src={photographer.avatar_url}
                  alt={photographer.display_name || 'フォトグラファー'}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {photographer.display_name || 'フォトグラファー'}
                </h3>
                {photographer.average_rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">
                      {photographer.average_rating.toFixed(1)}
                    </span>
                  </div>
                )}
                {photographer.bio && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {photographer.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* リクエスト詳細 */}
        <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {request.location_address || '位置情報あり'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              <span>{request.party_size}名</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 shrink-0" />
              <span>
                {request.request_type === 'portrait' && 'ポートレート'}
                {request.request_type === 'couple' && 'カップル'}
                {request.request_type === 'family' && 'ファミリー'}
                {request.request_type === 'group' && 'グループ'}
                {request.request_type === 'landscape' && '風景'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{request.duration}分</span>
            </div>
          </div>
        </div>

        {/* 料金情報 */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">撮影料金</span>
            <span className="text-lg font-semibold">
              <FormattedPrice value={request.budget} format="simple" />
            </span>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="neutral"
            onClick={handleReject}
            disabled={isRejecting || isApproving || timeRemaining === 0}
            className="flex-1"
          >
            {isRejecting ? (
              <>
                <Loader2 className="h-4 w-4 w-4 mr-2 animate-spin" />
                処理中...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                拒否する
              </>
            )}
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isApproving || isRejecting || timeRemaining === 0}
            className="flex-1"
            variant="cta"
          >
            {isApproving ? (
              <>
                <Loader2 className="h-4 w-4 w-4 mr-2 animate-spin" />
                処理中...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                承認する
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
