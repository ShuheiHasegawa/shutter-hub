import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/utils/logger';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  InfoIcon,
  MessageSquareIcon,
  StarIcon,
  CalendarIcon,
  UsersIcon,
} from 'lucide-react';
import { PhotoSessionWithOrganizer } from '@/types/database';

interface ParticipantInfoPanelProps {
  session: PhotoSessionWithOrganizer;
  isParticipant: boolean;
}

export function ParticipantInfoPanel({
  session,
  isParticipant,
}: ParticipantInfoPanelProps) {
  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);
  const now = new Date();
  const isUpcoming = startDate > now;
  const isOngoing = startDate <= now && endDate > now;
  const isPast = endDate <= now;

  const getStatusInfo = () => {
    if (isPast) {
      return {
        status: '終了',
        color: 'bg-gray-500',
        message: 'この撮影会は終了しました',
      };
    }
    if (isOngoing) {
      return {
        status: '開催中',
        color: 'bg-green-500',
        message: '現在開催中です',
      };
    }
    if (isUpcoming) {
      return {
        status: '予定',
        color: 'bg-blue-500',
        message: '開催予定です',
      };
    }
    return { status: '', color: '', message: '' };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-6">
      {/* 参加者向けヘッダー */}
      {isParticipant && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <InfoIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-green-900">
                    参加予定の撮影会
                  </CardTitle>
                  <p className="text-sm text-green-700">
                    この撮影会にご参加いただきありがとうございます
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                参加者
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* 撮影会ステータス */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
              <div>
                <p className="font-medium">{statusInfo.status}</p>
                <p className="text-sm text-muted-foreground">
                  {statusInfo.message}
                </p>
              </div>
            </div>
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* 参加者向けアクション */}
      {isParticipant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              参加者向けアクション
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex-col gap-2"
                onClick={() =>
                  logger.debug('主催者にメッセージ機能は開発中です')
                }
              >
                <MessageSquareIcon className="h-5 w-5" />
                <span className="text-sm">主催者にメッセージ</span>
              </Button>

              {isPast && (
                <Button
                  variant="outline"
                  className="h-auto p-4 flex-col gap-2"
                  onClick={() => logger.debug('レビュー投稿機能は開発中です')}
                >
                  <StarIcon className="h-5 w-5" />
                  <span className="text-sm">レビューを投稿</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 参加者向け注意事項 */}
      {isParticipant && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">参加者向け注意事項</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="space-y-2 list-disc list-inside">
                <li>撮影会開始の15分前には会場にお越しください</li>
                <li>遅刻される場合は必ず主催者にご連絡ください</li>
                <li>撮影に必要な衣装や小物は事前にご準備ください</li>
                <li>体調不良の場合は無理をせず、早めにご連絡ください</li>
                <li>
                  撮影した写真の使用については主催者の指示に従ってください
                </li>
                <li>他の参加者への配慮をお願いします</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* 一般向け情報 */}
      {!isParticipant && !isUpcoming && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto">
                <InfoIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-medium text-lg">
                  {isPast ? '終了した撮影会です' : '開催中の撮影会です'}
                </h3>
                <p className="text-muted-foreground">
                  {isPast
                    ? 'この撮影会は既に終了しています。他の撮影会をご検討ください。'
                    : '現在開催中のため、新規の参加申し込みはできません。'}
                </p>
              </div>
              <Button variant="outline" onClick={() => window.history.back()}>
                撮影会一覧に戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
