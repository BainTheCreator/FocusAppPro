// Drawer.tsx — React Native + NativeWind версия выдвижной панели (аналог Vaul Drawer)
// Зависимости иконок (для примера, не обязательны здесь): npm i lucide-react-native react-native-svg

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
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  type PressableProps,
  Text,
  View,
  type ViewProps,
} from 'react-native';

type WithClassName = { className?: string };
const cn = (...args: Array<string | undefined | null | false>) =>
  args.filter(Boolean).join(' ');

// ================= Context / Root =================
type DrawerCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
};
const Ctx = createContext<DrawerCtx | null>(null);
const useDrawer = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('Drawer.* must be used within <Drawer>');
  return v;
};

export type DrawerProps = {
  open?: boolean;                 // controlled
  defaultOpen?: boolean;          // uncontrolled
  onOpenChange?: (open: boolean) => void;
  shouldScaleBackground?: boolean; // для совместимости с Vaul (в RN не применяется)
  children?: React.ReactNode;
};

const Drawer = ({ open, defaultOpen = false, onOpenChange, shouldScaleBackground = true, children }: DrawerProps) => {
  const controlled = open !== undefined;
  const [internal, setInternal] = useState(defaultOpen);
  const value = controlled ? !!open : internal;

  const setOpen = useCallback((v: boolean) => {
    if (!controlled) setInternal(v);
    onOpenChange?.(v);
  }, [controlled, onOpenChange]);

  const ctx = useMemo(() => ({ open: value, setOpen }), [value, setOpen]);
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
};
Drawer.displayName = 'Drawer';

// ================= Trigger / Close / Portal / Overlay =================
export type DrawerTriggerProps = PressableProps & WithClassName;
const DrawerTrigger = forwardRef<React.ElementRef<typeof Pressable>, DrawerTriggerProps>(
  ({ onPress, className, ...rest }, ref) => {
    const { setOpen, open } = useDrawer();
    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      setOpen(true);
    };
    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        {...({ className, dataSet: { state: open ? 'open' : 'closed' } } as any)}
        {...rest}
      />
    );
  }
);

const DrawerPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export type DrawerCloseProps = PressableProps & WithClassName;
const DrawerClose = forwardRef<React.ElementRef<typeof Pressable>, DrawerCloseProps>(
  ({ onPress, className, ...rest }, ref) => {
    const { setOpen } = useDrawer();
    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      setOpen(false);
    };
    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        {...({ className } as any)}
        {...rest}
      />
    );
  }
);

export type DrawerOverlayProps = ViewProps & WithClassName;
const DrawerOverlay = forwardRef<React.ElementRef<typeof View>, DrawerOverlayProps>(
  ({ className, style, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        style={style}
        {...({ className: cn('absolute inset-0 bg-black/80'), } as any)}
        {...rest}
      />
    );
  }
);
DrawerOverlay.displayName = 'DrawerOverlay';

// ================= Content =================
export type DrawerContentProps = ViewProps & WithClassName & {
  animationDuration?: number;     // default 250ms
  closeOnOverlayPress?: boolean;  // default true
  enablePanGesture?: boolean;     // default true
  dismissThreshold?: number;      // доля высоты, при которой закрывать (0..1), default 0.25
  overlayClassName?: string;
  handleClassName?: string;
};

const screenH = Dimensions.get('window').height;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DrawerContent = forwardRef<React.ElementRef<typeof View>, DrawerContentProps>(
  (
    {
      className,
      style,
      children,
      animationDuration = 250,
      closeOnOverlayPress = true,
      enablePanGesture = true,
      dismissThreshold = 0.25,
      overlayClassName,
      handleClassName,
      ...rest
    },
    ref
  ) => {
    const { open, setOpen } = useDrawer();
    const [visible, setVisible] = useState(open);
    const [sheetH, setSheetH] = useState(0);

    const translateY = useRef(new Animated.Value(screenH)).current;
    const overlayOpacity = translateY.interpolate({
      inputRange: [0, Math.max(1, sheetH || 1)],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    const animateTo = (to: number, cb?: () => void) => {
      Animated.timing(translateY, {
        toValue: to,
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) cb?.();
      });
    };

    // Открытие/закрытие
    useEffect(() => {
      if (open) {
        setVisible(true);
        if (sheetH > 0) {
          translateY.setValue(sheetH);
          animateTo(0);
        } else {
          translateY.setValue(screenH);
        }
      } else {
        animateTo(sheetH || screenH, () => setVisible(false));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, sheetH]);

    const close = useCallback(() => setOpen(false), [setOpen]);

    // Пан-жест (тянем вниз, чтобы закрыть)
    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => enablePanGesture && (Math.abs(g.dy) > 6),
        onPanResponderMove: (_, g) => {
          if (!enablePanGesture) return;
          const dy = Math.max(0, g.dy);
          translateY.setValue(dy);
        },
        onPanResponderRelease: (_, g) => {
          if (!enablePanGesture) return;
          const dy = Math.max(0, g.dy);
          const shouldDismiss = dy > (sheetH * dismissThreshold) || g.vy > 1.2;
          if (shouldDismiss) {
            animateTo(sheetH || screenH, () => setVisible(false));
            setOpen(false);
          } else {
            animateTo(0);
          }
        },
        onPanResponderTerminate: () => {
          if (!enablePanGesture) return;
          animateTo(0);
        },
      })
    ).current;

    if (!visible) return null;

    return (
      <Modal transparent visible={visible} onRequestClose={close} animationType="none">
        {/* Overlay */}
        <AnimatedPressable
          onPress={closeOnOverlayPress ? close : undefined}
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)' },
            { opacity: overlayOpacity },
          ]}
          {...({ className: cn('z-50', overlayClassName), dataSet: { state: open ? 'open' : 'closed' } } as any)}
        />

        {/* Sheet */}
        <Animated.View
          ref={ref as any}
          onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
          style={[
            { position: 'absolute', left: 0, right: 0, bottom: 0, transform: [{ translateY }] },
            style,
          ]}
          {...({
            className: cn(
              // базовые стили
              'z-50 rounded-t-[10px] border bg-background',
              className
            ),
            dataSet: { state: open ? 'open' : 'closed' },
          } as any)}
          {...rest}
        >
          {/* Drag handle (область для жеста) */}
          <View
            {...({
              className: cn('pt-3 pb-1', handleClassName),
            } as any)}
            // вешаем жест на верхнюю часть
            {...(enablePanGesture ? panResponder.panHandlers : {})}
          >
            <View {...({ className: 'mx-auto h-2 w-[100px] rounded-full bg-muted' } as any)} />
          </View>

          {/* Контент */}
          {children}
        </Animated.View>
      </Modal>
    );
  }
);
DrawerContent.displayName = 'DrawerContent';

// ================= Header / Footer / Title / Description =================
export type DrawerHeaderProps = ViewProps & WithClassName;
const DrawerHeader = ({ className, ...rest }: DrawerHeaderProps) => (
  <View {...({ className: cn('p-4', className) } as any)} {...rest} />
);
DrawerHeader.displayName = 'DrawerHeader';

export type DrawerFooterProps = ViewProps & WithClassName;
const DrawerFooter = ({ className, ...rest }: DrawerFooterProps) => (
  <View {...({ className: cn('mt-auto flex flex-col gap-2 p-4', className) } as any)} {...rest} />
);
DrawerFooter.displayName = 'DrawerFooter';

export type DrawerTitleProps = ViewProps & WithClassName & { children?: React.ReactNode };
const DrawerTitle = forwardRef<React.ElementRef<typeof View>, DrawerTitleProps>(
  ({ className, children, ...rest }, ref) => (
    <View ref={ref} {...({ className } as any)} {...rest}>
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-lg font-semibold leading-none tracking-tight' } as any)}>{children}</Text>
      ) : children}
    </View>
  )
);
DrawerTitle.displayName = 'DrawerTitle';

export type DrawerDescriptionProps = ViewProps & WithClassName & { children?: React.ReactNode };
const DrawerDescription = forwardRef<React.ElementRef<typeof View>, DrawerDescriptionProps>(
  ({ className, children, ...rest }, ref) => (
    <View ref={ref} {...({ className } as any)} {...rest}>
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>{children}</Text>
      ) : children}
    </View>
  )
);
DrawerDescription.displayName = 'DrawerDescription';

// ================= exports =================
export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};