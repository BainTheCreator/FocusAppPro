// Separator.tsx — React Native + NativeWind адаптация Radix Separator
import React, { forwardRef } from 'react';
import { View, type ViewProps, StyleSheet } from 'react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

export type SeparatorProps = ViewProps &
  WithClassName & {
    orientation?: 'horizontal' | 'vertical';
    decorative?: boolean; // если true — скрыть от скринридеров
    thickness?: number;   // толщина линии (dp), по умолчанию HairlineWidth
  };

const Separator = forwardRef<React.ElementRef<typeof View>, SeparatorProps>(
  (
    {
      className,
      style,
      orientation = 'horizontal',
      decorative = true,
      thickness = StyleSheet.hairlineWidth,
      ...rest
    },
    ref
  ) => {
    const sizeStyle =
      orientation === 'horizontal'
        ? { height: thickness, width: '100%' }
        : { width: thickness, height: '100%' };

    return (
      <View
        ref={ref}
        accessible={!decorative}
        accessibilityRole="none"
        style={[sizeStyle, style]}
        {...({
          className: cn(
            'shrink-0 bg-border',
            orientation === 'horizontal' ? 'w-full' : 'h-full',
            className
          ),
          dataSet: { orientation },
        } as any)}
        {...rest}
      />
    );
  }
);
Separator.displayName = 'Separator';

export { Separator };