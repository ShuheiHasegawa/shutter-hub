'use client';

import React from 'react';
import { CalendarIcon, MapPinIcon, UsersIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import type { PhotoSessionWithOrganizer } from '@/types/database';
import {
  FormattedPrice,
  FormattedDateTime,
} from '@/components/ui/formatted-display';
import { CardFavoriteButton } from '@/components/ui/favorite-heart-button';
import { EmptyImage } from '@/components/ui/empty-image';
import { Camera } from 'lucide-react';

interface PhotoSessionGridCardProps {
  session: PhotoSessionWithOrganizer;
  onViewDetails?: (sessionId: string) => void;
  onEdit?: (sessionId: string) => void;
  showActions?: boolean;
  isOwner?: boolean;
  favoriteState?: {
    isFavorited: boolean;
    favoriteCount: number;
    isAuthenticated: boolean;
  };
  onFavoriteToggle?: (isFavorited: boolean, favoriteCount: number) => void;
}

export function PhotoSessionGridCard({
  session,
  onViewDetails,
  favoriteState,
  onFavoriteToggle,
}: PhotoSessionGridCardProps) {
  const t = useTranslations('photoSessions');
  const tBooking = useTranslations('booking');

  const startDate = new Date(session.start_time);
  const available = session.max_participants - session.current_participants;

  const getAvailabilityBadge = () => {
    const status =
      available <= 0 ? 'full' : available <= 2 ? 'fewLeft' : 'available';
    return (
      <Badge
        variant={
          status === 'available'
            ? 'default'
            : status === 'full'
              ? 'destructive'
              : 'secondary'
        }
        className="font-semibold"
      >
        {status === 'available'
          ? t('availability.available')
          : status === 'full'
            ? t('availability.full')
            : t('availability.fewLeft')}
      </Badge>
    );
  };

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
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
      onClick={() => onViewDetails?.(session.id)}
    >
      {/* Image Section */}
      <div className="relative h-40 md:h-48 w-full overflow-hidden">
        <EmptyImage
          src={session.image_urls?.[0] || undefined}
          alt={session.title}
          fallbackIcon={Camera}
          fallbackIconSize="lg"
          fill
          className="object-cover object-top"
        />
        {/* Availability Badge: Top Left */}
        <div className="absolute top-2 md:top-4 left-2 md:left-4">
          {getAvailabilityBadge()}
        </div>
        {/* Booking Type Badge: Bottom Right */}
        {getBookingTypeBadge() && (
          <div className="absolute bottom-2 right-2">
            {getBookingTypeBadge()}
          </div>
        )}
        {/* Favorite Button: Top Right */}
        <CardFavoriteButton
          favoriteType="photo_session"
          favoriteId={session.id}
          size="sm"
          initialState={
            favoriteState
              ? {
                  isFavorited: favoriteState.isFavorited,
                  favoriteCount: favoriteState.favoriteCount,
                  isAuthenticated: favoriteState.isAuthenticated,
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

      {/* Content Section */}
      <CardContent className="p-3 md:p-4 lg:p-5">
        {/* Title */}
        <h3 className="text-sm md:text-base lg:text-lg font-semibold md:font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 min-h-[2.5rem]">
          {session.title}
        </h3>

        {/* Info Grid */}
        <div className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-3">
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
            <span>
              <FormattedDateTime value={startDate} format="date-short" />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MapPinIcon className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
            <span className="truncate">{session.location}</span>
          </div>
        </div>

        {/* Description */}
        {session.description && (
          <p className="text-gray-700 dark:text-gray-300 text-xs md:text-sm mb-3 md:mb-4 line-clamp-2">
            {session.description}
          </p>
        )}

        {/* Footer: Price and Button */}
        <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-gray-100 md:border-gray-200 dark:border-gray-700">
          <div className="text-sm md:text-xl font-bold text-primary md:text-gray-900 dark:text-white">
            {session.price_per_person === 0 ? (
              tBooking('free')
            ) : (
              <FormattedPrice
                value={session.price_per_person}
                format="simple"
              />
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <UsersIcon className="w-3 h-3 flex-shrink-0" />
            <span>
              {session.current_participants}/{session.max_participants}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
