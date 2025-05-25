'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Shuffle, UserCheck, Star } from 'lucide-react';
import type { BookingType } from '@/types/database';

interface BookingTypeSelectorProps {
  value: BookingType;
  onChange: (value: BookingType) => void;
  disabled?: boolean;
}

export function BookingTypeSelector({
  value,
  onChange,
  disabled = false,
}: BookingTypeSelectorProps) {
  const t = useTranslations('photoSessions.bookingType');

  const bookingTypes = [
    {
      value: 'first_come' as BookingType,
      icon: Clock,
      title: t('firstCome.title'),
      description: t('firstCome.description'),
      badge: t('firstCome.badge'),
      badgeVariant: 'default' as const,
      features: [
        t('firstCome.feature1'),
        t('firstCome.feature2'),
        t('firstCome.feature3'),
      ],
    },
    {
      value: 'lottery' as BookingType,
      icon: Shuffle,
      title: t('lottery.title'),
      description: t('lottery.description'),
      badge: t('lottery.badge'),
      badgeVariant: 'secondary' as const,
      features: [
        t('lottery.feature1'),
        t('lottery.feature2'),
        t('lottery.feature3'),
      ],
    },
    {
      value: 'admin_lottery' as BookingType,
      icon: UserCheck,
      title: t('adminLottery.title'),
      description: t('adminLottery.description'),
      badge: t('adminLottery.badge'),
      badgeVariant: 'outline' as const,
      features: [
        t('adminLottery.feature1'),
        t('adminLottery.feature2'),
        t('adminLottery.feature3'),
      ],
    },
    {
      value: 'priority' as BookingType,
      icon: Star,
      title: t('priority.title'),
      description: t('priority.description'),
      badge: t('priority.badge'),
      badgeVariant: 'destructive' as const,
      features: [
        t('priority.feature1'),
        t('priority.feature2'),
        t('priority.feature3'),
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">{t('title')}</h3>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {bookingTypes.map(type => {
          const Icon = type.icon;
          return (
            <div key={type.value} className="relative">
              <RadioGroupItem
                value={type.value}
                id={type.value}
                className="peer sr-only"
              />
              <Label htmlFor={type.value} className="cursor-pointer">
                <Card className="peer-checked:ring-2 peer-checked:ring-primary peer-checked:border-primary transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">
                          {type.title}
                        </CardTitle>
                      </div>
                      <Badge variant={type.badgeVariant} className="text-xs">
                        {type.badge}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3">
                      {type.description}
                    </p>
                    <ul className="space-y-1">
                      {type.features.map((feature, index) => (
                        <li
                          key={index}
                          className="text-xs text-muted-foreground flex items-center gap-1"
                        >
                          <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
