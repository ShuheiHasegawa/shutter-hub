'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { voteReviewHelpful, reportReview } from '@/app/actions/reviews';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Flag,
  User,
  Calendar,
  MoreHorizontal,
  CheckCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ReviewCardProps {
  review: {
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
  };
  type: 'photo_session' | 'user';
  showActions?: boolean;
}

export function ReviewCard({
  review,
  type,
  showActions = true,
}: ReviewCardProps) {
  const { toast } = useToast();
  const t = useTranslations('reviews');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'ja' ? ja : enUS;

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [userVote, setUserVote] = useState<boolean | null>(null);

  const handleHelpfulVote = async (isHelpful: boolean) => {
    try {
      const result = await voteReviewHelpful({
        review_id: review.id,
        review_type: type,
        is_helpful: isHelpful,
      });

      if (result.error) {
        toast({
          title: t('error.voteFailed'),
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      setUserVote(isHelpful);
      toast({
        title: tCommon('success'),
        description: t('success.voteSubmitted'),
      });
    } catch (error) {
      console.error('投票エラー:', error);
      toast({
        title: t('error.voteFailed'),
        description: t('error.unexpectedError'),
        variant: 'destructive',
      });
    }
  };

  const handleReport = async () => {
    if (!reportReason) {
      toast({
        title: t('validation.reportReasonRequired'),
        description: t('validation.pleaseSelectReason'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingReport(true);

    try {
      const result = await reportReview({
        review_id: review.id,
        review_type: type,
        reason: reportReason as
          | 'spam'
          | 'inappropriate'
          | 'fake'
          | 'harassment'
          | 'other',
        description: reportDescription || undefined,
      });

      if (result.error) {
        toast({
          title: t('error.reportFailed'),
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: tCommon('success'),
        description: t('success.reportSubmitted'),
      });

      setIsReportDialogOpen(false);
      setReportReason('');
      setReportDescription('');
    } catch (error) {
      console.error('報告エラー:', error);
      toast({
        title: t('error.reportFailed'),
        description: t('error.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const StarDisplay = ({
    rating,
    label,
  }: {
    rating: number;
    label: string;
  }) => (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground min-w-0 flex-1">
        {label}
      </span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm font-medium ml-1">{rating}</span>
      </div>
    </div>
  );

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP', { locale: dateLocale });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {review.is_anonymous ? (
                <Avatar>
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar>
                  <AvatarImage src={review.reviewer?.avatar_url} />
                  <AvatarFallback>
                    {review.reviewer?.display_name
                      ? getInitials(review.reviewer.display_name)
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">
                    {review.is_anonymous
                      ? t('display.anonymousUser')
                      : review.reviewer?.display_name}
                  </h4>
                  {review.is_verified && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t('display.verified')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(review.created_at)}
                </div>
              </div>
            </div>

            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsReportDialogOpen(true)}>
                    <Flag className="h-4 w-4 mr-2" />
                    {t('actions.report')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* 総合評価 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= review.overall_rating
                      ? 'text-yellow-500 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="font-medium">{review.overall_rating}/5</span>
          </div>

          {/* タイトル */}
          {review.title && (
            <h3 className="text-lg font-medium">{review.title}</h3>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 詳細評価 */}
          {(review.organization_rating ||
            review.communication_rating ||
            review.value_rating ||
            review.venue_rating) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">
                {t('display.detailedRatings')}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {review.organization_rating && (
                  <StarDisplay
                    rating={review.organization_rating}
                    label={t('form.organizationRating')}
                  />
                )}
                {review.communication_rating && (
                  <StarDisplay
                    rating={review.communication_rating}
                    label={t('form.communicationRating')}
                  />
                )}
                {review.value_rating && (
                  <StarDisplay
                    rating={review.value_rating}
                    label={t('form.valueRating')}
                  />
                )}
                {review.venue_rating && (
                  <StarDisplay
                    rating={review.venue_rating}
                    label={t('form.venueRating')}
                  />
                )}
              </div>
            </div>
          )}

          {/* レビュー内容 */}
          {review.content && (
            <div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {review.content}
              </p>
            </div>
          )}

          {/* 良かった点・改善点 */}
          {(review.pros || review.cons) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {review.pros && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-green-700 dark:text-green-400">
                    {t('form.pros')}
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {review.pros}
                  </p>
                </div>
              )}
              {review.cons && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-orange-700 dark:text-orange-400">
                    {t('form.cons')}
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {review.cons}
                  </p>
                </div>
              )}
            </div>
          )}

          {showActions && (
            <>
              <Separator />

              {/* アクション */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant={userVote === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleHelpfulVote(true)}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    {t('actions.helpful')}
                  </Button>
                  <Button
                    variant={userVote === false ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleHelpfulVote(false)}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    {t('actions.notHelpful')}
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  {review.helpful_count > 0 && (
                    <span>
                      {t('display.helpfulCount', {
                        count: review.helpful_count,
                      })}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 報告ダイアログ */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('report.title')}</DialogTitle>
            <DialogDescription>{t('report.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {t('report.reason')}
              </label>
              <RadioGroup value={reportReason} onValueChange={setReportReason}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spam" id="spam" />
                  <label htmlFor="spam" className="text-sm">
                    {t('report.reasons.spam')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inappropriate" id="inappropriate" />
                  <label htmlFor="inappropriate" className="text-sm">
                    {t('report.reasons.inappropriate')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fake" id="fake" />
                  <label htmlFor="fake" className="text-sm">
                    {t('report.reasons.fake')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="harassment" id="harassment" />
                  <label htmlFor="harassment" className="text-sm">
                    {t('report.reasons.harassment')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <label htmlFor="other" className="text-sm">
                    {t('report.reasons.other')}
                  </label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <label className="text-sm font-medium">
                {t('report.additionalInfo')}
              </label>
              <Textarea
                value={reportDescription}
                onChange={e => setReportDescription(e.target.value)}
                placeholder={t('report.additionalInfoPlaceholder')}
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {reportDescription.length}/500
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReportDialogOpen(false)}
              disabled={isSubmittingReport}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleReport}
              disabled={isSubmittingReport || !reportReason}
            >
              {isSubmittingReport ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('report.submitting')}
                </>
              ) : (
                <>
                  <Flag className="mr-2 h-4 w-4" />
                  {t('report.submit')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
