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
  Grid3X3,
  Settings,
} from 'lucide-react';
import {
  usePhotobookEditorStore,
  useCurrentProject,
  useActivePage,
} from '@/stores/photobook-editor-store';
import type { PhotobookPage } from '@/types/photobook-editor';
import { NativeDndProvider } from './NativeDndProvider';
import EditorSidebar from './EditorSidebar';
import EditableCanvas from './EditableCanvas';
import { ToastProvider } from './ToastManager';
import { SettingsDialog } from './SettingsDialog';
import { PreviewModal } from './PreviewModal';
import { cn } from '@/lib/utils';
import { FormattedDateTime } from '@/components/ui/formatted-display';

// ============================================
// ツールバーコンポーネント
// ============================================

const EditorToolbar: React.FC<{
  onSettingsClick: () => void;
  onPreviewClick: () => void;
}> = ({ onSettingsClick, onPreviewClick }) => {
  const {
    canUndo,
    canRedo,
    editorState,
    undo,
    redo,
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
    <div className="surface-primary border-b px-4 py-2 flex items-center justify-between">
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
          variant="outline"
          size="sm"
          onClick={onPreviewClick}
          className="flex items-center space-x-1"
        >
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">プレビュー</span>
        </Button>

        <div className="w-px h-6 opacity-20 bg-current" />

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
          onClick={onSettingsClick}
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

  const pages = currentProject.pages;
  const totalPages = pages.length;

  // スプレッド構造を生成
  // 1ページ目: 単独（表紙）
  // 2-3, 4-5, ...: 見開き
  // 残りの単独ページがある場合：単独
  const spreads: Array<{ type: 'single' | 'spread'; pages: PhotobookPage[] }> =
    [];

  if (pages.length > 0) {
    // 表紙（1ページ目）は常に単独
    spreads.push({ type: 'single', pages: [pages[0]] });

    // 2ページ目以降を見開きペアとして処理
    let i = 1;
    while (i < totalPages) {
      if (i + 1 < totalPages) {
        // 次のページがある場合は見開き
        spreads.push({ type: 'spread', pages: [pages[i], pages[i + 1]] });
        i += 2;
      } else {
        // 次のページがない場合は単独（最終ページ）
        spreads.push({ type: 'single', pages: [pages[i]] });
        i += 1;
      }
    }
  }

  const handleSpreadClick = (spread: {
    type: 'single' | 'spread';
    pages: PhotobookPage[];
  }) => {
    // 見開きの場合は左ページを選択
    setActivePage(spread.pages[0].id);
  };

  const isSpreadActive = (spread: {
    type: 'single' | 'spread';
    pages: PhotobookPage[];
  }) => {
    return spread.pages.some(p => p.id === editorState.activePageId);
  };

  return (
    <div className="surface-secondary border-b px-4 py-2">
      <div className="flex items-center space-x-2 overflow-x-auto">
        {/* スプレッドサムネイル */}
        <div className="flex space-x-2">
          {spreads.map((spread, spreadIndex) => (
            <button
              key={spread.pages[0].id}
              onClick={() => handleSpreadClick(spread)}
              className={cn(
                'flex-shrink-0 border-2 rounded bg-white flex items-center justify-center transition-colors overflow-hidden',
                spread.type === 'spread' ? 'w-32 h-16' : 'w-14 h-16',
                isSpreadActive(spread)
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-300 hover:border-gray-400'
              )}
            >
              {spread.type === 'spread' ? (
                // 見開き表示
                <div className="flex w-full h-full">
                  <div className="flex-1 flex items-center justify-center text-xs font-medium border-r border-gray-300">
                    {spread.pages[0].pageNumber}
                  </div>
                  <div className="flex-1 flex items-center justify-center text-xs font-medium">
                    {spread.pages[1].pageNumber}
                  </div>
                </div>
              ) : (
                // 単独ページ表示
                <span className="text-xs font-medium">
                  {spreadIndex === 0 ? '表紙' : spread.pages[0].pageNumber}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ページ追加ボタン */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => addPage()}
          className="flex-shrink-0 h-16 w-14 text-xs border-dashed"
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

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
        <div className={cn('h-screen flex flex-col', className)}>
          {/* ツールバー */}
          <EditorToolbar
            onSettingsClick={() => setSettingsOpen(true)}
            onPreviewClick={() => setPreviewOpen(true)}
          />

          {/* 設定ダイアログ */}
          <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

          {/* プレビューモーダル */}
          <PreviewModal
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
          />

          {/* メインエディターエリア */}
          <div className="flex-1 flex overflow-hidden">
            {/* サイドバー */}
            <EditorSidebar />

            {/* キャンバスエリア - サイドバー除く全横幅 */}
            <div className="flex-1 flex flex-col border-l border-gray-200">
              {/* ページナビゲーション - キャンバスエリア上部 */}
              <PageNavigation />

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
                      {currentProject.meta.lastSavedAt ? (
                        <FormattedDateTime
                          value={new Date(currentProject.meta.lastSavedAt)}
                          format="datetime-short"
                        />
                      ) : (
                        '未保存'
                      )}
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
