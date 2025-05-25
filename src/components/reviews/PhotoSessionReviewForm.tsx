'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { createPhotoSessionReview } from '@/app/actions/reviews';
import { Star, Send } from 'lucide-react';

interface PhotoSessionReviewFormProps {
  photoSessionId: string;
  bookingId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ReviewFormData {
  overall_rating: number;
  organization_rating: number;
  communication_rating: number;
  value_rating: number;
  venue_rating: number;
  title: string;
  content: string;
  pros: string;
  cons: string;
  is_anonymous: boolean;
}

export function PhotoSessionReviewForm({
  photoSessionId,
  bookingId,
  onSuccess,
  onCancel,
}: PhotoSessionReviewFormProps) {
  const { toast } = useToast();
  const t = useTranslations('reviews');
  const tCommon = useTranslations('common');

  const [formData, setFormData] = useState<ReviewFormData>({
    overall_rating: 0,
    organization_rating: 0,
    communication_rating: 0,
    value_rating: 0,
    venue_rating: 0,
    title: '',
    content: '',
    pros: '',
    cons: '',
    is_anonymous: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = (field: keyof ReviewFormData, rating: number) => {
    setFormData(prev => ({ ...prev, [field]: rating }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.overall_rating === 0) {
      toast({
        title: t('validation.overallRatingRequired'),
        description: t('validation.pleaseSelectRating'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createPhotoSessionReview({
        photo_session_id: photoSessionId,
        booking_id: bookingId,
        overall_rating: formData.overall_rating,
        organization_rating: formData.organization_rating || undefined,
        communication_rating: formData.communication_rating || undefined,
        value_rating: formData.value_rating || undefined,
        venue_rating: formData.venue_rating || undefined,
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
    } catch (error) {
      console.error('レビュー投稿エラー:', error);
      toast({
        title: t('error.submitFailed'),
        description: t('error.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({
    rating,
    onRatingChange,
    label,
  }: {
    rating: number;
    onRatingChange: (rating: number) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`p-1 rounded transition-colors ${
              star <= rating
                ? 'text-yellow-500 hover:text-yellow-600'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <Star className="h-6 w-6 fill-current" />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {rating > 0 ? `${rating}/5` : t('form.notRated')}
        </span>
      </div>
    </div>
  );

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
          {/* 総合評価 */}
          <div>
            <StarRating
              rating={formData.overall_rating}
              onRatingChange={rating =>
                handleRatingChange('overall_rating', rating)
              }
              label={`${t('form.overallRating')} *`}
            />
          </div>

          <Separator />

          {/* 詳細評価 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('form.detailedRatings')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StarRating
                rating={formData.organization_rating}
                onRatingChange={rating =>
                  handleRatingChange('organization_rating', rating)
                }
                label={t('form.organizationRating')}
              />
              <StarRating
                rating={formData.communication_rating}
                onRatingChange={rating =>
                  handleRatingChange('communication_rating', rating)
                }
                label={t('form.communicationRating')}
              />
              <StarRating
                rating={formData.value_rating}
                onRatingChange={rating =>
                  handleRatingChange('value_rating', rating)
                }
                label={t('form.valueRating')}
              />
              <StarRating
                rating={formData.venue_rating}
                onRatingChange={rating =>
                  handleRatingChange('venue_rating', rating)
                }
                label={t('form.venueRating')}
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
              disabled={isSubmitting || formData.overall_rating === 0}
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
