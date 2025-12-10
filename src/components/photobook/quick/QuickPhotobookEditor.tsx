'use client';

import { useState, useCallback, useRef } from 'react';
import { Save, Eye, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import {
  Photobook,
  PhotobookImage,
  UnifiedImage,
} from '@/types/quick-photobook';
import { QuickPhotobookImageManagerV2 } from './QuickPhotobookImageManagerV2';
import { QuickPhotobookSettings } from './QuickPhotobookSettings';
import { PhotobookPreviewModal } from '../common/PhotobookPreviewModal';
import {
  getPhotobookImages,
  updatePhotobook,
} from '@/app/actions/quick-photobook';
import {
  reorderPhotobookImages,
  removePhotobookImage,
} from '@/app/actions/quick-photobook-images';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

/**
 * エディターヘッダー
 */
interface EditorHeaderProps {
  photobook: Photobook;
  onSave: () => void;
  onPreview: () => void;
  isSaving: boolean;
}

function EditorHeader({
  photobook,
  onSave,
  onPreview,
  isSaving,
}: EditorHeaderProps) {
  return (
    <div className="border-b px-4 py-2 md:py-3">
      {/* スマホ: 2行レイアウト、PC: 1行レイアウト */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        {/* 1行目: 戻る + タイトル + 保存ボタン */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <BackButton href="/photobooks" />

            {/* タイトル部分 */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              {/* アイコン - PCのみ表示 */}
              <div className="hidden md:block p-2 rounded-lg">
                <BookOpen className="h-5 w-5" />
              </div>

              {/* タイトルテキスト */}
              <h1 className="text-base md:text-lg font-semibold truncate max-w-[180px] md:max-w-none">
                {photobook.title}
              </h1>
            </div>
          </div>

          {/* 保存ボタン - スマホでは1行目に */}
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1 md:gap-2 shrink-0 ml-2"
            variant="cta"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isSaving ? '保存中...' : '保存'}
            </span>
          </Button>
        </div>

        {/* 2行目: バッジ・ページ情報・プレビューボタン */}
        <div className="flex items-center justify-between md:justify-end gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="text-xs">
              クイック
            </Badge>
            <span className="text-muted-foreground">
              {photobook.current_pages}/{photobook.max_pages} ページ
            </span>
          </div>

          {/* プレビューボタン - PCのみ */}
          <Button
            variant="action"
            size="sm"
            onClick={onPreview}
            className="hidden md:flex"
          >
            <Eye className="h-4 w-4 mr-2" />
            プレビュー
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * クイックフォトブックエディターメインコンポーネント
 */
interface QuickPhotobookEditorProps {
  photobook: Photobook;
  images: PhotobookImage[];
  userId: string;
}

export function QuickPhotobookEditor({
  photobook,
  images: initialImages,
  userId,
}: QuickPhotobookEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [images, setImages] = useState<PhotobookImage[]>(initialImages);
  const [coverImageId, setCoverImageId] = useState<string | undefined>(
    photobook.cover_image_url
      ? initialImages.find(img => img.image_url === photobook.cover_image_url)
          ?.id
      : undefined
  );
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [reorderedImages, setReorderedImages] = useState<PhotobookImage[]>([]);
  const [hasCoverChanges, setHasCoverChanges] = useState(false);
  const [pendingCoverImageId, setPendingCoverImageId] = useState<
    string | undefined
  >(coverImageId);
  const [hasDeleteChanges, setHasDeleteChanges] = useState(false);
  const [pendingDeleteImages, setPendingDeleteImages] = useState<string[]>([]);

  // 画像マネージャーの保存処理への参照
  const imageManagerSaveRef = useRef<(() => Promise<void>) | null>(null);

  // 画像リスト更新
  const handleImagesChange = useCallback(async () => {
    try {
      logger.info('画像データ再取得開始', { photobookId: photobook.id });
      const updatedImages = await getPhotobookImages(photobook.id, userId);

      // 取得した画像の順番をログで確認
      const imageOrder = updatedImages.map(img => ({
        id: img.id,
        page_number: img.page_number,
        filename: img.original_filename,
      }));

      logger.info('画像データ再取得完了', {
        imageCount: updatedImages.length,
        imageOrder,
      });

      setImages(updatedImages);
      // 注意: setHasOrderChanges(false) は保存処理で既にリセット済み
    } catch (error) {
      logger.error('画像データ再取得エラー', {
        error,
        photobookId: photobook.id,
      });
    }
  }, [photobook.id, userId]);

  // 画像順番変更通知
  const handleOrderChange = useCallback(
    (newOrderedImages: PhotobookImage[]) => {
      setHasOrderChanges(true);
      setReorderedImages(newOrderedImages);
    },
    []
  );

  // 表紙画像変更処理（仮選択）
  const handleCoverImageChange = useCallback((imageId: string) => {
    // フロントエンド状態のみ更新（DB保存は保存ボタン時）
    setPendingCoverImageId(imageId);
    setHasCoverChanges(true);
    toast.success('表紙を選択しました（仮保存）');
  }, []);

  // 削除変更通知
  const handleDeleteChange = useCallback((pendingDeleteIds: string[]) => {
    setHasDeleteChanges(pendingDeleteIds.length > 0);
    setPendingDeleteImages(pendingDeleteIds);
  }, []);

  // 保存処理（統合API使用）
  const handleSave = useCallback(async () => {
    logger.info('保存処理開始', {
      hasOrderChanges,
      hasCoverChanges,
      reorderedImagesCount: reorderedImages.length,
      pendingCoverImageId,
    });

    setIsSaving(true);

    try {
      // 🚀 最初に画像マネージャーの仮アップロード画像を保存
      if (imageManagerSaveRef.current) {
        logger.info('仮アップロード画像保存開始');
        await imageManagerSaveRef.current();
        logger.info('仮アップロード画像保存完了');

        // 画像保存後にデータを再取得して最新状態にする
        await handleImagesChange();
      }
      // 保存データを準備
      let coverImageUrl = photobook.cover_image_url;
      if (hasCoverChanges && pendingCoverImageId) {
        const selectedImage = images.find(
          img => img.id === pendingCoverImageId
        );
        if (selectedImage) {
          coverImageUrl = selectedImage.image_url;
          logger.info('表紙画像URL設定', { imageUrl: selectedImage.image_url });
        }
      }

      // 1. 基本情報保存
      const basicResult = await updatePhotobook(photobook.id, userId, {
        title: photobook.title,
        description: photobook.description,
        ...(coverImageUrl && { cover_image_url: coverImageUrl }),
      });

      logger.info('基本情報保存結果', { success: basicResult.success });

      if (!basicResult.success) {
        throw new Error(
          basicResult.error?.message || '基本情報保存に失敗しました'
        );
      }

      // 2. 画像順番保存（変更がある場合のみ）
      if (hasOrderChanges && reorderedImages.length > 0) {
        logger.info('画像順番保存開始', { imageCount: reorderedImages.length });

        const reorderData = reorderedImages.map((img, index) => ({
          id: img.id,
          page_number: index + 1,
        }));

        const orderResult = await reorderPhotobookImages(
          photobook.id,
          userId,
          reorderData
        );

        logger.info('画像順番保存結果', { success: orderResult.success });

        if (!orderResult.success) {
          logger.error('画像順番保存失敗', { error: orderResult.error });
        }
      }

      // 3. 削除予定画像の処理
      if (hasDeleteChanges && pendingDeleteImages.length > 0) {
        logger.info('削除予定画像処理開始', {
          deleteCount: pendingDeleteImages.length,
        });

        for (const imageId of pendingDeleteImages) {
          try {
            const deleteResult = await removePhotobookImage(
              imageId,
              photobook.id,
              userId
            );

            if (deleteResult.success) {
              logger.info('画像削除成功', { imageId });
            } else {
              logger.error('画像削除失敗', {
                imageId,
                error: deleteResult.error,
              });
            }
          } catch (error) {
            logger.error('画像削除エラー', { imageId, error });
          }
        }
      }

      // 成功メッセージ（フラグリセット前に判定）
      const savedItems = [];
      if (hasCoverChanges) savedItems.push('表紙');
      if (hasOrderChanges) savedItems.push('画像順番');
      if (hasDeleteChanges) savedItems.push('画像削除');

      // 状態フラグをリセット
      if (hasOrderChanges) setHasOrderChanges(false);
      if (hasCoverChanges) {
        setHasCoverChanges(false);
        setCoverImageId(pendingCoverImageId); // 確定状態に更新
      }
      if (hasDeleteChanges) {
        setHasDeleteChanges(false);
        setPendingDeleteImages([]);
      }

      // 成功メッセージ表示
      if (savedItems.length > 0) {
        toast.success(`フォトブックと${savedItems.join('・')}を保存しました`);
      } else {
        toast.success('フォトブックを保存しました');
      }

      logger.info('成功メッセージ表示', { savedItems });

      logger.info('保存成功、データ再取得開始');

      // 最新データを再取得
      await handleImagesChange();

      logger.info('保存処理完了');
    } catch (error) {
      logger.error('保存処理エラー', {
        error,
        photobookId: photobook.id,
        userId,
      });
      toast.error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [
    photobook,
    userId,
    hasOrderChanges,
    reorderedImages,
    hasCoverChanges,
    pendingCoverImageId,
    hasDeleteChanges,
    pendingDeleteImages,
    images,
    handleImagesChange,
  ]);

  // プレビューモーダル状態
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // プレビュー表示
  const handlePreview = useCallback(() => {
    setIsPreviewOpen(true);
  }, []);

  // 画像をUnifiedImage形式に変換
  const unifiedImages: UnifiedImage[] = images.map(img => ({
    id: img.id,
    type: 'saved' as const,
    pageNumber: img.page_number,
    orientation: img.orientation,
    preview: img.image_url,
    data: img,
  }));

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <EditorHeader
        photobook={photobook}
        onSave={handleSave}
        onPreview={handlePreview}
        isSaving={isSaving}
      />

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 space-y-8">
          {/* 画像管理セクション */}
          <QuickPhotobookImageManagerV2
            photobookId={photobook.id}
            userId={userId}
            images={images}
            maxPages={photobook.max_pages}
            onImagesChange={handleImagesChange}
            onSaveDraftRef={imageManagerSaveRef}
            coverImageId={pendingCoverImageId}
            onCoverImageChange={handleCoverImageChange}
            onOrderChange={handleOrderChange}
            onDeleteChange={handleDeleteChange}
          />

          {/* 基本設定セクション */}
          <QuickPhotobookSettings
            photobook={photobook}
            userId={userId}
            onUpdate={handleImagesChange}
          />
        </div>
      </div>

      {/* プレビューモーダル */}
      <PhotobookPreviewModal
        images={unifiedImages}
        coverImageId={pendingCoverImageId}
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
    </div>
  );
}
