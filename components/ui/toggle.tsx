// toggle.tsx — React Native + NativeWind адаптация Radix Toggle
import React, { forwardRef, useState } from 'react';
import { Pressable, type PressableProps, Text, Platform } from 'react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };
type Variant = 'default' | 'outline';
type Size = 'sm' | 'default' | 'lg';

export type ToggleProps = PressableProps &
  WithClassName & {
    variant?: Variant;
    size?: Size;
    pressed?: boolean;               // controlled
    defaultPressed?: boolean;        // uncontrolled
    onPressedChange?: (pressed: boolean) => void;
    disabled?: boolean;
  };

// Функция-эквивалент toggleVariants (без class-variance-authority)
export const toggleVariants = ({
  variant = 'default',
  size = 'default',
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) =>
  cn(
    // базовые
    'inline-flex items-center justify-center rounded-md text-sm font-medium',
    'transition-colors active:opacity-80',
    'disabled:opacity-50',
    // variant
    variant === 'default' && 'bg-transparent',
    variant === 'outline' && 'border border-input bg-transparent',
    // size
    size === 'default' && 'h-10 px-3',
    size === 'sm' && 'h-9 px-2.5',
    size === 'lg' && 'h-11 px-5',
    // state on
    "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
    className
  );

export const Toggle = forwardRef<React.ElementRef<typeof Pressable>, ToggleProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      pressed,
      defaultPressed = false,
      onPressedChange,
      disabled = false,
      android_ripple = { color: 'rgba(0,0,0,0.06)' },
      children,
      onPress,
      ...rest
    },
    ref
  ) => {
    const isControlled = pressed !== undefined;
    const [internal, setInternal] = useState(defaultPressed);
    const isOn = isControlled ? !!pressed : internal;

    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      if (disabled) return;
      const next = !isOn;
      if (!isControlled) setInternal(next);
      onPressedChange?.(next);
    };

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled, selected: isOn }}
        android_ripple={Platform.OS === 'android' ? android_ripple : undefined}
        {...({
          className: toggleVariants({ variant, size, className }),
          dataSet: { state: isOn ? 'on' : 'off' },
        } as any)}
        {...rest}
      >
        {typeof children === 'string' ? <Text>{children}</Text> : children}
      </Pressable>
    );
  }
);
Toggle.displayName = 'Toggle';

export default Toggle;