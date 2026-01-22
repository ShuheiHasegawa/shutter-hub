'use client';

import { useState } from 'react';
import {
  Edit,
  BookOpen,
  Calendar,
  User,
  Eye,
  EyeOff,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Photobook, PhotobookImage } from '@/types/quick-photobook';
import { QuickPhotobookPreview } from './QuickPhotobookPreview';
import { PhotobookPreviewModal } from '../common/PhotobookPreviewModal';
import { updatePhotobook } from '@/app/actions/quick-photobook';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/back-button';
import { FormattedDateTime } from '@/components/ui/formatted-display';

/**
 * フォトブック情報ヘッダー
 */
interface PhotobookHeaderProps {
  photobook: Photobook;
  isOwner: boolean;
  onPublishToggle: () => void;
  isUpdating: boolean;
  onPreviewOpen: () => void;
}

function PhotobookHeader({
  photobook,
  isOwner,
  onPublishToggle,
  isUpdating,
  onPreviewOpen,
}: PhotobookHeaderProps) {
  return (
    <div className="border-b px-4 py-4 md:py-6">
      <div>
        {/* モバイル: 縦積みレイアウト、デスクトップ: 横並び */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {/* 上部: 戻るボタンとタイトル部分 */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <BackButton href="/photobooks" size="sm" />

            <div className="flex-1 min-w-0">
              {/* タイトルとアイコン */}
              <div className="flex items-start gap-3 mb-2">
                <div className="p-2 surface-neutral rounded-lg shrink-0">
                  <BookOpen className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg md:text-2xl font-bold truncate">
                    {photobook.title}
                  </h1>

                  {/* バッジ群 - モバイルでは縦並び、デスクトップでは横並び */}
                  <div className="flex flex-col gap-2 mt-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {photobook.photobook_type === 'quick'
                          ? 'クイック'
                          : 'アドバンスド'}
                      </Badge>
                      <Badge
                        variant={
                          photobook.is_published ? 'default' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {photobook.is_published ? '公開中' : '下書き'}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {photobook.current_pages} ページ
                    </span>
                  </div>
                </div>
              </div>

              {/* 説明文 */}
              {photobook.description && (
                <p className="mt-2 text-sm md:text-base text-muted-foreground line-clamp-2 md:line-clamp-none">
                  {photobook.description}
                </p>
              )}

              {/* メタ情報 - モバイルでは隠す */}
              <div className="hidden md:flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    作成日:{' '}
                    <FormattedDateTime
                      value={new Date(photobook.created_at)}
                      format="date-short"
                    />
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>作成者: {isOwner ? 'あなた' : '匿名'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-2 shrink-0">
            {/* プレビューボタン（全ユーザー共通） */}
            <Button variant="outline" size="sm" onClick={onPreviewOpen}>
              <Play className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">プレビュー</span>
            </Button>

            {/* 編集・公開ボタン（オーナーのみ） */}
            {isOwner && (
              <>
                <Button variant="cta" size="sm" asChild>
                  <Link href={`/photobooks/quick/${photobook.id}/edit`}>
                    <Edit className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">編集</span>
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPublishToggle}
                  disabled={isUpdating}
                >
                  {photobook.is_published ? (
                    <>
                      <EyeOff className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">非公開</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">公開</span>
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* モバイル専用: メタ情報を下部に配置 */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground md:hidden">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              <FormattedDateTime
                value={new Date(photobook.created_at)}
                format="date-short"
              />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{isOwner ? 'あなた' : '匿名'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 統計情報表示
 */
interface StatsDisplayProps {
  images: PhotobookImage[];
  photobook: Photobook;
}

function StatsDisplay({ images, photobook }: StatsDisplayProps) {
  const orientationStats = {
    portrait: images.filter(img => img.orientation === 'portrait').length,
    landscape: images.filter(img => img.orientation === 'landscape').length,
    square: images.filter(img => img.orientation === 'square').length,
  };

  const completionRate = Math.round(
    (images.length / photobook.max_pages) * 100
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">フォトブック統計</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{images.length}</p>
            <p className="text-sm">総ページ数</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{completionRate}%</p>
            <p className="text-sm">完成度</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{orientationStats.portrait}</p>
            <p className="text-sm">縦長画像</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{orientationStats.landscape}</p>
            <p className="text-sm">横長画像</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span>
              作成日:{' '}
              <FormattedDateTime
                value={new Date(photobook.created_at)}
                format="date-short"
              />
            </span>
            <span>
              更新日:{' '}
              <FormattedDateTime
                value={new Date(photobook.updated_at)}
                format="date-short"
              />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * クイックフォトブックビューアーメインコンポーネント
 */
interface QuickPhotobookViewerProps {
  photobook: Photobook;
  images: PhotobookImage[];
  isOwner: boolean;
}

export function QuickPhotobookViewer({
  photobook,
  images,
  isOwner,
}: QuickPhotobookViewerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // プレビューモーダル開く
  const handlePreviewOpen = () => {
    setIsPreviewOpen(true);
  };

  // 統合画像データの作成（モーダル用）
  const unifiedImages = images.map(img => ({
    id: img.id,
    type: 'saved' as const,
    pageNumber: img.page_number,
    orientation: img.orientation,
    preview: img.image_url,
    data: img,
  }));

  // 公開状態切り替え
  const handlePublishToggle = async () => {
    if (!isOwner) return;

    try {
      setIsUpdating(true);

      const result = await updatePhotobook(photobook.id, photobook.user_id, {
        is_published: !photobook.is_published,
      });

      if (result.success) {
        toast.success(
          photobook.is_published
            ? 'フォトブックを非公開にしました'
            : 'フォトブックを公開しました'
        );
        // ページリフレッシュ
        window.location.reload();
      } else {
        throw new Error(result.error?.message || '更新に失敗しました');
      }
    } catch (error) {
      logger.error('Publish toggle error:', error);
      toast.error('公開状態の変更に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <PhotobookHeader
        photobook={photobook}
        isOwner={isOwner}
        onPublishToggle={handlePublishToggle}
        isUpdating={isUpdating}
        onPreviewOpen={handlePreviewOpen}
      />

      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* メインプレビュー */}
        <QuickPhotobookPreview
          images={images}
          viewMode="desktop"
          maxPages={photobook.max_pages}
        />

        {/* 統計情報（横幅活用） */}
        <StatsDisplay images={images} photobook={photobook} />

        {/* 機能制限案内（クイックタイプの場合） */}
        {photobook.photobook_type === 'quick' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="font-medium">🎨 より高度な編集機能</h3>
                <p className="text-sm">
                  アドバンスドフォトブックなら複雑なレイアウトやテキスト追加が可能
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="cta" size="sm" asChild>
                    <Link href="/photobooks/advanced">
                      アドバンスド版を試す
                    </Link>
                  </Button>
                  <Button variant="action" size="sm" asChild>
                    <Link href="/subscription">プラン詳細</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* プレビューモーダル */}
      <PhotobookPreviewModal
        images={unifiedImages}
        coverImageId={
          photobook.cover_image_url
            ? images.find(img => img.image_url === photobook.cover_image_url)
                ?.id
            : undefined
        }
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
    </div>
  );
}
