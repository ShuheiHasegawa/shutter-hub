import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { LoadingCard } from '@/components/ui/loading-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { UsersIcon } from 'lucide-react';
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
        return <Badge variant="secondary">確定</Badge>;
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
    <AuthenticatedLayout>
      <div>
        {/* ヘッダー */}
        <PageTitleHeader
          title="参加者管理"
          description={session.title}
          icon={<UsersIcon className="h-5 w-5" />}
          backButton={{
            href: `/photo-sessions/${id}`,
            variant: 'ghost',
          }}
        />

        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold brand-success">
                {statusCounts.confirmed}
              </div>
              <div className="text-sm text-muted-foreground">確定</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold brand-warning">
                {statusCounts.pending}
              </div>
              <div className="text-sm text-muted-foreground">保留</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold brand-error">
                {statusCounts.cancelled}
              </div>
              <div className="text-sm text-muted-foreground">キャンセル</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {statusCounts.waitlisted}
              </div>
              <div className="text-sm text-muted-foreground">待機中</div>
            </CardContent>
          </Card>
        </div>

        {/* 管理アクション */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>管理アクション</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Button
                variant="outline"
                className="w-full justify-center sm:justify-start"
              >
                一斉メッセージ送信
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center sm:justify-start"
              >
                出欠確認送信
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center sm:justify-start"
              >
                リマインダー送信
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center sm:justify-start"
              >
                参加者データエクスポート
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 参加者一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              参加者一覧 ({participants.length}名)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <Suspense fallback={<LoadingCard />}>
              <div className="space-y-4">
                {participants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    まだ参加者がいません
                  </div>
                ) : (
                  participants.map(participant => (
                    <div
                      key={participant.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="flex-shrink-0">
                          <AvatarImage
                            src={participant.user.avatar_url || ''}
                          />
                          <AvatarFallback>
                            {participant.user.display_name?.[0] ||
                              participant.user.email[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {participant.user.display_name ||
                              participant.user.email}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {participant.user.email}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {getStatusBadge(participant.status)}
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              予約:{' '}
                              {new Date(
                                participant.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 sm:ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          詳細
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
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
      </div>
    </AuthenticatedLayout>
  );
}
