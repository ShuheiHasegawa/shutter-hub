'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/client';
import {
  getInstantPhotoRequest,
  checkPhotographerTimeout,
} from '@/app/actions/instant-photo';
import { GuestApprovalPanel } from '@/components/instant/GuestApprovalPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormattedPrice } from '@/components/ui/formatted-display';
import {
  Camera,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import type { InstantPhotoRequest } from '@/types/instant-photo';

interface InstantRequestDetailClientProps {
  initialRequest: InstantPhotoRequest;
  photographer?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
    average_rating?: number;
    bio?: string;
  } | null;
}

export function InstantRequestDetailClient({
  initialRequest,
  photographer: initialPhotographer,
}: InstantRequestDetailClientProps) {
  const [request, setRequest] = useState<InstantPhotoRequest>(initialRequest);
  const [photographer, setPhotographer] = useState(initialPhotographer);
  const [isLoading, setIsLoading] = useState(false);

  // リクエスト情報を再取得
  const refreshRequest = async () => {
    setIsLoading(true);
    try {
      const result = await getInstantPhotoRequest(request.id);
      if (result.success && result.data) {
        setRequest(result.data);

        // フォトグラファー情報を再取得（承認待ちの場合）
        if (
          result.data.status === 'photographer_accepted' &&
          result.data.pending_photographer_id
        ) {
          const supabase = createClient();
          const { data: photographerProfile } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, bio')
            .eq('id', result.data.pending_photographer_id)
            .single();

          if (photographerProfile) {
            // 平均評価を取得
            const { data: ratings } = await supabase
              .from('instant_bookings')
              .select('guest_rating')
              .eq('photographer_id', result.data.pending_photographer_id)
              .not('guest_rating', 'is', null);

            const averageRating =
              ratings && ratings.length > 0
                ? ratings.reduce((sum, r) => sum + (r.guest_rating || 0), 0) /
                  ratings.length
                : undefined;

            setPhotographer({
              id: photographerProfile.id,
              display_name: photographerProfile.display_name,
              avatar_url: photographerProfile.avatar_url,
              bio: photographerProfile.bio,
              average_rating: averageRating,
            });
          }
        }
      }
    } catch (error) {
      logger.error('リクエスト再取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // リアルタイム監視
  useEffect(() => {
    const supabase = createClient();

    // リクエストの状態変更を監視
    const channel = supabase
      .channel(`instant_request_${request.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'instant_photo_requests',
          filter: `id=eq.${request.id}`,
        },
        async payload => {
          logger.info('リクエスト状態変更を検知:', payload.new);
          const updatedRequest = payload.new as InstantPhotoRequest;

          // タイムアウトチェック
          if (updatedRequest.status === 'photographer_accepted') {
            await checkPhotographerTimeout(request.id);
          }

          // リクエスト情報を再取得
          await refreshRequest();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [request.id]);

  // タイムアウトチェック（定期的に実行）
  useEffect(() => {
    if (request.status === 'photographer_accepted') {
      const interval = setInterval(async () => {
        await checkPhotographerTimeout(request.id);
        await refreshRequest();
      }, 60000); // 1分ごと

      return () => clearInterval(interval);
    }
  }, [request.id, request.status]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">撮影リクエスト詳細</h1>
        <p className="text-gray-600 mt-2">リクエストの状況を確認できます</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {/* ステータス表示 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            リクエスト情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
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
            >
              {request.status === 'pending' && '受付中'}
              {request.status === 'photographer_accepted' && '承認待ち'}
              {request.status === 'matched' && 'マッチ済み'}
              {request.status === 'in_progress' && '撮影中'}
              {request.status === 'completed' && '撮影完了'}
              {request.status === 'cancelled' && 'キャンセル'}
              {request.status === 'expired' && '期限切れ'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{request.location_address || '位置情報あり'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{request.party_size}名</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span>
                {request.request_type === 'portrait' && 'ポートレート'}
                {request.request_type === 'couple' && 'カップル'}
                {request.request_type === 'family' && 'ファミリー'}
                {request.request_type === 'group' && 'グループ'}
                {request.request_type === 'landscape' && '風景'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{request.duration}分</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">撮影料金</span>
              <span className="text-lg font-semibold">
                <FormattedPrice value={request.budget} format="simple" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ゲスト承認パネル */}
      {request.status === 'photographer_accepted' &&
        request.pending_photographer_id &&
        photographer && (
          <GuestApprovalPanel
            request={request}
            photographer={photographer}
            onApproved={() => {
              // 承認後の処理（必要に応じて）
            }}
            onRejected={() => {
              // 拒否後の処理（リクエストを再取得）
              refreshRequest();
            }}
          />
        )}

      {/* マッチング済みの場合 */}
      {request.status === 'matched' && request.matched_photographer_id && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            フォトグラファーとマッチングが成立しました。決済ページに進んでください。
          </AlertDescription>
        </Alert>
      )}

      {/* 特別リクエスト */}
      {request.special_requests && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>特別なリクエスト</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {request.special_requests}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
