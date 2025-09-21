// RadioGroup.tsx — React Native + NativeWind адаптация Radix RadioGroup
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  Pressable,
  type PressableProps,
  View,
  type ViewProps,
  Text,
} from 'react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

// -------- Context --------
type RGContext = {
  value?: string;
  setValue: (v: string) => void;
  disabled?: boolean;
};
const RadioGroupCtx = createContext<RGContext | null>(null);
const useRadioGroup = () => {
  const v = useContext(RadioGroupCtx);
  if (!v) throw new Error('RadioGroupItem must be used within <RadioGroup>');
  return v;
};

// -------- RadioGroup (Root) --------
export type RadioGroupProps = ViewProps &
  WithClassName & {
    value?: string;                 // controlled
    defaultValue?: string;          // uncontrolled
    onValueChange?: (v: string) => void;
    disabled?: boolean;
  };

const RadioGroup = forwardRef<React.ElementRef<typeof View>, RadioGroupProps>(
  ({ className, style, value, defaultValue, onValueChange, disabled, children, ...rest }, ref) => {
    const controlled = value !== undefined;
    const [internal, setInternal] = useState<string | undefined>(defaultValue);
    const val = controlled ? value : internal;

    const setValue = useCallback(
      (v: string) => {
        if (!controlled) setInternal(v);
        onValueChange?.(v);
      },
      [controlled, onValueChange]
    );

    const ctx = useMemo(() => ({ value: val, setValue, disabled }), [val, setValue, disabled]);

    return (
      <RadioGroupCtx.Provider value={ctx}>
        <View
          ref={ref}
          style={style}
          accessibilityRole="radiogroup"
          {...({ className: cn('grid gap-2', className) } as any)}
          {...rest}
        >
          {children}
        </View>
      </RadioGroupCtx.Provider>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';

// -------- RadioGroupItem (Item) --------
export type RadioGroupItemProps = PressableProps &
  WithClassName & {
    value: string;         // уникальное значение кнопки
    label?: React.ReactNode; // опционально — подпись справа
    disabled?: boolean;
    indicatorClassName?: string;
  };

const RadioGroupItem = forwardRef<React.ElementRef<typeof Pressable>, RadioGroupItemProps>(
  ({ className, value, label, disabled: disabledProp, onPress, indicatorClassName, style, ...rest }, ref) => {
    const { value: current, setValue, disabled: disabledCtx } = useRadioGroup();
    const checked = current === value;
    const disabled = disabledCtx || !!disabledProp;

    const handlePress: PressableProps['onPress'] = (e) => {
      if (disabled) return;
      onPress?.(e);
      setValue(value);
    };

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="radio"
        accessibilityState={{ disabled, checked }}
        style={style}
        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
        {...({
          className: cn(
            'flex-row items-center gap-2',
            className
          ),
          dataSet: { checked: checked ? 'true' : 'false', disabled: disabled ? 'true' : 'false' },
        } as any)}
        {...rest}
      >
        {/* Сам "радио"-круг */}
        <View
          {...({
            className: cn(
              'h-4 w-4 items-center justify-center rounded-full border border-primary',
              // имитация focus-visible/ring сложно в RN — можно управлять классами снаружи
              disabled ? 'opacity-50' : ''
            ),
          } as any)}
        >
          {checked ? (
            <View
              {...({
                className: cn('h-2.5 w-2.5 rounded-full bg-primary', indicatorClassName),
              } as any)}
            />
          ) : null}
        </View>

        {/* Необязательная подпись справа */}
        {typeof label === 'string' ? (
          <Text {...({ className: 'text-sm text-foreground' } as any)}>{label}</Text>
        ) : (
          label
        )}
      </Pressable>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };