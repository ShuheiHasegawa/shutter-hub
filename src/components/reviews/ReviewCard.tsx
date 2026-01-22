'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';
import { FormattedDateTime } from '@/components/ui/formatted-display';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { addReviewReaction, reportReview } from '@/app/actions/reviews';
import {
  REACTION_TYPES,
  REACTION_LABELS,
  type ReactionType,
} from '@/constants/reactions';
import {
  ThumbsUp,
  ThumbsDown,
  Flag,
  User,
  Calendar,
  MoreHorizontal,
  CheckCircle,
  Minus,
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
    overall_rating: number; // 1 (bad), 3 (normal), 5 (good) のみ
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
    created_at: string;
    user_reaction?: {
      reaction_type: ReactionType;
    } | null;
    reaction_counts?: Record<string, number>;
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

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(
    review.user_reaction?.reaction_type || null
  );
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>(
    review.reaction_counts || {}
  );

  // レビューのリアクション状態が更新されたときに状態を同期
  useEffect(() => {
    if (review.user_reaction) {
      setUserReaction(review.user_reaction.reaction_type);
    } else {
      setUserReaction(null);
    }
  }, [review.user_reaction]);

  useEffect(() => {
    if (review.reaction_counts) {
      setReactionCounts(review.reaction_counts);
    }
  }, [review.reaction_counts]);

  const handleReaction = async (reactionType: ReactionType) => {
    try {
      const result = await addReviewReaction({
        review_id: review.id,
        review_type: type,
        reaction_type: reactionType,
      });

      if (result.error) {
        toast({
          title: t('error.voteFailed'),
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      // 既存のリアクションと同じ場合は削除、違う場合は更新
      if (userReaction === reactionType) {
        setUserReaction(null);
        // リアクション数を減らす
        setReactionCounts(prev => ({
          ...prev,
          [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1),
        }));
      } else {
        // 以前のリアクションがあれば減らす
        if (userReaction) {
          setReactionCounts(prev => ({
            ...prev,
            [userReaction]: Math.max(0, (prev[userReaction] || 0) - 1),
          }));
        }
        setUserReaction(reactionType);
        // 新しいリアクション数を増やす
        setReactionCounts(prev => ({
          ...prev,
          [reactionType]: (prev[reactionType] || 0) + 1,
        }));
      }

      toast({
        title: tCommon('success'),
        description: t('success.voteSubmitted'),
      });
    } catch (error) {
      logger.error('リアクションエラー:', error);
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
      logger.error('報告エラー:', error);
      toast({
        title: t('error.reportFailed'),
        description: t('error.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // 数値評価をrating_levelに変換
  const numberToRatingLevel = (rating: number): 'good' | 'normal' | 'bad' => {
    if (rating >= 4) return 'good';
    if (rating === 3) return 'normal';
    return 'bad';
  };

  const RatingLevelDisplay = ({
    rating,
    label,
  }: {
    rating: number;
    label: string;
  }) => {
    const level = numberToRatingLevel(rating);
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground min-w-0 flex-1">
          {label}
        </span>
        <Badge variant={ratingBadgeVariants[level]} className="text-xs">
          {level === 'good' && <ThumbsUp className="h-3 w-3 mr-1" />}
          {level === 'normal' && <Minus className="h-3 w-3 mr-1" />}
          {level === 'bad' && <ThumbsDown className="h-3 w-3 mr-1" />}
          {ratingLabels[level]}
        </Badge>
      </div>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // overall_ratingから評価ラベルを取得（1=bad, 3=normal, 5=good）
  const getRatingLevel = (): 'good' | 'normal' | 'bad' => {
    if (review.overall_rating === 5) return 'good';
    if (review.overall_rating === 3) return 'normal';
    return 'bad'; // 1 or その他
  };

  const ratingLevel = getRatingLevel();
  const ratingLabels = {
    good: t('form.ratingLabels.good') || '良い',
    normal: t('form.ratingLabels.normal') || '普通',
    bad: t('form.ratingLabels.bad') || '悪い',
  };
  const ratingBadgeVariants = {
    good: 'default',
    normal: 'secondary',
    bad: 'destructive',
  } as const;

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
                  <FormattedDateTime
                    value={new Date(review.created_at)}
                    format="date-long"
                  />
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
                    <Flag className="h-4 w-4" />
                    {t('actions.report')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* 総合評価 */}
          <div className="flex items-center gap-3">
            <Badge variant={ratingBadgeVariants[ratingLevel]}>
              {ratingLevel === 'good' && <ThumbsUp className="h-3 w-3 mr-1" />}
              {ratingLevel === 'normal' && <Minus className="h-3 w-3 mr-1" />}
              {ratingLevel === 'bad' && <ThumbsDown className="h-3 w-3 mr-1" />}
              {ratingLabels[ratingLevel]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              ({review.overall_rating}/5)
            </span>
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
                  <RatingLevelDisplay
                    rating={review.organization_rating}
                    label={t('form.organizationRating')}
                  />
                )}
                {review.communication_rating && (
                  <RatingLevelDisplay
                    rating={review.communication_rating}
                    label={t('form.communicationRating')}
                  />
                )}
                {review.value_rating && (
                  <RatingLevelDisplay
                    rating={review.value_rating}
                    label={t('form.valueRating')}
                  />
                )}
                {review.venue_rating && (
                  <RatingLevelDisplay
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
                  <h4 className="text-sm font-medium text-success">
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

              {/* リアクション */}
              <div className="flex items-center gap-2 flex-wrap">
                {REACTION_TYPES.map(emoji => {
                  const count = reactionCounts[emoji] || 0;
                  const isSelected = userReaction === emoji;

                  return (
                    <Button
                      key={emoji}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleReaction(emoji)}
                      className="flex items-center gap-1"
                      title={t(`reactions.${REACTION_LABELS[emoji]}`)}
                    >
                      <span className="text-lg">{emoji}</span>
                      {count > 0 && (
                        <span className="text-xs ml-1">{count}</span>
                      )}
                    </Button>
                  );
                })}
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
                <>{t('report.submit')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
