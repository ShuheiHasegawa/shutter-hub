'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getStudioDetailAction } from '@/app/actions/studio';
import { StudioEditHistory } from '@/components/studio/StudioEditHistory';
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
  Heart,
  Share2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function StudioDetailPage() {
  const params = useParams();
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

    if (studioId) {
      fetchStudioDetail();
    }
  }, [studioId]);

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
      return `¥${studio.hourly_rate_min.toLocaleString()} - ¥${studio.hourly_rate_max.toLocaleString()}`;
    } else if (studio.hourly_rate_min) {
      return `¥${studio.hourly_rate_min.toLocaleString()}～`;
    }
    return '料金応相談';
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
          <Link href="/studios">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              スタジオ一覧に戻る
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{studio.name}</h1>
                {studio.verification_status === 'verified' && (
                  <Badge className="bg-green-500 text-white">認証済み</Badge>
                )}
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

            <Link href={`/studios/${studio.id}/edit`}>
              <Button variant="outline">
                <Pencil className="w-4 h-4 mr-2" />
                編集
              </Button>
            </Link>
          </div>
        </div>

        {/* 大きなメイン画像 */}
        <div className="aspect-[4/3] relative bg-gray-100 rounded-lg overflow-hidden mb-8">
          <Image
            src={
              photos.length > 0 ? photos[0].image_url : '/images/no-image.png'
            }
            alt={
              photos.length > 0 ? photos[0].alt_text || studio.name : 'No Image'
            }
            fill
            className="object-contain object-center"
            priority
          />
        </div>

        {/* 概要 ｜ スタジオ情報 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 左側：概要 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">概要</CardTitle>
              </CardHeader>
              <CardContent>
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
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">スタジオ情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-1 text-theme-text-muted flex-shrink-0" />
                    <div>
                      <p className="text-sm text-theme-text-secondary">住所</p>
                      <p className="font-medium">{studio.address}</p>
                    </div>
                  </div>

                  {studio.access_info && (
                    <div className="mt-2">
                      <p className="text-sm text-theme-text-secondary">
                        アクセス
                      </p>
                      <p className="text-sm">{studio.access_info}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-theme-text-muted" />
                  <div>
                    <p className="text-sm text-theme-text-secondary">料金</p>
                    <p className="font-medium">{formatPriceRange()}</p>
                  </div>
                </div>

                {studio.max_capacity && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-theme-text-muted" />
                    <div>
                      <p className="text-sm text-theme-text-secondary">
                        最大収容人数
                      </p>
                      <p className="font-medium">{studio.max_capacity}名</p>
                    </div>
                  </div>
                )}

                {/* 設備アイコン */}
                <div className="flex gap-4 pt-2">
                  {studio.parking_available && (
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <Truck className="w-4 h-4" />
                      <span>駐車場</span>
                    </div>
                  )}
                  {studio.wifi_available && (
                    <div className="flex items-center gap-1 text-sm text-blue-600">
                      <Wifi className="w-4 h-4" />
                      <span>Wi-Fi</span>
                    </div>
                  )}
                </div>

                {/* 連絡先 */}
                {(studio.phone || studio.email || studio.website_url) && (
                  <div className="pt-4 border-t border-theme-neutral/20">
                    <h4 className="font-medium mb-3">連絡先</h4>
                    <div className="space-y-2">
                      {studio.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-theme-text-muted" />
                          <a
                            href={`tel:${studio.phone}`}
                            className="text-blue-600 hover:underline"
                          >
                            {studio.phone}
                          </a>
                        </div>
                      )}

                      {studio.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-theme-text-muted" />
                          <a
                            href={`mailto:${studio.email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {studio.email}
                          </a>
                        </div>
                      )}

                      {studio.website_url && (
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-theme-text-muted" />
                          <a
                            href={studio.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            ウェブサイト
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* タブ切り替え ｜ お気に入り・シェアボタン */}
        <Tabs defaultValue="photos" className="w-full">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <TabsList className="grid w-full lg:w-auto grid-cols-4 lg:grid-cols-4">
              <TabsTrigger value="photos">写真</TabsTrigger>
              <TabsTrigger value="equipment">設備</TabsTrigger>
              <TabsTrigger value="evaluations">評価</TabsTrigger>
              <TabsTrigger value="history">履歴</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Heart className="w-4 h-4 mr-2" />
                お気に入り
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                シェア
              </Button>
            </div>
          </div>

          {/* タブコンテンツ */}
          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle>写真ギャラリー ({photos.length}枚)</CardTitle>
              </CardHeader>
              <CardContent>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map(photo => (
                      <div
                        key={photo.id}
                        className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden"
                      >
                        <Image
                          src={photo.image_url || '/images/no-image.png'}
                          alt={photo.alt_text || `${studio.name}の写真`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src="/images/no-image.png"
                        alt="No Image"
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
                              レンタル料: ¥{item.rental_fee.toLocaleString()}
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
                          {new Date(evaluation.created_at).toLocaleDateString(
                            'ja-JP'
                          )}
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
      </div>
    </AuthenticatedLayout>
  );
}
