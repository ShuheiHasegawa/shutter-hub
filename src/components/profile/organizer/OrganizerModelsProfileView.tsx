'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Calendar, Mail, Clock } from 'lucide-react';
import { formatDateLocalized } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import Link from 'next/link';
import type { OrganizerModelWithProfile } from '@/types/organizer-model';

interface OrganizerModelsProfileViewProps {
  models: OrganizerModelWithProfile[];
  isLoading?: boolean;
  showContactButton?: boolean; // 他のユーザーのプロフィールを見る場合
}

/**
 * プロフィールページ用のシンプルなモデル一覧表示
 * 管理機能なし、表示のみに特化
 */
export function OrganizerModelsProfileView({
  models,
  isLoading = false,
  showContactButton = false,
}: OrganizerModelsProfileViewProps) {
  logger.debug('[OrganizerModelsProfileView] レンダリング開始', {
    modelsLength: models.length,
    isLoading,
    showContactButton,
    models,
  });
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-32 bg-muted"></div>
            <CardContent className="p-4 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
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
          まだモデルを招待していないか、承認待ちの状態です。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 統計サマリー（最大4列維持） */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold brand-primary">
              {models.length}
            </div>
            <div className="text-xs text-muted-foreground">総モデル数</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold brand-success">
              {models.filter(m => m.status === 'active').length}
            </div>
            <div className="text-xs text-muted-foreground">アクティブ</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold brand-info">
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
            <div className="text-2xl font-bold brand-warning">
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

      {/* モデル一覧 - コンパクトグリッド（最大3列） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map(model => (
          <Card
            key={model.id}
            className="group relative overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300"
          >
            {/* ステータスバッジ */}
            <div className="absolute top-2 right-2 z-10">
              {getStatusBadge(model.status)}
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
                  <h3 className="text-sm font-semibold text-foreground truncate hover:text-brand-primary transition-colors cursor-pointer">
                    {model.model_profile?.display_name || '未設定'}
                  </h3>
                </Link>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDateLocalized(
                      new Date(model.joined_at),
                      'ja',
                      'short'
                    )}
                  </span>
                </div>
              </div>

              {/* 統計情報 - コンパクト */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-semibold brand-info">
                    {model.total_sessions_participated || 0}
                  </div>
                  <div className="text-muted-foreground">参加回数</div>
                </div>

                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-semibold brand-success">
                    ¥{Math.floor((model.total_revenue_generated || 0) / 1000)}K
                  </div>
                  <div className="text-muted-foreground">収益</div>
                </div>
              </div>

              {/* 最終活動日 */}
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  最終活動:{' '}
                  {model.last_activity_at
                    ? formatDateLocalized(
                        new Date(model.last_activity_at),
                        'ja',
                        'short'
                      )
                    : '未記録'}
                </span>
              </div>

              {/* アクションボタン（他のユーザーのプロフィールを見る場合） */}
              {showContactButton && (
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
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
    </div>
  );
}
