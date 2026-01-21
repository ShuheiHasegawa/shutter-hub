'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type LucideIcon } from 'lucide-react';

interface Location {
  location: string;
  count: number;
}

interface LocationStatsProps {
  title: string;
  locations: Location[];
  icon?: LucideIcon;
  unit?: string;
}

export function LocationStats({
  title,
  locations,
  icon: Icon,
  unit = '件',
}: LocationStatsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {locations.map((location, index) => (
            <div
              key={`${location.location}-${index}`}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {Icon ? (
                  <>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{location.location}</span>
                  </>
                ) : (
                  <>
                    <Badge variant="outline">{index + 1}</Badge>
                    <span>{location.location}</span>
                  </>
                )}
              </div>
              <span className="font-bold">
                {location.count}
                {unit}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
