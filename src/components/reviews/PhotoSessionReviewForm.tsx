'use client';

import { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  createPhotoSessionReview,
  updatePhotoSessionReview,
} from '@/app/actions/reviews';
import { Star, Send } from 'lucide-react';
import {
  ThreeLevelRating,
  type RatingLevel,
} from '@/components/reviews/ThreeLevelRating';

interface PhotoSessionReviewFormProps {
  photoSessionId: string;
  bookingId?: string;
  existingReview?: {
    id: string;
    overall_rating: number;
    organization_rating?: number | null;
    communication_rating?: number | null;
    value_rating?: number | null;
    venue_rating?: number | null;
    title?: string | null;
    content?: string | null;
    pros?: string | null;
    cons?: string | null;
    is_anonymous?: boolean;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ReviewFormData {
  overall_rating: RatingLevel;
  organization_rating: RatingLevel;
  communication_rating: RatingLevel;
  value_rating: RatingLevel;
  venue_rating: RatingLevel;
  title: string;
  content: string;
  pros: string;
  cons: string;
  is_anonymous: boolean;
}

export function PhotoSessionReviewForm({
  photoSessionId,
  bookingId,
  existingReview,
  onSuccess,
  onCancel,
}: PhotoSessionReviewFormProps) {
  const { toast } = useToast();
  const t = useTranslations('reviews');
  const tCommon = useTranslations('common');

  // 数値からRatingLevelに変換
  const numberToRatingLevel = (
    rating: number | null | undefined
  ): RatingLevel => {
    if (!rating) return null;
    if (rating >= 5) return 'good';
    if (rating >= 3) return 'normal';
    return 'bad';
  };

  const [formData, setFormData] = useState<ReviewFormData>({
    overall_rating: existingReview
      ? numberToRatingLevel(existingReview.overall_rating)
      : null,
    organization_rating: existingReview
      ? numberToRatingLevel(existingReview.organization_rating)
      : null,
    communication_rating: existingReview
      ? numberToRatingLevel(existingReview.communication_rating)
      : null,
    value_rating: existingReview
      ? numberToRatingLevel(existingReview.value_rating)
      : null,
    venue_rating: existingReview
      ? numberToRatingLevel(existingReview.venue_rating)
      : null,
    title: existingReview?.title || '',
    content: existingReview?.content || '',
    pros: existingReview?.pros || '',
    cons: existingReview?.cons || '',
    is_anonymous: existingReview?.is_anonymous || false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = (
    field: keyof ReviewFormData,
    rating: RatingLevel
  ) => {
    setFormData(prev => ({ ...prev, [field]: rating }));
  };

  // rating_levelをoverall_rating（数値）に変換
  const ratingLevelToNumber = (rating: RatingLevel): number => {
    if (rating === 'good') return 5;
    if (rating === 'normal') return 3;
    if (rating === 'bad') return 1;
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.overall_rating) {
      toast({
        title: t('validation.overallRatingRequired'),
        description: t('validation.pleaseSelectRating'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 既存レビューがある場合は更新、ない場合は新規作成
      if (existingReview) {
        const result = await updatePhotoSessionReview({
          review_id: existingReview.id,
          overall_rating: ratingLevelToNumber(formData.overall_rating),
          organization_rating: formData.organization_rating
            ? ratingLevelToNumber(formData.organization_rating)
            : undefined,
          communication_rating: formData.communication_rating
            ? ratingLevelToNumber(formData.communication_rating)
            : undefined,
          value_rating: formData.value_rating
            ? ratingLevelToNumber(formData.value_rating)
            : undefined,
          venue_rating: formData.venue_rating
            ? ratingLevelToNumber(formData.venue_rating)
            : undefined,
          title: formData.title || undefined,
          content: formData.content || undefined,
          pros: formData.pros || undefined,
          cons: formData.cons || undefined,
          is_anonymous: formData.is_anonymous,
        });

        if (result.error) {
          toast({
            title: t('error.submitFailed'),
            description: result.error,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: tCommon('success'),
          description: 'レビューを更新しました',
        });

        onSuccess?.();
      } else {
        if (!bookingId) {
          toast({
            title: t('error.submitFailed'),
            description: '予約情報が見つかりません',
            variant: 'destructive',
          });
          return;
        }

        const result = await createPhotoSessionReview({
          photo_session_id: photoSessionId,
          booking_id: bookingId,
          overall_rating: ratingLevelToNumber(formData.overall_rating),
          organization_rating: formData.organization_rating
            ? ratingLevelToNumber(formData.organization_rating)
            : undefined,
          communication_rating: formData.communication_rating
            ? ratingLevelToNumber(formData.communication_rating)
            : undefined,
          value_rating: formData.value_rating
            ? ratingLevelToNumber(formData.value_rating)
            : undefined,
          venue_rating: formData.venue_rating
            ? ratingLevelToNumber(formData.venue_rating)
            : undefined,
          title: formData.title || undefined,
          content: formData.content || undefined,
          pros: formData.pros || undefined,
          cons: formData.cons || undefined,
          is_anonymous: formData.is_anonymous,
        });

        if (result.error) {
          toast({
            title: t('error.submitFailed'),
            description: result.error,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: tCommon('success'),
          description: t('success.reviewSubmitted'),
        });

        onSuccess?.();
      }
    } catch (error) {
      logger.error('レビュー投稿エラー:', error);
      toast({
        title: t('error.submitFailed'),
        description: t('error.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card data-review-form>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          {t('form.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 総合評価（必須） */}
          <div>
            <ThreeLevelRating
              value={formData.overall_rating}
              onChange={rating => handleRatingChange('overall_rating', rating)}
              label={t('form.overallRating')}
              required
              size="md"
            />
          </div>

          <Separator />

          {/* 詳細評価（任意） */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('form.detailedRatings')}</h3>
            <div className="space-y-4">
              <ThreeLevelRating
                value={formData.organization_rating}
                onChange={rating =>
                  handleRatingChange('organization_rating', rating)
                }
                label={t('form.organizationRating')}
                size="sm"
              />
              <ThreeLevelRating
                value={formData.communication_rating}
                onChange={rating =>
                  handleRatingChange('communication_rating', rating)
                }
                label={t('form.communicationRating')}
                size="sm"
              />
              <ThreeLevelRating
                value={formData.value_rating}
                onChange={rating => handleRatingChange('value_rating', rating)}
                label={t('form.valueRating')}
                size="sm"
              />
              <ThreeLevelRating
                value={formData.venue_rating}
                onChange={rating => handleRatingChange('venue_rating', rating)}
                label={t('form.venueRating')}
                size="sm"
              />
            </div>
          </div>

          <Separator />

          {/* レビュー内容 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('form.reviewContent')}</h3>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('form.reviewTitle')}
              </label>
              <Input
                value={formData.title}
                onChange={e =>
                  setFormData(prev => ({ ...prev, title: e.target.value }))
                }
                placeholder={t('form.reviewTitlePlaceholder')}
                maxLength={200}
                disabled={isSubmitting}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {formData.title.length}/200
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('form.reviewContent')}
              </label>
              <Textarea
                value={formData.content}
                onChange={e =>
                  setFormData(prev => ({ ...prev, content: e.target.value }))
                }
                placeholder={t('form.reviewContentPlaceholder')}
                rows={6}
                maxLength={2000}
                disabled={isSubmitting}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {formData.content.length}/2000
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('form.pros')}
                </label>
                <Textarea
                  value={formData.pros}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, pros: e.target.value }))
                  }
                  placeholder={t('form.prosPlaceholder')}
                  rows={4}
                  maxLength={1000}
                  disabled={isSubmitting}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {formData.pros.length}/1000
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('form.cons')}
                </label>
                <Textarea
                  value={formData.cons}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, cons: e.target.value }))
                  }
                  placeholder={t('form.consPlaceholder')}
                  rows={4}
                  maxLength={1000}
                  disabled={isSubmitting}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {formData.cons.length}/1000
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* オプション */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('form.options')}</h3>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={formData.is_anonymous}
                onCheckedChange={checked =>
                  setFormData(prev => ({ ...prev, is_anonymous: !!checked }))
                }
                disabled={isSubmitting}
              />
              <label htmlFor="anonymous" className="text-sm">
                {t('form.postAnonymously')}
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('form.anonymousDescription')}
            </p>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.overall_rating}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {existingReview ? '更新中...' : t('form.submitting')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {existingReview ? 'レビューを更新' : t('form.submitReview')}
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
            )}
          </div>

          {/* 注意事項 */}
          <div className="bg-muted p-4 rounded-md">
            <h4 className="text-sm font-medium mb-2">
              {t('form.guidelines.title')}
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• {t('form.guidelines.honest')}</li>
              <li>• {t('form.guidelines.respectful')}</li>
              <li>• {t('form.guidelines.constructive')}</li>
              <li>• {t('form.guidelines.noPersonalInfo')}</li>
              <li>• {t('form.guidelines.editPolicy')}</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
