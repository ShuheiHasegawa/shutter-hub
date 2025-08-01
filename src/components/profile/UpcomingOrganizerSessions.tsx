'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Camera,
  MapPin,
  Calendar,
  Users,
  ExternalLink,
  Edit,
  BarChart3,
  Loader2,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';
import type { BookingType } from '@/types/database';

interface OrganizerUpcomingSession {
  id: string;
  title: string;
  description: string | null;
  location: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  current_participants: number;
  price_per_person: number;
  image_urls: string[] | null;
  booking_type: BookingType;
  is_published: boolean;
}

interface UpcomingOrganizerSessionsProps {
  userId: string;
}

export function UpcomingOrganizerSessions({
  userId,
}: UpcomingOrganizerSessionsProps) {
  const [sessions, setSessions] = useState<OrganizerUpcomingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingSessions();
  }, [fetchUpcomingSessions]);

  const fetchUpcomingSessions = useCallback(async () => {
    try {
      const supabase = createClient();

      // 現在日時以降の自分が主催する撮影会を取得
      const { data, error } = await supabase
        .from('photo_sessions')
        .select(
          `
          id,
          title,
          description,
          location,
          start_time,
          end_time,
          max_participants,
          current_participants,
          price_per_person,
          image_urls,
          booking_type,
          is_published
        `
        )
        .eq('organizer_id', userId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        logger.error('開催予定撮影会取得エラー:', error);
        return;
      }

      setSessions(data || []);
    } catch (error) {
      logger.error('開催予定撮影会取得エラー:', error);
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

  const getBookingTypeLabel = (type: BookingType) => {
    switch (type) {
      case 'first_come':
        return '先着順';
      case 'lottery':
        return '抽選';
      case 'admin_lottery':
        return '管理抽選';
      case 'priority':
        return '優先予約';
      default:
        return type;
    }
  };

  const getStatusBadge = (session: OrganizerUpcomingSession) => {
    if (!session.is_published) {
      return <Badge variant="secondary">下書き</Badge>;
    }

    const participationRate =
      (session.current_participants / session.max_participants) * 100;

    if (participationRate >= 100) {
      return <Badge variant="default">満員</Badge>;
    } else if (participationRate >= 80) {
      return <Badge variant="default">ほぼ満員</Badge>;
    } else if (participationRate >= 50) {
      return <Badge variant="outline">募集中</Badge>;
    } else {
      return <Badge variant="outline">募集開始</Badge>;
    }
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
            開催予定の撮影会
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              開催予定の撮影会はありません
            </p>
            <Link href="/ja/photo-sessions/create">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                撮影会を作成
              </Button>
            </Link>
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
          開催予定の撮影会
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
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm line-clamp-2">
                        {session.title}
                      </h3>
                      {getStatusBadge(session)}
                    </div>

                    {/* 予約方式 */}
                    <div className="mb-2">
                      <Badge variant="outline" className="text-xs">
                        {getBookingTypeLabel(session.booking_type)}
                      </Badge>
                    </div>

                    {/* 日時・場所・料金 */}
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

                    {/* 参加者進捗 */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>参加者</span>
                        <span>
                          {session.current_participants}/
                          {session.max_participants}人
                        </span>
                      </div>
                      <Progress
                        value={
                          (session.current_participants /
                            session.max_participants) *
                          100
                        }
                        className="h-1"
                      />
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex flex-col gap-1">
                    <Link href={`/ja/photo-sessions/${session.id}/edit`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Link href={`/ja/photo-sessions/${session.id}/analytics`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <BarChart3 className="h-3 w-3" />
                      </Button>
                    </Link>
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

        {/* 新規作成ボタン */}
        <div className="pt-2">
          <Link href="/ja/photo-sessions/create">
            <Button variant="outline" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              新しい撮影会を作成
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
