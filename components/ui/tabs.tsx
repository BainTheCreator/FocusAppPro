// Tabs.tsx — React Native + NativeWind адаптация Radix Tabs
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

type TabsCtx = {
  value?: string;
  setValue: (v: string) => void;
  orientation: 'horizontal' | 'vertical';
};
const Ctx = createContext<TabsCtx | null>(null);
const useTabs = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('Tabs.* must be used within <Tabs>');
  return v;
};

// Root
export type TabsProps = ViewProps &
  WithClassName & {
    value?: string; // controlled
    defaultValue?: string; // uncontrolled
    onValueChange?: (v: string) => void;
    orientation?: 'horizontal' | 'vertical';
  };

const Tabs = ({ className, style, value, defaultValue, onValueChange, orientation = 'horizontal', children, ...rest }: TabsProps) => {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState<string | undefined>(defaultValue);
  const current = controlled ? value : internal;

  const setValue = useCallback((v: string) => {
    if (!controlled) setInternal(v);
    onValueChange?.(v);
  }, [controlled, onValueChange]);

  const ctx = useMemo(() => ({ value: current, setValue, orientation }), [current, setValue, orientation]);

  return (
    <Ctx.Provider value={ctx}>
      <View
        style={style}
        {...({ className, dataSet: { orientation } } as any)}
        {...rest}
      >
        {children}
      </View>
    </Ctx.Provider>
  );
};

// List
export type TabsListProps = ViewProps & WithClassName;
const TabsList = forwardRef<React.ElementRef<typeof View>, TabsListProps>(
  ({ className, style, children, ...rest }, ref) => {
    const { orientation } = useTabs();
    return (
      <View
        ref={ref}
        style={style}
        accessibilityRole="tablist"
        {...({
          className: cn(
            'rounded-md bg-muted p-1 text-muted-foreground',
            orientation === 'horizontal' ? 'flex-row items-center justify-center h-10' : 'flex-col',
            className
          ),
        } as any)}
        {...rest}
      >
        {children}
      </View>
    );
  }
);
TabsList.displayName = 'TabsList';

// Trigger
export type TabsTriggerProps = PressableProps &
  WithClassName & {
    value: string;
    disabled?: boolean;
  };

const TabsTrigger = forwardRef<React.ElementRef<typeof Pressable>, TabsTriggerProps>(
  ({ className, value, disabled, children, onPress, ...rest }, ref) => {
    const { value: current, setValue } = useTabs();
    const active = current === value;

    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      if (disabled) return;
      setValue(value);
    };

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="tab"
        accessibilityState={{ selected: active, disabled }}
        {...({
          className: cn(
            'px-3 py-1.5 rounded-sm',
            'text-sm font-medium',
            'active:opacity-80',
            disabled ? 'opacity-50' : '',
            active
              ? 'bg-background text-foreground shadow-sm'
              : '',
            className
          ),
          dataSet: { state: active ? 'active' : 'inactive' },
        } as any)}
        {...rest}
      >
        {typeof children === 'string' ? (
          <Text {...({ className: active ? 'text-foreground' : 'text-muted-foreground' } as any)}>
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

// Content
export type TabsContentProps = ViewProps &
  WithClassName & {
    value: string;
    keepMounted?: boolean; // если true — скрываем стилями, но не размонтируем
  };

const TabsContent = forwardRef<React.ElementRef<typeof View>, TabsContentProps>(
  ({ className, style, value, keepMounted = false, children, ...rest }, ref) => {
    const { value: current } = useTabs();
    const open = current === value;

    if (!open && !keepMounted) return null;

    return (
      <View
        ref={ref}
        style={[
          style,
          !open && keepMounted ? { display: 'none' } : null,
        ]}
        {...({
          className: cn(
            'mt-2',
            className
          ),
          dataSet: { state: open ? 'active' : 'inactive' },
        } as any)}
        {...rest}
      >
        {children}
      </View>
    );
  }
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };