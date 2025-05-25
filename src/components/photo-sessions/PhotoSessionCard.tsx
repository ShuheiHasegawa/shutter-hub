'use client';

import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  CircleDollarSignIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslations, useLocale } from 'next-intl';
import type { PhotoSessionWithOrganizer } from '@/types/database';

interface PhotoSessionCardProps {
  session: PhotoSessionWithOrganizer;
  onViewDetails?: (sessionId: string) => void;
  onEdit?: (sessionId: string) => void;
  showActions?: boolean;
  isOwner?: boolean;
}

export function PhotoSessionCard({
  session,
  onViewDetails,
  onEdit,
  showActions = true,
  isOwner = false,
}: PhotoSessionCardProps) {
  const t = useTranslations('photoSessions');
  const tBooking = useTranslations('booking');
  const locale = useLocale();

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);
  const now = new Date();
  const isUpcoming = startDate > now;
  const isOngoing = startDate <= now && endDate > now;
  const isPast = endDate <= now;

  const getStatusBadge = () => {
    if (isPast) {
      return <Badge variant="secondary">{t('status.ended')}</Badge>;
    }
    if (isOngoing) {
      return <Badge variant="default">{t('status.ongoing')}</Badge>;
    }
    if (isUpcoming) {
      return <Badge variant="outline">{t('status.upcoming')}</Badge>;
    }
    return null;
  };

  const getAvailabilityBadge = () => {
    const available = session.max_participants - session.current_participants;
    if (available <= 0) {
      return <Badge variant="destructive">{t('availability.full')}</Badge>;
    }
    if (available <= 2) {
      return <Badge variant="secondary">{t('availability.fewLeft')}</Badge>;
    }
    return <Badge variant="outline">{t('availability.available')}</Badge>;
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-2">
            {session.title}
          </CardTitle>
          <div className="flex gap-2 ml-2">
            {getStatusBadge()}
            {!session.is_published && (
              <Badge variant="outline">{t('status.unpublished')}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {tBooking('organizer')}:{' '}
            {session.organizer.display_name || session.organizer.email}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {session.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {session.description}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div>{formatDateLocalized(startDate, locale, 'long')}</div>
              <div className="text-muted-foreground">
                {formatTimeLocalized(startDate, locale)} -{' '}
                {formatTimeLocalized(endDate, locale)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
            <span>{session.location}</span>
          </div>

          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {session.current_participants}/{session.max_participants}
              {tBooking('people')}
            </span>
            {getAvailabilityBadge()}
          </div>

          <div className="flex items-center gap-2">
            <CircleDollarSignIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {session.price_per_person === 0
                ? tBooking('free')
                : `¥${session.price_per_person.toLocaleString()}`}
            </span>
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2 pt-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(session.id)}
                className="flex-1"
              >
                {t('viewDetails')}
              </Button>
            )}
            {!isOwner && onViewDetails && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onViewDetails(session.id)}
                className="flex-1"
                disabled={
                  session.current_participants >= session.max_participants
                }
              >
                {session.current_participants >= session.max_participants
                  ? tBooking('sessionFull')
                  : tBooking('reserve')}
              </Button>
            )}
            {isOwner && onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(session.id)}
              >
                {t('edit')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
