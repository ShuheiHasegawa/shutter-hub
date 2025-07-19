'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { getUserReviews } from '@/app/actions/reviews';
import { Star, Users, Camera, MessageSquare } from 'lucide-react';

interface UserReviewListProps {
  userId: string;
}

interface UserReview {
  id: string;
  overall_rating: number;
  punctuality_rating?: number;
  communication_rating?: number;
  professionalism_rating?: number;
  cooperation_rating?: number;
  title?: string;
  content?: string;
  reviewer_role: 'organizer' | 'participant';
  reviewee_role: 'organizer' | 'participant';
  is_anonymous: boolean;
  helpful_count: number;
  created_at: string;
  reviewer?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  photo_session?: {
    id: string;
    title: string;
    start_time: string;
  };
}

interface PhotoSessionReview {
  id: string;
  overall_rating: number;
  organization_rating?: number;
  communication_rating?: number;
  value_rating?: number;
  venue_rating?: number;
  title?: string;
  content?: string;
  pros?: string;
  cons?: string;
  is_anonymous: boolean;
  is_verified: boolean;
  helpful_count: number;
  created_at: string;
  reviewer?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export function UserReviewList({ userId }: UserReviewListProps) {
  const tCommon = useTranslations('common');

  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const [sessionReviews, setSessionReviews] = useState<PhotoSessionReview[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [userId]);

  const loadReviews = async () => {
    setIsLoading(true);

    try {
      // ユーザーレビューを取得
      const userReviewsResult = await getUserReviews(userId);

      if (userReviewsResult.error) {
        logger.error('ユーザーレビュー取得エラー:', userReviewsResult.error);
      } else if (userReviewsResult.data) {
        setUserReviews(userReviewsResult.data);
      }

      // 撮影会レビューを取得（主催者として）
      // TODO: 主催者として受け取った撮影会レビューを取得する関数を実装
      // 現在は空配列を設定
      setSessionReviews([]);
    } catch (error) {
      logger.error('レビュー取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="ml-2">{tCommon('loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalReviews = userReviews.length + sessionReviews.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            受け取ったレビュー ({totalReviews})
          </CardTitle>
        </CardHeader>

        {totalReviews === 0 ? (
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                まだレビューがありません
              </h3>
              <p className="text-sm">
                撮影会に参加または主催すると、他のユーザーからレビューを受け取ることができます。
              </p>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <Tabs defaultValue="user" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="user" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  ユーザーレビュー ({userReviews.length})
                </TabsTrigger>
                <TabsTrigger
                  value="session"
                  className="flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  撮影会レビュー ({sessionReviews.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="user" className="space-y-4">
                {userReviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>ユーザーレビューはまだありません</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userReviews.map(review => (
                      <Card key={review.id}>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            {/* レビュー基本情報 */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  {review.reviewer?.avatar_url ? (
                                    <Image
                                      src={review.reviewer.avatar_url}
                                      alt={review.reviewer.display_name}
                                      width={40}
                                      height={40}
                                      className="w-10 h-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <Users className="h-5 w-5 text-gray-500" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {review.is_anonymous
                                      ? '匿名ユーザー'
                                      : review.reviewer?.display_name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {review.reviewer_role === 'organizer'
                                      ? '主催者'
                                      : '参加者'}
                                    として評価
                                  </div>
                                </div>
                              </div>
                              <Badge variant="outline" className="w-20">
                                {review.reviewee_role === 'organizer'
                                  ? '主催者'
                                  : '参加者'}
                              </Badge>
                            </div>

                            {/* 評価 */}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= review.overall_rating
                                        ? 'text-yellow-500 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-medium">
                                {review.overall_rating}/5
                              </span>
                            </div>

                            {/* タイトル・内容 */}
                            {review.title && (
                              <h4 className="font-medium">{review.title}</h4>
                            )}
                            {review.content && (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {review.content}
                              </p>
                            )}

                            {/* 撮影会情報 */}
                            {review.photo_session && (
                              <div className="text-xs text-muted-foreground">
                                撮影会: {review.photo_session.title}
                              </div>
                            )}

                            <Separator />

                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>
                                {new Date(review.created_at).toLocaleDateString(
                                  'ja-JP'
                                )}
                              </span>
                              {review.helpful_count > 0 && (
                                <span>
                                  {review.helpful_count}人が参考になったと評価
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="session" className="space-y-4">
                {sessionReviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>撮影会レビューはまだありません</p>
                    <p className="text-sm">
                      撮影会を主催すると参加者からレビューを受け取ることができます
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessionReviews.map(review => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        type="photo_session"
                        showActions={false}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
