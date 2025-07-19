'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { X, Edit2, Check, User } from 'lucide-react';
import type { SelectedModel } from '@/types/photo-session';

interface SelectedModelCardProps {
  model: SelectedModel;
  onUpdate: (updatedModel: SelectedModel) => void;
  onRemove: (modelId: string) => void;
  disabled?: boolean;
  showIndex?: boolean;
  index?: number;
}

export function SelectedModelCard({
  model,
  onUpdate,
  onRemove,
  disabled = false,
  showIndex = true,
  index = 0,
}: SelectedModelCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedFee, setEditedFee] = useState(model.fee_amount.toString());

  const handleSave = () => {
    const newFee = parseInt(editedFee) || 0;
    if (newFee < 0) {
      setEditedFee(model.fee_amount.toString());
      return;
    }

    onUpdate({
      ...model,
      fee_amount: newFee,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedFee(model.fee_amount.toString());
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <Card className="relative group">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* インデックス番号 */}
          {showIndex && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              {index + 1}
            </div>
          )}

          {/* アバター */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={model.avatar_url} alt={model.display_name} />
            <AvatarFallback>
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>

          {/* モデル情報 */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{model.display_name}</h4>
            <p className="text-sm text-muted-foreground">モデル</p>
          </div>

          {/* 料金設定 */}
          <div className="flex-shrink-0 w-32">
            {isEditing ? (
              <div className="space-y-2">
                <Label htmlFor={`fee-${model.model_id}`} className="text-xs">
                  料金（円）
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id={`fee-${model.model_id}`}
                    type="number"
                    value={editedFee}
                    onChange={e => setEditedFee(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="h-8 text-sm"
                    min="0"
                    step="100"
                    autoFocus
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSave}
                    className="h-6 w-6 p-0"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs">料金</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    ¥{model.fee_amount.toLocaleString()}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    disabled={disabled}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 削除ボタン */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(model.model_id)}
            disabled={disabled}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
