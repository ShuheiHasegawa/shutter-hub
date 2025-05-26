'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import {
  togglePhotographerOnlineStatusWithLocation,
  getPhotographerRequests,
  respondToRequest,
  updateRequestStatus,
} from '@/app/actions/instant-photo';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { InstantPhotoRequest } from '@/types/instant-photo';

interface PhotographerInstantDashboardProps {
  userId: string;
}

export function PhotographerInstantDashboard({
  userId,
}: PhotographerInstantDashboardProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState<InstantPhotoRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [error, setError] = useState('');

  // 位置情報取得
  const {
    location,
    error: locationError,
    isLoading: locationLoading,
  } = useGeolocation({
    enableHighAccuracy: true,
    watch: true, // 継続監視
  });

  // リクエスト一覧を取得
  const loadRequests = async () => {
    setRequestsLoading(true);
    try {
      const result = await getPhotographerRequests();
      if (result.success && result.data) {
        setRequests(result.data);
      } else {
        setError(result.error || 'リクエストの取得に失敗しました');
      }
    } catch (error) {
      console.error('リクエスト取得エラー:', error);
      setError('予期しないエラーが発生しました');
    } finally {
      setRequestsLoading(false);
    }
  };

  // オンライン状態を切り替え
  const handleToggleOnline = async (online: boolean) => {
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
      console.error('オンライン状態更新エラー:', error);
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
    try {
      const result = await respondToRequest(
        requestId,
        responseType,
        declineReason,
        estimatedArrivalTime
      );
      if (result.success) {
        // リクエスト一覧を更新
        loadRequests();
      } else {
        setError(result.error || '応答の送信に失敗しました');
      }
    } catch (error) {
      console.error('応答エラー:', error);
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
      console.error('ステータス更新エラー:', error);
      setError('予期しないエラーが発生しました');
    }
  };

  // 初回読み込み
  useEffect(() => {
    loadRequests();
  }, []);

  // 緊急度のバッジ色を取得
  const getUrgencyBadgeVariant = (urgency: string) => {
    switch (urgency) {
      case 'now':
        return 'destructive';
      case 'within_30min':
        return 'default';
      case 'within_1hour':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // ステータスのバッジ色を取得
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'matched':
        return 'default';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'expired':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // 緊急度のラベルを取得
  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'now':
        return '今すぐ';
      case 'within_30min':
        return '30分以内';
      case 'within_1hour':
        return '1時間以内';
      default:
        return urgency;
    }
  };

  // ステータスのラベルを取得
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待機中';
      case 'matched':
        return 'マッチング済み';
      case 'in_progress':
        return '撮影中';
      case 'completed':
        return '完了';
      case 'cancelled':
        return 'キャンセル';
      case 'expired':
        return '期限切れ';
      default:
        return status;
    }
  };

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
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Navigation className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium">位置情報</div>
                <div className="text-sm text-gray-600">
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
              <p className="text-sm text-gray-600">
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              即座撮影リクエスト
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRequests}
              disabled={requestsLoading}
            >
              {requestsLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  更新中
                </>
              ) : (
                '更新'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>リクエストを読み込み中...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>現在、即座撮影リクエストはありません</p>
              <p className="text-sm">オンラインにするとリクエストが届きます</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <Card key={request.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* ヘッダー情報 */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getUrgencyBadgeVariant(request.urgency)}
                            >
                              {getUrgencyLabel(request.urgency)}
                            </Badge>
                            <Badge
                              variant={getStatusBadgeVariant(request.status)}
                            >
                              {getStatusLabel(request.status)}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg">
                            {request.request_type === 'portrait' &&
                              'ポートレート撮影'}
                            {request.request_type === 'couple' &&
                              'カップル撮影'}
                            {request.request_type === 'family' &&
                              'ファミリー撮影'}
                            {request.request_type === 'group' && 'グループ撮影'}
                            {request.request_type === 'landscape' && '風景撮影'}
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            ¥{request.budget.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.duration}分間
                          </div>
                        </div>
                      </div>

                      {/* 詳細情報 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4" />
                            <span>{request.guest_name}</span>
                            <span className="text-gray-500">
                              ({request.party_size}名)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4" />
                            <span>{request.guest_phone}</span>
                          </div>
                          {request.guest_email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4" />
                              <span>{request.guest_email}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">
                              {request.location_address ||
                                `${request.location_lat}, ${request.location_lng}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>
                              {new Date(request.created_at).toLocaleString(
                                'ja-JP'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 特別リクエスト */}
                      {request.special_requests && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">
                            特別なリクエスト
                          </h4>
                          <p className="text-sm text-gray-700">
                            {request.special_requests}
                          </p>
                        </div>
                      )}

                      <Separator />

                      {/* アクションボタン */}
                      <div className="flex gap-2">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              onClick={() =>
                                handleRespond(
                                  request.id,
                                  'accept',
                                  undefined,
                                  15
                                )
                              }
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              受諾する
                            </Button>
                            <Button
                              variant="outline"
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
                          </>
                        )}

                        {request.status === 'matched' &&
                          request.matched_photographer_id === userId && (
                            <Button
                              onClick={() =>
                                handleUpdateStatus(request.id, 'in_progress')
                              }
                              className="flex-1"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              撮影開始
                            </Button>
                          )}

                        {request.status === 'in_progress' &&
                          request.matched_photographer_id === userId && (
                            <Button
                              onClick={() =>
                                handleUpdateStatus(request.id, 'completed')
                              }
                              className="flex-1"
                              variant="default"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              撮影完了
                            </Button>
                          )}
                      </div>
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
