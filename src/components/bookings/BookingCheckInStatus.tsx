'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDateTimeLocalized } from '@/lib/utils/date';

interface BookingCheckInStatusProps {
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  locale: string;
}

export function BookingCheckInStatus({
  checkedInAt,
  checkedOutAt,
  locale,
}: BookingCheckInStatusProps) {
  const t = useTranslations('checkin');

  const getStatus = () => {
    if (checkedOutAt) {
      return {
        label: t('completed'),
        variant: 'default' as const,
        icon: CheckCircle2,
        color: 'text-green-500',
      };
    }
    if (checkedInAt) {
      return {
        label: t('checkedInStatus'),
        variant: 'default' as const,
        icon: CheckCircle2,
        color: 'text-blue-500',
      };
    }
    return {
      label: t('notCheckedIn'),
      variant: 'secondary' as const,
      icon: Clock,
      color: 'text-muted-foreground',
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 ${status.color}`} />
          {t('checkInStatus')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('status')}</span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {checkedInAt && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">{t('checkedInAt')}</span>
            </div>
            <div className="ml-6 text-sm">
              {formatDateTimeLocalized(new Date(checkedInAt), locale)}
            </div>
          </div>
        )}

        {checkedOutAt && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">{t('checkedOutAt')}</span>
            </div>
            <div className="ml-6 text-sm">
              {formatDateTimeLocalized(new Date(checkedOutAt), locale)}
            </div>
          </div>
        )}

        {!checkedInAt && (
          <div className="text-sm text-muted-foreground">
            {t('checkInInstructions')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
