'use client';

import * as React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// 単一選択用のContext
interface SelectableWrapperSingleContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const SelectableWrapperSingleContext =
  React.createContext<SelectableWrapperSingleContextValue | null>(null);

// 複数選択用のContext
interface SelectableWrapperMultipleContextValue {
  values: string[];
  onValuesChange: (values: string[]) => void;
}

const SelectableWrapperMultipleContext =
  React.createContext<SelectableWrapperMultipleContextValue | null>(null);

// Group Props（単一選択用）
interface SelectableWrapperGroupSingleProps {
  mode?: 'single';
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

// Group Props（複数選択用）
interface SelectableWrapperGroupMultipleProps {
  mode: 'multiple';
  values: string[];
  onValuesChange: (values: string[]) => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

type SelectableWrapperGroupProps =
  | SelectableWrapperGroupSingleProps
  | SelectableWrapperGroupMultipleProps;

const SelectableWrapperGroup = React.forwardRef<
  HTMLDivElement,
  SelectableWrapperGroupProps
>((props, ref) => {
  const { mode = 'single', className, children, disabled, ...rest } = props;

  if (mode === 'multiple') {
    const { values, onValuesChange } =
      rest as SelectableWrapperGroupMultipleProps;
    return (
      <SelectableWrapperMultipleContext.Provider
        value={{ values, onValuesChange }}
      >
        <div
          ref={ref}
          className={cn('grid grid-cols-1 gap-4', className)}
          {...(disabled && { 'aria-disabled': true })}
        >
          {children}
        </div>
      </SelectableWrapperMultipleContext.Provider>
    );
  }

  const { value, onValueChange } = rest as SelectableWrapperGroupSingleProps;
  return (
    <SelectableWrapperSingleContext.Provider value={{ value, onValueChange }}>
      <RadioGroup
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        className={cn('grid grid-cols-1 gap-4', className)}
        ref={ref}
      >
        {children}
      </RadioGroup>
    </SelectableWrapperSingleContext.Provider>
  );
});
SelectableWrapperGroup.displayName = 'SelectableWrapperGroup';

interface SelectableWrapperItemProps {
  value: string;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

const SelectableWrapperItem = React.forwardRef<
  HTMLDivElement,
  SelectableWrapperItemProps
>(({ value, className, disabled = false, children, ...props }, ref) => {
  // 単一選択用のContextを試す
  const singleContext = React.useContext(SelectableWrapperSingleContext);
  // 複数選択用のContextを試す
  const multipleContext = React.useContext(SelectableWrapperMultipleContext);

  if (!singleContext && !multipleContext) {
    throw new Error(
      'SelectableWrapperItem must be used within SelectableWrapperGroup'
    );
  }

  const isSingleMode = !!singleContext;
  const isSelected = isSingleMode
    ? singleContext!.value === value
    : multipleContext!.values.includes(value);

  const id = `selectable-wrapper-${value}`;

  const handleMultipleChange = (checked: boolean) => {
    if (disabled) return;
    const currentValues = multipleContext!.values;
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    multipleContext!.onValuesChange(newValues);
  };

  return (
    <div ref={ref} className={cn('relative', className)} {...props}>
      {/* 単一選択モード: RadioGroupItem */}
      {isSingleMode && (
        <RadioGroupItem
          value={value}
          id={id}
          className="sr-only"
          disabled={disabled}
        />
      )}

      {/* 複数選択モード: Checkbox */}
      {!isSingleMode && (
        <Checkbox
          id={id}
          checked={isSelected}
          disabled={disabled}
          className="sr-only"
          onCheckedChange={handleMultipleChange}
        />
      )}

      <Label
        htmlFor={id}
        className={cn(
          'block transition-all duration-200 group cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div
          className={cn(
            'relative transition-all duration-200 active:scale-[0.98]',
            isSelected
              ? 'ring-2 ring-primary shadow-md'
              : 'group-hover:ring-2 group-hover:ring-muted-foreground'
          )}
        >
          {/* 選択オーバーレイ */}
          <div
            className={cn(
              'absolute inset-0 rounded-lg transition-all duration-300 z-10 pointer-events-none',
              isSelected
                ? 'bg-primary/20 backdrop-blur-[1px]'
                : 'bg-transparent'
            )}
          >
            {isSelected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle2 className="h-16 w-16 text-primary animate-in zoom-in-50 duration-300" />
              </div>
            )}
          </div>

          {/* 子コンテンツ */}
          <div className="relative z-0">{children}</div>
        </div>
      </Label>
    </div>
  );
});
SelectableWrapperItem.displayName = 'SelectableWrapperItem';

export { SelectableWrapperGroup, SelectableWrapperItem };
