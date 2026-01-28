'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

// Leaflet は SSR 非対応のため動的インポート
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), {
  ssr: false,
});

// Leaflet アイコンの設定（SSR 非対応のため、クライアント側でのみ実行）
if (typeof window !== 'undefined') {
  import('leaflet').then(L => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  });
}

interface PhotographerInstantDashboardProps {
  userId: string;
}

// 残り時間を計算する関数
function calculateRemainingTime(expiresAt: string): {
  remaining: number;
  formatted: string;
  isExpired: boolean;
} {
  const now = new Date().getTime();
  const expires = new Date(expiresAt).getTime();
  const remaining = expires - now;

  if (remaining <= 0) {
    return { remaining: 0, formatted: '', isExpired: true };
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return { remaining, formatted, isExpired: false };
}

export function PhotographerInstantDashboard({
  userId,
}: PhotographerInstantDashboardProps) {
  const router = useRouter();
  const t = useTranslations('instant.dashboard');
  const [requests, setRequests] = useState<InstantPhotoRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<InstantPhotoRequest | null>(null);
  const [, setTick] = useState(0); // 残り時間のリアルタイム更新用

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
        const errorMessage = result.error || t('errors.fetchFailed');
        logger.error('リクエスト取得失敗:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      logger.error('リクエスト取得エラー（例外）:', error);
      setError(t('errors.unexpected'));
    } finally {
      setRequestsLoading(false);
      logger.info('リクエスト一覧読み込み完了');
    }
  };

  // オンライン状態切り替え
  const handleToggleOnline = async (online: boolean) => {
    if (!location) {
      setError(t('location.notAcquired'));
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
        setError(result.error || t('errors.updateFailed'));
      }
    } catch (error) {
      logger.error('オンライン状態更新エラー:', error);
      setError(t('errors.unexpected'));
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
        // ダイアログを閉じる
        setConfirmDialogOpen(false);
        setSelectedRequest(null);
      } else {
        const errorMessage = result.error || t('errors.responseFailed');
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
      setError(t('errors.unexpected'));
    }
  };

  // 受諾確認ダイアログを開く
  const handleOpenConfirmDialog = (request: InstantPhotoRequest) => {
    setSelectedRequest(request);
    setConfirmDialogOpen(true);
  };

  // ダイアログから受諾を実行
  const handleAcceptFromDialog = async () => {
    if (!selectedRequest) return;
    await handleRespond(selectedRequest.id, 'accept', undefined, 15);
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
        setError(result.error || t('errors.updateFailed'));
      }
    } catch (error) {
      logger.error('ステータス更新エラー:', error);
      setError(t('errors.unexpected'));
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
        setError(t('errors.bookingFetchFailed'));
        return;
      }

      router.push(`/instant/deliver/${booking.id}`);
    } catch (error) {
      logger.error('予約情報取得エラー:', error);
      setError(t('errors.unexpected'));
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

  // 残り時間のリアルタイム更新（1秒ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 初回読み込み
  useEffect(() => {
    loadOnlineStatus();
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* オンライン状態管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {t('onlineStatus.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 位置情報状態 */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Navigation className="h-5 w-5 text-info" />
              <div>
                <div className="font-medium">{t('location.title')}</div>
                <div className="text-sm text-muted-foreground">
                  {locationLoading
                    ? t('location.loading')
                    : locationError
                      ? t('location.failed')
                      : location
                        ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                        : t('location.notAcquired')}
                </div>
              </div>
            </div>
            <Badge variant={location ? 'default' : 'secondary'}>
              {location ? t('location.acquired') : t('location.notAcquired')}
            </Badge>
          </div>

          {/* オンライン状態切り替え */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="online-status" className="text-base font-medium">
                {t('onlineStatus.label')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('onlineStatus.description')}
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
                {t('onlineStatus.locationRequired')}
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
            {t('requests.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>{t('requests.loading')}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('requests.empty')}</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {t('requests.emptyHint')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(request => {
                const remainingTime = calculateRemainingTime(
                  request.expires_at
                );
                return (
                  <Card key={request.id} className="border-l-4 border-blue-500">
                    <CardContent className="p-4">
                      {/* ヘッダーセクション: 名前、ステータス、価格 */}
                      <div className="flex items-start justify-between gap-4 pb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-lg truncate">
                              {request.guest_name}
                              {t('common.guestSuffix', {
                                defaultValue: 'さん',
                              })}
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
                              {request.status === 'pending' &&
                                t('status.pending')}
                              {request.status === 'photographer_accepted' &&
                                request.pending_photographer_id === userId &&
                                t('status.waitingApproval')}
                              {request.status === 'matched' &&
                                t('status.matched')}
                              {request.status === 'in_progress' &&
                                t('status.inProgress')}
                              {request.status === 'completed' &&
                                t('status.completed')}
                              {request.status === 'cancelled' &&
                                t('status.cancelled')}
                              {request.status === 'expired' &&
                                t('status.expired')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FormattedDateTime
                              value={request.created_at}
                              format="time"
                            />
                            {request.status === 'pending' &&
                              !remainingTime.isExpired && (
                                <>
                                  <span>•</span>
                                  <span
                                    className={
                                      remainingTime.remaining < 300000
                                        ? 'text-destructive font-medium'
                                        : ''
                                    }
                                  >
                                    {t('remainingTime', {
                                      time: remainingTime.formatted,
                                    })}
                                  </span>
                                </>
                              )}
                            {remainingTime.isExpired && (
                              <>
                                <span>•</span>
                                <span className="text-destructive font-medium">
                                  {t('expired')}
                                </span>
                              </>
                            )}
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
                            {request.duration}
                            {t('common.minutes', { defaultValue: '分' })}
                          </div>
                        </div>
                      </div>

                      {/* 詳細情報セクション */}
                      <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="break-words">
                              {request.location_address ||
                                t('location.hasLocation')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 shrink-0" />
                            <span>
                              {request.party_size}
                              {t('common.people', { defaultValue: '名' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4 shrink-0" />
                            <span>
                              {request.request_type === 'portrait' &&
                                t('requestType.portrait')}
                              {request.request_type === 'couple' &&
                                t('requestType.couple')}
                              {request.request_type === 'family' &&
                                t('requestType.family')}
                              {request.request_type === 'group' &&
                                t('requestType.group')}
                              {request.request_type === 'landscape' &&
                                t('requestType.landscape')}
                              {request.request_type === 'pet' &&
                                t('requestType.pet')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span>
                              {request.urgency === 'now' && t('urgency.now')}
                              {request.urgency === 'within_30min' &&
                                t('urgency.within30min')}
                              {request.urgency === 'within_1hour' &&
                                t('urgency.within1hour')}
                              {request.urgency === 'normal' &&
                                t('urgency.normal')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 特別リクエストセクション */}
                      {request.special_requests && (
                        <div className="bg-muted/50 rounded-lg p-4 mt-4">
                          <h5 className="font-medium text-sm mb-2">
                            {t('specialRequests.title')}
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
                              {t('contact.hidden')}
                            </span>
                          </>
                        )}
                      </div>

                      {/* アクションボタンセクション */}
                      <div className="pt-4">
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              onClick={() =>
                                handleRespond(
                                  request.id,
                                  'decline',
                                  '対応できません'
                                )
                              }
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4" />
                              {t('actions.decline')}
                            </Button>
                            <Button
                              onClick={() => handleOpenConfirmDialog(request)}
                              className="flex-1"
                              variant="neutral"
                            >
                              <CheckCircle className="h-4 w-4" />
                              {t('actions.accept')}
                            </Button>
                          </div>
                        )}

                        {request.status === 'photographer_accepted' &&
                          request.pending_photographer_id === userId && (
                            <div className="w-full text-center text-sm text-muted-foreground">
                              {t('actions.waitingGuestApproval')}
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
                              <Camera className="h-4 w-4" />
                              {t('actions.startShooting')}
                            </Button>
                          )}

                        {request.status === 'in_progress' &&
                          request.matched_photographer_id === userId && (
                            <Button
                              onClick={() => handleMarkCompleted(request.id)}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                              {t('actions.completeShooting')}
                            </Button>
                          )}

                        {request.status === 'completed' &&
                          request.matched_photographer_id === userId && (
                            <div className="flex flex-col gap-4 w-full">
                              {/* 撮影完了メッセージ */}
                              <div className="bg-success/10 border border-success/20 rounded-lg p-4 w-full">
                                <div className="flex items-center gap-2 text-success mb-2">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="font-medium">
                                    {t('completed.title')}
                                  </span>
                                </div>
                                <p className="text-sm text-success/80">
                                  {t('completed.message')}
                                </p>
                              </div>

                              {/* 写真配信ボタン */}
                              <Button
                                onClick={() =>
                                  handleProceedToDelivery(request.id)
                                }
                                className="w-full"
                              >
                                <Upload className="h-4 w-4" />
                                {t('actions.deliverPhotos')}
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
                                  <span className="font-medium">
                                    {t('completed.title')}
                                  </span>
                                </div>
                                <p className="text-sm text-success/80">
                                  {t('completed.message')}
                                </p>
                              </div>

                              {/* 配信完了メッセージ */}
                              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 w-full">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                                  <Send className="h-4 w-4" />
                                  <span className="font-medium">
                                    {t('delivered.title')}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {t('delivered.title')}
                                  </Badge>
                                </div>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                  {t('delivered.message')}
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
                                <Upload className="h-4 w-4" />
                                {t('actions.redelivery')}
                              </Button>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 詳細確認ダイアログ */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('confirmDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('confirmDialog.description')}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {/* 地図表示 */}
              <div className="h-[300px] w-full rounded-lg overflow-hidden border">
                {typeof window !== 'undefined' && (
                  <MapContainer
                    center={[
                      selectedRequest.location_lat,
                      selectedRequest.location_lng,
                    ]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker
                      position={[
                        selectedRequest.location_lat,
                        selectedRequest.location_lng,
                      ]}
                    />
                  </MapContainer>
                )}
              </div>

              {/* リクエスト詳細情報 */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      {t('location.title')}
                    </div>
                    <div className="break-words">
                      {selectedRequest.location_address ||
                        t('location.hasLocation')}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      {t('common.guest', { defaultValue: 'ゲスト' })}
                    </div>
                    <div>{selectedRequest.guest_name}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      {t('common.budget', { defaultValue: '予算' })}
                    </div>
                    <div>
                      <FormattedPrice
                        value={selectedRequest.budget}
                        format="simple"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      {t('common.duration', { defaultValue: '時間' })}
                    </div>
                    <div>
                      {selectedRequest.duration}
                      {t('common.minutes', { defaultValue: '分' })}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      {t('requestType.portrait', {
                        defaultValue: '撮影タイプ',
                      })}
                    </div>
                    <div>
                      {selectedRequest.request_type === 'portrait' &&
                        t('requestType.portrait')}
                      {selectedRequest.request_type === 'couple' &&
                        t('requestType.couple')}
                      {selectedRequest.request_type === 'family' &&
                        t('requestType.family')}
                      {selectedRequest.request_type === 'group' &&
                        t('requestType.group')}
                      {selectedRequest.request_type === 'landscape' &&
                        t('requestType.landscape')}
                      {selectedRequest.request_type === 'pet' &&
                        t('requestType.pet')}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      {t('urgency.now', { defaultValue: '緊急度' })}
                    </div>
                    <div>
                      {selectedRequest.urgency === 'now' && t('urgency.now')}
                      {selectedRequest.urgency === 'within_30min' &&
                        t('urgency.within30min')}
                      {selectedRequest.urgency === 'within_1hour' &&
                        t('urgency.within1hour')}
                      {selectedRequest.urgency === 'normal' &&
                        t('urgency.normal')}
                    </div>
                  </div>
                </div>

                {selectedRequest.special_requests && (
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      {t('specialRequests.title')}
                    </div>
                    <div className="text-sm">
                      {selectedRequest.special_requests}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setSelectedRequest(null);
              }}
            >
              {t('confirmDialog.cancel')}
            </Button>
            <Button onClick={handleAcceptFromDialog} variant="neutral">
              {t('confirmDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
