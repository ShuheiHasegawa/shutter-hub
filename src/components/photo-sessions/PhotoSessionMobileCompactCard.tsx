'use client';

import React from 'react';
import { CalendarIcon, MapPinIcon, UsersIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import type { PhotoSessionWithOrganizer } from '@/types/database';
import {
  FormattedPrice,
  FormattedDateTime,
} from '@/components/ui/formatted-display';
import { FavoriteHeartButton } from '@/components/ui/favorite-heart-button';
import { EmptyImage } from '@/components/ui/empty-image';
import { Camera } from 'lucide-react';
import Link from 'next/link';

interface PhotoSessionMobileCompactCardProps {
  session: PhotoSessionWithOrganizer;
  onViewDetails?: (sessionId: string) => void;
  favoriteState?: {
    isFavorited: boolean;
    favoriteCount: number;
    isAuthenticated: boolean;
  };
  onFavoriteToggle?: (isFavorited: boolean, favoriteCount: number) => void;
}

export function PhotoSessionMobileCompactCard({
  session,
  onViewDetails,
  favoriteState,
  onFavoriteToggle,
}: PhotoSessionMobileCompactCardProps) {
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
      className="flex gap-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-all p-3 border border-gray-200 dark:border-gray-800"
      onClick={e => {
        if (onViewDetails) {
          e.preventDefault();
          onViewDetails(session.id);
        }
      }}
    >
      {/* 画像セクション */}
      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
        <EmptyImage
          src={session.image_urls?.[0] || undefined}
          alt={session.title}
          fallbackIcon={Camera}
          fallbackIconSize="sm"
          fill
          className="object-cover"
        />
        {/* カテゴリバッジ */}
        {getBookingTypeBadge() && (
          <div className="absolute top-1 right-1">{getBookingTypeBadge()}</div>
        )}
      </div>

      {/* コンテンツセクション */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
          {session.title}
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 mb-1">
          <CalendarIcon className="w-3 h-3 flex-shrink-0" />
          <span>
            <FormattedDateTime value={startDate} format="date-short" />
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 mb-2">
          <MapPinIcon className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{session.location}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-primary font-bold text-sm">
            {session.price_per_person === 0 ? (
              tBooking('free')
            ) : (
              <FormattedPrice
                value={session.price_per_person}
                format="simple"
              />
            )}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <UsersIcon className="w-3 h-3 flex-shrink-0" />
            <span>
              {session.current_participants}/{session.max_participants}
            </span>
          </div>
        </div>
      </div>

      {/* お気に入りボタン */}
      <div className="flex-shrink-0">
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
    </Link>
  );
}
