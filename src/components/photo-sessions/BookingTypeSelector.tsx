'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Shuffle, UserCheck, Star, Info } from 'lucide-react';
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
  const t = useTranslations('photoSessions');

  const bookingTypes = [
    {
      value: 'first_come' as BookingType,
      title: t('bookingType.firstCome.title'),
      description: t('bookingType.firstCome.description'),
      icon: Clock,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      features: [
        t('bookingType.firstCome.feature1'),
        t('bookingType.firstCome.feature2'),
        t('bookingType.firstCome.feature3'),
      ],
    },
    {
      value: 'lottery' as BookingType,
      title: t('bookingType.lottery.title'),
      description: t('bookingType.lottery.description'),
      icon: Shuffle,
      color: 'bg-green-100 text-green-800 border-green-200',
      features: [
        t('bookingType.lottery.feature1'),
        t('bookingType.lottery.feature2'),
        t('bookingType.lottery.feature3'),
      ],
    },
    {
      value: 'admin_lottery' as BookingType,
      title: t('bookingType.adminLottery.title'),
      description: t('bookingType.adminLottery.description'),
      icon: UserCheck,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      features: [
        t('bookingType.adminLottery.feature1'),
        t('bookingType.adminLottery.feature2'),
        t('bookingType.adminLottery.feature3'),
      ],
    },
    {
      value: 'priority' as BookingType,
      title: t('bookingType.priority.title'),
      description: t('bookingType.priority.description'),
      icon: Star,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      features: [
        t('bookingType.priority.feature1'),
        t('bookingType.priority.feature2'),
        t('bookingType.priority.feature3'),
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t('bookingType.title')}</h3>

      <RadioGroup
        value={value}
        onValueChange={newValue => onChange(newValue as BookingType)}
        disabled={disabled}
        className="space-y-4"
      >
        {bookingTypes.map(type => {
          const Icon = type.icon;
          const isSelected = value === type.value;

          return (
            <div key={type.value} className="relative">
              <RadioGroupItem
                value={type.value}
                id={type.value}
                className="sr-only"
              />
              <Label
                htmlFor={type.value}
                className={`block cursor-pointer transition-all duration-200 ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Card
                  className={`transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? 'ring-2 ring-primary shadow-md'
                      : 'hover:border-muted-foreground/20'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${type.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {type.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {type.description}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <Badge variant="default" className="ml-2">
                          {t('bookingType.selected')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {type.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
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
