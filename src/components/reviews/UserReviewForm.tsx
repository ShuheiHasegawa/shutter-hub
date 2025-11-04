'use client';

import { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { createUserReview } from '@/app/actions/reviews';
import { User, Send } from 'lucide-react';
import {
  ThreeLevelRating,
  type RatingLevel,
} from '@/components/reviews/ThreeLevelRating';

interface UserReviewFormProps {
  photoSessionId: string;
  revieweeId: string;
  bookingId: string;
  reviewerRole: 'organizer' | 'participant';
  revieweeRole: 'organizer' | 'participant';
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ReviewFormData {
  overall_rating: RatingLevel;
  punctuality_rating: RatingLevel;
  communication_rating: RatingLevel;
  professionalism_rating: RatingLevel;
  cooperation_rating: RatingLevel;
  content: string;
  is_anonymous: boolean;
}

export function UserReviewForm({
  photoSessionId,
  revieweeId,
  bookingId,
  reviewerRole,
  revieweeRole,
  onSuccess,
  onCancel,
}: UserReviewFormProps) {
  const { toast } = useToast();
  const t = useTranslations('reviews');
  const tCommon = useTranslations('common');

  const [formData, setFormData] = useState<ReviewFormData>({
    overall_rating: null,
    punctuality_rating: null,
    communication_rating: null,
    professionalism_rating: null,
    cooperation_rating: null,
    content: '',
    is_anonymous: false,
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
      const result = await createUserReview({
        photo_session_id: photoSessionId,
        reviewee_id: revieweeId,
        booking_id: bookingId,
        overall_rating: ratingLevelToNumber(formData.overall_rating),
        punctuality_rating: formData.punctuality_rating
          ? ratingLevelToNumber(formData.punctuality_rating)
          : undefined,
        communication_rating: formData.communication_rating
          ? ratingLevelToNumber(formData.communication_rating)
          : undefined,
        professionalism_rating: formData.professionalism_rating
          ? ratingLevelToNumber(formData.professionalism_rating)
          : undefined,
        cooperation_rating: formData.cooperation_rating
          ? ratingLevelToNumber(formData.cooperation_rating)
          : undefined,
        content: formData.content || undefined,
        reviewer_role: reviewerRole,
        reviewee_role: revieweeRole,
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
          <User className="h-5 w-5" />
          {t('form.userReviewTitle')}
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
                value={formData.punctuality_rating}
                onChange={rating =>
                  handleRatingChange('punctuality_rating', rating)
                }
                label={t('form.punctualityRating')}
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
                value={formData.professionalism_rating}
                onChange={rating =>
                  handleRatingChange('professionalism_rating', rating)
                }
                label={t('form.professionalismRating')}
                size="sm"
              />
              <ThreeLevelRating
                value={formData.cooperation_rating}
                onChange={rating =>
                  handleRatingChange('cooperation_rating', rating)
                }
                label={t('form.cooperationRating')}
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
                {t('form.reviewContent')}
              </label>
              <Textarea
                value={formData.content}
                onChange={e =>
                  setFormData(prev => ({ ...prev, content: e.target.value }))
                }
                placeholder={t('form.userReviewContentPlaceholder')}
                rows={6}
                maxLength={2000}
                disabled={isSubmitting}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {formData.content.length}/2000
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
                  {t('form.submitting')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('form.submitReview')}
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
