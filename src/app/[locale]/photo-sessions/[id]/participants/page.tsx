import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { LoadingCard } from '@/components/ui/loading-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeftIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { getPhotoSessionParticipants } from '@/app/actions/photo-session-participants';

interface ParticipantPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ParticipantsPage({
  params,
}: ParticipantPageProps) {
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

  // ステータス別統計
  const statusCounts = {
    confirmed: participants.filter(p => p.status === 'confirmed').length,
    pending: participants.filter(p => p.status === 'pending').length,
    cancelled: participants.filter(p => p.status === 'cancelled').length,
    waitlisted: participants.filter(p => p.status === 'waitlisted').length,
  };

  // ステータスバッジ
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">確定</Badge>;
      case 'pending':
        return <Badge variant="outline">保留</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">キャンセル</Badge>;
      case 'waitlisted':
        return <Badge variant="secondary">待機中</Badge>;
      default:
        return <Badge variant="outline">不明</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/photo-sessions/${id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              撮影会に戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">参加者管理</h1>
            <p className="text-muted-foreground">{session.title}</p>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {statusCounts.confirmed}
              </div>
              <div className="text-sm text-green-700">確定</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {statusCounts.pending}
              </div>
              <div className="text-sm text-yellow-700">保留</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {statusCounts.cancelled}
              </div>
              <div className="text-sm text-red-700">キャンセル</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">
                {statusCounts.waitlisted}
              </div>
              <div className="text-sm text-gray-700">待機中</div>
            </CardContent>
          </Card>
        </div>

        {/* 参加者一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              参加者一覧 ({participants.length}名)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<LoadingCard />}>
              <div className="space-y-3">
                {participants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    まだ参加者がいません
                  </div>
                ) : (
                  participants.map(participant => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={participant.user.avatar_url || ''}
                          />
                          <AvatarFallback>
                            {participant.user.display_name?.[0] ||
                              participant.user.email[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {participant.user.display_name ||
                              participant.user.email}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {participant.user.email}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(participant.status)}
                            <span className="text-xs text-muted-foreground">
                              予約:{' '}
                              {new Date(
                                participant.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          詳細
                        </Button>
                        <Button variant="outline" size="sm">
                          メッセージ
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Suspense>
          </CardContent>
        </Card>

        {/* 管理アクション */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>管理アクション</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline">一斉メッセージ送信</Button>
              <Button variant="outline">出欠確認送信</Button>
              <Button variant="outline">リマインダー送信</Button>
              <Button variant="outline">参加者データエクスポート</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
