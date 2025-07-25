'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Users, AlertCircle, CheckCircle } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { SelectedModelCard } from './SelectedModelCard';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';
import type { SelectedModel, ModelSearchResult } from '@/types/photo-session';

interface ModelSelectionFormProps {
  selectedModels: SelectedModel[];
  onModelsChange: (models: SelectedModel[]) => void;
  maxModels?: number;
  disabled?: boolean;
}

export function ModelSelectionForm({
  selectedModels,
  onModelsChange,
  maxModels = 99,
  disabled = false,
}: ModelSelectionFormProps) {
  const [searchError, setSearchError] = useState<string | null>(null);
  const [allModels, setAllModels] = useState<ModelSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 全モデル一覧を取得
  useEffect(() => {
    const fetchAllModels = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, bio, user_type')
          .eq('user_type', 'model')
          .order('display_name');

        if (error) {
          logger.error('モデル一覧取得エラー:', error);
          return;
        }

        setAllModels(data || []);
      } catch (error) {
        logger.error('予期しないモデル取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllModels();
  }, []);

  // MultiSelect用のオプション作成
  const modelOptions = useMemo(() => {
    return allModels.map(model => ({
      label: model.display_name,
      value: model.id,
      icon: Users,
      type: 'model' as const,
    }));
  }, [allModels]);

  // マルチセレクトからの選択変更を処理
  const handleMultiSelectChange = (selectedIds: string[]) => {
    setSearchError(null);

    // 新しく追加されたモデルIDを特定
    const currentIds = selectedModels.map(m => m.model_id);
    const addedIds = selectedIds.filter(id => !currentIds.includes(id));
    const removedIds = currentIds.filter(id => !selectedIds.includes(id));

    let updatedModels = [...selectedModels];

    // 削除されたモデルを除去
    if (removedIds.length > 0) {
      updatedModels = updatedModels.filter(
        model => !removedIds.includes(model.model_id)
      );
    }

    // 新しく追加されたモデルを追加
    for (const modelId of addedIds) {
      const modelData = allModels.find(m => m.id === modelId);
      if (modelData) {
        const newModel: SelectedModel = {
          model_id: modelData.id,
          display_name: modelData.display_name,
          avatar_url: modelData.avatar_url,
          fee_amount: 5000, // デフォルト料金
          profile_id: modelData.id,
        };
        updatedModels.push(newModel);
      }
    }

    onModelsChange(updatedModels);
  };

  // モデル更新
  const handleModelUpdate = (updatedModel: SelectedModel) => {
    const updatedModels = selectedModels.map(model =>
      model.model_id === updatedModel.model_id ? updatedModel : model
    );
    onModelsChange(updatedModels);
  };

  // モデル削除
  const handleModelRemove = (modelId: string) => {
    const updatedModels = selectedModels.filter(
      model => model.model_id !== modelId
    );
    onModelsChange(updatedModels);
    setSearchError(null);
  };

  // 現在選択されているモデルIDのリスト
  const selectedModelIds = selectedModels.map(model => model.model_id);

  // 統計情報
  const totalFee = selectedModels.reduce(
    (sum, model) => sum + model.fee_amount,
    0
  );
  const isMaxReached = selectedModels.length >= maxModels;

  return (
    <div className="space-y-4">
      {/* 統計情報 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            選択中: {selectedModels.length} / {maxModels} 人
          </span>
        </div>
        {selectedModels.length > 0 && (
          <Badge variant="outline">総料金: ¥{totalFee.toLocaleString()}</Badge>
        )}
      </div>

      {/* モデル検索 - マルチセレクト */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">モデル選択</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <MultiSelect
              options={modelOptions}
              onValueChange={handleMultiSelectChange}
              defaultValue={selectedModelIds}
              placeholder="モデルを検索・選択してください..."
              variant="default"
              maxCount={3}
              className="w-full"
              disabled={disabled || isLoading}
            />

            {/* エラー表示 */}
            {searchError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            )}

            {/* 制限警告 */}
            {isMaxReached && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  最大選択数に達しました。これ以上追加するには、既存のモデルを削除してください。
                </AlertDescription>
              </Alert>
            )}

            {/* 使用方法ヒント */}
            {selectedModels.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                <p className="font-medium mb-2">💡 モデル選択のヒント</p>
                <ul className="space-y-1 text-xs">
                  <li>• 複数のモデルを一度に選択できます</li>
                  <li>• 各モデルに個別の料金を設定できます</li>
                  <li>• 同じモデルを重複して選択することはできません</li>
                  <li>• 最大{maxModels}人まで選択可能です</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 選択済みモデル一覧 */}
      {selectedModels.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">選択済みモデル</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedModels.map((model, index) => (
                <SelectedModelCard
                  key={model.model_id}
                  model={model}
                  index={index}
                  onUpdate={handleModelUpdate}
                  onRemove={handleModelRemove}
                  disabled={disabled}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
