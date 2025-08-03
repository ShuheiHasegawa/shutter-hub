import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  PhotobookProject,
  PhotobookPage,
  PageElement,
  EditorState,
  HistoryAction,
  HistoryChange,
  AccountTier,
  AccountLimits,
} from '@/types/photobook-editor';

// ============================================
// 状態の型定義
// ============================================

interface PhotobookEditorState {
  // プロジェクト関連
  currentProject: PhotobookProject | null;
  isProjectLoading: boolean;
  projectError: string | null;

  // エディター状態
  editorState: EditorState;

  // UI状態
  sidebarOpen: boolean;
  activeTab: 'layout' | 'upload' | 'properties';
  isPreviewMode: boolean;

  // 履歴管理
  canUndo: boolean;
  canRedo: boolean;

  // アカウント制限
  accountTier: AccountTier;
  accountLimits: AccountLimits;

  // 一時的な状態
  draggedItem: unknown;
  isUploading: boolean;
  uploadProgress: number;
}

interface PhotobookEditorActions {
  // プロジェクト管理
  createNewProject: (title: string) => void;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  updateProjectMeta: (meta: Partial<PhotobookProject['meta']>) => void;

  // ページ管理
  addPage: (position?: number) => void;
  removePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  setActivePage: (pageId: string) => void;

  // 要素管理
  addElement: (pageId: string, element: Omit<PageElement, 'id'>) => void;
  removeElement: (elementId: string) => void;
  updateElement: (elementId: string, updates: Partial<PageElement>) => void;
  duplicateElement: (elementId: string) => void;

  // 選択管理
  selectElement: (elementId: string, multiSelect?: boolean) => void;
  selectElements: (elementIds: string[]) => void;
  clearSelection: () => void;

  // 履歴管理
  undo: () => void;
  redo: () => void;
  addToHistory: (action: HistoryAction, changes: HistoryChange[]) => void;
  clearHistory: () => void;

  // UI状態管理
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'layout' | 'upload' | 'properties') => void;
  setPreviewMode: (preview: boolean) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  toggleGuides: () => void;
  toggleSnapToGrid: () => void;

  // ドラッグ&ドロップ
  setDraggedItem: (item: unknown) => void;
  clearDraggedItem: () => void;

  // アップロード状態
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;

  // 画像リソース管理
  addImageResource: (image: ImageResource) => void;
  removeImageResource: (imageId: string) => void;
  uploadImages: (files: FileList) => Promise<void>;

  // アカウント管理
  setAccountTier: (tier: AccountTier) => void;
  checkLimits: (operation: string) => boolean;
}

// ============================================
// アカウント制限定義
// ============================================

const ACCOUNT_LIMITS: Record<AccountTier, AccountLimits> = {
  free: {
    maxPages: 20,
    maxImagesPerPage: 4,
    maxImageSizeMB: 5,
    maxProjectSizeMB: 50,
    maxProjects: 3,
    maxHistoryStates: 20,
    exportFormats: ['pdf_72dpi', 'jpg_medium'],
    cloudStorage: false,
  },
  premium: {
    maxPages: 100,
    maxImagesPerPage: 10,
    maxImageSizeMB: 20,
    maxProjectSizeMB: 500,
    maxProjects: 20,
    maxHistoryStates: 50,
    exportFormats: ['pdf_300dpi', 'jpg_high', 'png', 'tiff'],
    cloudStorage: true,
    cloudStorageGB: 10,
  },
  pro: {
    maxPages: -1, // 無制限
    maxImagesPerPage: -1,
    maxImageSizeMB: 100,
    maxProjectSizeMB: 2000,
    maxProjects: -1,
    maxHistoryStates: 100,
    exportFormats: ['pdf_print_ready', 'cmyk_tiff', 'eps'],
    cloudStorage: true,
    cloudStorageGB: 100,
    printingPartnership: true,
  },
};

// ============================================
// ユーティリティ関数
// ============================================

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// サムネイル生成関数
const createThumbnail = (
  imageDataUrl: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> => {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // アスペクト比を維持してリサイズ
      const { width, height } = calculateThumbnailSize(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      );

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    img.src = imageDataUrl;
  });
};

// サムネイルサイズ計算
const calculateThumbnailSize = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
) => {
  const aspectRatio = originalWidth / originalHeight;

  let width = maxWidth;
  let height = maxHeight;

  if (aspectRatio > 1) {
    // 横長の場合
    height = maxWidth / aspectRatio;
  } else {
    // 縦長の場合
    width = maxHeight * aspectRatio;
  }

  return { width, height };
};

const createDefaultProject = (title: string): PhotobookProject => ({
  meta: {
    id: generateId(),
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title,
    accountTier: 'free' as AccountTier,
  },
  settings: {
    dimensions: { width: 210, height: 297 }, // A4サイズ (mm)
    dpi: 300,
    colorSpace: 'RGB',
    bleedMargin: 3,
  },
  pages: [
    {
      id: generateId(),
      pageNumber: 1,
      layout: {
        backgroundColor: '#ffffff',
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
      },
      elements: [],
    },
  ],
  resources: {
    images: [],
    fonts: [],
  },
  history: {
    settings: {
      maxStates: 20,
      maxMemoryMB: 100,
      snapshotInterval: 10,
    },
    currentIndex: -1,
    states: [],
  },
});

const createDefaultEditorState = (): EditorState => ({
  selectedElements: [],
  activePageId: '',
  viewMode: 'single',
  zoomLevel: 1,
  showGrid: false,
  showGuides: false,
  snapToGrid: true,
  snapToGuides: true,
});

// ============================================
// Zustandストア
// ============================================

export const usePhotobookEditorStore = create<
  PhotobookEditorState & PhotobookEditorActions
>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // 初期状態
        currentProject: null,
        isProjectLoading: false,
        projectError: null,
        editorState: createDefaultEditorState(),
        sidebarOpen: true,
        activeTab: 'layout',
        isPreviewMode: false,
        canUndo: false,
        canRedo: false,
        accountTier: 'free',
        accountLimits: ACCOUNT_LIMITS.free,
        draggedItem: null,
        isUploading: false,
        uploadProgress: 0,

        // プロジェクト管理
        createNewProject: (title: string) => {
          set(state => {
            const newProject = createDefaultProject(title);
            state.currentProject = newProject;
            state.editorState.activePageId = newProject.pages[0].id;
            state.projectError = null;
          });
        },

        loadProject: async (projectId: string) => {
          set(state => {
            state.isProjectLoading = true;
            state.projectError = null;
          });

          try {
            // TODO: 実際のAPI呼び出しを実装
            // const project = await api.loadProject(projectId);

            // モックデータ（開発時）
            const mockProject =
              createDefaultProject('読み込まれたプロジェクト');
            mockProject.meta.id = projectId;

            set(state => {
              state.currentProject = mockProject;
              state.editorState.activePageId = mockProject.pages[0].id;
              state.isProjectLoading = false;
            });
          } catch (error) {
            set(state => {
              state.projectError =
                error instanceof Error ? error.message : '読み込みエラー';
              state.isProjectLoading = false;
            });
          }
        },

        saveProject: async () => {
          const { currentProject } = get();
          if (!currentProject) return;

          try {
            // TODO: 実際のAPI呼び出しを実装
            // await api.saveProject(currentProject);

            set(state => {
              if (state.currentProject) {
                state.currentProject.meta.updatedAt = new Date().toISOString();
                state.currentProject.meta.lastSavedAt =
                  new Date().toISOString();
              }
            });
          } catch (error) {
            set(state => {
              state.projectError =
                error instanceof Error ? error.message : '保存エラー';
            });
          }
        },

        updateProjectMeta: meta => {
          set(state => {
            if (state.currentProject) {
              Object.assign(state.currentProject.meta, meta);
              state.currentProject.meta.updatedAt = new Date().toISOString();
            }
          });
        },

        // ページ管理
        addPage: position => {
          set(state => {
            if (!state.currentProject) return;

            const newPage: PhotobookPage = {
              id: generateId(),
              pageNumber: state.currentProject.pages.length + 1,
              layout: {
                backgroundColor: '#ffffff',
                margins: { top: 10, right: 10, bottom: 10, left: 10 },
              },
              elements: [],
            };

            if (position !== undefined) {
              state.currentProject.pages.splice(position, 0, newPage);
              // ページ番号を再計算
              state.currentProject.pages.forEach((page, index) => {
                page.pageNumber = index + 1;
              });
            } else {
              state.currentProject.pages.push(newPage);
            }

            state.editorState.activePageId = newPage.id;
          });
        },

        removePage: (pageId: string) => {
          set(state => {
            if (!state.currentProject) return;

            const pageIndex = state.currentProject.pages.findIndex(
              p => p.id === pageId
            );
            if (pageIndex === -1) return;

            state.currentProject.pages.splice(pageIndex, 1);

            // ページ番号を再計算
            state.currentProject.pages.forEach((page, index) => {
              page.pageNumber = index + 1;
            });

            // アクティブページの調整
            if (state.editorState.activePageId === pageId) {
              const nextPageIndex = Math.min(
                pageIndex,
                state.currentProject.pages.length - 1
              );
              state.editorState.activePageId =
                state.currentProject.pages[nextPageIndex]?.id || '';
            }
          });
        },

        duplicatePage: (pageId: string) => {
          set(state => {
            if (!state.currentProject) return;

            const pageIndex = state.currentProject.pages.findIndex(
              p => p.id === pageId
            );
            if (pageIndex === -1) return;

            const originalPage = state.currentProject.pages[pageIndex];
            const duplicatedPage: PhotobookPage = {
              ...originalPage,
              id: generateId(),
              pageNumber: originalPage.pageNumber + 1,
              elements: originalPage.elements.map(element => ({
                ...element,
                id: generateId(),
              })),
            };

            state.currentProject.pages.splice(pageIndex + 1, 0, duplicatedPage);

            // ページ番号を再計算
            state.currentProject.pages.forEach((page, index) => {
              page.pageNumber = index + 1;
            });

            state.editorState.activePageId = duplicatedPage.id;
          });
        },

        reorderPages: (fromIndex: number, toIndex: number) => {
          set(state => {
            if (!state.currentProject) return;

            const pages = state.currentProject.pages;
            const [movedPage] = pages.splice(fromIndex, 1);
            pages.splice(toIndex, 0, movedPage);

            // ページ番号を再計算
            pages.forEach((page, index) => {
              page.pageNumber = index + 1;
            });
          });
        },

        setActivePage: (pageId: string) => {
          set(state => {
            state.editorState.activePageId = pageId;
            state.editorState.selectedElements = [];
          });
        },

        // 要素管理
        addElement: (pageId: string, element) => {
          set(state => {
            if (!state.currentProject) return;

            const page = state.currentProject.pages.find(p => p.id === pageId);
            if (!page) return;

            const newElement: PageElement = {
              ...element,
              id: generateId(),
            };

            page.elements.push(newElement);
            state.editorState.selectedElements = [newElement.id];
          });
        },

        removeElement: (elementId: string) => {
          set(state => {
            if (!state.currentProject) return;

            for (const page of state.currentProject.pages) {
              const elementIndex = page.elements.findIndex(
                e => e.id === elementId
              );
              if (elementIndex !== -1) {
                page.elements.splice(elementIndex, 1);
                break;
              }
            }

            state.editorState.selectedElements =
              state.editorState.selectedElements.filter(id => id !== elementId);
          });
        },

        updateElement: (elementId: string, updates) => {
          set(state => {
            if (!state.currentProject) return;

            for (const page of state.currentProject.pages) {
              const element = page.elements.find(e => e.id === elementId);
              if (element) {
                Object.assign(element, updates);
                element.lastModified = new Date().toISOString();
                break;
              }
            }
          });
        },

        duplicateElement: (elementId: string) => {
          set(state => {
            if (!state.currentProject) return;

            for (const page of state.currentProject.pages) {
              const element = page.elements.find(e => e.id === elementId);
              if (element) {
                const duplicatedElement: PageElement = {
                  ...element,
                  id: generateId(),
                  transform: {
                    ...element.transform,
                    x: element.transform.x + 5,
                    y: element.transform.y + 5,
                  },
                };
                page.elements.push(duplicatedElement);
                state.editorState.selectedElements = [duplicatedElement.id];
                break;
              }
            }
          });
        },

        // 選択管理
        selectElement: (elementId: string, multiSelect = false) => {
          set(state => {
            if (multiSelect) {
              if (state.editorState.selectedElements.includes(elementId)) {
                state.editorState.selectedElements =
                  state.editorState.selectedElements.filter(
                    id => id !== elementId
                  );
              } else {
                state.editorState.selectedElements.push(elementId);
              }
            } else {
              state.editorState.selectedElements = [elementId];
            }
          });
        },

        selectElements: (elementIds: string[]) => {
          set(state => {
            state.editorState.selectedElements = elementIds;
          });
        },

        clearSelection: () => {
          set(state => {
            state.editorState.selectedElements = [];
          });
        },

        // 履歴管理（簡易実装）
        undo: () => {
          // TODO: 履歴管理の実装
          // console.log('Undo operation');
        },

        redo: () => {
          // TODO: 履歴管理の実装
          // console.log('Redo operation');
        },

        addToHistory: (_action: HistoryAction, _changes: HistoryChange[]) => {
          // TODO: 履歴管理の実装
          // console.log('Add to history:', action, changes);
        },

        clearHistory: () => {
          set(state => {
            if (state.currentProject?.history) {
              state.currentProject.history.states = [];
              state.currentProject.history.currentIndex = -1;
            }
            state.canUndo = false;
            state.canRedo = false;
          });
        },

        // UI状態管理
        setSidebarOpen: (open: boolean) => {
          set(state => {
            state.sidebarOpen = open;
          });
        },

        setActiveTab: tab => {
          set(state => {
            state.activeTab = tab;
          });
        },

        setPreviewMode: (preview: boolean) => {
          set(state => {
            state.isPreviewMode = preview;
          });
        },

        setZoom: (zoom: number) => {
          set(state => {
            state.editorState.zoomLevel = Math.max(0.1, Math.min(5, zoom));
          });
        },

        toggleGrid: () => {
          set(state => {
            state.editorState.showGrid = !state.editorState.showGrid;
          });
        },

        toggleGuides: () => {
          set(state => {
            state.editorState.showGuides = !state.editorState.showGuides;
          });
        },

        toggleSnapToGrid: () => {
          set(state => {
            state.editorState.snapToGrid = !state.editorState.snapToGrid;
          });
        },

        // ドラッグ&ドロップ
        setDraggedItem: (item: unknown) => {
          set(state => {
            state.draggedItem = item;
          });
        },

        clearDraggedItem: () => {
          set(state => {
            state.draggedItem = null;
          });
        },

        // アップロード状態
        setUploading: (uploading: boolean) => {
          set(state => {
            state.isUploading = uploading;
            if (!uploading) {
              state.uploadProgress = 0;
            }
          });
        },

        setUploadProgress: (progress: number) => {
          set(state => {
            state.uploadProgress = progress;
          });
        },

        // 画像リソース管理
        addImageResource: (image: ImageResource) => {
          set(state => {
            if (state.currentProject) {
              state.currentProject.resources.images.push(image);
            }
          });
        },

        removeImageResource: (imageId: string) => {
          set(state => {
            if (state.currentProject) {
              state.currentProject.resources.images =
                state.currentProject.resources.images.filter(
                  img => img.id !== imageId
                );
            }
          });
        },

        uploadImages: async (files: FileList) => {
          const { setUploading, setUploadProgress, addImageResource } = get();

          setUploading(true);

          let successCount = 0;
          let skipCount = 0;

          try {
            for (let i = 0; i < files.length; i++) {
              const file = files[i];

              // ファイル形式チェック
              if (!file.type.startsWith('image/')) {
                skipCount++;
                continue;
              }

              // ファイルサイズチェック（10MB制限）
              if (file.size > 10 * 1024 * 1024) {
                skipCount++;
                continue;
              }

              // プログレス更新
              setUploadProgress((i / files.length) * 100);

              // 画像をBase64に変換（実際の実装ではSupabase Storageにアップロード）
              const imageDataUrl = await new Promise<string>(resolve => {
                const reader = new FileReader();
                reader.onload = e => {
                  resolve(e.target?.result as string);
                };
                reader.readAsDataURL(file);
              });

              // 画像サイズ取得
              const dimensions = await new Promise<{
                width: number;
                height: number;
              }>(resolve => {
                const img = new Image();
                img.onload = () => {
                  resolve({ width: img.width, height: img.height });
                };
                img.src = imageDataUrl;
              });

              // サムネイル生成（簡易版）
              const thumbnailDataUrl = await createThumbnail(
                imageDataUrl,
                200,
                200
              );

              // 画像リソースとして追加
              const imageResource: ImageResource = {
                id: `img-${Date.now()}-${i}`,
                name: file.name,
                src: imageDataUrl,
                thumbnailSrc: thumbnailDataUrl,
                size: file.size,
                dimensions,
                format: file.type,
                uploadedAt: new Date().toISOString(),
              };

              addImageResource(imageResource);
              successCount++;

              // 少し待機（UX向上のため）
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            setUploadProgress(100);

            // 結果通知（実際の実装ではtoast通知で表示）
            if (successCount > 0) {
              // console.log(`${successCount}枚の画像をアップロードしました`);
            }
            if (skipCount > 0) {
              // console.warn(`${skipCount}枚の画像をスキップしました（形式またはサイズ制限）`);
            }
          } catch {
            // console.error('画像アップロードエラー:', error);
          } finally {
            setTimeout(() => {
              setUploading(false);
            }, 500);
          }
        },

        // アカウント管理
        setAccountTier: (tier: AccountTier) => {
          set(state => {
            state.accountTier = tier;
            state.accountLimits = ACCOUNT_LIMITS[tier];
          });
        },

        checkLimits: (operation: string) => {
          const { accountLimits, currentProject } = get();

          switch (operation) {
            case 'add_page':
              if (accountLimits.maxPages === -1) return true;
              return (
                (currentProject?.pages.length || 0) < accountLimits.maxPages
              );

            case 'add_project':
              // TODO: 実際のプロジェクト数チェック
              return true;

            default:
              return true;
          }
        },
      })),
      {
        name: 'photobook-editor-store',
      }
    )
  )
);

// ============================================
// セレクター関数
// ============================================

export const useCurrentProject = () =>
  usePhotobookEditorStore(state => state.currentProject);
export const useActivePage = () =>
  usePhotobookEditorStore(state => {
    const { currentProject, editorState } = state;
    return currentProject?.pages.find(p => p.id === editorState.activePageId);
  });
export const useSelectedElements = () =>
  usePhotobookEditorStore(state => {
    const { currentProject, editorState } = state;
    if (!currentProject) return [];

    const allElements = currentProject.pages.flatMap(page => page.elements);
    return allElements.filter(element =>
      editorState.selectedElements.includes(element.id)
    );
  });
export const useAccountLimits = () =>
  usePhotobookEditorStore(state => state.accountLimits);
