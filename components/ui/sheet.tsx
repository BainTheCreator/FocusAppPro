// Sheet.tsx — React Native + NativeWind адаптация Radix Sheet
// Зависимости: npm i lucide-react-native react-native-svg

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
  Modal,
  Pressable,
  type PressableProps,
  View,
  type ViewProps,
  Text,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

type Side = 'top' | 'bottom' | 'left' | 'right';

type SheetCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
};
const Ctx = createContext<SheetCtx | null>(null);
const useSheet = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('Sheet.* must be used within <Sheet>');
  return v;
};

// Root
export type SheetProps = {
  open?: boolean;               // controlled
  defaultOpen?: boolean;        // uncontrolled
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};
const Sheet = ({ open, defaultOpen = false, onOpenChange, children }: SheetProps) => {
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

// Trigger
export type SheetTriggerProps = PressableProps & WithClassName;
const SheetTrigger = forwardRef<React.ElementRef<typeof Pressable>, SheetTriggerProps>(
  ({ className, onPress, ...rest }, ref) => {
    const { setOpen, open } = useSheet();
    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      setOpen(true);
    };
    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        {...({ className, dataSet: { state: open ? 'open' : 'closed' } } as any)}
        {...rest}
      />
    );
  }
);

// Close
export type SheetCloseProps = PressableProps & WithClassName;
const SheetClose = forwardRef<React.ElementRef<typeof Pressable>, SheetCloseProps>(
  ({ className, onPress, ...rest }, ref) => {
    const { setOpen } = useSheet();
    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      setOpen(false);
    };
    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        accessibilityRole="button"
        {...({ className } as any)}
        {...rest}
      />
    );
  }
);

// Portal (no-op для совместимости API)
const SheetPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

// Overlay (отдельный экспорт, но Content рисует свой оверлей сам)
export type SheetOverlayProps = ViewProps & WithClassName;
const SheetOverlay = forwardRef<React.ElementRef<typeof View>, SheetOverlayProps>(
  ({ className, style, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, style]}
        {...({ className: cn('bg-black/80'), } as any)}
        {...rest}
      />
    );
  }
);
SheetOverlay.displayName = 'SheetOverlay';

// Content
export type SheetContentProps = ViewProps & WithClassName & {
  side?: Side;                     // default: 'right'
  animationDuration?: number;      // default 300ms
  width?: number;                  // для left/right (по умолчанию 75% экрана)
  height?: number;                 // для top/bottom (по умолчанию auto, анимация от экрана)
  overlayClassName?: string;
  showDefaultClose?: boolean;      // default true — крестик в углу
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SheetContent = forwardRef<React.ElementRef<typeof View>, SheetContentProps>(
  (
    {
      side = 'right',
      className,
      style,
      animationDuration = 300,
      width,
      height,
      overlayClassName,
      showDefaultClose = true,
      children,
      ...rest
    },
    ref
  ) => {
    const { open, setOpen } = useSheet();
    const [visible, setVisible] = useState(open);
    const screen = Dimensions.get('window');

    const sheetW = width ?? Math.round(screen.width * 0.75);
    const sheetH = height ?? undefined;

    // Анимации
    const translate = useRef(new Animated.Value(0)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    const isHorizontal = side === 'left' || side === 'right';

    const openFrom = (() => {
      switch (side) {
        case 'left': return -screen.width;
        case 'right': return screen.width;
        case 'top': return -screen.height;
        case 'bottom': return screen.height;
        default: return screen.width;
      }
    })();

    useEffect(() => {
      if (open) {
        setVisible(true);
        translate.setValue(openFrom);
        overlayOpacity.setValue(0);
        Animated.parallel([
          Animated.timing(translate, { toValue: 0, duration: animationDuration, useNativeDriver: true }),
          Animated.timing(overlayOpacity, { toValue: 1, duration: animationDuration, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(translate, { toValue: openFrom, duration: animationDuration, useNativeDriver: true }),
          Animated.timing(overlayOpacity, { toValue: 0, duration: animationDuration, useNativeDriver: true }),
        ]).start(() => setVisible(false));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, animationDuration, openFrom]);

    const close = () => setOpen(false);
    if (!visible) return null;

    // Позиционирование панели
    const absPos: any = { position: 'absolute' };
    if (side === 'right') Object.assign(absPos, { top: 0, bottom: 0, right: 0, width: sheetW });
    if (side === 'left') Object.assign(absPos, { top: 0, bottom: 0, left: 0, width: sheetW });
    if (side === 'bottom') Object.assign(absPos, { left: 0, right: 0, bottom: 0, width: '100%', height: sheetH });
    if (side === 'top') Object.assign(absPos, { left: 0, right: 0, top: 0, width: '100%', height: sheetH });

    const transformStyle = isHorizontal
      ? { transform: [{ translateX: translate }] }
      : { transform: [{ translateY: translate }] };

    return (
      <Modal
        transparent
        visible={visible}
        onRequestClose={close}
        animationType={Platform.OS === 'android' ? 'fade' : 'none'}
      >
        {/* Overlay */}
        <AnimatedPressable
          onPress={close}
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
            { opacity: overlayOpacity },
          ]}
          {...({ className: cn('bg-black/80', overlayClassName) } as any)}
        />

        {/* Content */}
        <Animated.View
          ref={ref as any}
          style={[absPos, transformStyle, style]}
          {...({
            className: cn(
              'z-50 bg-background p-6 shadow-lg',
              // границы по стороне
              side === 'top' ? 'border-b' : '',
              side === 'bottom' ? 'border-t' : '',
              side === 'left' ? 'h-full border-r' : '',
              side === 'right' ? 'h-full border-l' : '',
              className
            ),
            dataSet: { state: open ? 'open' : 'closed', side },
          } as any)}
          {...rest}
        >
          {children}

          {showDefaultClose && (
            <SheetClose
              {...({
                className:
                  'absolute right-4 top-4 rounded-sm opacity-70 active:opacity-100',
              } as any)}
              accessibilityLabel="Close"
            >
              <X size={16} />
            </SheetClose>
          )}
        </Animated.View>
      </Modal>
    );
  }
);
SheetContent.displayName = 'SheetContent';

// Header / Footer / Title / Description
export type SheetHeaderProps = ViewProps & WithClassName;
const SheetHeader = ({ className, ...rest }: SheetHeaderProps) => (
  <View
    {...({
      className: cn('flex flex-col space-y-2', className),
    } as any)}
    {...rest}
  />
);
SheetHeader.displayName = 'SheetHeader';

export type SheetFooterProps = ViewProps & WithClassName;
const SheetFooter = ({ className, ...rest }: SheetFooterProps) => (
  <View
    {...({
      className: cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className),
    } as any)}
    {...rest}
  />
);
SheetFooter.displayName = 'SheetFooter';

export type SheetTitleProps = ViewProps & WithClassName & { children?: React.ReactNode };
const SheetTitle = forwardRef<React.ElementRef<typeof View>, SheetTitleProps>(
  ({ className, children, ...rest }, ref) => (
    <View ref={ref} {...({ className } as any)} {...rest}>
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-lg font-semibold text-foreground' } as any)}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
);
SheetTitle.displayName = 'SheetTitle';

export type SheetDescriptionProps = ViewProps & WithClassName & { children?: React.ReactNode };
const SheetDescription = forwardRef<React.ElementRef<typeof View>, SheetDescriptionProps>(
  ({ className, children, ...rest }, ref) => (
    <View ref={ref} {...({ className } as any)} {...rest}>
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
);
SheetDescription.displayName = 'SheetDescription';

// Exports
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};