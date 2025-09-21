// Collapsible.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  forwardRef,
} from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  PressableProps,
  UIManager,
  View,
  ViewProps,
} from 'react-native';

// Позволяем передавать className снаружи (NativeWind)
type WithClassName = { className?: string };

type PresetName = 'easeInEaseOut' | 'linear' | 'spring';

type CollapsibleContextValue = {
  open: boolean;
  disabled: boolean;
  setOpen: (next: boolean, opts?: { animate?: boolean }) => void;
  toggle: (opts?: { animate?: boolean }) => void;
  animate: boolean;
  animationPreset: PresetName;
};

const Ctx = createContext<CollapsibleContextValue | undefined>(undefined);
function useCollapsible() {
  const v = useContext(Ctx);
  if (!v) throw new Error('Collapsible.* must be used within <Collapsible>');
  return v;
}

export type CollapsibleProps = ViewProps &
  WithClassName & {
    open?: boolean;                  // controlled
    defaultOpen?: boolean;           // uncontrolled
    onOpenChange?: (open: boolean) => void;
    disabled?: boolean;
    animate?: boolean;               // default: true
    animationPreset?: PresetName;    // default: 'easeInEaseOut'
    enableAndroidLayoutAnimation?: boolean; // default: true
  };

function Collapsible({
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  animate = true,
  animationPreset = 'easeInEaseOut',
  enableAndroidLayoutAnimation = true,
  className,
  style,
  children,
  ...rest
}: CollapsibleProps) {
  const isControlled = open !== undefined;
  const [internal, setInternal] = useState(defaultOpen);
  const valueOpen = isControlled ? !!open : internal;

  // Включаем LayoutAnimation на Android один раз
  useEffect(() => {
    if (
      enableAndroidLayoutAnimation &&
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, [enableAndroidLayoutAnimation]);

  const configureAnim = useCallback(() => {
    if (!animate) return;
    const preset =
      LayoutAnimation.Presets[animationPreset] ?? LayoutAnimation.Presets.easeInEaseOut;
    LayoutAnimation.configureNext(preset);
  }, [animate, animationPreset]);

  const setOpen = useCallback(
    (next: boolean, opts?: { animate?: boolean }) => {
      if (disabled) return;
      if (opts?.animate ?? animate) configureAnim();
      if (!isControlled) setInternal(next);
      onOpenChange?.(next);
    },
    [animate, configureAnim, disabled, isControlled, onOpenChange]
  );

  const toggle = useCallback(
    (opts?: { animate?: boolean }) => setOpen(!valueOpen, opts),
    [setOpen, valueOpen]
  );

  const ctxValue = useMemo(
    () => ({ open: valueOpen, disabled, setOpen, toggle, animate, animationPreset }),
    [animationPreset, animate, disabled, setOpen, toggle, valueOpen]
  );

  return (
    <Ctx.Provider value={ctxValue}>
      <View
        style={style}
        // Быстрый фикс типов: className + dataSet через каст
        {...({ className, dataSet: { state: valueOpen ? 'open' : 'closed' } } as any)}
        {...rest}
      >
        {children}
      </View>
    </Ctx.Provider>
  );
}

export type CollapsibleTriggerProps = Omit<PressableProps, 'onPress'> &
  WithClassName & {
    onPress?: PressableProps['onPress'];
  };

const CollapsibleTrigger = forwardRef<any, CollapsibleTriggerProps>(
  ({ onPress, disabled: disabledProp, className, ...rest }, ref) => {
    const { toggle, open, disabled } = useCollapsible();
    const isDisabled = disabled || !!disabledProp;

    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      if (isDisabled) return;
      toggle();
    };

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, expanded: open }}
        android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
        // Быстрый фикс типов: className + dataSet через каст
        {...({ className, dataSet: { state: open ? 'open' : 'closed' } } as any)}
        {...rest}
      />
    );
  }
);

export type CollapsibleContentProps = ViewProps &
  WithClassName & {
    unmountOnExit?: boolean;        // размонтировать контент, когда закрыт
    closeUnmountDelayMs?: number;   // задержка перед размонтированием (для анимации), по умолчанию 250
    closedClassName?: string;       // дополнительные классы, когда закрыт (например 'h-0 overflow-hidden')
  };

const CollapsibleContent = forwardRef<any, CollapsibleContentProps>(
  (
    {
      unmountOnExit = false,
      closeUnmountDelayMs = 250,
      className,
      closedClassName = 'h-0 overflow-hidden',
      style,
      children,
      ...rest
    },
    ref
  ) => {
    const { open, animate, animationPreset } = useCollapsible();
    const [mounted, setMounted] = useState(open);

    // Анимируем изменение высоты при смене open
    useEffect(() => {
      if (!animate) return;
      const preset =
        LayoutAnimation.Presets[animationPreset] ?? LayoutAnimation.Presets.easeInEaseOut;
      LayoutAnimation.configureNext(preset);
    }, [open, animate, animationPreset]);

    // Размонтирование с задержкой, чтобы анимация закрытия успела отработать
    useEffect(() => {
      if (open) setMounted(true);
      else if (unmountOnExit) {
        const t = setTimeout(() => setMounted(false), closeUnmountDelayMs);
        return () => clearTimeout(t);
      }
    }, [open, unmountOnExit, closeUnmountDelayMs]);

    if (!mounted && unmountOnExit) return null;

    const finalClassName = open
      ? className
      : [className, closedClassName].filter(Boolean).join(' ');

    return (
      <View
        ref={ref}
        style={style}
        pointerEvents={open ? 'auto' : 'none'}
        // Быстрый фикс типов: className + dataSet через каст
        {...({ className: finalClassName, dataSet: { state: open ? 'open' : 'closed' } } as any)}
        {...rest}
      >
        {children}
      </View>
    );
  }
);

// Экспорт без дублирования
export { Collapsible, CollapsibleTrigger, CollapsibleContent, Collapsible as Root };
export default Collapsible;