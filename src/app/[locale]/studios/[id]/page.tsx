'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getStudioDetailAction } from '@/app/actions/studio';
import { StudioEditHistory } from '@/components/studio/StudioEditHistory';
import { StudioReportDialog } from '@/components/studio/StudioReportDialog';
import { InlineFavoriteButton } from '@/components/ui/favorite-heart-button';
import { useFavoriteStates } from '@/hooks/useFavoriteStates';
import {
  StudioWithStats,
  StudioPhoto,
  StudioEquipment,
  StudioEvaluation,
} from '@/types/database';
import {
  MapPin,
  Users,
  DollarSign,
  Star,
  Truck,
  Wifi,
  Phone,
  Mail,
  Globe,
  ArrowLeft,
  Pencil,
  Share2,
  Flag,
  Info,
  ChevronLeft,
  ChevronRight,
  Building2,
  Train,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  FormattedPrice,
  FormattedDateTime,
} from '@/components/ui/formatted-display';
import { EmptyImage } from '@/components/ui/empty-image';

export default function StudioDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const studioId = params.id as string;

  const [studio, setStudio] = useState<StudioWithStats | null>(null);
  const [photos, setPhotos] = useState<StudioPhoto[]>([]);
  const [equipment, setEquipment] = useState<StudioEquipment[]>([]);
  const [evaluations, setEvaluations] = useState<StudioEvaluation[]>([]);
  const [averageRatings, setAverageRatings] = useState<{
    overall: number;
    accessibility: number;
    cleanliness: number;
    staff_support: number;
    cost_performance: number;
    byRole: {
      model: number;
      photographer: number;
      organizer: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null
  );
  const lastRefreshParam = useRef<string | null>(null);

  // お気に入り状態を取得
  const { favoriteStates, isAuthenticated, ready } = useFavoriteStates(
    [{ type: 'studio', id: studioId }],
    { enabled: !!studioId }
  );

  const favoriteState = favoriteStates[`studio_${studioId}`] || {
    isFavorited: false,
    favoriteCount: 0,
  };

  useEffect(() => {
    const fetchStudioDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getStudioDetailAction(studioId);

        if (result.success) {
          setStudio(result.studio || null);
          setPhotos(result.photos || []);
          setEquipment(result.equipment || []);
          setEvaluations(result.evaluations || []);
          setAverageRatings(result.averageRatings || null);
        } else {
          setError(result.error || 'スタジオ詳細の取得に失敗しました');
        }
      } catch {
        setError('スタジオ詳細の取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    // refreshパラメータが存在し、前回と異なる場合のみ再フェッチ
    const refreshParam = searchParams.get('refresh');
    if (refreshParam && refreshParam !== lastRefreshParam.current) {
      lastRefreshParam.current = refreshParam;
      if (studioId) {
        fetchStudioDetail();
        return;
      }
    }

    if (studioId) {
      fetchStudioDetail();
    }

    // ページがフォーカスされた時にデータを再フェッチ（編集後の戻りに対応）
    const handleFocus = () => {
      if (studioId) {
        fetchStudioDetail();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && studioId) {
        fetchStudioDetail();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [studioId, searchParams]);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star className="w-4 h-4 text-theme-text-muted" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
            </div>
          </div>
        );
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-theme-text-muted" />);
      }
    }

    return stars;
  };

  const formatPriceRange = () => {
    if (!studio) return '料金応相談';

    if (studio.hourly_rate_min && studio.hourly_rate_max) {
      return (
        <>
          <FormattedPrice value={studio.hourly_rate_min} format="simple" /> -{' '}
          <FormattedPrice value={studio.hourly_rate_max} format="simple" />
        </>
      );
    } else if (studio.hourly_rate_min) {
      return (
        <>
          <FormattedPrice value={studio.hourly_rate_min} format="simple" />～
        </>
      );
    }
    return '料金応相談';
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${studio?.name || 'スタジオ'} - ShutterHub`;
    const text = studio?.description || '';

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        toast.success('シェアしました');
      } catch (error) {
        // ユーザーがキャンセルした場合などはエラーを表示しない
        if ((error as Error).name !== 'AbortError') {
          toast.error('シェアに失敗しました');
        }
      }
    } else {
      // フォールバック: クリップボードにコピー
      try {
        await navigator.clipboard.writeText(url);
        toast.success('URLをコピーしました');
      } catch {
        toast.error('コピーに失敗しました');
      }
    }
  };

  const handlePhotoClick = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const handlePreviousPhoto = () => {
    if (selectedPhotoIndex === null || photos.length === 0) return;
    setSelectedPhotoIndex(
      selectedPhotoIndex === 0 ? photos.length - 1 : selectedPhotoIndex - 1
    );
  };

  const handleNextPhoto = () => {
    if (selectedPhotoIndex === null || photos.length === 0) return;
    setSelectedPhotoIndex(
      selectedPhotoIndex === photos.length - 1 ? 0 : selectedPhotoIndex + 1
    );
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-video w-full rounded-lg mb-6" />
            </div>
            <div>
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error || !studio) {
    if (error === 'スタジオが見つかりません') {
      notFound();
    }

    return (
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-6">
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* ヘッダー */}
        <div className="mb-6">
          {/* 戻るボタンと編集ボタン */}
          <div className="flex justify-between items-center mb-4">
            <Link href="/studios">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                スタジオ一覧に戻る
              </Button>
            </Link>

            <Link href={`/studios/${studio.id}/edit`}>
              <Button variant="cta">
                <Pencil className="w-4 h-4 mr-2" />
                編集
              </Button>
            </Link>
          </div>

          {/* タイトルと評価 */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{studio.name}</h1>
            </div>

            {averageRatings && studio.evaluation_count > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex">
                  {renderStars(averageRatings.overall)}
                </div>
                <span className="text-lg font-medium">
                  {averageRatings.overall.toFixed(1)}
                </span>
                <span className="text-theme-text-secondary">
                  ({studio.evaluation_count}件のレビュー)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* スタジオ情報の注意書き */}
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>このスタジオ情報は誰でも編集可能です</AlertTitle>
          <AlertDescription>
            不適切な内容を見つけた場合は報告してください。報告数が3件に達すると自動的に非表示になります。
          </AlertDescription>
        </Alert>

        {/* 大きなメイン画像 */}
        <div className="aspect-[4/3] relative bg-gray-100 rounded-lg overflow-hidden mb-8">
          <EmptyImage
            src={photos.length > 0 ? photos[0].image_url : undefined}
            alt={
              photos.length > 0 ? photos[0].alt_text || studio.name : 'No Image'
            }
            fallbackIcon={Building2}
            fallbackIconSize="xl"
            fill
            className="object-contain object-center"
            priority
          />
        </div>

        {/* お気に入り・シェア・報告ボタン */}
        <div className="flex justify-end gap-2 mb-4">
          {ready && (
            <InlineFavoriteButton
              favoriteType="studio"
              favoriteId={studioId}
              variant="outline"
              size="sm"
              initialState={{
                isFavorited: favoriteState.isFavorited,
                favoriteCount: favoriteState.favoriteCount,
                isAuthenticated: isAuthenticated ?? false,
              }}
            />
          )}
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            シェア
          </Button>
          <StudioReportDialog
            studioId={studioId}
            studioName={studio.name}
            trigger={
              <Button variant="outline" size="sm">
                <Flag className="w-4 h-4 mr-2" />
                報告
              </Button>
            }
          />
        </div>

        {/* 概要 ｜ スタジオ情報 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 左側：概要 */}
          <div className="flex">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">概要</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                {studio.description ? (
                  <p className="text-theme-text-primary leading-relaxed">
                    {studio.description}
                  </p>
                ) : (
                  <p className="text-theme-text-muted italic">
                    説明が登録されていません
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右側：スタジオ情報 */}
          <div className="flex">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">スタジオ情報</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* 基本情報 */}
                <div className="space-y-4 flex-1">
                  {/* 住所 */}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 mt-0.5 text-theme-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm text-theme-text-secondary">住所</p>
                      <p className="font-medium text-theme-text-primary">
                        {studio.address}
                      </p>
                    </div>
                  </div>

                  {/* アクセス */}
                  {studio.access_info && (
                    <div className="flex items-start gap-3">
                      <Train className="w-4 h-4 mt-0.5 text-theme-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm text-theme-text-secondary">
                          アクセス
                        </p>
                        <p className="text-sm text-theme-text-primary">
                          {studio.access_info}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 料金 */}
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-4 h-4 mt-0.5 text-theme-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm text-theme-text-secondary">料金</p>
                      <p className="font-medium text-theme-text-primary">
                        {formatPriceRange()}
                      </p>
                    </div>
                  </div>

                  {/* 最大収容人数 */}
                  {studio.max_capacity && (
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 mt-0.5 text-theme-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm text-theme-text-secondary">
                          最大収容人数
                        </p>
                        <p className="font-medium text-theme-text-primary">
                          {studio.max_capacity}名
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 設備バッジ */}
                {(studio.parking_available || studio.wifi_available) && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-theme-neutral/10">
                    {studio.parking_available && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        駐車場あり
                      </Badge>
                    )}
                    {studio.wifi_available && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1.5"
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        Wi-Fi完備
                      </Badge>
                    )}
                  </div>
                )}

                {/* 連絡先 */}
                {(studio.phone || studio.email || studio.website_url) && (
                  <div className="mt-4 pt-4 border-t border-theme-neutral/10">
                    <h4 className="font-medium text-sm text-theme-text-secondary mb-3">
                      連絡先
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {studio.phone && (
                        <a
                          href={`tel:${studio.phone}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-surface/50 border border-theme-neutral/10 hover:border-theme-primary/30 transition-colors"
                        >
                          <Phone className="w-4 h-4 text-theme-primary" />
                          <span className="text-sm">{studio.phone}</span>
                        </a>
                      )}

                      {studio.email && (
                        <a
                          href={`mailto:${studio.email}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-surface/50 border border-theme-neutral/10 hover:border-theme-primary/30 transition-colors"
                        >
                          <Mail className="w-4 h-4 text-theme-primary" />
                          <span className="text-sm">{studio.email}</span>
                        </a>
                      )}

                      {studio.website_url && (
                        <a
                          href={studio.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-surface/50 border border-theme-neutral/10 hover:border-theme-primary/30 transition-colors"
                        >
                          <Globe className="w-4 h-4 text-theme-primary" />
                          <span className="text-sm">ウェブサイト</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 非表示スタジオの警告メッセージ */}
        {studio.is_hidden && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>このスタジオは一時的に非表示になっています</AlertTitle>
            <AlertDescription>
              {studio.hidden_reason ||
                '複数の報告により一時的に非表示になっています。'}
            </AlertDescription>
          </Alert>
        )}

        {/* タブ切り替え */}
        <Tabs defaultValue="photos" className="w-full">
          <TabsList className="grid w-full lg:w-auto grid-cols-4 lg:grid-cols-4">
            <TabsTrigger value="photos">写真</TabsTrigger>
            <TabsTrigger value="equipment">設備</TabsTrigger>
            <TabsTrigger value="evaluations">評価</TabsTrigger>
            <TabsTrigger value="history">履歴</TabsTrigger>
          </TabsList>

          {/* タブコンテンツ */}
          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle>写真ギャラリー ({photos.length}枚)</CardTitle>
              </CardHeader>
              <CardContent>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => handlePhotoClick(index)}
                      >
                        <EmptyImage
                          src={photo.image_url || undefined}
                          alt={photo.alt_text || `${studio.name}の写真`}
                          fallbackIcon={Building2}
                          fallbackIconSize="lg"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                      <EmptyImage
                        src={undefined}
                        alt="No Image"
                        fallbackIcon={Building2}
                        fallbackIconSize="lg"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment">
            <Card>
              <CardHeader>
                <CardTitle>設備・機材 ({equipment.length}点)</CardTitle>
              </CardHeader>
              <CardContent>
                {equipment.length > 0 ? (
                  <div className="space-y-4">
                    {equipment.map(item => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{item.name}</h4>
                          <Badge variant="outline">{item.category}</Badge>
                        </div>
                        {item.description && (
                          <p className="text-theme-text-secondary text-sm mb-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-theme-text-muted">
                          <span>数量: {item.quantity}点</span>
                          {item.rental_fee && (
                            <span>
                              レンタル料:{' '}
                              <FormattedPrice
                                value={item.rental_fee}
                                format="simple"
                              />
                            </span>
                          )}
                          <span>
                            {item.is_included ? '利用料込み' : 'オプション'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-theme-text-muted text-center py-8">
                    設備情報が登録されていません
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evaluations">
            <Card>
              <CardHeader>
                <CardTitle>評価・レビュー ({evaluations.length}件)</CardTitle>
              </CardHeader>
              <CardContent>
                {evaluations.length > 0 ? (
                  <div className="space-y-4">
                    {evaluations.slice(0, 5).map(evaluation => (
                      <div
                        key={evaluation.id}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {renderStars(evaluation.overall_rating)}
                          </div>
                          <span className="font-medium">
                            {evaluation.overall_rating}.0
                          </span>
                          <Badge variant="outline">
                            {evaluation.user_role}
                          </Badge>
                        </div>
                        {evaluation.comment && (
                          <p className="text-theme-text-primary">
                            {evaluation.comment}
                          </p>
                        )}
                        <p className="text-xs text-theme-text-muted mt-2">
                          <FormattedDateTime
                            value={new Date(evaluation.created_at)}
                            format="date-short"
                          />
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-theme-text-muted text-center py-8">
                    まだレビューがありません
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <StudioEditHistory studioId={studioId} />
          </TabsContent>
        </Tabs>

        {/* 写真拡大表示モーダル */}
        <Dialog
          open={selectedPhotoIndex !== null}
          onOpenChange={open => {
            if (!open) setSelectedPhotoIndex(null);
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>写真拡大表示</DialogTitle>
            </DialogHeader>
            {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
              <div className="relative w-full h-full flex flex-col">
                <div className="flex-1 relative overflow-hidden bg-black">
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <EmptyImage
                      src={photos[selectedPhotoIndex].image_url || undefined}
                      alt={
                        photos[selectedPhotoIndex].alt_text ||
                        `${studio.name}の写真`
                      }
                      fallbackIcon={Building2}
                      fallbackIconSize="xl"
                      width={1200}
                      height={800}
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  </div>

                  {/* 前後の写真へのナビゲーション */}
                  {photos.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-white/20"
                        onClick={handlePreviousPhoto}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-white/20"
                        onClick={handleNextPhoto}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-black/50 text-white">
                          {selectedPhotoIndex + 1} / {photos.length}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
