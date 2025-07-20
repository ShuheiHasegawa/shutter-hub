'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { removeOrganizerModelAction } from '@/app/actions/organizer-model';
import type { OrganizerModelWithProfile } from '@/types/organizer-model';
import {
  Users,
  Trash2,
  Calendar,
  DollarSign,
  Activity,
  MapPin,
  User,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface OrganizerModelsListProps {
  models: OrganizerModelWithProfile[];
  onModelRemoved?: () => void;
  isLoading?: boolean;
}

export function OrganizerModelsList({
  models,
  onModelRemoved,
  isLoading = false,
}: OrganizerModelsListProps) {
  const { toast } = useToast();
  const [removingModelId, setRemovingModelId] = useState<string | null>(null);

  const handleRemoveModel = async (modelId: string, modelName: string) => {
    setRemovingModelId(modelId);
    try {
      const result = await removeOrganizerModelAction(modelId);

      if (result.success) {
        toast({
          title: '成功',
          description: `${modelName}の所属関係を削除しました`,
        });
        onModelRemoved?.();
      } else {
        toast({
          title: 'エラー',
          description: result.error || '削除に失敗しました',
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
      setRemovingModelId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          所属モデルがいません
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          「新規招待」タブからモデルを招待してみましょう
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {models.map(model => (
        <Card key={model.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              {/* モデル情報 */}
              <div className="flex items-start space-x-4 flex-1">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={model.model_profile?.avatar_url}
                    alt={model.model_profile?.display_name}
                  />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                      {model.model_profile?.display_name || 'Unknown'}
                    </h3>
                    <Badge
                      variant={
                        model.status === 'active' ? 'default' : 'secondary'
                      }
                      className="flex-shrink-0"
                    >
                      {model.status === 'active'
                        ? 'アクティブ'
                        : model.status === 'inactive'
                          ? '非アクティブ'
                          : '停止中'}
                    </Badge>
                  </div>

                  {model.model_profile?.bio && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {model.model_profile.bio}
                    </p>
                  )}

                  {/* 統計情報 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatDate(model.joined_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Activity className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {model.total_sessions_participated}回参加
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatCurrency(model.total_revenue_generated)}
                      </span>
                    </div>

                    {model.model_profile?.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400 truncate">
                          {model.model_profile.location}
                        </span>
                      </div>
                    )}
                  </div>

                  {model.last_activity_at && (
                    <div className="mt-2 text-xs text-gray-500">
                      最終活動: {formatDate(model.last_activity_at)}
                    </div>
                  )}
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex-shrink-0 ml-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removingModelId === model.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {removingModelId === model.id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>所属関係の削除</AlertDialogTitle>
                      <AlertDialogDescription>
                        {model.model_profile?.display_name}
                        との所属関係を削除しますか？
                        この操作は取り消すことができません。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          handleRemoveModel(
                            model.id,
                            model.model_profile?.display_name || 'Unknown'
                          )
                        }
                        className="bg-red-600 hover:bg-red-700"
                      >
                        削除する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
