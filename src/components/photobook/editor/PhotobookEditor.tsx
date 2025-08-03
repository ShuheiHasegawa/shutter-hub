'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Download,
  Eye,
  EyeOff,
  Grid3X3,
  Settings,
} from 'lucide-react';
import {
  usePhotobookEditorStore,
  useCurrentProject,
  useActivePage,
} from '@/stores/photobook-editor-store';
import { NativeDndProvider } from './NativeDndProvider';
import EditorSidebar from './EditorSidebar';
import EditableCanvas from './EditableCanvas';
import { ToastProvider } from './ToastManager';
import { cn } from '@/lib/utils';

// ============================================
// ツールバーコンポーネント
// ============================================

const EditorToolbar: React.FC = () => {
  const {
    canUndo,
    canRedo,
    isPreviewMode,
    editorState,
    undo,
    redo,
    setPreviewMode,
    setZoom,
    toggleGrid,
    saveProject,
    currentProject,
  } = usePhotobookEditorStore();

  const handleZoomIn = () => {
    setZoom(Math.min(editorState.zoomLevel + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(editorState.zoomLevel - 0.25, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleSave = async () => {
    try {
      await saveProject();
      // TODO: 成功通知
    } catch {
      // TODO: エラー通知
      // console.error('保存エラー:', error);
    }
  };

  return (
    <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
      {/* 左側のツール */}
      <div className="flex items-center space-x-2">
        {/* アンドゥ・リドゥ */}
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            className="p-2"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            className="p-2"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* ズームコントロール */}
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            className="p-2"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            className="px-3 text-xs"
          >
            {Math.round(editorState.zoomLevel * 100)}%
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            className="p-2"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        {/* 表示オプション */}
        <div className="flex items-center space-x-1">
          <Button
            variant={editorState.showGrid ? 'default' : 'outline'}
            size="sm"
            onClick={toggleGrid}
            className="p-2"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 中央のプロジェクト名 */}
      <div className="flex-1 flex justify-center">
        <h1 className="text-lg font-semibold text-gray-800">
          {currentProject?.meta.title || 'Untitled Project'}
        </h1>
      </div>

      {/* 右側のアクション */}
      <div className="flex items-center space-x-2">
        {/* プレビューモード */}
        <Button
          variant={isPreviewMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPreviewMode(!isPreviewMode)}
          className="flex items-center space-x-1"
        >
          {isPreviewMode ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">プレビュー</span>
        </Button>

        <div className="w-px h-6 bg-gray-300" />

        {/* 保存・エクスポート */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          className="flex items-center space-x-1"
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">保存</span>
        </Button>

        <Button size="sm" className="flex items-center space-x-1">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">エクスポート</span>
        </Button>

        {/* プロパティ設定 */}
        <Button
          variant="outline"
          size="sm"
          className="p-2"
          title="プロパティ設定"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ============================================
// ページナビゲーションコンポーネント
// ============================================

const PageNavigation: React.FC = () => {
  const { currentProject, editorState, setActivePage, addPage } =
    usePhotobookEditorStore();

  if (!currentProject) return null;

  return (
    <div className="bg-gray-50 border-b px-4 py-2">
      <div className="flex items-center space-x-2 overflow-x-auto">
        {/* ページサムネイル */}
        <div className="flex space-x-2">
          {currentProject.pages.map((page, index) => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={cn(
                'flex-shrink-0 w-16 h-20 border-2 rounded bg-white flex items-center justify-center text-xs font-medium transition-colors',
                editorState.activePageId === page.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              )}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* ページ追加ボタン */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => addPage()}
          className="flex-shrink-0 h-20 w-16 text-xs border-dashed"
        >
          + 追加
        </Button>
      </div>
    </div>
  );
};

// ============================================
// メインエディターコンポーネント
// ============================================

interface PhotobookEditorProps {
  projectId?: string;
  className?: string;
}

const PhotobookEditor: React.FC<PhotobookEditorProps> = ({
  projectId,
  className,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  const {
    createNewProject,
    loadProject,
    isProjectLoading,
    projectError,
    setAccountTier,
  } = usePhotobookEditorStore();

  const currentProject = useCurrentProject();
  const activePage = useActivePage();

  // 水和エラー回避のためのマウント確認
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // プロジェクトの初期化
  useEffect(() => {
    if (!isMounted) return;

    if (projectId) {
      loadProject(projectId);
    } else if (!currentProject) {
      createNewProject('新しいフォトブック');
    }
  }, [isMounted, projectId, currentProject, loadProject, createNewProject]);

  // 開発時の設定（実際の実装では認証から取得）
  useEffect(() => {
    if (!isMounted) return;
    setAccountTier('premium');
  }, [isMounted, setAccountTier]);

  // サーバーサイドまたは未マウント時は最小限のローディングを表示
  if (!isMounted) {
    return (
      <div
        className={cn('flex items-center justify-center h-screen', className)}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (isProjectLoading) {
    return (
      <div
        className={cn('flex items-center justify-center h-screen', className)}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">プロジェクトを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (projectError) {
    return (
      <div
        className={cn('flex items-center justify-center h-screen', className)}
      >
        <div className="text-center">
          <p className="text-red-600 mb-2">エラーが発生しました</p>
          <p className="text-gray-600 text-sm">{projectError}</p>
          <Button
            onClick={() => createNewProject('新しいフォトブック')}
            className="mt-4"
          >
            新しいプロジェクトを作成
          </Button>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div
        className={cn('flex items-center justify-center h-screen', className)}
      >
        <div className="text-center">
          <p className="text-gray-600 mb-4">プロジェクトがありません</p>
          <Button onClick={() => createNewProject('新しいフォトブック')}>
            新しいプロジェクトを作成
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <NativeDndProvider>
        <div className={cn('h-screen flex flex-col bg-gray-100', className)}>
          {/* ツールバー */}
          <EditorToolbar />

          {/* ページナビゲーション */}
          <PageNavigation />

          {/* メインエディターエリア */}
          <div className="flex-1 flex overflow-hidden">
            {/* サイドバー */}
            <EditorSidebar />

            {/* キャンバスエリア - サイドバーと同じ幅に調整 */}
            <div className="w-80 flex flex-col border-l border-gray-200">
              <div className="flex-1 p-4">
                <EditableCanvas className="w-full h-full" />
              </div>

              {/* ステータスバー */}
              <div className="bg-white border-t px-4 py-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span>
                      ページ {activePage?.pageNumber} /{' '}
                      {currentProject.pages.length}
                    </span>
                    <span>要素: {activePage?.elements.length || 0}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span>{currentProject.meta.accountTier} プラン</span>
                    <span className="text-xs text-gray-500">
                      最終保存:{' '}
                      {currentProject.meta.lastSavedAt
                        ? new Date(
                            currentProject.meta.lastSavedAt
                          ).toLocaleString()
                        : '未保存'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </NativeDndProvider>
    </ToastProvider>
  );
};

export default PhotobookEditor;
