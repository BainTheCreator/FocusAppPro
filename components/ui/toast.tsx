// toast.tsx — React Native + NativeWind адаптация Radix Toast primitives
// Иконки: npm i lucide-react-native react-native-svg

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  View,
  type ViewProps,
  Text,
} from 'react-native';
import { X } from 'lucide-react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

// ========== Provider ==========
const ToastProvider = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

// ========== Viewport ==========
export type ToastViewportProps = ViewProps & WithClassName & {
  position?: 'top' | 'bottom'; // default: top на мобильных, но оставим top как дефолт
  maxWidth?: number;           // по умолчанию 420 (как md:max-w)
};
const ToastViewport = forwardRef<React.ElementRef<typeof View>, ToastViewportProps>(
  ({ className, style, position = 'top', maxWidth = 420, children, ...rest }, ref) => {
    const isTop = position === 'top';
    return (
      <View
        ref={ref}
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            zIndex: 100,
            maxWidth,
            alignSelf: 'flex-end',
          },
          isTop ? { top: 0 } : { bottom: 0 },
          style,
        ]}
        {...({
          className: cn(
            'flex p-4',
            isTop ? 'flex-col-reverse' : 'flex-col', // сверху — новые добавляются вниз, как у Radix
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
ToastViewport.displayName = 'ToastViewport';

// ========== Toast Root ==========
type Variant = 'default' | 'destructive';

export type ToastRootProps = ViewProps &
  WithClassName & {
    open?: boolean;                          // controlled
    onOpenChange?: (open: boolean) => void;  // вызов при закрытии
    variant?: Variant;
    position?: 'top' | 'bottom';             // влияет на направление анимации
  };

const ToastContext = createContext<{ close: () => void; variant: Variant } | null>(null);
const useToastCtx = () => {
  const v = useContext(ToastContext);
  if (!v) throw new Error('Toast* components must be used within <Toast>');
  return v;
};

const Toast = forwardRef<React.ElementRef<typeof View>, ToastRootProps>(
  ({ className, style, open = true, onOpenChange, variant = 'default', position = 'top', children, ...rest }, ref) => {
    const [visible, setVisible] = useState(!!open);
    const opacity = useRef(new Animated.Value(0)).current;
    const translate = useRef(new Animated.Value(0)).current;

    const isTop = position === 'top';
    const from = isTop ? -24 : 24;

    const animateIn = useCallback(() => {
      translate.setValue(from);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translate, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, [from, opacity, translate]);

    const animateOut = useCallback((done?: () => void) => {
      Animated.parallel([
        Animated.timing(translate, { toValue: from, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => done?.());
    }, [from, opacity, translate]);

    useEffect(() => {
      if (open) {
        setVisible(true);
        animateIn();
      } else {
        animateOut(() => setVisible(false));
      }
    }, [open, animateIn, animateOut]);

    const close = () => {
      onOpenChange?.(false);
    };

    if (!visible) return null;

    const variantClasses =
      variant === 'destructive'
        ? 'border-destructive bg-destructive text-destructive-foreground'
        : 'border bg-background text-foreground';

    return (
      <ToastContext.Provider value={{ close, variant }}>
        <Animated.View
          ref={ref}
          style={[
            { transform: [{ translateY: translate }], opacity },
            style,
          ]}
          {...({
            className: cn(
              'relative w-full flex-row items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg',
              variantClasses,
              className
            ),
            dataSet: { state: open ? 'open' : 'closed', variant },
          } as any)}
          {...rest}
        >
          {children}
        </Animated.View>
      </ToastContext.Provider>
    );
  }
);
Toast.displayName = 'Toast';

// ========== Action ==========
export type ToastActionProps = PressableProps & WithClassName;
const ToastAction = forwardRef<React.ElementRef<typeof Pressable>, ToastActionProps>(
  ({ className, children, ...rest }, ref) => {
    const { variant } = useToastCtx();
    return (
      <Pressable
        ref={ref}
        {...({
          className: cn(
            'h-8 items-center justify-center rounded-md border px-3',
            'text-sm font-medium',
            'active:opacity-80',
            variant === 'destructive'
              ? 'border-muted/40'
              : '',
            className
          ),
        } as any)}
        {...rest}
      >
        {typeof children === 'string' ? (
          <Text {...({ className: 'text-foreground' } as any)}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }
);
ToastAction.displayName = 'ToastAction';

// ========== Close ==========
export type ToastCloseProps = PressableProps & WithClassName;
const ToastClose = forwardRef<React.ElementRef<typeof Pressable>, ToastCloseProps>(
  ({ className, ...rest }, ref) => {
    const { close, variant } = useToastCtx();
    return (
      <Pressable
        ref={ref}
        onPress={() => close()}
        {...({
          className: cn(
            'absolute right-2 top-2 rounded-md p-1',
            variant === 'destructive' ? 'text-red-300' : 'text-foreground/50',
            className
          ),
        } as any)}
        {...rest}
      >
        <X size={16} />
      </Pressable>
    );
  }
);
ToastClose.displayName = 'ToastClose';

// ========== Title / Description ==========
export type ToastTitleProps = ViewProps & WithClassName & { children?: React.ReactNode };
const ToastTitle = forwardRef<React.ElementRef<typeof View>, ToastTitleProps>(
  ({ className, children, ...rest }, ref) => (
    <View ref={ref} {...({ className: cn('flex-1', className) } as any)} {...rest}>
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-sm font-semibold' } as any)}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
);
ToastTitle.displayName = 'ToastTitle';

export type ToastDescriptionProps = ViewProps & WithClassName & { children?: React.ReactNode };
const ToastDescription = forwardRef<React.ElementRef<typeof View>, ToastDescriptionProps>(
  ({ className, children, ...rest }, ref) => (
    <View ref={ref} {...({ className, } as any)} {...rest}>
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-sm opacity-90' } as any)}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
);
ToastDescription.displayName = 'ToastDescription';

// ========== Types ==========
export type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
export type ToastActionElement = React.ReactElement<typeof ToastAction>;

// ========== Exports ==========
export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};