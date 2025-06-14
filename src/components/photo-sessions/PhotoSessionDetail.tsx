'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  CircleDollarSignIcon,
  UserIcon,
  ImageIcon,
} from 'lucide-react';
import { PhotoSessionWithOrganizer } from '@/types/database';
import { PhotoSessionSlot } from '@/types/photo-session';
import { PhotoSessionBookingForm } from './PhotoSessionBookingForm';
import PhotoSessionSlotCard from './PhotoSessionSlotCard';
import { OrganizerManagementPanel } from './OrganizerManagementPanel';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import { format } from 'date-fns';

interface PhotoSessionDetailProps {
  session: PhotoSessionWithOrganizer;
  slots: PhotoSessionSlot[];
}

export function PhotoSessionDetail({
  session,
  slots,
}: PhotoSessionDetailProps) {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);
  const now = new Date();
  const isUpcoming = startDate > now;
  const isOngoing = startDate <= now && endDate > now;
  const isPast = endDate <= now;

  // 開催者判定
  const isOrganizer = user?.id === session.organizer_id;

  const getStatusBadge = () => {
    if (isPast) {
      return <Badge variant="secondary">終了</Badge>;
    }
    if (isOngoing) {
      return <Badge variant="default">開催中</Badge>;
    }
    if (isUpcoming) {
      return <Badge variant="outline">予定</Badge>;
    }
    return null;
  };

  const getAvailabilityBadge = () => {
    const available = session.max_participants - session.current_participants;
    if (available === 0) {
      return <Badge variant="destructive">満席</Badge>;
    }
    if (available <= 2) {
      return <Badge variant="secondary">残りわずか</Badge>;
    }
    return <Badge variant="default">空きあり</Badge>;
  };

  const handleBookingSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const hasSlots = slots && slots.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{session.title}</CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserIcon className="h-4 w-4" />
                <span>
                  主催者:{' '}
                  {session.organizer.display_name || session.organizer.email}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {getStatusBadge()}
              {!hasSlots && getAvailabilityBadge()}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 説明 */}
          {session.description && (
            <p className="text-muted-foreground">{session.description}</p>
          )}

          {/* 画像ギャラリー */}
          {session.image_urls && session.image_urls.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                画像ギャラリー
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {session.image_urls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`${session.title} - ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">開催詳細</h3>
              <div className="space-y-3">
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

                {!hasSlots && (
                  <>
                    <div className="flex items-center gap-3">
                      <UsersIcon className="h-5 w-5 text-muted-foreground" />
                      <span>
                        {session.current_participants}/
                        {session.max_participants}人
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <CircleDollarSignIcon className="h-5 w-5 text-muted-foreground" />
                      <span>
                        {session.price_per_person === 0
                          ? '無料'
                          : `¥${session.price_per_person.toLocaleString()}/人`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">主催者情報</h3>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={session.organizer.avatar_url || ''} />
                  <AvatarFallback>
                    {session.organizer.display_name?.[0] ||
                      session.organizer.email[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {session.organizer.display_name || session.organizer.email}
                  </div>
                  <div className="text-sm text-muted-foreground">主催者</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 開催者の場合は管理パネル、参加者の場合は予約フォーム */}
      {isOrganizer ? (
        <OrganizerManagementPanel session={session} slots={slots} />
      ) : hasSlots ? (
        <div className="space-y-6" key={`slots-${refreshKey}`}>
          <Card>
            <CardHeader>
              <CardTitle>予約可能枠</CardTitle>
              <p className="text-sm text-muted-foreground">
                ご希望の時間枠を選択してご予約ください
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map(slot => (
                  <PhotoSessionSlotCard
                    key={slot.id}
                    slot={slot}
                    photoSessionLocation={session.location}
                    photoSessionDate={format(startDate, 'yyyy年MM月dd日')}
                    onBookingSuccess={handleBookingSuccess}
                    isLoggedIn={!!user}
                    locale="ja"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <PhotoSessionBookingForm
          key={`booking-${refreshKey}`}
          session={session}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      <Separator />

      {/* 注意事項 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ご注意事項</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="space-y-2 list-disc list-inside">
            <li>キャンセルは撮影会開始の24時間前まで可能です</li>
            <li>遅刻される場合は必ず主催者にご連絡ください</li>
            <li>撮影した写真の使用については主催者の指示に従ってください</li>
            <li>体調不良の場合は無理をせず参加をお控えください</li>
            {hasSlots && (
              <li>
                スロット制撮影会では、予約した時間枠以外の参加はできません
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
