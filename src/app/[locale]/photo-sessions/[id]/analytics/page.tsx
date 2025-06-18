import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeftIcon,
  BarChart3Icon,
  TrendingUpIcon,
  UsersIcon,
  CircleDollarSignIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  MapPinIcon,
} from 'lucide-react';
import Link from 'next/link';
import { getPhotoSessionParticipants } from '@/app/actions/photo-session-participants';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';

interface AnalyticsPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  // 撮影会情報を取得
  const { data: session, error } = await supabase
    .from('photo_sessions')
    .select(
      `
      *,
      organizer:organizer_id(
        id,
        email,
        display_name,
        avatar_url
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !session) {
    notFound();
  }

  // 開催者チェック
  if (session.organizer_id !== user.id) {
    redirect(`/photo-sessions/${id}`);
  }

  // 参加者データを取得
  const participants = await getPhotoSessionParticipants(id);

  // スロット情報を取得
  const { data: slots } = await supabase
    .from('photo_session_slots')
    .select('*')
    .eq('photo_session_id', id)
    .eq('is_active', true)
    .order('slot_number');

  // 統計計算
  const hasSlots = slots && slots.length > 0;
  const totalCapacity = hasSlots
    ? slots.reduce((sum, slot) => sum + slot.max_participants, 0)
    : session.max_participants;
  const totalBookings = hasSlots
    ? slots.reduce((sum, slot) => sum + slot.current_participants, 0)
    : session.current_participants;

  const bookingRate =
    totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;
  const expectedRevenue = totalBookings * (session.price_per_person || 0);
  const maxRevenue = totalCapacity * (session.price_per_person || 0);

  // ステータス別統計
  const statusCounts = {
    confirmed: participants.filter(p => p.status === 'confirmed').length,
    pending: participants.filter(p => p.status === 'pending').length,
    cancelled: participants.filter(p => p.status === 'cancelled').length,
    waitlisted: participants.filter(p => p.status === 'waitlisted').length,
  };

  // 時間別予約分析（スロット制の場合）
  const timeSlotAnalysis = hasSlots
    ? slots.map(slot => ({
        time: `${slot.start_time} - ${slot.end_time}`,
        bookings: slot.current_participants,
        capacity: slot.max_participants,
        rate:
          slot.max_participants > 0
            ? Math.round(
                (slot.current_participants / slot.max_participants) * 100
              )
            : 0,
        revenue:
          slot.current_participants *
          (slot.price_per_person || session.price_per_person || 0),
      }))
    : [];

  // 予約トレンド（日別）
  const bookingTrend = participants.reduce(
    (acc, participant) => {
      const date = new Date(participant.created_at).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);
  const now = new Date();
  const isOngoing = startDate <= now && endDate > now;
  const isPast = endDate <= now;

  return (
    <DashboardLayout>
      <div>
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/photo-sessions/${id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              撮影会に戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3Icon className="h-6 w-6" />
              分析・統計
            </h1>
            <p className="text-muted-foreground">{session.title}</p>
          </div>
        </div>

        {/* 概要統計 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">予約率</p>
                  <p className="text-3xl font-bold">{bookingRate}%</p>
                  <Progress value={bookingRate} className="mt-2" />
                </div>
                <TrendingUpIcon className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">総参加者数</p>
                  <p className="text-3xl font-bold">{totalBookings}</p>
                  <p className="text-sm text-muted-foreground">
                    / {totalCapacity}名
                  </p>
                </div>
                <UsersIcon className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">予想収益</p>
                  <p className="text-3xl font-bold">
                    ¥{expectedRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    / ¥{maxRevenue.toLocaleString()}
                  </p>
                </div>
                <CircleDollarSignIcon className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    撮影会ステータス
                  </p>
                  <p className="text-lg font-bold">
                    {isPast ? '終了' : isOngoing ? '開催中' : '予定'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateLocalized(startDate, 'ja', 'short')}
                  </p>
                </div>
                <CalendarIcon className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 参加者ステータス分析 */}
          <Card>
            <CardHeader>
              <CardTitle>参加者ステータス分析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span className="font-medium">確定</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {statusCounts.confirmed}名
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {totalBookings > 0
                        ? Math.round(
                            (statusCounts.confirmed / totalBookings) * 100
                          )
                        : 0}
                      %
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                    <span className="font-medium">保留</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-yellow-600">
                      {statusCounts.pending}名
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {totalBookings > 0
                        ? Math.round(
                            (statusCounts.pending / totalBookings) * 100
                          )
                        : 0}
                      %
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                    <span className="font-medium">待機中</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-600">
                      {statusCounts.waitlisted}名
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {totalBookings > 0
                        ? Math.round(
                            (statusCounts.waitlisted / totalBookings) * 100
                          )
                        : 0}
                      %
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                    <span className="font-medium">キャンセル</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">
                      {statusCounts.cancelled}名
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {totalBookings > 0
                        ? Math.round(
                            (statusCounts.cancelled / totalBookings) * 100
                          )
                        : 0}
                      %
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 撮影会詳細情報 */}
          <Card>
            <CardHeader>
              <CardTitle>撮影会詳細情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {formatDateLocalized(startDate, 'ja', 'long')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatTimeLocalized(startDate, 'ja')} -{' '}
                    {formatTimeLocalized(endDate, 'ja')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPinIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{session.location}</div>
                  {session.address && (
                    <div className="text-sm text-muted-foreground">
                      {session.address}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CircleDollarSignIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {session.price_per_person === 0
                      ? '無料'
                      : `¥${session.price_per_person.toLocaleString()}/人`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {hasSlots ? 'スロット制' : session.booking_type}
                  </div>
                </div>
              </div>

              {hasSlots && (
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{slots?.length}スロット</div>
                    <div className="text-sm text-muted-foreground">
                      時間枠制撮影会
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* スロット別分析（スロット制の場合） */}
        {hasSlots && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>スロット別分析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeSlotAnalysis.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">スロット {index + 1}</Badge>
                      <div>
                        <div className="font-medium">{slot.time}</div>
                        <div className="text-sm text-muted-foreground">
                          {slot.bookings}/{slot.capacity}名 ({slot.rate}%)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        ¥{slot.revenue.toLocaleString()}
                      </div>
                      <Progress value={slot.rate} className="w-24 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 予約トレンド */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>予約トレンド</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(bookingTrend).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  まだ予約がありません
                </div>
              ) : (
                Object.entries(bookingTrend)
                  .sort(
                    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
                  )
                  .map(([date, count]) => (
                    <div
                      key={date}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="font-medium">{date}</div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{count}件の予約</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min((count / Math.max(...Object.values(bookingTrend))) * 100, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <Card>
          <CardHeader>
            <CardTitle>レポート・エクスポート</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline">
                <BarChart3Icon className="h-4 w-4 mr-2" />
                詳細レポートをダウンロード
              </Button>
              <Button variant="outline">参加者リストをエクスポート</Button>
              <Button variant="outline">収益レポートを生成</Button>
              <Button variant="outline">
                <StarIcon className="h-4 w-4 mr-2" />
                満足度調査を送信
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
