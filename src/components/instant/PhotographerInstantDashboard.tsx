'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Camera,
  MapPin,
  Clock,
  Users,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Navigation,
  Zap,
  Upload,
  ArrowRight,
  Send,
} from 'lucide-react';
import {
  togglePhotographerOnlineStatusWithLocation,
  getPhotographerRequests,
  getPhotographerOnlineStatus,
  respondToRequest,
  updateRequestStatus,
} from '@/app/actions/instant-photo';
import { createClient } from '@/lib/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useRouter } from 'next/navigation';
import {
  FormattedPrice,
  FormattedDateTime,
} from '@/components/ui/formatted-display';
import type { InstantPhotoRequest } from '@/types/instant-photo';

interface PhotographerInstantDashboardProps {
  userId: string;
}

export function PhotographerInstantDashboard({
  userId,
}: PhotographerInstantDashboardProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<InstantPhotoRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 位置情報取得
  const {
    location,
    error: locationError,
    isLoading: locationLoading,
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5分間キャッシュ
  });

  // リクエスト一覧を読み込み
  const loadRequests = async () => {
    logger.info('リクエスト一覧読み込み開始');
    setRequestsLoading(true);
    try {
      const result = await getPhotographerRequests();
      logger.info('リクエスト一覧取得結果:', {
        success: result.success,
        count: result.data?.length || 0,
        error: result.error,
      });

      if (result.success && result.data) {
        logger.info('リクエスト一覧を更新:', {
          count: result.data.length,
          statuses: result.data.map(r => ({
            id: r.id,
            status: r.status,
            matched_photographer_id: r.matched_photographer_id,
            created_at: r.created_at, // 日時不明デバッグ用
          })),
        });
        setRequests(result.data);
        setError(''); // エラー状態をクリア
      } else {
        const errorMessage = result.error || 'リクエストの取得に失敗しました';
        logger.error('リクエスト取得失敗:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      logger.error('リクエスト取得エラー（例外）:', error);
      setError('予期しないエラーが発生しました');
    } finally {
      setRequestsLoading(false);
      logger.info('リクエスト一覧読み込み完了');
    }
  };

  // オンライン状態切り替え
  const handleToggleOnline = async (online: boolean) => {
    if (!location) {
      setError('位置情報が取得できていません');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await togglePhotographerOnlineStatusWithLocation(
        online,
        location?.latitude,
        location?.longitude
      );
      if (result.success) {
        setIsOnline(online);
        if (online) {
          // オンラインになったらリクエストを再読み込み
          loadRequests();
        }
      } else {
        setError(result.error || 'ステータスの更新に失敗しました');
      }
    } catch (error) {
      logger.error('オンライン状態更新エラー:', error);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // リクエストに応答
  const handleRespond = async (
    requestId: string,
    responseType: 'accept' | 'decline',
    declineReason?: string,
    estimatedArrivalTime?: number
  ) => {
    logger.info('リクエスト応答開始:', {
      requestId,
      responseType,
      declineReason,
      estimatedArrivalTime,
    });

    try {
      const result = await respondToRequest(
        requestId,
        responseType,
        declineReason,
        estimatedArrivalTime
      );

      logger.info('リクエスト応答結果:', {
        success: result.success,
        error: result.error,
        requestId,
        responseType,
      });

      if (result.success) {
        // 成功メッセージを表示
        logger.info('リクエスト応答成功、一覧を更新します', {
          requestId,
          responseType,
        });
        // リクエスト一覧を更新
        await loadRequests();
        // エラー状態をクリア
        setError('');
      } else {
        const errorMessage = result.error || '応答の送信に失敗しました';
        logger.error('リクエスト応答失敗:', {
          error: errorMessage,
          requestId,
          responseType,
          declineReason,
          estimatedArrivalTime,
        });
        setError(errorMessage);
      }
    } catch (error) {
      logger.error('応答エラー（例外）:', error);
      setError('予期しないエラーが発生しました');
    }
  };

  // リクエストステータスを更新
  const handleUpdateStatus = async (
    requestId: string,
    status: 'in_progress' | 'completed' | 'cancelled'
  ) => {
    try {
      const result = await updateRequestStatus(requestId, status);
      if (result.success) {
        loadRequests();
      } else {
        setError(result.error || 'ステータスの更新に失敗しました');
      }
    } catch (error) {
      logger.error('ステータス更新エラー:', error);
      setError('予期しないエラーが発生しました');
    }
  };

  // 撮影完了後の配信ページ遷移
  const handleProceedToDelivery = async (requestId: string) => {
    try {
      const supabase = createClient();

      // リクエストIDからbooking IDを取得
      const { data: booking, error } = await supabase
        .from('instant_bookings')
        .select('id')
        .eq('request_id', requestId)
        .single();

      if (error || !booking) {
        setError('予約情報の取得に失敗しました');
        return;
      }

      router.push(`/instant/deliver/${booking.id}`);
    } catch (error) {
      logger.error('予約情報取得エラー:', error);
      setError('予期しないエラーが発生しました');
    }
  };

  // 撮影完了処理の改善
  const handleMarkCompleted = async (requestId: string) => {
    try {
      const result = await updateRequestStatus(requestId, 'completed');
      if (result.success) {
        setRequests(prev =>
          prev.map(req =>
            req.id === requestId ? { ...req, status: 'completed' } : req
          )
        );

        // 撮影完了処理
      }
    } catch (error) {
      logger.error('撮影完了エラー:', error);
    }
  };

  // オンライン状態を読み込み
  const loadOnlineStatus = async () => {
    try {
      const result = await getPhotographerOnlineStatus();
      if (result.success) {
        setIsOnline(result.data || false);
        logger.info('オンライン状態を読み込み:', { isOnline: result.data });
      } else {
        logger.warn('オンライン状態取得失敗:', result.error);
      }
    } catch (error) {
      logger.error('オンライン状態取得エラー（例外）:', error);
    }
  };

  // 初回読み込み
  useEffect(() => {
    loadOnlineStatus();
    loadRequests();
  }, []);

  return (
    <div className="space-y-6">
      {/* オンライン状態管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            即座撮影対応状態
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 位置情報状態 */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Navigation className="h-5 w-5 text-info" />
              <div>
                <div className="font-medium">位置情報</div>
                <div className="text-sm text-muted-foreground">
                  {locationLoading
                    ? '取得中...'
                    : locationError
                      ? '取得失敗'
                      : location
                        ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                        : '未取得'}
                </div>
              </div>
            </div>
            <Badge variant={location ? 'default' : 'secondary'}>
              {location ? '取得済み' : '未取得'}
            </Badge>
          </div>

          {/* オンライン状態切り替え */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="online-status" className="text-base font-medium">
                即座撮影リクエストを受け付ける
              </Label>
              <p className="text-sm text-muted-foreground">
                オンラインにすると近くのゲストからリクエストが届きます
              </p>
            </div>
            <Switch
              id="online-status"
              checked={isOnline}
              onCheckedChange={handleToggleOnline}
              disabled={isLoading || !location}
            />
          </div>

          {!location && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                即座撮影リクエストを受け付けるには位置情報が必要です。
                ブラウザで位置情報を許可してください。
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* リクエスト一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            即座撮影リクエスト
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>リクエストを読み込み中...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                現在リクエストはありません
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                オンライン状態にして新しいリクエストを受け取りましょう
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <Card key={request.id} className="border-l-4 border-blue-500">
                  <CardContent className="p-4">
                    {/* ヘッダーセクション: 名前、ステータス、価格 */}
                    <div className="flex items-start justify-between gap-4 pb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-lg truncate">
                            {request.guest_name}さん
                          </h4>
                          <Badge
                            variant={
                              request.status === 'pending'
                                ? 'default'
                                : request.status === 'photographer_accepted'
                                  ? 'default'
                                  : request.status === 'matched'
                                    ? 'secondary'
                                    : request.status === 'in_progress'
                                      ? 'default'
                                      : request.status === 'completed'
                                        ? 'secondary'
                                        : 'destructive'
                            }
                            className="shrink-0"
                          >
                            {request.status === 'pending' && '受付中'}
                            {request.status === 'photographer_accepted' &&
                              request.pending_photographer_id === userId &&
                              '承認待ち'}
                            {request.status === 'matched' && 'マッチ済み'}
                            {request.status === 'in_progress' && '撮影中'}
                            {request.status === 'completed' && '撮影完了'}
                            {request.status === 'cancelled' && 'キャンセル'}
                            {request.status === 'expired' && '期限切れ'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <FormattedDateTime
                            value={request.created_at}
                            format="time"
                          />
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-medium text-success">
                          <FormattedPrice
                            value={request.budget}
                            format="simple"
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {request.duration}分
                        </div>
                      </div>
                    </div>

                    {/* 詳細情報セクション */}
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
                            {request.request_type === 'portrait' &&
                              'ポートレート'}
                            {request.request_type === 'couple' && 'カップル'}
                            {request.request_type === 'family' && 'ファミリー'}
                            {request.request_type === 'group' && 'グループ'}
                            {request.request_type === 'landscape' && '風景'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>
                            {request.urgency === 'now' && '今すぐ'}
                            {request.urgency === 'within_30min' && '30分以内'}
                            {request.urgency === 'within_1hour' && '1時間以内'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 特別リクエストセクション */}
                    {request.special_requests && (
                      <div className="bg-muted/50 rounded-lg p-4 mt-4">
                        <h5 className="font-medium text-sm mb-2">
                          特別なリクエスト
                        </h5>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {request.special_requests}
                        </p>
                      </div>
                    )}

                    {/* 連絡先セクション */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
                      {['matched', 'in_progress', 'completed'].includes(
                        request.status
                      ) && request.matched_photographer_id === userId ? (
                        // マッチング成立後：連絡先を表示
                        <>
                          <Phone className="h-4 w-4 shrink-0" />
                          <span>{request.guest_phone}</span>
                          {request.guest_email && (
                            <>
                              <Mail className="h-4 w-4 ml-2 shrink-0" />
                              <span className="truncate">
                                {request.guest_email}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        // マッチング前：プライバシー保護メッセージ
                        <>
                          <Phone className="h-4 w-4 shrink-0" />
                          <span className="text-muted-foreground/60">
                            連絡先は受注後に表示されます
                          </span>
                        </>
                      )}
                    </div>

                    {/* アクションボタンセクション */}
                    <div className="pt-4">
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="neutral"
                            onClick={() =>
                              handleRespond(
                                request.id,
                                'decline',
                                '対応できません'
                              )
                            }
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            辞退する
                          </Button>
                          <Button
                            onClick={() =>
                              handleRespond(request.id, 'accept', undefined, 15)
                            }
                            className="flex-1"
                            variant="cta"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            受諾する
                          </Button>
                        </div>
                      )}

                      {request.status === 'photographer_accepted' &&
                        request.pending_photographer_id === userId && (
                          <div className="w-full text-center text-sm text-muted-foreground">
                            ゲストの承認をお待ちください
                          </div>
                        )}

                      {request.status === 'matched' &&
                        request.matched_photographer_id === userId && (
                          <Button
                            onClick={() =>
                              handleUpdateStatus(request.id, 'in_progress')
                            }
                            className="w-full"
                            variant="cta"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            撮影開始
                          </Button>
                        )}

                      {request.status === 'in_progress' &&
                        request.matched_photographer_id === userId && (
                          <Button
                            onClick={() => handleMarkCompleted(request.id)}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            撮影完了
                          </Button>
                        )}

                      {request.status === 'completed' &&
                        request.matched_photographer_id === userId && (
                          <div className="flex flex-col gap-4 w-full">
                            {/* 撮影完了メッセージ */}
                            <div className="bg-success/10 border border-success/20 rounded-lg p-4 w-full">
                              <div className="flex items-center gap-2 text-success mb-2">
                                <CheckCircle className="h-4 w-4" />
                                <span className="font-medium">撮影完了</span>
                              </div>
                              <p className="text-sm text-success/80">
                                写真を配信して収益を受け取りましょう
                              </p>
                            </div>

                            {/* 写真配信ボタン */}
                            <Button
                              onClick={() =>
                                handleProceedToDelivery(request.id)
                              }
                              className="w-full"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              写真配信
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        )}

                      {request.status === 'delivered' &&
                        request.matched_photographer_id === userId && (
                          <div className="flex flex-col gap-4 w-full">
                            {/* 撮影完了メッセージ */}
                            <div className="bg-success/10 border border-success/20 rounded-lg p-4 w-full">
                              <div className="flex items-center gap-2 text-success mb-2">
                                <CheckCircle className="h-4 w-4" />
                                <span className="font-medium">撮影完了</span>
                              </div>
                              <p className="text-sm text-success/80">
                                撮影が完了しました
                              </p>
                            </div>

                            {/* 配信完了メッセージ */}
                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 w-full">
                              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                                <Send className="h-4 w-4" />
                                <span className="font-medium">
                                  写真配信済み
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  配信完了
                                </Badge>
                              </div>
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                配信完了しました。ゲストの受取確認をお待ちください
                              </p>
                            </div>

                            {/* 再配信ボタン */}
                            <Button
                              onClick={() =>
                                handleProceedToDelivery(request.id)
                              }
                              variant="outline"
                              className="w-full"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              再配信（上書き）
                            </Button>
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
