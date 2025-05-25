'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Separator } from '@/components/ui/separator';
import { ReviewCard } from './ReviewCard';
import {
  getPhotoSessionReviews,
  getPhotoSessionRatingStats,
} from '@/app/actions/reviews';
import { Star, TrendingUp, Users, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReviewListProps {
  photoSessionId: string;
  showAddReviewButton?: boolean;
  onAddReviewClick?: () => void;
}

interface Review {
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

interface RatingStats {
  review_count: number;
  avg_overall_rating: number;
  avg_organization_rating: number;
  avg_communication_rating: number;
  avg_value_rating: number;
  avg_venue_rating: number;
  rating_5_count: number;
  rating_4_count: number;
  rating_3_count: number;
  rating_2_count: number;
  rating_1_count: number;
}

export function ReviewList({
  photoSessionId,
  showAddReviewButton = false,
  onAddReviewClick,
}: ReviewListProps) {
  const t = useTranslations('reviews');
  const tCommon = useTranslations('common');

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<
    'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'
  >('newest');
  const [filterRating, setFilterRating] = useState<string>('all');

  useEffect(() => {
    loadReviewsAndStats();
  }, [photoSessionId]);

  const loadReviewsAndStats = async () => {
    setIsLoading(true);

    try {
      const [reviewsResult, statsResult] = await Promise.all([
        getPhotoSessionReviews(photoSessionId),
        getPhotoSessionRatingStats(photoSessionId),
      ]);

      if (reviewsResult.data) {
        setReviews(reviewsResult.data);
      }

      if (statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('レビュー・統計取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedAndFilteredReviews = reviews
    .filter(review => {
      if (filterRating === 'all') return true;
      return review.overall_rating === parseInt(filterRating);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case 'oldest':
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case 'highest':
          return b.overall_rating - a.overall_rating;
        case 'lowest':
          return a.overall_rating - b.overall_rating;
        case 'helpful':
          return b.helpful_count - a.helpful_count;
        default:
          return 0;
      }
    });

  const RatingDistribution = () => {
    if (!stats || stats.review_count === 0) return null;

    const ratings = [
      { stars: 5, count: stats.rating_5_count },
      { stars: 4, count: stats.rating_4_count },
      { stars: 3, count: stats.rating_3_count },
      { stars: 2, count: stats.rating_2_count },
      { stars: 1, count: stats.rating_1_count },
    ];

    return (
      <div className="space-y-2">
        {ratings.map(({ stars, count }) => {
          const percentage =
            stats.review_count > 0 ? (count / stats.review_count) * 100 : 0;

          return (
            <div key={stars} className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
                <span>{stars}</span>
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
              </div>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-muted-foreground min-w-0 flex-shrink-0">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const DetailedRatings = () => {
    if (!stats || stats.review_count === 0) return null;

    const detailedRatings = [
      {
        label: t('form.organizationRating'),
        value: stats.avg_organization_rating,
      },
      {
        label: t('form.communicationRating'),
        value: stats.avg_communication_rating,
      },
      { label: t('form.valueRating'), value: stats.avg_value_rating },
      { label: t('form.venueRating'), value: stats.avg_venue_rating },
    ].filter(rating => rating.value > 0);

    if (detailedRatings.length === 0) return null;

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium">{t('display.detailedRatings')}</h4>
        <div className="space-y-2">
          {detailedRatings.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <div className="flex items-center gap-1">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= value
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium ml-1">
                  {value.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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

  return (
    <div className="space-y-6">
      {/* 評価統計 */}
      {stats && stats.review_count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('stats.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 総合評価 */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {stats.avg_overall_rating.toFixed(1)}
                </div>
                <div className="flex items-center justify-center mt-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= stats.avg_overall_rating
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t('stats.reviewCount', { count: stats.review_count })}
                </div>
              </div>

              <div className="flex-1">
                <RatingDistribution />
              </div>
            </div>

            <Separator />

            {/* 詳細評価 */}
            <DetailedRatings />
          </CardContent>
        </Card>
      )}

      {/* レビュー一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('list.title')} ({reviews.length})
            </CardTitle>

            {showAddReviewButton && (
              <Button onClick={onAddReviewClick}>
                <Star className="mr-2 h-4 w-4" />
                {t('list.writeReview')}
              </Button>
            )}
          </div>
        </CardHeader>

        {reviews.length > 0 && (
          <CardContent className="space-y-4">
            {/* フィルター・ソート */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterRating} onValueChange={setFilterRating}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('list.filters.allRatings')}
                    </SelectItem>
                    <SelectItem value="5">
                      5 {t('list.filters.stars')}
                    </SelectItem>
                    <SelectItem value="4">
                      4 {t('list.filters.stars')}
                    </SelectItem>
                    <SelectItem value="3">
                      3 {t('list.filters.stars')}
                    </SelectItem>
                    <SelectItem value="2">
                      2 {t('list.filters.stars')}
                    </SelectItem>
                    <SelectItem value="1">
                      1 {t('list.filters.stars')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select
                value={sortBy}
                onValueChange={(value: typeof sortBy) => setSortBy(value)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">
                    {t('list.sort.newest')}
                  </SelectItem>
                  <SelectItem value="oldest">
                    {t('list.sort.oldest')}
                  </SelectItem>
                  <SelectItem value="highest">
                    {t('list.sort.highest')}
                  </SelectItem>
                  <SelectItem value="lowest">
                    {t('list.sort.lowest')}
                  </SelectItem>
                  <SelectItem value="helpful">
                    {t('list.sort.helpful')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* レビューリスト */}
            <div className="space-y-4">
              {sortedAndFilteredReviews.length > 0 ? (
                sortedAndFilteredReviews.map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    type="photo_session"
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('list.noReviewsWithFilter')}
                </div>
              )}
            </div>
          </CardContent>
        )}

        {reviews.length === 0 && (
          <CardContent>
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {t('list.noReviews')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('list.noReviewsDescription')}
              </p>
              {showAddReviewButton && (
                <Button onClick={onAddReviewClick}>
                  <Star className="mr-2 h-4 w-4" />
                  {t('list.writeFirstReview')}
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
