'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePhotobookEditorStore } from '@/stores/photobook-editor-store';
import { cn } from '@/lib/utils';
import type { PhotobookAspectRatio } from '@/types/photobook-editor';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ASPECT_RATIO_OPTIONS: Array<{
  value: PhotobookAspectRatio;
  label: string;
  description: string;
  preview: { width: number; height: number };
}> = [
  {
    value: 'portrait',
    label: '縦長',
    description: 'A4縦 (210×297mm)',
    preview: { width: 28, height: 40 },
  },
  {
    value: 'landscape',
    label: '横長',
    description: 'A4横 (297×210mm)',
    preview: { width: 40, height: 28 },
  },
  {
    value: 'square',
    label: '正方形',
    description: '210×210mm',
    preview: { width: 32, height: 32 },
  },
];

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { currentProject, updateProjectMeta, updateProjectSettings } =
    usePhotobookEditorStore();

  const [title, setTitle] = React.useState(currentProject?.meta.title || '');
  const [description, setDescription] = React.useState(
    currentProject?.meta.description || ''
  );
  const [aspectRatio, setAspectRatio] = React.useState<PhotobookAspectRatio>(
    currentProject?.settings.aspectRatio || 'portrait'
  );

  // プロジェクトが変更されたらフォームを更新
  React.useEffect(() => {
    if (currentProject) {
      setTitle(currentProject.meta.title);
      setDescription(currentProject.meta.description || '');
      setAspectRatio(currentProject.settings.aspectRatio || 'portrait');
    }
  }, [currentProject]);

  const handleSave = () => {
    if (updateProjectMeta) {
      updateProjectMeta({
        title,
        description,
      });
    }
    if (updateProjectSettings) {
      updateProjectSettings({
        aspectRatio,
      });
    }
    onOpenChange(false);
  };

  if (!currentProject) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>プロジェクト設定</DialogTitle>
          <DialogDescription>
            フォトブックの基本情報を編集します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* タイトル */}
          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="フォトブックのタイトル"
            />
          </div>

          {/* 説明 */}
          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Input
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="フォトブックの説明（任意）"
            />
          </div>

          {/* アスペクト比選択 */}
          <div className="space-y-2">
            <Label>形状</Label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIO_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAspectRatio(option.value)}
                  className={cn(
                    'flex flex-col items-center p-3 border-2 rounded-lg transition-colors',
                    aspectRatio === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  )}
                >
                  {/* プレビュー形状 */}
                  <div
                    className={cn(
                      'border-2 rounded mb-2',
                      aspectRatio === option.value
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-800'
                        : 'border-gray-300 bg-gray-100 dark:bg-gray-700'
                    )}
                    style={{
                      width: option.preview.width,
                      height: option.preview.height,
                    }}
                  />
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs opacity-60">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* DPI（読み取り専用） */}
          <div className="space-y-2">
            <Label>解像度</Label>
            <div className="text-sm opacity-70">
              {currentProject.settings.dpi} DPI
            </div>
          </div>

          {/* ページ数 */}
          <div className="space-y-2">
            <Label>ページ数</Label>
            <div className="text-sm opacity-70">
              {currentProject.pages.length} ページ
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
