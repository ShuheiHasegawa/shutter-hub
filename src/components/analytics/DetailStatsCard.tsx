'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FormattedPrice } from '@/components/ui/formatted-display';

interface StatItem {
  label: string;
  value: number;
  total: number;
  color?: 'default' | 'success' | 'error' | 'info';
  showPrice?: boolean;
}

interface DetailStatsCardProps {
  title: string;
  items: StatItem[];
}

const colorClasses: Record<string, string> = {
  default: '',
  success: 'text-success',
  error: 'text-error',
  info: 'text-info',
};

export function DetailStatsCard({ title, items }: DetailStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span>{item.label}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`font-bold ${
                    item.color ? colorClasses[item.color] : ''
                  }`}
                >
                  {item.showPrice ? (
                    <FormattedPrice value={item.value} format="simple" />
                  ) : (
                    item.value
                  )}
                </span>
                <Progress
                  value={(item.value / item.total) * 100}
                  className="w-20"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
