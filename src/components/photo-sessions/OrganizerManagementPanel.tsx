import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  SettingsIcon,
  UsersIcon,
  EditIcon,
  BarChart3Icon,
  CalendarIcon,
  CopyIcon,
  Clock,
} from 'lucide-react';
import { PhotoSessionWithOrganizer } from '@/types/database';
import { PhotoSessionSlot } from '@/types/photo-session';
import { useRouter } from 'next/navigation';
import { formatTime } from '@/lib/utils/date';

interface OrganizerManagementPanelProps {
  session: PhotoSessionWithOrganizer;
  slots: PhotoSessionSlot[];
}

export function OrganizerManagementPanel({
  session,
  slots,
}: OrganizerManagementPanelProps) {
  const router = useRouter();
  const hasSlots = slots && slots.length > 0;

  // 予約方式の日本語化
  const getBookingTypeLabel = (bookingType: string) => {
    const bookingTypes: Record<string, string> = {
      first_come: '先着順',
      lottery: '抽選',
      admin_lottery: '管理抽選',
      priority: '優先予約',
      waitlist: 'キャンセル待ち',
    };
    return bookingTypes[bookingType] || bookingType;
  };
  const totalBookings = hasSlots
    ? slots.reduce((sum, slot) => sum + slot.current_participants, 0)
    : session.current_participants;
  const totalCapacity = hasSlots
    ? slots.reduce((sum, slot) => sum + slot.max_participants, 0)
    : session.max_participants;

  const getBookingRate = () => {
    if (totalCapacity === 0) return 0;
    return Math.round((totalBookings / totalCapacity) * 100);
  };

  const getStatusColor = () => {
    const rate = getBookingRate();
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-yellow-500';
    if (rate >= 50) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">予約状況</p>
                <p className="text-2xl font-bold">
                  {totalBookings}/{totalCapacity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                <span className="text-sm font-medium">{getBookingRate()}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {hasSlots ? '撮影枠数' : '予約方式'}
                </p>
                <p className="text-2xl font-bold">
                  {hasSlots
                    ? slots.length
                    : getBookingTypeLabel(session.booking_type || 'first_come')}
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">収益予想</p>
                <p className="text-2xl font-bold">
                  ¥
                  {(
                    totalBookings * (session.price_per_person || 0)
                  ).toLocaleString()}
                </p>
              </div>
              <BarChart3Icon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 管理アクション */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            管理アクション
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() => router.push(`/photo-sessions/${session.id}/edit`)}
            >
              <EditIcon className="h-5 w-5" />
              <span className="text-sm">撮影会を編集</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() =>
                router.push(`/photo-sessions/${session.id}/duplicate`)
              }
            >
              <CopyIcon className="h-5 w-5" />
              <span className="text-sm">撮影会を複製</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() =>
                router.push(`/photo-sessions/${session.id}/participants`)
              }
            >
              <UsersIcon className="h-5 w-5" />
              <span className="text-sm">参加者管理</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() =>
                router.push(`/photo-sessions/${session.id}/analytics`)
              }
            >
              <BarChart3Icon className="h-5 w-5" />
              <span className="text-sm">分析・統計</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* タイムライン型レイアウト（スロット制の場合） */}
      {hasSlots && (
        <Card>
          <CardHeader>
            <div className="mb-6 flex items-center">
              <Clock className="text-xl mr-3 text-blue-600 h-6 w-6" />
              <h2 className="text-2xl font-bold">撮影枠別予約状況</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              {slots.map((slot, index) => {
                const isFullyBooked =
                  slot.current_participants >= slot.max_participants;
                const bookingRate =
                  slot.max_participants > 0
                    ? Math.round(
                        (slot.current_participants / slot.max_participants) *
                          100
                      )
                    : 0;
                const revenue =
                  slot.current_participants *
                  (slot.price_per_person || session.price_per_person);
                const showProgress = slot.max_participants > 1; // 予約可能人数が1人の場合は進捗非表示

                return (
                  <div key={slot.id} className="relative mb-8">
                    <div
                      className={`absolute left-8 top-0 bottom-0 w-0.5 ${
                        isFullyBooked ? 'bg-rose-400' : 'bg-emerald-400'
                      }`}
                      style={{
                        top: '-1rem',
                        bottom: index === slots.length - 1 ? '0' : '-1rem',
                      }}
                    ></div>

                    <div
                      className={`absolute left-6 top-0 h-4 w-4 rounded-full border-2 border-white ${
                        isFullyBooked ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    ></div>

                    <div className="ml-16">
                      <Card className="border-0 shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Badge
                                variant="outline"
                                className={`mr-2 font-semibold ${
                                  isFullyBooked
                                    ? 'bg-rose-100 text-rose-700 border-rose-300'
                                    : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                }`}
                              >
                                枠 {slot.slot_number}
                              </Badge>
                              <h3 className="text-lg font-semibold">
                                {formatTime(new Date(slot.start_time))} -{' '}
                                {formatTime(new Date(slot.end_time))}
                              </h3>
                            </div>

                            <Badge
                              className={`${
                                isFullyBooked
                                  ? 'bg-rose-600 hover:bg-rose-700'
                                  : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {isFullyBooked ? '満席' : '空きあり'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                            <div>
                              <div className="text-sm text-gray-600">
                                参加者
                              </div>
                              <div className="font-semibold">
                                {slot.current_participants}/
                                {slot.max_participants}人
                              </div>
                            </div>

                            <div>
                              <div className="text-sm text-gray-600">
                                予約率
                              </div>
                              <div className="font-semibold">
                                {bookingRate}%
                              </div>
                            </div>

                            <div>
                              <div className="text-sm text-gray-600">料金</div>
                              <div className="font-semibold">
                                ¥
                                {(
                                  slot.price_per_person ||
                                  session.price_per_person
                                ).toLocaleString()}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm text-gray-600">収益</div>
                              <div
                                className={`font-semibold ${revenue > 0 ? 'text-green-600' : ''}`}
                              >
                                ¥{revenue.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* 予約進捗表示（予約可能人数が1人の場合は非表示） */}
                          {showProgress && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span>予約進捗</span>
                                <span>{bookingRate}%</span>
                              </div>
                              <Progress
                                value={bookingRate}
                                className={`h-1.5 ${isFullyBooked ? 'bg-rose-200' : 'bg-emerald-200'}`}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
