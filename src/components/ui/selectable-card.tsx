'use client';

import * as React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectableCardContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const SelectableCardContext =
  React.createContext<SelectableCardContextValue | null>(null);

interface SelectableCardGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const SelectableCardGroup = React.forwardRef<
  HTMLDivElement,
  SelectableCardGroupProps
>(({ value, onValueChange, className, children, disabled, ...props }, ref) => {
  return (
    <SelectableCardContext.Provider value={{ value, onValueChange }}>
      <RadioGroup
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}
        ref={ref}
        {...props}
      >
        {children}
      </RadioGroup>
    </SelectableCardContext.Provider>
  );
});
SelectableCardGroup.displayName = 'SelectableCardGroup';

interface SelectableCardItemProps {
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  title: string;
  description?: string;
  features?: string[];
  className?: string;
  disabled?: boolean;
  additionalContent?: React.ReactNode;
}

const SelectableCardItem = React.forwardRef<
  HTMLDivElement,
  SelectableCardItemProps
>(
  (
    {
      value,
      icon: Icon,
      iconColor,
      title,
      description,
      features,
      className,
      disabled = false,
      additionalContent,
      ...props
    },
    ref
  ) => {
    const context = React.useContext(SelectableCardContext);
    if (!context) {
      throw new Error(
        'SelectableCardItem must be used within SelectableCardGroup'
      );
    }

    const isSelected = context.value === value;
    const id = `selectable-card-${value}`;

    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        <RadioGroupItem
          value={value}
          id={id}
          className="sr-only"
          disabled={disabled}
        />
        <Label
          htmlFor={id}
          className={cn(
            'block transition-all duration-200 group',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          )}
        >
          <Card
            className={cn(
              'relative transition-all duration-200 active:scale-[0.98]',
              isSelected
                ? 'ring-2 ring-primary shadow-md'
                : 'group-hover:ring-2 group-hover:ring-muted-foreground'
            )}
          >
            {/* オーバーレイ */}
            <div
              className={cn(
                'absolute inset-0 rounded-lg transition-all duration-300 z-10',
                isSelected
                  ? 'bg-primary/20 backdrop-blur-[1px]'
                  : 'bg-transparent pointer-events-none'
              )}
            >
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle2 className="h-16 w-16 text-primary animate-in zoom-in-50 duration-300" />
                </div>
              )}
            </div>

            <CardHeader className="pb-3 relative z-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div
                      className={cn('p-2 rounded-lg', iconColor || 'bg-muted')}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    {description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {description}
                      </p>
                    )}
                    {additionalContent && (
                      <div className="mt-2">{additionalContent}</div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            {features && features.length > 0 && (
              <CardContent className="pt-0 relative z-0">
                <div className="space-y-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </Label>
      </div>
    );
  }
);
SelectableCardItem.displayName = 'SelectableCardItem';

export { SelectableCardGroup, SelectableCardItem };
