'use client';

import { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Filter,
  MoreVertical,
  User,
  Calendar,
  TrendingUp,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { OrganizerModelWithProfile } from '@/types/organizer-model';

interface OrganizerModelsListProps {
  models: OrganizerModelWithProfile[];
  onRefresh?: () => void;
}

interface FilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  type: 'models';
}

export function OrganizerModelsList({
  models,
  onRefresh,
}: OrganizerModelsListProps) {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [sortField, setSortField] = useState<
    | 'joined_at'
    | 'display_name'
    | 'total_sessions_participated'
    | 'last_activity_at'
  >('joined_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // フィルターオプションの定義（モデル名のみ）
  const filterOptions: FilterOption[] = useMemo(() => {
    // モデル名フィルター（実際のモデルから動的生成）
    const uniqueModels = Array.from(
      new Set(models.map(m => m.model_profile?.display_name).filter(Boolean))
    );

    return uniqueModels.map(name => ({
      label: name!,
      value: name!,
      icon: User,
      type: 'models' as const,
    }));
  }, [models]);

  // フィルタリングとソート
  const filteredAndSortedModels = useMemo(() => {
    const filtered = models.filter(model => {
      // フィルターが選択されていない場合は全て表示
      if (selectedFilters.length === 0) return true;

      // 選択されたモデル名に一致するかチェック
      return selectedFilters.includes(model.model_profile?.display_name || '');
    });

    // ソート
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortField) {
        case 'display_name':
          aValue = a.model_profile?.display_name || '';
          bValue = b.model_profile?.display_name || '';
          break;
        case 'total_sessions_participated':
          aValue = a.total_sessions_participated || 0;
          bValue = b.total_sessions_participated || 0;
          break;
        case 'last_activity_at':
          aValue = a.last_activity_at
            ? new Date(a.last_activity_at)
            : new Date(0);
          bValue = b.last_activity_at
            ? new Date(b.last_activity_at)
            : new Date(0);
          break;
        default: // joined_at
          aValue = new Date(a.joined_at);
          bValue = new Date(b.joined_at);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [models, selectedFilters, sortField, sortOrder]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="secondary" className="text-green-600">
            アクティブ
          </Badge>
        );
      case 'inactive':
        return <Badge variant="outline">非アクティブ</Badge>;
      case 'suspended':
        return <Badge variant="destructive">停止中</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年MM月dd日', { locale: ja });
    } catch {
      return '不明';
    }
  };

  return (
    <div className="space-y-4">
      {/* 検索・フィルター */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <MultiSelect
            options={filterOptions}
            onValueChange={setSelectedFilters}
            defaultValue={selectedFilters}
            placeholder="モデル名で絞り込み..."
            variant="default"
            maxCount={3}
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
              setSortOrder(newOrder);
            }}
            className="min-w-[120px]"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {sortOrder === 'asc' ? '昇順' : '降順'}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              const fields = [
                'joined_at',
                'display_name',
                'total_sessions_participated',
                'last_activity_at',
              ] as const;
              const currentIndex = fields.indexOf(sortField);
              const nextIndex = (currentIndex + 1) % fields.length;
              setSortField(fields[nextIndex]);
            }}
            className="min-w-[140px]"
          >
            <Filter className="h-4 w-4 mr-2" />
            {sortField === 'joined_at' && '参加日時順'}
            {sortField === 'display_name' && '名前順'}
            {sortField === 'total_sessions_participated' && '参加数順'}
            {sortField === 'last_activity_at' && '最終活動順'}
          </Button>

          {onRefresh && (
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 結果表示 */}
      <div className="text-sm text-muted-foreground">
        {filteredAndSortedModels.length} 件中 {filteredAndSortedModels.length}{' '}
        件を表示
      </div>

      {/* モデル一覧 - クリーンなグリッドレイアウト */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAndSortedModels.map(model => (
          <Card
            key={model.id}
            className="group relative overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300"
          >
            {/* ステータスバッジ - 絶対配置 */}
            <div className="absolute top-4 right-4 z-10">
              {getStatusBadge(model.status)}
            </div>

            {/* モデル画像 */}
            <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-800">
              <Avatar className="h-full w-full rounded-none">
                <AvatarImage
                  src={model.model_profile?.avatar_url || undefined}
                  alt={model.model_profile?.display_name || 'モデル'}
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <AvatarFallback className="h-full w-full rounded-none bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-4xl font-semibold">
                  {model.model_profile?.display_name
                    ?.charAt(0)
                    ?.toUpperCase() || 'M'}
                </AvatarFallback>
              </Avatar>

              {/* アクションメニュー - ホバー時表示 */}
              <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-white/90 dark:bg-gray-800/90 shadow-sm"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem>
                      <User className="h-4 w-4 mr-2" />
                      プロフィール表示
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Mail className="h-4 w-4 mr-2" />
                      メッセージ送信
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              {/* モデル基本情報 */}
              <div className="space-y-3">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {model.model_profile?.display_name || '未設定'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {model.model_profile?.email}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>参加日: {formatDate(model.joined_at)}</span>
                </div>
              </div>

              {/* 統計情報 - ミニマル */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {model.total_sessions_participated || 0}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    参加回数
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    ¥{Math.floor((model.total_revenue_generated || 0) / 1000)}K
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    収益貢献
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {model.last_activity_at
                      ? format(new Date(model.last_activity_at), 'MM/dd', {
                          locale: ja,
                        })
                      : '---'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    最終活動
                  </p>
                </div>
              </div>

              {/* 契約情報 */}
              {(model.contract_start_date ||
                model.contract_end_date ||
                model.notes) && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    契約情報
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {model.contract_start_date && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs">
                          開始日
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDate(model.contract_start_date)}
                        </span>
                      </div>
                    )}
                    {model.contract_end_date && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs">
                          終了日
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDate(model.contract_end_date)}
                        </span>
                      </div>
                    )}
                  </div>

                  {model.notes && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs block mb-1">
                        メモ
                      </span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {model.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 結果なし */}
      {filteredAndSortedModels.length === 0 && models.length > 0 && (
        <div className="text-center py-12">
          <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">該当するモデルがいません</h3>
          <p className="text-muted-foreground">
            フィルター条件を変更してください。
          </p>
        </div>
      )}
    </div>
  );
}
