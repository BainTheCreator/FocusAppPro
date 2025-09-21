// ToggleGroup.tsx — React Native + NativeWind адаптация Radix ToggleGroup
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

type Variant = 'default' | 'outline';
type Size = 'sm' | 'default' | 'lg';

type GroupCtx = {
  type: 'single' | 'multiple';
  valueSingle?: string;
  valueMultiple: string[];
  disabled?: boolean;
  variant?: Variant;
  size?: Size;
  toggleValue: (v: string) => void;
};

const Ctx = createContext<GroupCtx | null>(null);
const useToggleGroup = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('ToggleGroupItem must be used within <ToggleGroup>');
  return v;
};

function classesForToggle(variant: Variant, size: Size, active: boolean, disabled?: boolean) {
  return cn(
    'items-center justify-center rounded-md',
    // size
    size === 'sm' ? 'h-8 px-2' : size === 'lg' ? 'h-10 px-3' : 'h-9 px-3',
    // typography
    size === 'sm' ? 'text-xs' : 'text-sm',
    // base
    'active:opacity-80',
    disabled ? 'opacity-50' : '',
    // variant styles
    variant === 'outline' ? 'border' : '',
    // active state
    active ? 'bg-accent text-accent-foreground shadow-sm' : 'text-foreground'
  );
}

// Root
export type ToggleGroupProps = ViewProps &
  WithClassName & {
    type?: 'single' | 'multiple';
    // single
    value?: string;
    defaultValue?: string;
    // multiple
    values?: string[];
    defaultValues?: string[];
    onValueChange?: (val: string | undefined | string[]) => void;
    disabled?: boolean;
    variant?: Variant;
    size?: Size;
    orientation?: 'horizontal' | 'vertical';
  };

const ToggleGroup = forwardRef<React.ElementRef<typeof View>, ToggleGroupProps>(
  (
    {
      className,
      style,
      children,
      type = 'single',
      value,
      defaultValue,
      values,
      defaultValues,
      onValueChange,
      disabled,
      variant = 'default',
      size = 'default',
      orientation = 'horizontal',
      ...rest
    },
    ref
  ) => {
    // single
    const controlledSingle = typeof value === 'string' || value === undefined;
    const [internalSingle, setInternalSingle] = useState<string | undefined>(defaultValue);
    const currentSingle = controlledSingle ? value : internalSingle;

    // multiple
    const controlledMulti = Array.isArray(values);
    const [internalMulti, setInternalMulti] = useState<string[]>(defaultValues ?? []);
    const currentMulti = controlledMulti ? (values as string[] | undefined) ?? [] : internalMulti;

    const toggleValue = useCallback(
      (v: string) => {
        if (type === 'single') {
          const next = currentSingle === v ? undefined : v;
          if (!controlledSingle) setInternalSingle(next);
          onValueChange?.(next);
        } else {
          const exists = currentMulti.includes(v);
          const next = exists ? currentMulti.filter((x) => x !== v) : [...currentMulti, v];
          if (!controlledMulti) setInternalMulti(next);
          onValueChange?.(next);
        }
      },
      [controlledMulti, controlledSingle, currentMulti, currentSingle, onValueChange, type]
    );

    const ctx = useMemo<GroupCtx>(
      () => ({
        type,
        valueSingle: currentSingle,
        valueMultiple: currentMulti,
        disabled,
        variant,
        size,
        toggleValue,
      }),
      [currentMulti, currentSingle, disabled, size, toggleValue, type, variant]
    );

    return (
      <Ctx.Provider value={ctx}>
        <View
          ref={ref}
          style={[{ flexDirection: orientation === 'horizontal' ? 'row' : 'column' }, style]}
          {...({
            className: cn('items-center justify-center gap-1', className),
            dataSet: { orientation },
          } as any)}
          {...rest}
        >
          {children}
        </View>
      </Ctx.Provider>
    );
  }
);
ToggleGroup.displayName = 'ToggleGroup';

// Item
export type ToggleGroupItemProps = PressableProps &
  WithClassName & {
    value: string;
    disabled?: boolean;
    variant?: Variant;
    size?: Size;
  };

const ToggleGroupItem = forwardRef<React.ElementRef<typeof Pressable>, ToggleGroupItemProps>(
  ({ className, children, value, disabled: disabledProp, variant, size, onPress, ...rest }, ref) => {
    const ctx = useToggleGroup();
    const isOn =
      ctx.type === 'single'
        ? ctx.valueSingle === value
        : ctx.valueMultiple.includes(value);

    const disabled = ctx.disabled || disabledProp;
    const v = variant ?? ctx.variant ?? 'default';
    const s = size ?? ctx.size ?? 'default';

    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      if (disabled) return;
      ctx.toggleValue(value);
    };

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected: isOn, disabled }}
        {...({
          className: cn(classesForToggle(v, s, isOn, disabled), className),
          dataSet: { state: isOn ? 'on' : 'off' },
        } as any)}
        {...rest}
      >
        {typeof children === 'string' ? <Text>{children}</Text> : children}
      </Pressable>
    );
  }
);
ToggleGroupItem.displayName = 'ToggleGroupItem';

export { ToggleGroup, ToggleGroupItem };