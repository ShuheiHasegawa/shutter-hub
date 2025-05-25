'use client';

import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  CircleDollarSignIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);
  const now = new Date();
  const isUpcoming = startDate > now;
  const isOngoing = startDate <= now && endDate > now;
  const isPast = endDate <= now;

  const getStatusBadge = () => {
    if (isPast) {
      return <Badge variant="secondary">終了</Badge>;
    }
    if (isOngoing) {
      return <Badge variant="default">開催中</Badge>;
    }
    if (isUpcoming) {
      return <Badge variant="outline">予定</Badge>;
    }
    return null;
  };

  const getAvailabilityBadge = () => {
    const available = session.max_participants - session.current_participants;
    if (available <= 0) {
      return <Badge variant="destructive">満員</Badge>;
    }
    if (available <= 2) {
      return <Badge variant="secondary">残りわずか</Badge>;
    }
    return <Badge variant="outline">空きあり</Badge>;
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
            {!session.is_published && <Badge variant="outline">非公開</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            主催者: {session.organizer.display_name || session.organizer.email}
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
              <div>{format(startDate, 'PPP', { locale: ja })}</div>
              <div className="text-muted-foreground">
                {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
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
              {session.current_participants}/{session.max_participants}人
            </span>
            {getAvailabilityBadge()}
          </div>

          <div className="flex items-center gap-2">
            <CircleDollarSignIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {session.price_per_person === 0
                ? '無料'
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
                詳細を見る
              </Button>
            )}
            {isOwner && onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(session.id)}
              >
                編集
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
