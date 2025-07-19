'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Users, AlertCircle, CheckCircle } from 'lucide-react';
import { ModelSearchInput } from './ModelSearchInput';
import { SelectedModelCard } from './SelectedModelCard';
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

  // モデル追加
  const handleModelAdd = (searchResult: ModelSearchResult) => {
    setSearchError(null);

    // 重複チェック
    const isDuplicate = selectedModels.some(
      model => model.model_id === searchResult.id
    );

    if (isDuplicate) {
      setSearchError('このモデルは既に選択されています');
      return;
    }

    // 最大数チェック
    if (selectedModels.length >= maxModels) {
      setSearchError(`最大${maxModels}人まで選択可能です`);
      return;
    }

    // 新しいモデルを追加
    const newModel: SelectedModel = {
      model_id: searchResult.id,
      display_name: searchResult.display_name,
      avatar_url: searchResult.avatar_url,
      fee_amount: 5000, // デフォルト料金
      profile_id: searchResult.id,
    };

    onModelsChange([...selectedModels, newModel]);
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

  // 除外IDリスト
  const excludeIds = selectedModels.map(model => model.model_id);

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

      {/* モデル検索 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">モデル検索</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ModelSearchInput
              onModelSelect={handleModelAdd}
              excludeIds={excludeIds}
              placeholder="モデル名で検索してください..."
              disabled={disabled || isMaxReached}
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
                  <li>• モデル名を入力して検索してください</li>
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
