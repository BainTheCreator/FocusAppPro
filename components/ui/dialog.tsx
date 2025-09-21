// Dialog.tsx — React Native + NativeWind версия диалога (аналог Radix Dialog)
// Зависимости иконок: npm i lucide-react-native react-native-svg

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
  Modal,
  Pressable,
  type PressableProps,
  Text,
  View,
  type ViewProps,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';

type WithClassName = { className?: string };

// утилита для классов
const cn = (...args: Array<string | undefined | null | false>) =>
  args.filter(Boolean).join(' ');

// ================= Context / Root =================
type DialogCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
};
const Ctx = createContext<DialogCtx | null>(null);
const useDialog = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('Dialog.* must be used within <Dialog>');
  return v;
};

export type DialogProps = {
  open?: boolean;               // controlled
  defaultOpen?: boolean;        // uncontrolled
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

const Dialog = ({ open, defaultOpen = false, onOpenChange, children }: DialogProps) => {
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

// ================ Trigger / Close / Portal / Overlay ================
export type DialogTriggerProps = PressableProps & WithClassName;
const DialogTrigger = forwardRef<React.ElementRef<typeof Pressable>, DialogTriggerProps>(
  ({ onPress, className, ...rest }, ref) => {
    const { setOpen, open } = useDialog();
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

// В RN портал не нужен — оставим для совместимости с API
const DialogPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

// Отдельный Overlay экспортируем для совместимости, но сам по себе его можно не использовать,
// потому что он уже вшит внутрь DialogContent. Оставим как "презентационный" компонент.
export type DialogOverlayProps = ViewProps & WithClassName;
const DialogOverlay = forwardRef<React.ElementRef<typeof View>, DialogOverlayProps>(
  ({ className, style, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        style={style}
        {...({ className: cn('absolute inset-0 bg-black/80', className) } as any)}
        {...rest}
      />
    );
  }
);

// Кнопка закрытия
export type DialogCloseProps = PressableProps & WithClassName;
const DialogClose = forwardRef<React.ElementRef<typeof Pressable>, DialogCloseProps>(
  ({ onPress, className, ...rest }, ref) => {
    const { setOpen } = useDialog();
    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      setOpen(false);
    };
    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        {...({ className, } as any)}
        {...rest}
      />
    );
  }
);

// ================= Content =================
export type DialogContentProps = ViewProps & WithClassName & {
  // Параметры анимации
  animationDuration?: number;        // default 200ms
  closeOnOverlayPress?: boolean;     // default true
  showDefaultClose?: boolean;        // default true (иконка X в правом верхнем углу)
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DialogContent = forwardRef<React.ElementRef<typeof View>, DialogContentProps>(
  (
    {
      className,
      style,
      children,
      animationDuration = 200,
      closeOnOverlayPress = true,
      showDefaultClose = true,
      ...rest
    },
    ref
  ) => {
    const { open, setOpen } = useDialog();
    const [visible, setVisible] = useState(open);

    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const contentScale = useRef(new Animated.Value(0.95)).current;

    // Управление монтированием и анимациями
    useEffect(() => {
      if (open) {
        setVisible(true);
        Animated.parallel([
          Animated.timing(overlayOpacity, { toValue: 1, duration: animationDuration, useNativeDriver: true }),
          Animated.timing(contentOpacity, { toValue: 1, duration: animationDuration, useNativeDriver: true }),
          Animated.timing(contentScale, { toValue: 1, duration: animationDuration, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(overlayOpacity, { toValue: 0, duration: animationDuration, useNativeDriver: true }),
          Animated.timing(contentOpacity, { toValue: 0, duration: animationDuration, useNativeDriver: true }),
          Animated.timing(contentScale, { toValue: 0.95, duration: animationDuration, useNativeDriver: true }),
        ]).start(() => setVisible(false));
      }
    }, [open, animationDuration, overlayOpacity, contentOpacity, contentScale]);

    const close = useCallback(() => setOpen(false), [setOpen]);
    if (!visible) return null;

    return (
      <Modal
        transparent
        visible={visible}
        onRequestClose={close}
        animationType={Platform.OS === 'ios' ? 'none' : 'fade'} // анимацию делаем сами
      >
        {/* Overlay */}
        <AnimatedPressable
          onPress={closeOnOverlayPress ? close : undefined}
          style={[
            { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)' },
            { opacity: overlayOpacity },
          ]}
          {...({ className: 'z-50', dataSet: { state: open ? 'open' : 'closed' } } as any)}
        />

        {/* Content wrapper (центрирование) */}
        <View
          {...({ className: 'z-50 h-full w-full items-center justify-center' } as any)}
          pointerEvents="box-none"
        >
          <Animated.View
            ref={ref as any}
            style={[
              { opacity: contentOpacity, transform: [{ scale: contentScale }] },
              style,
            ]}
            {...({
              className: cn(
                'w-[90%] max-w-xl rounded-lg border bg-background p-6 shadow-lg',
                className
              ),
              dataSet: { state: open ? 'open' : 'closed' },
            } as any)}
            {...rest}
          >
            {children}
            {showDefaultClose && (
              <DialogClose
                {...({
                  className:
                    'absolute right-4 top-4 rounded-sm opacity-70 active:opacity-100',
                } as any)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={16} />
              </DialogClose>
            )}
          </Animated.View>
        </View>
      </Modal>
    );
  }
);

// ================= Header / Footer / Title / Description =================
export type DialogHeaderProps = ViewProps & WithClassName;
const DialogHeader = ({ className, ...rest }: DialogHeaderProps) => (
  <View {...({ className: cn('flex flex-col space-y-1.5', className) } as any)} {...rest} />
);

export type DialogFooterProps = ViewProps & WithClassName;
const DialogFooter = ({ className, ...rest }: DialogFooterProps) => (
  <View
    {...({
      className: cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className),
    } as any)}
    {...rest}
  />
);

export type DialogTitleProps = ViewProps & WithClassName & { children?: React.ReactNode };
const DialogTitle = forwardRef<React.ElementRef<typeof View>, DialogTitleProps>(
  ({ className, children, ...rest }, ref) => (
    <View ref={ref} {...({ className: cn('mb-1', className) } as any)} {...rest}>
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-lg font-semibold leading-none tracking-tight' } as any)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
);

export type DialogDescriptionProps = ViewProps & WithClassName & { children?: React.ReactNode };
const DialogDescription = forwardRef<React.ElementRef<typeof View>, DialogDescriptionProps>(
  ({ className, children, ...rest }, ref) => (
    <View ref={ref} {...({ className: className } as any)} {...rest}>
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
);

// ================= displayName =================
DialogTrigger.displayName = 'DialogTrigger';
DialogOverlay.displayName = 'DialogOverlay';
DialogClose.displayName = 'DialogClose';
DialogContent.displayName = 'DialogContent';
DialogHeader.displayName = 'DialogHeader';
DialogFooter.displayName = 'DialogFooter';
DialogTitle.displayName = 'DialogTitle';
DialogDescription.displayName = 'DialogDescription';

// ================= exports =================
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};