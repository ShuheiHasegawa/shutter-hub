'use client';

import { useTranslations } from 'next-intl';
import { useCallback, memo } from 'react';
import {
  SelectableCardGroup,
  SelectableCardItem,
} from '@/components/ui/selectable-card';
import { Clock, Shuffle, UserCheck, Star } from 'lucide-react';
import type { BookingType } from '@/types/database';

interface BookingTypeSelectorProps {
  value: BookingType;
  onChange: (value: BookingType) => void;
  disabled?: boolean;
}

export const BookingTypeSelector = memo(function BookingTypeSelector({
  value,
  onChange,
  disabled = false,
}: BookingTypeSelectorProps) {
  const t = useTranslations('photoSessions');

  // onChangeをメモ化して無限ループを防止
  const handleValueChange = useCallback(
    (newValue: string) => {
      // 同じ値の場合は何もしない（無限ループ防止）
      if (newValue === value) {
        return;
      }
      onChange(newValue as BookingType);
    },
    [value, onChange]
  );

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
      color: 'bg-success/10 text-success border-success/30',
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

      <SelectableCardGroup
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        {bookingTypes.map(type => (
          <SelectableCardItem
            key={type.value}
            value={type.value}
            icon={type.icon}
            iconColor={type.color}
            title={type.title}
            description={type.description}
            features={type.features}
          />
        ))}
      </SelectableCardGroup>
    </div>
  );
});
