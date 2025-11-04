'use client';

import { useState } from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { Footer } from '@/components/layout/footer';
import { DevToolsNavigation } from '@/components/dev/DevToolsNavigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createTestPhotoSessionWithBooking } from '@/app/actions/dev-test-flow';
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Users,
} from 'lucide-react';
import Link from 'next/link';

export default function PhotoSessionTestFlowPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    photo_session_id: string;
    booking_id: string;
    photo_session_url: string;
    booking_url: string;
  } | null>(null);

  // デフォルトのユーザーID
  const [organizerId, setOrganizerId] = useState(
    'bd4ddf07-8ca3-4df2-8b2d-849209daea22' // モデルID
  );
  const [participantId, setParticipantId] = useState(
    'c216595e-0b05-4b6b-bebe-65636ccb1007' // フォトグラファーID
  );
  const [title, setTitle] = useState('');
  const [daysAgo, setDaysAgo] = useState(1);
  const [hoursDuration, setHoursDuration] = useState(2);

  const handleCreateTestSession = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await createTestPhotoSessionWithBooking({
        organizer_id: organizerId,
        participant_id: participantId,
        title: title || undefined,
        days_ago: daysAgo,
        hours_duration: hoursDuration,
      });

      if (response.success && response.data) {
        setResult(response.data);
        toast({
          title: 'テスト撮影会を作成しました',
          description: '予約も確認済み状態で作成されました。レビュー可能です。',
        });
      } else {
        toast({
          title: 'エラー',
          description: response.error || 'テスト撮影会の作成に失敗しました',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DevToolsNavigation />
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <PublicHeader />
          <main>
            {/* ヘッダーセクション */}
            <section className="py-24 surface-primary">
              <div className="container">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Calendar className="h-8 w-8" />
                    <h1 className="text-4xl md:text-5xl font-bold">
                      撮影会テストフロー
                    </h1>
                  </div>
                  <p className="text-xl opacity-80 max-w-2xl mx-auto">
                    撮影会作成→予約→レビューまでのフローを効率的にテストするツール
                  </p>
                </div>
              </div>
            </section>

            {/* メインコンテンツ */}
            <section className="py-16 bg-background">
              <div className="container">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* 説明カード */}
                  <Card>
                    <CardHeader>
                      <CardTitle>使い方</CardTitle>
                      <CardDescription>
                        過去の日時に撮影会を作成し、予約を確認済み状態にしてレビュー可能な状態にします。
                        これにより、時間を待たずにレビューフローをテストできます。
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  {/* フォーム */}
                  <Card>
                    <CardHeader>
                      <CardTitle>テスト撮影会を作成</CardTitle>
                      <CardDescription>
                        指定したユーザーで撮影会を作成し、参加者の予約を確認済み状態にします。
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="organizerId">主催者ID（モデル）</Label>
                        <Input
                          id="organizerId"
                          value={organizerId}
                          onChange={e => setOrganizerId(e.target.value)}
                          placeholder="bd4ddf07-8ca3-4df2-8b2d-849209daea22"
                        />
                        <p className="text-xs text-muted-foreground">
                          <Link
                            href="/ja/profile/bd4ddf07-8ca3-4df2-8b2d-849209daea22"
                            target="_blank"
                            className="text-primary hover:underline"
                          >
                            モデルプロフィール
                          </Link>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="participantId">
                          参加者ID（フォトグラファー）
                        </Label>
                        <Input
                          id="participantId"
                          value={participantId}
                          onChange={e => setParticipantId(e.target.value)}
                          placeholder="c216595e-0b05-4b6b-bebe-65636ccb1007"
                        />
                        <p className="text-xs text-muted-foreground">
                          <Link
                            href="/ja/profile/c216595e-0b05-4b6b-bebe-65636ccb1007"
                            target="_blank"
                            className="text-primary hover:underline"
                          >
                            フォトグラファープロフィール
                          </Link>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="title">撮影会タイトル（任意）</Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder="テスト撮影会 2024-11-05"
                        />
                        <p className="text-xs text-muted-foreground">
                          空欄の場合は自動生成されます
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="daysAgo">何日前の撮影会か</Label>
                          <Input
                            id="daysAgo"
                            type="number"
                            min="1"
                            value={daysAgo}
                            onChange={e => setDaysAgo(Number(e.target.value))}
                          />
                          <p className="text-xs text-muted-foreground">
                            デフォルト: 1日前（レビュー可能）
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="hoursDuration">
                            撮影時間（時間）
                          </Label>
                          <Input
                            id="hoursDuration"
                            type="number"
                            min="1"
                            max="8"
                            value={hoursDuration}
                            onChange={e =>
                              setHoursDuration(Number(e.target.value))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            デフォルト: 2時間
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={handleCreateTestSession}
                        disabled={isLoading}
                        className="w-full"
                        size="lg"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            作成中...
                          </>
                        ) : (
                          <>
                            <Calendar className="mr-2 h-4 w-4" />
                            テスト撮影会を作成
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* 結果表示 */}
                  {result && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <CardTitle className="text-green-800">
                            テスト撮影会を作成しました
                          </CardTitle>
                        </div>
                        <CardDescription className="text-green-700">
                          予約は確認済み状態です。レビュー可能です。
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              撮影会ID:
                            </span>
                            <code className="text-xs bg-white px-2 py-1 rounded">
                              {result.photo_session_id}
                            </code>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">予約ID:</span>
                            <code className="text-xs bg-white px-2 py-1 rounded">
                              {result.booking_id}
                            </code>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button asChild variant="outline" className="flex-1">
                            <Link
                              href={result.photo_session_url}
                              target="_blank"
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              撮影会詳細を見る
                            </Link>
                          </Button>
                          <Button asChild variant="cta" className="flex-1">
                            <Link
                              href={`${result.photo_session_url}/reviews`}
                              target="_blank"
                              className="flex items-center gap-2"
                            >
                              <Users className="h-4 w-4" />
                              レビューを書く
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 注意事項 */}
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                      <CardTitle className="text-yellow-800">
                        注意事項
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-yellow-700 space-y-2">
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          このツールは開発・テスト環境でのみ使用してください
                        </li>
                        <li>
                          作成された撮影会は過去の日時に設定され、レビュー可能な状態です
                        </li>
                        <li>
                          予約は確認済み状態で作成されます（決済処理はスキップされます）
                        </li>
                        <li>
                          テスト完了後は、作成した撮影会を手動で削除してください
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
