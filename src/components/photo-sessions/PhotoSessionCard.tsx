'use client';

import React from 'react';
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  CircleDollarSignIcon,
  Clock,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslations, useLocale } from 'next-intl';
import type { PhotoSessionWithOrganizer } from '@/types/database';
import { FormattedPrice } from '@/components/ui/formatted-display';
import { CardFavoriteButton } from '@/components/ui/favorite-heart-button';

interface PhotoSessionCardProps {
  session: PhotoSessionWithOrganizer;
  onViewDetails?: (sessionId: string) => void;
  onEdit?: (sessionId: string) => void;
  showActions?: boolean;
  isOwner?: boolean;
  layoutMode?: 'vertical' | 'horizontal' | 'mobile' | 'card';
  favoriteState?: {
    isFavorited: boolean;
    favoriteCount: number;
  };
  onFavoriteToggle?: (isFavorited: boolean, favoriteCount: number) => void;
}

export function PhotoSessionCard({
  session,
  onViewDetails,
  onEdit,
  showActions = true,
  isOwner = false,
  layoutMode = 'vertical',
  favoriteState,
  onFavoriteToggle,
}: PhotoSessionCardProps) {
  const t = useTranslations('photoSessions');
  const tBooking = useTranslations('booking');
  const tWaitlist = useTranslations('waitlist');
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

  // Layout1: カード型（画像左配置）
  if (layoutMode === 'card') {
    const available = session.max_participants - session.current_participants;
    const status =
      available <= 0 ? 'full' : available <= 2 ? 'fewLeft' : 'available';

    return (
      <Card
        className="overflow-hidden hover:shadow-xl hover:border-info/50 hover:scale-[1.02] transition-all duration-300 group cursor-pointer transform"
        onClick={e => {
          // Favicon.ico調査用：カードクリック時のログ
          // eslint-disable-next-line no-console
          console.log('🃏 カードクリック detected', {
            sessionId: session.id,
            target: e.target,
            currentTarget: e.currentTarget.tagName,
            timeStamp: e.timeStamp,
          });
          onViewDetails?.(session.id);
        }}
      >
        <CardContent className="p-0">
          {/* Desktop Layout */}
          <div className="hidden md:flex ">
            {/* Image Section */}
            <div className="w-80 flex-shrink-0 relative overflow-hidden">
              {/* プレースホルダー画像 - 将来的に実際の画像に置き換え */}
              <div className="w-full h-full bg-gradient-to-br from-info/10 to-primary/10 dark:from-info/20 dark:to-primary/20 flex items-center justify-center">
                <CalendarIcon className="h-16 w-16 text-info/60 opacity-60" />
              </div>
              {/* バッジ：左上に配置 */}
              <div className="absolute top-4 left-4 flex gap-2">
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
              </div>

              {/* お気に入りボタン：右上に配置 */}
              <div className="absolute top-4 right-4">
                <CardFavoriteButton
                  favoriteType="photo_session"
                  favoriteId={session.id}
                  size="md"
                  initialState={
                    favoriteState
                      ? {
                          isFavorited: favoriteState.isFavorited,
                          favoriteCount: favoriteState.favoriteCount,
                          isAuthenticated: true,
                        }
                      : undefined
                  }
                  onToggle={onFavoriteToggle}
                />
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {session.title}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-3">
                    <User className="w-4 h-4 mr-1" />
                    <span>
                      {session.organizer.display_name ||
                        session.organizer.email}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed line-clamp-2">
                    {session.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <CalendarIcon className="w-4 h-4 mr-2 text-info" />
                    <span>
                      {formatDateLocalized(startDate, locale, 'short')}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Clock className="w-4 h-4 mr-2 text-info" />
                    <span>{formatTimeLocalized(startDate, locale)}〜</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <MapPinIcon className="w-4 h-4 mr-2 text-success" />
                    <span>{session.location}</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <UsersIcon className="w-4 h-4 mr-2 text-primary" />
                    <span>
                      {session.current_participants}/{session.max_participants}
                      名
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center">
                  <CircleDollarSignIcon className="w-5 h-5 mr-1 text-warning" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {session.price_per_person === 0 ? (
                      tBooking('free')
                    ) : (
                      <FormattedPrice
                        value={session.price_per_person}
                        format="simple"
                      />
                    )}
                  </span>
                </div>

                {/* Phase 1: 詳細・予約ボタンを削除（詳細画面専用化） */}
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden">
            {/* Image Section */}
            <div className="relative h-48 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-info/10 to-primary/10 dark:from-info/20 dark:to-primary/20 flex items-center justify-center">
                <CalendarIcon className="h-12 w-12 text-info/60 opacity-60" />
              </div>
              {/* バッジ：左上に配置 */}
              <div className="absolute top-4 left-4">
                <Badge
                  variant={
                    status === 'available'
                      ? 'default'
                      : status === 'full'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className="font-semibold text-xs"
                >
                  {status === 'available'
                    ? t('availability.available')
                    : status === 'full'
                      ? t('availability.full')
                      : t('availability.fewLeft')}
                </Badge>
              </div>

              {/* お気に入りボタン：右上に配置 */}
              <div className="absolute top-4 right-4">
                <CardFavoriteButton
                  favoriteType="photo_session"
                  favoriteId={session.id}
                  size="sm"
                  initialState={
                    favoriteState
                      ? {
                          isFavorited: favoriteState.isFavorited,
                          favoriteCount: favoriteState.favoriteCount,
                          isAuthenticated: true,
                        }
                      : undefined
                  }
                  onToggle={onFavoriteToggle}
                />
              </div>
            </div>

            {/* Content Section */}
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {session.title}
                </h3>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-3">
                  <User className="w-4 h-4 mr-1" />
                  <span>
                    {session.organizer.display_name || session.organizer.email}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {session.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <CalendarIcon className="w-4 h-4 mr-2 text-info" />
                  <span>{formatDateLocalized(startDate, locale, 'short')}</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Clock className="w-4 h-4 mr-2 text-info" />
                  <span>{formatTimeLocalized(startDate, locale)}〜</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <MapPinIcon className="w-4 h-4 mr-2 text-success" />
                  <span>{session.location}</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <UsersIcon className="w-4 h-4 mr-2 text-primary" />
                  <span>
                    {session.current_participants}/{session.max_participants}名
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center">
                  <CircleDollarSignIcon className="w-5 h-5 mr-1 text-warning" />
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {session.price_per_person === 0 ? (
                      tBooking('free')
                    ) : (
                      <FormattedPrice
                        value={session.price_per_person}
                        format="simple"
                      />
                    )}
                  </span>
                </div>
              </div>

              {/* Phase 1: モバイル詳細・予約ボタンも削除（詳細画面専用化） */}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // モバイル専用レイアウト（iPhone12 Proなど）
  if (layoutMode === 'mobile') {
    // 参加者埋まり具合の計算
    const participantFillPercentage =
      (session.current_participants / session.max_participants) * 100;

    // バッテリー風のカラーリング
    const getBatteryColor = (percentage: number) => {
      if (percentage >= 90) return 'bg-error'; // 満員間近
      if (percentage >= 70) return 'bg-warning'; // 多め
      if (percentage >= 30) return 'bg-success'; // 適度
      return 'bg-info'; // 余裕あり
    };

    return (
      <Card
        className="w-full hover:shadow-lg hover:border-info/50 hover:scale-[1.02] transition-all duration-300 bg-white border border-gray-200 cursor-pointer transform"
        onClick={e => {
          // Favicon.ico調査用：モバイルカードクリック時のログ
          // eslint-disable-next-line no-console
          console.log('📱 モバイルカードクリック detected', {
            sessionId: session.id,
            target: e.target,
            currentTarget: e.currentTarget.tagName,
            timeStamp: e.timeStamp,
          });
          onViewDetails?.(session.id);
        }}
      >
        <div className="p-4">
          {/* ヘッダー */}
          <div className="flex justify-between items-start mb-3">
            {/* 左上：バッジ */}
            <div className="flex gap-1 flex-shrink-0">
              <Badge
                variant={
                  status === 'available'
                    ? 'default'
                    : status === 'full'
                      ? 'destructive'
                      : 'secondary'
                }
                className="font-semibold text-xs"
              >
                {status === 'available'
                  ? t('availability.available')
                  : status === 'full'
                    ? t('availability.full')
                    : t('availability.fewLeft')}
              </Badge>
            </div>

            {/* 右上：お気に入りボタン */}
            <div className="flex-shrink-0">
              <CardFavoriteButton
                favoriteType="photo_session"
                favoriteId={session.id}
                size="sm"
                initialState={
                  favoriteState
                    ? {
                        isFavorited: favoriteState.isFavorited,
                        favoriteCount: favoriteState.favoriteCount,
                        isAuthenticated: true,
                      }
                    : undefined
                }
                onToggle={onFavoriteToggle}
              />
            </div>
          </div>

          {/* タイトル */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 mb-3">
            {session.title}
          </h3>

          {/* 主催者 */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {tBooking('organizer')}:{' '}
            {session.organizer.display_name || session.organizer.email}
          </p>

          {/* 説明文 */}
          {session.description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-4 leading-relaxed">
              {session.description}
            </p>
          )}

          {/* 情報グリッド（2×2）- 等しい横幅 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* 日時 */}
            <div className="bg-info/10 p-2.5 rounded-lg min-h-[70px] flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarIcon className="h-3.5 w-3.5 text-info flex-shrink-0" />
                <span className="text-xs font-semibold text-info/80 truncate">
                  {t('card.labels.dateTime')}
                </span>
              </div>
              <div className="text-xs font-medium text-gray-900 leading-tight">
                {formatDateLocalized(startDate, locale, 'short')}
              </div>
              <div className="text-xs text-gray-600 mt-0.5 leading-tight">
                {formatTimeLocalized(startDate, locale)}〜
              </div>
            </div>

            {/* 場所 */}
            <div className="bg-green-50 p-2.5 rounded-lg min-h-[70px] flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPinIcon className="h-3.5 w-3.5 text-success flex-shrink-0" />
                <span className="text-xs font-semibold text-green-800 truncate">
                  {t('card.labels.location')}
                </span>
              </div>
              <div className="text-xs font-medium text-gray-900 line-clamp-3 leading-tight">
                {session.location}
              </div>
            </div>

            {/* 参加者 - バッテリー風デザイン */}
            <div className="bg-primary/10 p-2.5 rounded-lg min-h-[70px] flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <UsersIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-xs font-semibold text-primary/80 truncate">
                  {t('card.labels.participants')}
                </span>
              </div>
              <div className="text-xs font-medium text-gray-900 mb-1.5">
                {session.current_participants}/{session.max_participants}
                {tBooking('people')}
              </div>

              {/* バッテリー風ビジュアル */}
              <div className="flex items-center gap-1">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full ${getBatteryColor(participantFillPercentage)} transition-all duration-300 rounded-full relative`}
                    style={{
                      width: `${Math.min(participantFillPercentage, 100)}%`,
                    }}
                  >
                    {participantFillPercentage >= 100 && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-700 min-w-[24px] text-right">
                  {Math.round(participantFillPercentage)}%
                </span>
              </div>
            </div>

            {/* 料金 */}
            <div className="bg-warning/10 p-2.5 rounded-lg min-h-[70px] flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <CircleDollarSignIcon className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                <span className="text-xs font-semibold text-warning/80 truncate">
                  {t('card.labels.price')}
                </span>
              </div>
              <div className="text-sm font-bold text-gray-900 mt-auto">
                {session.price_per_person === 0 ? (
                  tBooking('free')
                ) : (
                  <FormattedPrice
                    value={session.price_per_person}
                    format="simple"
                  />
                )}
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          {showActions && (
            <div className="space-y-2">
              {!isOwner && onViewDetails && (
                <Button
                  size="sm"
                  onClick={() => onViewDetails(session.id)}
                  disabled={
                    session.current_participants >= session.max_participants
                  }
                  className="w-full h-11 bg-gradient-to-r from-info to-primary hover:from-info/90 hover:to-primary/90 text-white shadow-md disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200"
                >
                  {session.current_participants >= session.max_participants
                    ? tBooking('sessionFull')
                    : tBooking('reserve')}
                </Button>
              )}

              <div className="flex gap-2">
                {onViewDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(session.id)}
                    className="flex-1 h-11 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all"
                  >
                    {t('viewDetails')}
                  </Button>
                )}

                {!isOwner &&
                  session.current_participants >= session.max_participants &&
                  onViewDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(session.id)}
                      className="flex-1 h-11 border-warning text-warning hover:bg-warning/10"
                    >
                      {tWaitlist('button.join_waitlist')}
                    </Button>
                  )}

                {isOwner && onEdit && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEdit(session.id)}
                    className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    {t('edit')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (layoutMode === 'horizontal') {
    // 参加者埋まり具合の計算（水平レイアウト用）
    const participantFillPercentage =
      (session.current_participants / session.max_participants) * 100;

    // バッテリー風のカラーリング
    const getBatteryColor = (percentage: number) => {
      if (percentage >= 90) return 'bg-error'; // 満員間近
      if (percentage >= 70) return 'bg-warning'; // 多め
      if (percentage >= 30) return 'bg-success'; // 適度
      return 'bg-blue-500'; // 余裕あり
    };

    return (
      <Card className="w-full hover:shadow-lg transition-all duration-300 group border-l-4 border-l-transparent hover:border-l-blue-500 bg-gradient-to-r from-white to-gray-50/30">
        <div className="flex items-stretch p-6">
          {/* 左側: 画像エリア（将来の実装用） */}
          <div className="w-48 h-32 bg-gradient-to-br from-info/10 to-primary/10 rounded-xl mr-6 flex-shrink-0 flex items-center justify-center shadow-sm">
            <CalendarIcon className="h-12 w-12 text-info/60 opacity-60" />
          </div>

          {/* 中央: コンテンツエリア */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* タイトルとステータス */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-700 transition-colors">
                  {session.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {tBooking('organizer')}:{' '}
                  {session.organizer.display_name || session.organizer.email}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {getStatusBadge()}
                {!session.is_published && (
                  <Badge variant="outline">{t('status.unpublished')}</Badge>
                )}
              </div>
            </div>

            {/* 説明文 */}
            {session.description && (
              <p className="text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
                {session.description}
              </p>
            )}

            {/* 詳細情報 - 四角いカードデザイン（2×2グリッド） */}
            <div className="grid grid-cols-2 gap-3">
              {/* 日時 */}
              <div className="bg-blue-50 p-3 rounded-lg min-h-[80px] flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-blue-800">
                    {t('card.labels.dateTime')}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900 leading-tight">
                  {formatDateLocalized(startDate, locale, 'short')}
                </div>
                <div className="text-xs text-gray-600 mt-1 leading-tight">
                  {formatTimeLocalized(startDate, locale)} -{' '}
                  {formatTimeLocalized(endDate, locale)}
                </div>
              </div>

              {/* 場所 */}
              <div className="bg-green-50 p-3 rounded-lg min-h-[80px] flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <MapPinIcon className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-sm font-semibold text-green-800">
                    {t('card.labels.location')}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
                  {session.location}
                </div>
              </div>

              {/* 参加者 - バッテリー風デザイン */}
              <div className="bg-primary/10 p-3 rounded-lg min-h-[80px] flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <UsersIcon className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold text-primary/80">
                    {t('card.labels.participants')}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900 mb-2">
                  {session.current_participants}/{session.max_participants}
                  {tBooking('people')}
                </div>

                {/* バッテリー風ビジュアル */}
                <div className="flex items-center gap-2 mt-auto">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full ${getBatteryColor(participantFillPercentage)} transition-all duration-300 rounded-full relative`}
                      style={{
                        width: `${Math.min(participantFillPercentage, 100)}%`,
                      }}
                    >
                      {participantFillPercentage >= 100 && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-700 min-w-[32px] text-right">
                    {Math.round(participantFillPercentage)}%
                  </span>
                </div>
              </div>

              {/* 料金 */}
              <div className="bg-warning/10 p-3 rounded-lg min-h-[80px] flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <CircleDollarSignIcon className="h-4 w-4 text-warning flex-shrink-0" />
                  <span className="text-sm font-semibold text-warning/80">
                    {t('card.labels.price')}
                  </span>
                </div>
                <div className="text-lg font-bold text-gray-900 mt-auto">
                  {session.price_per_person === 0 ? (
                    tBooking('free')
                  ) : (
                    <FormattedPrice
                      value={session.price_per_person}
                      format="simple"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 右側: アクションボタン */}
          {showActions && (
            <div className="flex flex-col gap-2 ml-6 w-36 justify-center">
              {onViewDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(session.id)}
                  className="border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all"
                >
                  {t('viewDetails')}
                </Button>
              )}
              {!isOwner && onViewDetails && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onViewDetails(session.id)}
                    disabled={
                      session.current_participants >= session.max_participants
                    }
                    className="bg-gradient-to-r from-info to-primary hover:from-info/90 hover:to-primary/90 text-white shadow-md disabled:from-gray-400 disabled:to-gray-500"
                  >
                    {session.current_participants >= session.max_participants
                      ? tBooking('sessionFull')
                      : tBooking('reserve')}
                  </Button>
                  {session.current_participants >= session.max_participants && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(session.id)}
                      className="border-warning text-warning hover:bg-warning/10"
                    >
                      {tWaitlist('button.join_waitlist')}
                    </Button>
                  )}
                </>
              )}
              {isOwner && onEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(session.id)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  {t('edit')}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // 縦型レイアウト（既存のデザイン）
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
              {session.price_per_person === 0 ? (
                tBooking('free')
              ) : (
                <FormattedPrice
                  value={session.price_per_person}
                  format="simple"
                />
              )}
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
              <>
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
                {session.current_participants >= session.max_participants && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(session.id)}
                    className="flex-1"
                  >
                    {tWaitlist('button.join_waitlist')}
                  </Button>
                )}
              </>
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
