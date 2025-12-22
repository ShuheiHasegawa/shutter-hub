'use client';

import React from 'react';
import { CalendarIcon, MapPinIcon, UsersIcon, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import type { PhotoSessionWithOrganizer } from '@/types/database';
import {
  FormattedPrice,
  FormattedDateTime,
} from '@/components/ui/formatted-display';
import { FavoriteHeartButton } from '@/components/ui/favorite-heart-button';
import Link from 'next/link';

interface PhotoSessionMobileListCardProps {
  session: PhotoSessionWithOrganizer;
  onViewDetails?: (sessionId: string) => void;
  favoriteState?: {
    isFavorited: boolean;
    favoriteCount: number;
  };
  onFavoriteToggle?: (isFavorited: boolean, favoriteCount: number) => void;
}

export function PhotoSessionMobileListCard({
  session,
  onViewDetails,
  favoriteState,
  onFavoriteToggle,
}: PhotoSessionMobileListCardProps) {
  const t = useTranslations('photoSessions');
  const tBooking = useTranslations('booking');

  const startDate = new Date(session.start_time);

  const getBookingTypeBadge = () => {
    if (!session.booking_type) return null;
    const bookingTypeLabels: Record<string, string> = {
      first_come: t('status.firstCome'),
      lottery: t('status.lottery'),
      admin_lottery: t('status.management'),
      priority: t('status.priority'),
    };
    const label =
      bookingTypeLabels[session.booking_type] || session.booking_type;
    return (
      <Badge variant="secondary" className="text-xs">
        {label}
      </Badge>
    );
  };

  return (
    <Link
      href={`/photo-sessions/${session.id}`}
      className="block bg-white dark:bg-gray-900 rounded-lg shadow-sm hover:shadow-md transition-all p-4 border border-gray-200 dark:border-gray-800"
      onClick={e => {
        if (onViewDetails) {
          e.preventDefault();
          onViewDetails(session.id);
        }
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
            {session.title}
          </h3>
          {getBookingTypeBadge() && (
            <div className="mb-1">{getBookingTypeBadge()}</div>
          )}
        </div>
        <div className="flex-shrink-0 ml-2">
          <FavoriteHeartButton
            favoriteType="photo_session"
            favoriteId={session.id}
            size="sm"
            position="inline"
            variant="ghost"
            iconOnly
            initialState={
              favoriteState
                ? {
                    isFavorited: favoriteState.isFavorited,
                    favoriteCount: favoriteState.favoriteCount,
                    isAuthenticated: true,
                  }
                : {
                    isFavorited: false,
                    favoriteCount: 0,
                    isAuthenticated: false,
                  }
            }
            onToggle={onFavoriteToggle}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300 mb-3">
        <div className="flex items-center gap-1">
          <CalendarIcon className="w-4 h-4 flex-shrink-0" />
          <span>
            <FormattedDateTime value={startDate} format="date-short" />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>
            <FormattedDateTime value={startDate} format="time" />〜
          </span>
        </div>
        <div className="flex items-center gap-1">
          <MapPinIcon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{session.location}</span>
        </div>
        <div className="flex items-center gap-1">
          <UsersIcon className="w-4 h-4 flex-shrink-0" />
          <span>
            {session.current_participants}/{session.max_participants}
            {tBooking('people')}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <User className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            {session.organizer.display_name || session.organizer.email}
          </span>
        </div>
        <span className="text-primary font-bold text-sm">
          {session.price_per_person === 0 ? (
            tBooking('free')
          ) : (
            <FormattedPrice value={session.price_per_person} format="simple" />
          )}
        </span>
      </div>
    </Link>
  );
}
