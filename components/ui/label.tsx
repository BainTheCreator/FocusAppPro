// label.tsx — React Native + NativeWind версия Label (без Radix)
import React, { forwardRef } from 'react';
import { Text, type TextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const labelVariants = cva('text-sm font-medium leading-none', {
  variants: {
    disabled: {
      true: 'opacity-70',
      false: '',
    },
  },
  defaultVariants: {
    disabled: false,
  },
});

type WithClassName = { className?: string };

export type LabelProps = TextProps &
  WithClassName &
  VariantProps<typeof labelVariants> & {
    htmlFor?: string; // для совместимости с web-API; в RN не используется
    disabled?: boolean;
  };

const Label = forwardRef<React.ElementRef<typeof Text>, LabelProps>(
  ({ className, disabled = false, htmlFor, accessibilityState, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        accessibilityState={{ ...accessibilityState, disabled }}
        {...({ className: cn(labelVariants({ disabled }), className) } as any)}
        {...props}
      />
    );
  }
);
Label.displayName = 'Label';

export { Label, labelVariants };