'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Camera,
  MapPin,
  Calendar,
  Users,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';
import type { BookingStatus } from '@/types/database';

interface ModelUpcomingSession {
  id: string;
  booking_id: string;
  title: string;
  description: string | null;
  location: string;
  start_time: string;
  end_time: string;
  price_per_person: number;
  image_urls: string[] | null;
  booking_status: BookingStatus;
  organizer: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface UpcomingModelSessionsProps {
  userId: string;
}

export function UpcomingModelSessions({ userId }: UpcomingModelSessionsProps) {
  const [sessions, setSessions] = useState<ModelUpcomingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingSessions();
  }, [fetchUpcomingSessions]);

  const fetchUpcomingSessions = useCallback(async () => {
    try {
      const supabase = createClient();

      logger.debug('出演予定撮影会取得開始:', { userId });

      // まず最もシンプルなクエリで確認
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, photo_session_id')
        .eq('user_id', userId)
        .eq('status', 'confirmed');

      if (bookingsError) {
        logger.error('予約データ取得エラー:', {
          error: bookingsError,
          message: bookingsError?.message,
          code: bookingsError?.code,
          details: bookingsError?.details,
          hint: bookingsError?.hint,
          userId,
        });
        return;
      }

      logger.debug('予約データ:', bookingsData);

      if (!bookingsData || bookingsData.length === 0) {
        setSessions([]);
        return;
      }

      // 撮影会情報を取得
      const sessionIds = bookingsData.map(booking => booking.photo_session_id);
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('photo_sessions')
        .select(
          'id, title, description, location, start_time, end_time, price_per_person, image_urls, organizer_id'
        )
        .in('id', sessionIds)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (sessionsError) {
        logger.error('撮影会データ取得エラー:', {
          error: sessionsError,
          message: sessionsError?.message,
          code: sessionsError?.code,
          details: sessionsError?.details,
          hint: sessionsError?.hint,
        });
        return;
      }

      logger.debug('撮影会データ:', sessionsData);

      if (!sessionsData || sessionsData.length === 0) {
        setSessions([]);
        return;
      }

      // 主催者情報を取得
      const organizerIds = [
        ...new Set(sessionsData.map(session => session.organizer_id)),
      ];
      const { data: organizers, error: organizerError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', organizerIds);

      if (organizerError) {
        logger.error('主催者情報取得エラー:', {
          error: organizerError,
          message: organizerError?.message,
          code: organizerError?.code,
          details: organizerError?.details,
          hint: organizerError?.hint,
        });
        return;
      }

      logger.debug('主催者データ:', organizers);

      // データを統合
      const formattedSessions: ModelUpcomingSession[] = sessionsData.map(
        session => {
          const booking = bookingsData.find(
            b => b.photo_session_id === session.id
          );
          const organizer = organizers?.find(
            org => org.id === session.organizer_id
          ) || {
            id: session.organizer_id,
            display_name: '不明なユーザー',
            avatar_url: null,
          };

          return {
            id: session.id,
            booking_id: booking?.id || '',
            title: session.title,
            description: session.description,
            location: session.location,
            start_time: session.start_time,
            end_time: session.end_time,
            price_per_person: session.price_per_person,
            image_urls: session.image_urls,
            booking_status: booking?.status || 'confirmed',
            organizer: organizer,
          };
        }
      );

      logger.debug('最終データ:', formattedSessions);
      setSessions(formattedSessions);
    } catch (error) {
      logger.error('出演予定撮影会取得エラー（予期しないエラー）:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'M月d日(E) HH:mm', { locale: ja });
  };

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            出演予定の撮影会
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-2">
              出演予定の撮影会はありません
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          出演予定の撮影会
          <Badge variant="secondary" className="ml-auto">
            {sessions.length}件
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.map((session, index) => (
          <div key={session.id}>
            <div className="flex items-start gap-4">
              {/* 撮影会画像 */}
              <div className="flex-shrink-0">
                {session.image_urls && session.image_urls.length > 0 ? (
                  <Image
                    src={session.image_urls[0]}
                    alt={session.title}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* 撮影会情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                      {session.title}
                    </h3>

                    {/* 主催者情報 */}
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          src={session.organizer.avatar_url || ''}
                          alt={session.organizer.display_name}
                        />
                        <AvatarFallback className="text-xs">
                          {session.organizer.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {session.organizer.display_name}
                      </span>
                    </div>

                    {/* 日時・場所 */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(session.start_time)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {session.location}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {formatPrice(session.price_per_person)}
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="text-xs">
                      確定済み
                    </Badge>
                    <Link href={`/ja/photo-sessions/${session.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {index < sessions.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
