'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Layout, Settings, Image, X } from 'lucide-react';
import { usePhotobookEditorStore } from '@/stores/photobook-editor-store';
import {
  DraggableImageBox,
  DraggableTextBox,
  DraggableShapeBox,
  DraggableLayoutTemplate,
  DraggableUploadedImage,
} from './DraggableElements';
import {
  singlePageTemplates,
  spreadTemplates,
} from '@/constants/layoutTemplates';
import { cn } from '@/lib/utils';

// ============================================
// レイアウトタブコンポーネント
// ============================================

const LayoutTab: React.FC = () => {
  // const { currentProject } = usePhotobookEditorStore();

  return (
    <div className="space-y-6">
      {/* 基本要素 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">基本要素</h3>
        <div className="grid grid-cols-1 gap-3">
          <DraggableImageBox />
          <DraggableTextBox />
        </div>
      </div>

      {/* 図形 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">図形</h3>
        <div className="grid grid-cols-2 gap-2">
          <DraggableShapeBox shapeType="rectangle" className="p-2" />
          <DraggableShapeBox shapeType="circle" className="p-2" />
          <DraggableShapeBox shapeType="triangle" className="p-2" />
          <DraggableShapeBox shapeType="star" className="p-2" />
        </div>
      </div>

      {/* レイアウトテンプレート */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          単一ページテンプレート
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {singlePageTemplates.map(template => (
            <DraggableLayoutTemplate
              key={template.id}
              template={template}
              className="p-2"
            />
          ))}
        </div>
      </div>

      {/* 見開きテンプレート */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          見開きテンプレート
        </h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {spreadTemplates.map(template => (
            <DraggableLayoutTemplate
              key={template.id}
              template={template}
              className="p-2"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// アップロードタブコンポーネント
// ============================================

const UploadTab: React.FC = () => {
  const {
    currentProject,
    isUploading,
    uploadProgress,
    uploadImages,
    removeImageResource,
  } = usePhotobookEditorStore();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  // ファイル選択
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await uploadImages(files);
  };

  // ドラッグ&ドロップ
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const uploadedImages = currentProject?.resources.images || [];

  return (
    <div className="space-y-6">
      {/* ファイルアップロード */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          画像アップロード
        </h3>

        {/* ドラッグ&ドロップエリア */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300',
            isUploading && 'opacity-50 pointer-events-none'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">画像をドラッグ&ドロップ</p>
          <p className="text-xs text-gray-500 mb-3">または</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            ファイルを選択
          </Button>
        </div>

        {/* プログレスバー */}
        {isUploading && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              アップロード中... {Math.round(uploadProgress)}%
            </p>
          </div>
        )}

        {/* ファイル入力 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => handleFileSelect(e.target.files)}
        />
      </div>

      {/* アップロード済み画像 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          アップロード済み画像 ({uploadedImages.length})
        </h3>

        {uploadedImages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Image
              className="h-12 w-12 mx-auto mb-2 opacity-50"
              aria-label="画像なしアイコン"
            />
            <p className="text-sm">まだ画像がありません</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {uploadedImages.map(image => (
              <div key={image.id} className="relative group">
                <DraggableUploadedImage image={image} />
                {/* 削除ボタン */}
                <button
                  onClick={() => {
                    if (window.confirm(`${image.name}を削除しますか？`)) {
                      removeImageResource(image.id);
                    }
                  }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  aria-label={`${image.name}を削除`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// プロパティタブコンポーネント
// ============================================

const PropertiesTab: React.FC = () => {
  const { editorState, setZoom, toggleGrid, toggleGuides, toggleSnapToGrid } =
    usePhotobookEditorStore();

  return (
    <div className="space-y-6">
      {/* ビュー設定 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">ビュー設定</h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="zoom" className="text-xs">
              ズーム: {Math.round(editorState.zoomLevel * 100)}%
            </Label>
            <Input
              id="zoom"
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={editorState.zoomLevel}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="mt-1"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-grid"
                checked={editorState.showGrid}
                onChange={toggleGrid}
                className="rounded border-gray-300"
              />
              <Label htmlFor="show-grid" className="text-sm">
                グリッド表示
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-guides"
                checked={editorState.showGuides}
                onChange={toggleGuides}
                className="rounded border-gray-300"
              />
              <Label htmlFor="show-guides" className="text-sm">
                ガイド表示
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="snap-to-grid"
                checked={editorState.snapToGrid}
                onChange={toggleSnapToGrid}
                className="rounded border-gray-300"
              />
              <Label htmlFor="snap-to-grid" className="text-sm">
                グリッドスナップ
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* 選択要素情報 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">選択要素</h3>
        {editorState.selectedElements.length === 0 ? (
          <p className="text-sm text-gray-500">要素が選択されていません</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              {editorState.selectedElements.length}個の要素を選択中
            </p>
            {/* TODO: 選択要素の詳細プロパティ編集 */}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// メインサイドバーコンポーネント
// ============================================

interface EditorSidebarProps {
  className?: string;
}

const EditorSidebar: React.FC<EditorSidebarProps> = ({ className }) => {
  const { sidebarOpen, activeTab, setSidebarOpen, setActiveTab } =
    usePhotobookEditorStore();

  if (!sidebarOpen) {
    return (
      <div className={cn('w-12 bg-gray-50 border-r flex flex-col', className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="p-2 m-2"
        >
          <Layout className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('w-80 bg-white border-r flex flex-col', className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">編集パネル</h2>
        <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={value =>
            setActiveTab(value as 'layout' | 'upload' | 'properties')
          }
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="layout" className="text-xs">
              <Layout className="h-4 w-4 mr-1" />
              レイアウト
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-xs">
              <Upload className="h-4 w-4 mr-1" />
              アップロード
            </TabsTrigger>
            <TabsTrigger value="properties" className="text-xs">
              <Settings className="h-4 w-4 mr-1" />
              プロパティ
            </TabsTrigger>
          </TabsList>

          <div className="p-4 overflow-y-auto h-full">
            <TabsContent value="layout" className="mt-0">
              <LayoutTab />
            </TabsContent>

            <TabsContent value="upload" className="mt-0">
              <UploadTab />
            </TabsContent>

            <TabsContent value="properties" className="mt-0">
              <PropertiesTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default EditorSidebar;
