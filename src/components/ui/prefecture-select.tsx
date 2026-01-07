'use client';

import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PREFECTURE_KEYS, type PrefectureKey } from '@/constants/japan';

interface PrefectureSelectProps {
  value?: string;
  onValueChange: (value: PrefectureKey) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * 都道府県選択セレクトボックスコンポーネント
 * 多言語化対応済み
 */
export function PrefectureSelect({
  value,
  onValueChange,
  placeholder,
  disabled,
}: PrefectureSelectProps) {
  const t = useTranslations('prefecture');

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder || t('selectPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        {PREFECTURE_KEYS.map(key => (
          <SelectItem key={key} value={key}>
            {t(key)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
