'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CommunityBoardSidebarProps {
  participantCount: number;
  postCount: number;
  eventTimeRange?: string;
}

export function CommunityBoardSidebar({
  participantCount,
  postCount,
  eventTimeRange,
}: CommunityBoardSidebarProps) {
  const t = useTranslations('communityBoard');

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base">
            {t('sessionInfo', { defaultValue: '撮影会情報' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('participants')}
            </span>
            <span className="font-medium">
              {participantCount}
              {t('people', { defaultValue: '名' })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('postCount')}
            </span>
            <span className="font-medium">
              {postCount}
              {t('posts', { defaultValue: '件' })}
            </span>
          </div>
          {eventTimeRange && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('eventTime')}
              </span>
              <span className="font-medium">{eventTimeRange}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
