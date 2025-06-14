import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  SettingsIcon,
  UsersIcon,
  EditIcon,
  BarChart3Icon,
  MessageSquareIcon,
  CalendarIcon,
  CopyIcon,
} from 'lucide-react';
import { PhotoSessionWithOrganizer } from '@/types/database';
import { PhotoSessionSlot } from '@/types/photo-session';
import { useRouter } from 'next/navigation';

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
      {/* 開催者専用ヘッダー */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <SettingsIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-blue-900">
                  開催者管理パネル
                </CardTitle>
                <p className="text-sm text-blue-700">
                  あなたが主催する撮影会の管理画面です
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              主催者
            </Badge>
          </div>
        </CardHeader>
      </Card>

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
                  {hasSlots ? 'スロット数' : '予約方式'}
                </p>
                <p className="text-2xl font-bold">
                  {hasSlots ? slots.length : session.booking_type}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              onClick={() => console.log('複製機能は開発中です')}
            >
              <CopyIcon className="h-5 w-5" />
              <span className="text-sm">撮影会を複製</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() => console.log('参加者管理機能は開発中です')}
            >
              <UsersIcon className="h-5 w-5" />
              <span className="text-sm">参加者管理</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() => console.log('メッセージ機能は開発中です')}
            >
              <MessageSquareIcon className="h-5 w-5" />
              <span className="text-sm">メッセージ</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              onClick={() => console.log('分析機能は開発中です')}
            >
              <BarChart3Icon className="h-5 w-5" />
              <span className="text-sm">分析・統計</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* スロット別詳細（スロット制の場合） */}
      {hasSlots && (
        <Card>
          <CardHeader>
            <CardTitle>スロット別予約状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">スロット {index + 1}</Badge>
                    <div>
                      <p className="font-medium">
                        {slot.start_time} - {slot.end_time}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ¥
                        {slot.price_per_person?.toLocaleString() ||
                          session.price_per_person.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {slot.current_participants}/{slot.max_participants}
                    </span>
                    <Badge
                      variant={
                        slot.current_participants >= slot.max_participants
                          ? 'destructive'
                          : 'default'
                      }
                    >
                      {slot.current_participants >= slot.max_participants
                        ? '満席'
                        : '空きあり'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* 注意事項 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">開催者向け注意事項</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="space-y-2 list-disc list-inside">
            <li>参加者との連絡は必ずプラットフォーム内で行ってください</li>
            <li>撮影会の変更・キャンセルは早めに参加者に通知してください</li>
            <li>参加者の安全と快適な撮影環境の提供を心がけてください</li>
            <li>撮影した写真の取り扱いについて事前に説明してください</li>
            <li>トラブルが発生した場合は運営チームにご連絡ください</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
