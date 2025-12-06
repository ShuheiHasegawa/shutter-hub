'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { PublicHeader } from '@/components/layout/public-header';
import { DevToolsNavigation } from '@/components/dev/DevToolsNavigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Camera,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  getPhotographersList,
  createTestInstantRequest,
  getTestRequests,
  simulatePhotoDelivery,
} from '@/app/actions/instant-test';
import { approvePhotographer } from '@/app/actions/instant-photo';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { RequestType } from '@/types/instant-photo';

interface Photographer {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface TestRequest {
  id: string;
  guest_name: string;
  request_type: RequestType;
  budget: number;
  status: string;
  created_at: string;
  booking_id?: string;
  photographer_id?: string;
}

const requestTypeLabels: Record<RequestType, string> = {
  portrait: 'ポートレート',
  couple: 'カップル',
  family: 'ファミリー',
  group: 'グループ',
  landscape: '風景',
  pet: 'ペット',
};

const statusLabels: Record<string, string> = {
  pending: '待機中',
  photographer_accepted: 'カメラマン受諾済み',
  guest_approved: 'ゲスト承認済み',
  matched: 'マッチング済み',
  in_progress: '撮影中',
  completed: '完了',
  delivered: '配信済み',
  cancelled: 'キャンセル',
  expired: '期限切れ',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  photographer_accepted: 'bg-orange-100 text-orange-800',
  guest_approved: 'bg-cyan-100 text-cyan-800',
  matched: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
};

export default function InstantTestPage() {
  const locale = useLocale();
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [selectedPhotographerId, setSelectedPhotographerId] =
    useState<string>('');
  const [testRequests, setTestRequests] = useState<TestRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const { toast } = useToast();

  // フォトグラファー一覧を取得
  useEffect(() => {
    const loadPhotographers = async () => {
      const result = await getPhotographersList();
      if (result.success && result.data) {
        setPhotographers(result.data);
        if (result.data.length > 0) {
          setSelectedPhotographerId(result.data[0].id);
        }
      } else {
        toast({
          title: 'エラー',
          description:
            result.error || 'フォトグラファー一覧の取得に失敗しました',
          variant: 'destructive',
        });
      }
    };

    loadPhotographers();
  }, [toast]);

  // テストリクエスト一覧を取得
  const loadTestRequests = async () => {
    setIsLoadingRequests(true);
    const result = await getTestRequests();
    if (result.success && result.data) {
      setTestRequests(result.data);
    } else {
      toast({
        title: 'エラー',
        description: result.error || 'テストリクエスト一覧の取得に失敗しました',
        variant: 'destructive',
      });
    }
    setIsLoadingRequests(false);
  };

  useEffect(() => {
    loadTestRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // テストリクエストを作成
  const handleCreateRequest = async () => {
    if (!selectedPhotographerId) {
      toast({
        title: 'エラー',
        description: 'フォトグラファーを選択してください',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const result = await createTestInstantRequest(selectedPhotographerId);

    if (result.success) {
      toast({
        title: '成功',
        description: 'テストリクエストを作成しました',
      });
      // リクエスト一覧を再読み込み
      await loadTestRequests();
    } else {
      toast({
        title: 'エラー',
        description: result.error || 'テストリクエストの作成に失敗しました',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  // ゲスト承認（本番フローに沿ったテスト用）
  const handleApproveAsGuest = async (
    requestId: string,
    photographerId?: string
  ) => {
    if (!photographerId) return;

    setApprovingId(requestId);
    try {
      const result = await approvePhotographer(requestId, photographerId);

      if (result.success) {
        const bookingId = result.data?.bookingId;
        toast({
          title: '承認完了',
          description: bookingId
            ? `フォトグラファーを承認し、予約を作成しました (bookingId: ${bookingId})`
            : 'フォトグラファーを承認しました',
        });
        await loadTestRequests();
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'フォトグラファー承認処理に失敗しました',
          variant: 'destructive',
        });
      }
    } finally {
      setApprovingId(null);
    }
  };

  // 写真配信シミュレート（テスト用）
  const handleSimulateDelivery = async (bookingId: string) => {
    setDeliveringId(bookingId);
    try {
      const result = await simulatePhotoDelivery(bookingId);

      if (result.success) {
        toast({
          title: '配信シミュレート完了',
          description: `写真配信をシミュレートしました。URL: ${result.data?.deliveryUrl}`,
        });
        await loadTestRequests();
      } else {
        toast({
          title: 'エラー',
          description: result.error || '写真配信シミュレートに失敗しました',
          variant: 'destructive',
        });
      }
    } finally {
      setDeliveringId(null);
    }
  };

  // 日時をフォーマット
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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
                    <Camera className="h-8 w-8" />
                    <h1 className="text-4xl md:text-5xl font-bold">
                      即座撮影テストツール
                    </h1>
                  </div>
                  <p className="text-xl opacity-80 max-w-2xl mx-auto">
                    即座撮影リクエストのテストデータ作成とStripe決済テスト
                  </p>
                </div>
              </div>
            </section>

            {/* メインコンテンツ */}
            <section className="py-16 bg-background">
              <div className="container max-w-6xl">
                <div className="space-y-8">
                  {/* リクエスト作成セクション */}
                  <Card>
                    <CardHeader>
                      <CardTitle>テストリクエスト作成</CardTitle>
                      <CardDescription>
                        フォトグラファーを選択してランダムなリクエストを作成します
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          フォトグラファー選択
                        </label>
                        <Select
                          value={selectedPhotographerId}
                          onValueChange={setSelectedPhotographerId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="フォトグラファーを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {photographers.map(photographer => (
                              <SelectItem
                                key={photographer.id}
                                value={photographer.id}
                              >
                                {photographer.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          選択したフォトグラファーが依頼を受ける形でテストデータが作成されます。
                          ランダムなゲスト情報、撮影タイプ、料金が自動生成されます。
                        </AlertDescription>
                      </Alert>

                      <Button
                        onClick={handleCreateRequest}
                        disabled={isLoading || !selectedPhotographerId}
                        className="w-full"
                        variant="cta"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            作成中...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            テストリクエストを作成
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* 作成済みリクエスト一覧 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>作成済みテストリクエスト</CardTitle>
                          <CardDescription>
                            最近作成したテストリクエスト一覧
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadTestRequests}
                          disabled={isLoadingRequests}
                        >
                          {isLoadingRequests ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            '更新'
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {testRequests.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          まだテストリクエストが作成されていません
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>ゲスト名</TableHead>
                                <TableHead>撮影タイプ</TableHead>
                                <TableHead>料金</TableHead>
                                <TableHead>ステータス</TableHead>
                                <TableHead>作成日時</TableHead>
                                <TableHead>操作</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {testRequests.map(request => (
                                <TableRow key={request.id}>
                                  <TableCell className="font-medium">
                                    {request.guest_name}
                                  </TableCell>
                                  <TableCell>
                                    {requestTypeLabels[request.request_type]}
                                  </TableCell>
                                  <TableCell>
                                    ¥{request.budget.toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      className={
                                        statusColors[request.status] ||
                                        'bg-gray-100 text-gray-800'
                                      }
                                    >
                                      {statusLabels[request.status] ||
                                        request.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {formatDateTime(request.created_at)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-2">
                                      {request.status ===
                                        'photographer_accepted' &&
                                        request.photographer_id && (
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() =>
                                              handleApproveAsGuest(
                                                request.id,
                                                request.photographer_id
                                              )
                                            }
                                            disabled={
                                              approvingId === request.id
                                            }
                                          >
                                            {approvingId === request.id
                                              ? '承認中...'
                                              : 'ゲストとして承認（テスト）'}
                                          </Button>
                                        )}

                                      {request.booking_id ? (
                                        <>
                                          <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                          >
                                            <Link
                                              href={`/${locale}/instant/payment/${request.booking_id}`}
                                              target="_blank"
                                            >
                                              <ExternalLink className="mr-2 h-3 w-3" />
                                              決済ページ
                                            </Link>
                                          </Button>
                                          {/* 決済完了後かつ配信前の場合のみ配信シミュレートボタンを表示 */}
                                          {[
                                            'in_progress',
                                            'completed',
                                          ].includes(request.status) && (
                                            <Button
                                              variant="secondary"
                                              size="sm"
                                              onClick={() =>
                                                request.booking_id &&
                                                handleSimulateDelivery(
                                                  request.booking_id
                                                )
                                              }
                                              disabled={
                                                deliveringId ===
                                                request.booking_id
                                              }
                                            >
                                              {deliveringId ===
                                              request.booking_id
                                                ? '配信中...'
                                                : '📷 写真配信シミュレート'}
                                            </Button>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">
                                          マッチング待ち
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 使い方説明 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>使い方</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">
                          1. フォトグラファー選択
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          既存のフォトグラファーユーザーから選択します。
                          選択したフォトグラファーが依頼を受ける形でテストデータが作成されます。
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold">
                          2. テストリクエスト作成
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          「テストリクエストを作成」ボタンをクリックすると、
                          ランダムなゲスト情報、撮影タイプ、料金でリクエストが作成されます。
                          自動マッチングが実行され、選択したフォトグラファーにマッチングされます。
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold">3. 決済テスト</h3>
                        <p className="text-sm text-muted-foreground">
                          マッチングが成功したリクエストは「決済ページ」リンクが表示されます。
                          リンクをクリックしてStripe決済フローをテストできます。
                        </p>
                      </div>
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          テストデータは「090-TEST-XXXX」形式の電話番号で識別されます。
                          ゲスト利用制限（月3回）は適用されません。
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
