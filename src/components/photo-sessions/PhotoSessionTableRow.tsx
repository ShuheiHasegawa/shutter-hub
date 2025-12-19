'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import type { PhotoSessionWithOrganizer } from '@/types/database';
import {
  FormattedPrice,
  FormattedDateTime,
} from '@/components/ui/formatted-display';
import { EmptyImage } from '@/components/ui/empty-image';
import { Camera } from 'lucide-react';

interface PhotoSessionTableRowProps {
  session: PhotoSessionWithOrganizer;
  onViewDetails?: (sessionId: string) => void;
  onEdit?: (sessionId: string) => void;
  showActions?: boolean;
  isOwner?: boolean;
}

export function PhotoSessionTableRow({
  session,
  onViewDetails,
  showActions = true,
}: PhotoSessionTableRowProps) {
  const t = useTranslations('photoSessions');
  const tBooking = useTranslations('booking');
  const startDate = new Date(session.start_time);
  const available = session.max_participants - session.current_participants;

  const getAvailabilityBadge = () => {
    if (available <= 0) {
      return <Badge variant="destructive">{t('availability.full')}</Badge>;
    }
    if (available <= 2) {
      return <Badge variant="secondary">{t('availability.fewLeft')}</Badge>;
    }
    return <Badge variant="outline">{t('availability.available')}</Badge>;
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
    <tr
      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      onClick={() => onViewDetails?.(session.id)}
    >
      {/* 撮影会名 */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 relative">
            <EmptyImage
              src={session.image_urls?.[0] || undefined}
              alt={session.title}
              fallbackIcon={Camera}
              fallbackIconSize="sm"
              fill
              className="object-cover object-top"
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
              {session.title}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {session.organizer.display_name || session.organizer.email}
            </div>
          </div>
        </div>
      </td>

      {/* 開催日時 */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-white">
          <FormattedDateTime value={startDate} format="date-short" />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <FormattedDateTime value={startDate} format="time" />〜
        </div>
      </td>

      {/* 場所 */}
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 dark:text-white max-w-[150px] truncate">
          {session.location}
        </div>
      </td>

      {/* 予約状況 */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-white mb-1">
          {session.current_participants}/{session.max_participants}
          {tBooking('people')}
        </div>
        {getAvailabilityBadge()}
      </td>

      {/* 予約方式 */}
      <td className="px-6 py-4 whitespace-nowrap">{getBookingTypeBadge()}</td>

      {/* 料金 */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-lg font-bold text-gray-900 dark:text-white">
          {session.price_per_person === 0 ? (
            tBooking('free')
          ) : (
            <FormattedPrice value={session.price_per_person} format="simple" />
          )}
        </div>
      </td>

      {/* アクション */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        {showActions && (
          <Button
            size="sm"
            variant="default"
            onClick={e => {
              e.stopPropagation();
              onViewDetails?.(session.id);
            }}
            className="text-sm whitespace-nowrap"
          >
            {t('viewDetails')}
          </Button>
        )}
      </td>
    </tr>
  );
}
