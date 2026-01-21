'use client';

import { Card, CardContent } from '@/components/ui/card';
import { type LucideIcon } from 'lucide-react';
import { FormattedPrice } from '@/components/ui/formatted-display';
import { Star } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string | number;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  showStars?: boolean;
  rating?: number;
  showPrice?: boolean;
}

export function StatsCard({
  label,
  value,
  subValue,
  icon: Icon,
  iconBgColor,
  iconColor,
  showStars = false,
  rating = 0,
  showPrice = false,
}: StatsCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-3 md:p-4 lg:p-6">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
              {label}
            </p>
            <div
              className={`p-1.5 md:p-2 rounded-lg ${iconBgColor} flex-shrink-0`}
            >
              <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${iconColor}`} />
            </div>
          </div>
          <div className="flex flex-col space-y-0.5">
            {showPrice && typeof value === 'number' ? (
              <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                <FormattedPrice value={value} format="simple" />
              </p>
            ) : showStars ? (
              <div className="flex items-baseline space-x-0.5">
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                  {typeof value === 'number' ? value.toFixed(1) : value}
                </p>
                <span className="text-xs md:text-sm text-muted-foreground">
                  /5.0
                </span>
              </div>
            ) : (
              <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                {value}
              </p>
            )}
            {showStars && rating > 0 && (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`h-2.5 w-2.5 ${
                      star <= rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
            {subValue !== undefined && (
              <p className="text-xs text-muted-foreground">
                {showPrice && typeof subValue === 'number' ? (
                  <>
                    今月: <FormattedPrice value={subValue} format="simple" />
                  </>
                ) : (
                  subValue
                )}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
