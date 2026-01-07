'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  User,
  Calendar,
  Mail,
  Clock,
  Settings,
  MoreVertical,
  UserMinus,
} from 'lucide-react';
import { FormattedDateTime } from '@/components/ui/formatted-display';
import { logger } from '@/lib/utils/logger';
import { useToast } from '@/hooks/use-toast';
import { removeOrganizerModelAction } from '@/app/actions/organizer-model';
import { getUserAvailability } from '@/app/actions/user-availability';
import Link from 'next/link';
import type { OrganizerModelWithProfile } from '@/types/organizer-model';

interface OrganizerModelsCommonProps {
  models: OrganizerModelWithProfile[];
  isLoading?: boolean;
  showContactButton?: boolean;
  showStatistics?: boolean;
  variant?: 'profile' | 'management';
  isOwnProfile?: boolean;
  onDataChanged?: () => void;
}

/**
 * 運営者の所属モデル表示共通コンポーネント
 * プロフィールページと管理ページで共通使用
 */
export function OrganizerModelsCommon({
  models,
  isLoading = false,
  showContactButton = false,
  showStatistics = true,
  variant = 'profile',
  isOwnProfile = false,
  onDataChanged,
}: OrganizerModelsCommonProps) {
  const [removingModelId, setRemovingModelId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [modelAvailabilityCounts, setModelAvailabilityCounts] = useState<
    Record<string, number>
  >({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const { toast } = useToast();

  logger.debug('[OrganizerModelsCommon] レンダリング開始', {
    modelsLength: models.length,
    isLoading,
    showContactButton,
    showStatistics,
    variant,
  });

  // 各モデルの空き時間数を取得
  useEffect(() => {
    if (models.length === 0 || isLoading) return;

    const loadAvailabilityCounts = async () => {
      setLoadingAvailability(true);
      try {
        const today = new Date();
        const threeMonthsLater = new Date(today);
        threeMonthsLater.setMonth(today.getMonth() + 3);

        const startDate = today.toISOString().split('T')[0];
        const endDate = threeMonthsLater.toISOString().split('T')[0];

        const counts: Record<string, number> = {};

        await Promise.all(
          models.map(async model => {
            try {
              const result = await getUserAvailability(
                model.model_id,
                startDate,
                endDate
              );
              if (result.success && result.data) {
                counts[model.model_id] = result.data.length;
              } else {
                counts[model.model_id] = 0;
              }
            } catch (error) {
              logger.error(
                `モデル ${model.model_id} の空き時間取得エラー:`,
                error
              );
              counts[model.model_id] = 0;
            }
          })
        );

        setModelAvailabilityCounts(counts);
      } catch (error) {
        logger.error('空き時間取得エラー:', error);
      } finally {
        setLoadingAvailability(false);
      }
    };

    loadAvailabilityCounts();
  }, [models, isLoading]);

  const handleRemoveModel = async (modelId: string, modelName: string) => {
    setIsRemoving(true);
    try {
      const result = await removeOrganizerModelAction(modelId);

      if (result.success) {
        toast({
          title: '所属解除完了',
          description: `${modelName}さんとの所属関係を解除しました`,
        });

        // データ再読み込み
        onDataChanged?.();
      } else {
        toast({
          title: 'エラー',
          description: result.error || '所属解除に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('所属解除エラー:', error);
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(false);
      setRemovingModelId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="secondary" className="text-xs">
            アクティブ
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="outline" className="text-xs">
            非アクティブ
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="destructive" className="text-xs">
            停止中
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  // 既存データがある場合はスケルトンローディングを表示しない（チカチカ防止）
  if (isLoading && models.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-32 w-full rounded-t-lg" />
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">所属モデルがいません</h3>
        <p className="text-muted-foreground">
          {variant === 'management'
            ? 'まだモデルを招待していないか、承認待ちの状態です。'
            : 'この運営者にはまだ所属モデルがいません。'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* プロフィール表示で自分のプロフィールの場合のみ管理ページへの導線 */}
      {variant === 'profile' && isOwnProfile && (
        <div className="flex justify-center mt-4 mb-4">
          <Link href="/models">
            <Button variant="navigation" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              モデル管理ページへ
            </Button>
          </Link>
        </div>
      )}

      {/* モデル一覧 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map(model => (
          <Card
            key={model.id}
            className="group relative overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300"
          >
            {/* ヘッダー部分（ステータスバッジとメニュー） */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
              {getStatusBadge(model.status)}

              {/* 管理画面でのみメニューを表示 */}
              {variant === 'management' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-background/80"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-error focus:text-error cursor-pointer"
                      onClick={() => setRemovingModelId(model.id)}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      所属解除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* モデル画像 */}
            <Link href={`/profile/${model.model_id}`} className="block">
              <div className="relative h-32 overflow-hidden bg-muted cursor-pointer flex items-center justify-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={model.model_profile?.avatar_url || undefined}
                    alt={model.model_profile?.display_name || 'モデル'}
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xl font-semibold">
                    {model.model_profile?.display_name
                      ?.charAt(0)
                      ?.toUpperCase() || 'M'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </Link>

            <CardContent className="p-4 space-y-3">
              {/* モデル基本情報 */}
              <div className="text-center">
                <Link href={`/profile/${model.model_id}`}>
                  <h3 className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors cursor-pointer">
                    {model.model_profile?.display_name || '未設定'}
                  </h3>
                </Link>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    <FormattedDateTime
                      value={new Date(model.joined_at)}
                      format="date-short"
                    />
                  </span>
                </div>
              </div>

              {/* 統計情報 - コンパクト */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-semibold text-primary">
                    {model.total_sessions_participated || 0}
                  </div>
                  <div className="text-muted-foreground">参加回数</div>
                </div>

                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-semibold text-primary">
                    ¥{Math.floor((model.total_revenue_generated || 0) / 1000)}K
                  </div>
                  <div className="text-muted-foreground">収益</div>
                </div>
              </div>

              {/* 空き時間情報 */}
              <div className="text-center p-2 bg-muted/30 rounded border border-primary/20">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  <span>空き時間（3ヶ月先まで）</span>
                </div>
                {loadingAvailability ? (
                  <div className="text-xs text-muted-foreground">
                    読み込み中...
                  </div>
                ) : (
                  <div className="font-semibold text-primary">
                    {modelAvailabilityCounts[model.model_id] ?? 0}件
                  </div>
                )}
              </div>

              {/* 最終活動日 */}
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  最終活動:{' '}
                  {model.last_activity_at ? (
                    <FormattedDateTime
                      value={new Date(model.last_activity_at)}
                      format="date-short"
                    />
                  ) : (
                    '未記録'
                  )}
                </span>
              </div>

              {/* アクションボタン */}
              {showContactButton && (
                <div className="pt-2 border-t">
                  <Button
                    variant="navigation"
                    size="sm"
                    className="w-full text-xs"
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    連絡する
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 統計サマリー */}
      {showStatistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {models.length}
              </div>
              <div className="text-xs text-muted-foreground">総モデル数</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {models.filter(m => m.status === 'active').length}
              </div>
              <div className="text-xs text-muted-foreground">アクティブ</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {models.reduce(
                  (sum, m) => sum + (m.total_sessions_participated || 0),
                  0
                )}
              </div>
              <div className="text-xs text-muted-foreground">総参加回数</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                ¥
                {Math.floor(
                  models.reduce(
                    (sum, m) => sum + (m.total_revenue_generated || 0),
                    0
                  ) / 1000
                )}
                K
              </div>
              <div className="text-xs text-muted-foreground">総収益貢献</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 所属解除確認ダイアログ */}
      <AlertDialog
        open={!!removingModelId}
        onOpenChange={open => !open && setRemovingModelId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>所属解除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              {removingModelId && (
                <>
                  <span className="font-semibold">
                    {
                      models.find(m => m.id === removingModelId)?.model_profile
                        ?.display_name
                    }
                  </span>
                  さんとの所属関係を解除しますか？
                  <br />
                  <br />
                  この操作は取り消せません。解除後、再度招待を送信することで所属関係を再構築できます。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-error text-error-foreground hover:bg-error/90"
              disabled={isRemoving}
              onClick={() => {
                const model = models.find(m => m.id === removingModelId);
                if (model && removingModelId) {
                  handleRemoveModel(
                    removingModelId,
                    model.model_profile?.display_name || 'モデル'
                  );
                }
              }}
            >
              {isRemoving ? '解除中...' : '所属解除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
