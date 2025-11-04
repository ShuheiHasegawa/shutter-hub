'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Star,
  TrendingUp,
  Users,
  Camera,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface UserRatingStatsProps {
  stats: {
    user_id: string;
    organizer_review_count: number;
    organizer_avg_rating: number;
    organizer_avg_organization: number;
    organizer_avg_communication: number;
    organizer_avg_value: number;
    organizer_avg_venue: number;
    participant_review_count: number;
    participant_avg_rating: number;
    participant_avg_punctuality: number;
    participant_avg_communication: number;
    participant_avg_professionalism: number;
    participant_avg_cooperation: number;
    updated_at: string;
  };
}

export function UserRatingStats({ stats }: UserRatingStatsProps) {
  const t = useTranslations('reviews');

  // 数値評価をrating_levelに変換
  const numberToRatingLevel = (rating: number): 'good' | 'normal' | 'bad' => {
    if (rating >= 4) return 'good';
    if (rating === 3) return 'normal';
    return 'bad';
  };

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

  const RatingLevelDisplay = ({
    rating,
    label,
  }: {
    rating: number;
    label: string;
  }) => {
    const level = numberToRatingLevel(rating);
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <Badge variant={ratingBadgeVariants[level]} className="text-xs">
            {level === 'good' && <ThumbsUp className="h-3 w-3 mr-1" />}
            {level === 'normal' && <Minus className="h-3 w-3 mr-1" />}
            {level === 'bad' && <ThumbsDown className="h-3 w-3 mr-1" />}
            {ratingLabels[level]}
          </Badge>
          <span className="text-sm font-medium text-muted-foreground">
            ({rating > 0 ? rating.toFixed(1) : '-'})
          </span>
        </div>
      </div>
    );
  };

  const hasOrganizerStats = stats.organizer_review_count > 0;
  const hasParticipantStats = stats.participant_review_count > 0;

  if (!hasOrganizerStats && !hasParticipantStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            評価統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>まだ評価がありません</p>
            <p className="text-sm">
              撮影会に参加または主催すると評価が表示されます
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          評価統計
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 主催者としての評価 */}
        {hasOrganizerStats && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-4 w-4" />
              <h4 className="font-medium">主催者として</h4>
              <Badge variant="secondary">
                {stats.organizer_review_count}件のレビュー
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">総合評価</span>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      ratingBadgeVariants[
                        numberToRatingLevel(stats.organizer_avg_rating)
                      ]
                    }
                  >
                    {numberToRatingLevel(stats.organizer_avg_rating) ===
                      'good' && <ThumbsUp className="h-3 w-3 mr-1" />}
                    {numberToRatingLevel(stats.organizer_avg_rating) ===
                      'normal' && <Minus className="h-3 w-3 mr-1" />}
                    {numberToRatingLevel(stats.organizer_avg_rating) ===
                      'bad' && <ThumbsDown className="h-3 w-3 mr-1" />}
                    {
                      ratingLabels[
                        numberToRatingLevel(stats.organizer_avg_rating)
                      ]
                    }
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground">
                    ({stats.organizer_avg_rating.toFixed(1)})
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                {stats.organizer_avg_organization > 0 && (
                  <RatingLevelDisplay
                    rating={stats.organizer_avg_organization}
                    label="運営・進行"
                  />
                )}
                {stats.organizer_avg_communication > 0 && (
                  <RatingLevelDisplay
                    rating={stats.organizer_avg_communication}
                    label="コミュニケーション"
                  />
                )}
                {stats.organizer_avg_value > 0 && (
                  <RatingLevelDisplay
                    rating={stats.organizer_avg_value}
                    label="コストパフォーマンス"
                  />
                )}
                {stats.organizer_avg_venue > 0 && (
                  <RatingLevelDisplay
                    rating={stats.organizer_avg_venue}
                    label="会場・環境"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {hasOrganizerStats && hasParticipantStats && <Separator />}

        {/* 参加者としての評価 */}
        {hasParticipantStats && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4" />
              <h4 className="font-medium">参加者</h4>
              <Badge variant="secondary">
                {stats.participant_review_count}件のレビュー
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">総合評価</span>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      ratingBadgeVariants[
                        numberToRatingLevel(stats.participant_avg_rating)
                      ]
                    }
                  >
                    {numberToRatingLevel(stats.participant_avg_rating) ===
                      'good' && <ThumbsUp className="h-3 w-3 mr-1" />}
                    {numberToRatingLevel(stats.participant_avg_rating) ===
                      'normal' && <Minus className="h-3 w-3 mr-1" />}
                    {numberToRatingLevel(stats.participant_avg_rating) ===
                      'bad' && <ThumbsDown className="h-3 w-3 mr-1" />}
                    {
                      ratingLabels[
                        numberToRatingLevel(stats.participant_avg_rating)
                      ]
                    }
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground">
                    ({stats.participant_avg_rating.toFixed(1)})
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                {stats.participant_avg_punctuality > 0 && (
                  <RatingLevelDisplay
                    rating={stats.participant_avg_punctuality}
                    label="時間厳守"
                  />
                )}
                {stats.participant_avg_communication > 0 && (
                  <RatingLevelDisplay
                    rating={stats.participant_avg_communication}
                    label="コミュニケーション"
                  />
                )}
                {stats.participant_avg_professionalism > 0 && (
                  <RatingLevelDisplay
                    rating={stats.participant_avg_professionalism}
                    label="プロ意識"
                  />
                )}
                {stats.participant_avg_cooperation > 0 && (
                  <RatingLevelDisplay
                    rating={stats.participant_avg_cooperation}
                    label="協調性"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
