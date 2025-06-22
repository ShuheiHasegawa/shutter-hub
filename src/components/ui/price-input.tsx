'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PriceInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value'
  > {
  value?: string | number;
  onChange?: (value: string) => void;
  name?: string;
  className?: string;
  placeholder?: string;
}

/**
 * 全角数字を半角数字に変換する
 */
const convertToHalfWidth = (value: string): string => {
  return value.replace(/[０-９]/g, char =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
};

/**
 * 先頭のゼロを削除する（ただし、"0"のみの場合は"0"を返す）
 */
const removeLeadingZeros = (value: string): string => {
  const cleaned = value.replace(/^0+/, '');
  return cleaned || '0';
};

/**
 * 数値にカンマ区切りを追加する
 */
const addCommas = (value: string): string => {
  const numericValue = value.replace(/,/g, '');
  if (!numericValue || numericValue === '0') return numericValue;
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * カンマを除去して純粋な数値文字列を取得する
 */
const removeCommas = (value: string): string => {
  return value.replace(/,/g, '');
};

export const PriceInput = React.forwardRef<HTMLInputElement, PriceInputProps>(
  ({ className, value = '', onChange, name, placeholder, ...props }, ref) => {
    const t = useTranslations('common');
    const [displayValue, setDisplayValue] = React.useState('');

    // 初期値の設定
    React.useEffect(() => {
      const initialValue = String(value || '');
      const cleanValue = removeCommas(initialValue);
      setDisplayValue(addCommas(cleanValue));
    }, [value]);

    /**
     * 入力時の処理
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // 全角数字を半角に変換
      inputValue = convertToHalfWidth(inputValue);

      // カンマを除去
      const numericValue = removeCommas(inputValue);

      // 数字のみを許可
      if (!/^\d*$/.test(numericValue)) {
        return;
      }

      // カンマ区切りで表示
      const formattedValue = addCommas(numericValue);
      setDisplayValue(formattedValue);

      // 親コンポーネントには数値のみを渡す
      if (onChange) {
        onChange(numericValue);
      }
    };

    /**
     * フォーカス離脱時の処理（先頭ゼロの削除）
     */
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const numericValue = removeCommas(displayValue);
      const cleanedValue = removeLeadingZeros(numericValue);
      const formattedValue = addCommas(cleanedValue);

      setDisplayValue(formattedValue);

      if (onChange && cleanedValue !== numericValue) {
        onChange(cleanedValue);
      }

      // 元のonBlurイベントも実行
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    /**
     * キーダウン時の処理（許可されたキーのみ）
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const allowedKeys = [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
      ];

      // Ctrl/Cmd + A, C, V, X を許可
      if (
        (e.ctrlKey || e.metaKey) &&
        ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())
      ) {
        return;
      }

      // 許可されたキーまたは数字（全角・半角）のみ許可
      if (!allowedKeys.includes(e.key) && !/^[0-9０-９]$/.test(e.key)) {
        e.preventDefault();
      }

      // 元のonKeyDownイベントも実行
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9,]*"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t('priceInputPlaceholder')}
        className={cn(className)}
        aria-describedby={name ? `${name}-description` : undefined}
        {...props}
      />
    );
  }
);

PriceInput.displayName = 'PriceInput';
