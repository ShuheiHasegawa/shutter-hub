'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ActionBar,
  ActionBarButton,
  ActionBarSpacer,
} from '@/components/ui/action-bar';
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  CircleDollarSignIcon,
  UserIcon,
  ImageIcon,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { PhotoSessionWithOrganizer } from '@/types/database';
import { PhotoSessionSlot } from '@/types/photo-session';
import PhotoSessionSlotCard from './PhotoSessionSlotCard';
import { OrganizerManagementPanel } from './OrganizerManagementPanel';
import { PhotoSessionGroupChat } from './PhotoSessionGroupChat';
import { PhotoSessionDocuments } from './PhotoSessionDocuments';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import { format } from 'date-fns';
import Image from 'next/image';
import {
  getPhotoSessionParticipants,
  checkUserParticipation,
  type PhotoSessionParticipant,
} from '@/app/actions/photo-session-participants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { createPhotoSessionBooking } from '@/app/actions/photo-session-booking';

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
  const [participants, setParticipants] = useState<PhotoSessionParticipant[]>(
    []
  );
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const { toast } = useToast();

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);
  const now = new Date();
  const isUpcoming = startDate > now;
  const isOngoing = startDate <= now && endDate > now;
  const isPast = endDate <= now;

  // 開催者判定
  const isOrganizer = user?.id === session.organizer_id;

  // 参加者データを取得
  useEffect(() => {
    const loadParticipantsData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [participantsData, userParticipation] = await Promise.all([
          getPhotoSessionParticipants(session.id),
          checkUserParticipation(session.id, user.id),
        ]);

        setParticipants(participantsData);
        setIsParticipant(userParticipation);
      } catch (error) {
        console.error('Error loading participants data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadParticipantsData();
  }, [session.id, user]);

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

  // 直接予約処理
  const handleDirectBooking = async () => {
    if (!user) {
      toast({
        title: 'ログインが必要です',
        description: '予約するにはログインしてください',
        variant: 'destructive',
      });
      return;
    }

    setIsBooking(true);
    try {
      const result = await createPhotoSessionBooking(session.id, user.id);

      if (result.success) {
        toast({
          title: '予約が完了しました！',
          description: '撮影会への参加が確定しました',
        });
        setShowBookingDialog(false);
        setRefreshKey(prev => prev + 1);
      } else {
        toast({
          title: 'エラー',
          description: result.error || '予約に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('予約エラー:', error);
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsBooking(false);
    }
  };

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

  const hasSlots = slots && slots.length > 0;

  // 予約可能状態の判定
  const canBook = !isOrganizer && !isParticipant && isUpcoming && user;
  const available = session.max_participants - session.current_participants;
  const isFull = available === 0;

  // アクションバーのボタン設定
  const getActionBarButtons = (): ActionBarButton[] => {
    if (isOrganizer || !user || !canBook) {
      return [];
    }

    if (hasSlots) {
      return [
        {
          id: 'select-slot',
          label: '時間枠を選択',
          variant: 'default',
          onClick: () => {
            // 撮影枠選択エリアにスクロール
            const slotsElement = document.getElementById('slots-section');
            if (slotsElement) {
              slotsElement.scrollIntoView({ behavior: 'smooth' });
            }
          },
          icon: <Calendar className="h-4 w-4" />,
          className: 'bg-blue-600 hover:bg-blue-700',
        },
      ];
    } else {
      return [
        {
          id: 'book-now',
          label: isFull ? 'キャンセル待ちに登録' : '予約する',
          variant: 'default',
          onClick: () => {
            setShowBookingDialog(true);
          },
          disabled: false,
          icon: <CreditCard className="h-4 w-4" />,
          className: 'bg-blue-600 hover:bg-blue-700',
        },
      ];
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 開催者管理パネル（主催者の場合、最上部に表示） */}
      {isOrganizer && (
        <OrganizerManagementPanel session={session} slots={slots} />
      )}

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
                  <div key={index} className="relative w-full h-48">
                    <Image
                      src={url}
                      alt={`${session.title} - ${index + 1}`}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
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

                {/* 予約方式表示 */}
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <span>
                    予約方式:{' '}
                    {getBookingTypeLabel(session.booking_type || 'first_come')}
                  </span>
                </div>
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

      {/* 参加者の場合は予約フォーム（モーダル表示） */}
      {!isOrganizer && hasSlots ? (
        <div
          id="slots-section"
          className="space-y-6"
          key={`slots-${refreshKey}`}
        >
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
      ) : null}

      {/* グループチャット機能（メッセージシステムが利用可能な場合のみ） */}
      {user && !loading && (isOrganizer || isParticipant) && (
        <div className="space-y-4">
          <PhotoSessionGroupChat
            sessionId={session.id}
            sessionTitle={session.title}
            sessionDate={formatDateLocalized(startDate, 'ja', 'long')}
            sessionLocation={session.location}
            organizerId={session.organizer_id}
            currentUserId={user.id}
            participants={participants}
          />
        </div>
      )}

      {/* ドキュメント管理機能 */}
      {user && !loading && (isOrganizer || isParticipant) && (
        <PhotoSessionDocuments
          sessionId={session.id}
          currentUserId={user.id}
          isOrganizer={isOrganizer}
          participants={participants}
        />
      )}

      {/* 注意事項（主催者以外のみ表示） */}
      {!isOrganizer && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ご注意事項</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="space-y-2 list-disc list-inside">
                <li>キャンセルは撮影会開始の24時間前まで可能です</li>
                <li>遅刻される場合は必ず主催者にご連絡ください</li>
                <li>
                  撮影した写真の使用については主催者の指示に従ってください
                </li>
                <li>体調不良の場合は無理をせず参加をお控えください</li>
                {hasSlots && (
                  <li>
                    撮影枠制撮影会では、予約した時間枠以外の参加はできません
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* 開催者向け注意事項（主催者のみ表示、最下部） */}
      {isOrganizer && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">開催者向け注意事項</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="space-y-2 list-disc list-inside">
                <li>参加者への適切な連絡・指示を心がけてください</li>
                <li>撮影時は参加者の安全と快適性を最優先してください</li>
                <li>時間管理を徹底し、予定通りの進行を心がけてください</li>
                <li>トラブル発生時は運営チームにご連絡ください</li>
                <li>
                  撮影した写真の取り扱いについて事前に参加者と合意を取ってください
                </li>
                {hasSlots && (
                  <li>
                    撮影枠制の場合、各時間枠の参加者管理を適切に行ってください
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* 固定フッターがある場合のスペーサー */}
      {canBook && <ActionBarSpacer />}

      {/* 固定フッターアクションバー */}
      {canBook && (
        <ActionBar
          actions={getActionBarButtons()}
          maxColumns={1}
          background="blur"
        />
      )}

      {/* 予約確認ダイアログ */}
      <AlertDialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>予約確認</AlertDialogTitle>
            <AlertDialogDescription>
              以下の撮影会を予約しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* 撮影会情報 */}
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium text-foreground">撮影会</div>
                <div className="text-muted-foreground">{session.title}</div>
              </div>

              <div>
                <div className="font-medium text-foreground">日時</div>
                <div className="text-muted-foreground">
                  {formatDateLocalized(startDate, 'ja', 'long')}
                  <br />
                  {formatTimeLocalized(startDate, 'ja')} -{' '}
                  {formatTimeLocalized(endDate, 'ja')}
                </div>
              </div>

              <div>
                <div className="font-medium text-foreground">場所</div>
                <div className="text-muted-foreground">
                  {session.location}
                  {session.address && (
                    <>
                      <br />
                      {session.address}
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="font-medium text-foreground">料金</div>
                <div className="text-muted-foreground">
                  {session.price_per_person === 0
                    ? '無料'
                    : `¥${session.price_per_person.toLocaleString()}`}
                </div>
              </div>
            </div>

            {/* 確認事項 */}
            <div className="border-t pt-4">
              <div className="font-medium text-foreground mb-2">確認事項</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 予約のキャンセルは撮影会開始の24時間前まで可能です</li>
                <li>• 遅刻される場合は主催者にご連絡ください</li>
                <li>• 体調不良の場合は無理をせず参加をお控えください</li>
              </ul>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDirectBooking}
              disabled={isBooking}
            >
              {isBooking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  予約中...
                </>
              ) : (
                '予約する'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
