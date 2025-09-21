// HoverCard.tsx — React Native + NativeWind адаптация Radix HoverCard
// Примечание: на мобильных платформах "hover" недоступен, поэтому открываем по pressIn/hoverIn,
// закрываем по pressOut/hoverOut с задержками. Контент позиционируется около триггера.

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
  type LayoutChangeEvent,
  Platform,
} from 'react-native';

type WithClassName = { className?: string };
const cn = (...args: Array<string | undefined | null | false>) => args.filter(Boolean).join(' ');

type Rect = { x: number; y: number; w: number; h: number };

// ================= Root =================
type HoverCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  openWithDelay: (anchor: Rect) => void;
  closeWithDelay: () => void;
  setAnchor: (r: Rect | null) => void;
  anchor: Rect | null;
  openDelay: number;
  closeDelay: number;
  closeOnTouchOutside: boolean;
};
const Ctx = createContext<HoverCtx | null>(null);
const useHover = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('HoverCard components must be used within <HoverCard>');
  return v;
};

export type HoverCardProps = {
  open?: boolean;                 // controlled
  defaultOpen?: boolean;          // uncontrolled
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  openDelay?: number;             // ms, default 200
  closeDelay?: number;            // ms, default 100
  closeOnTouchOutside?: boolean;  // default true
};

const HoverCard = ({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
  openDelay = 200,
  closeDelay = 100,
  closeOnTouchOutside = true,
}: HoverCardProps) => {
  const controlled = open !== undefined;
  const [internal, setInternal] = useState(defaultOpen);
  const value = controlled ? !!open : internal;
  const [anchor, setAnchor] = useState<Rect | null>(null);

  const showTO = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTO = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setOpen = useCallback((v: boolean) => {
    if (!controlled) setInternal(v);
    onOpenChange?.(v);
    if (!v) {
      // Закрываем — сбросим таймеры
      if (showTO.current) { clearTimeout(showTO.current); showTO.current = null; }
    }
  }, [controlled, onOpenChange]);

  const openWithDelay = useCallback((a: Rect) => {
    setAnchor(a);
    if (hideTO.current) { clearTimeout(hideTO.current); hideTO.current = null; }
    if (showTO.current) clearTimeout(showTO.current);
    showTO.current = setTimeout(() => setOpen(true), openDelay);
  }, [openDelay, setOpen]);

  const closeWithDelay = useCallback(() => {
    if (showTO.current) { clearTimeout(showTO.current); showTO.current = null; }
    if (hideTO.current) clearTimeout(hideTO.current);
    hideTO.current = setTimeout(() => setOpen(false), closeDelay);
  }, [closeDelay, setOpen]);

  useEffect(() => {
    return () => {
      if (showTO.current) clearTimeout(showTO.current);
      if (hideTO.current) clearTimeout(hideTO.current);
    };
  }, []);

  const valueCtx = useMemo(
    () => ({
      open: value,
      setOpen,
      openWithDelay,
      closeWithDelay,
      setAnchor,
      anchor,
      openDelay,
      closeDelay,
      closeOnTouchOutside,
    }),
    [value, setOpen, openWithDelay, closeWithDelay, anchor, openDelay, closeDelay, closeOnTouchOutside]
  );

  return <Ctx.Provider value={valueCtx}>{children}</Ctx.Provider>;
};

// ================= Trigger =================
export type HoverCardTriggerProps = PressableProps & WithClassName;

const HoverCardTrigger = forwardRef<React.ElementRef<typeof Pressable>, HoverCardTriggerProps>(
  ({ className, onPressIn, onPressOut, onHoverIn, onHoverOut, ...rest }, ref) => {
    const { open, openWithDelay, closeWithDelay, setAnchor } = useHover();
    const innerRef = useRef<any>(null);

    const setRefs = (node: any) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as any).current = node;
    };

    const measureAnchor = (cb?: (r: Rect) => void) => {
      try {
        innerRef.current?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
          const r = { x, y, w, h };
          setAnchor(r);
          cb?.(r);
        });
      } catch {
        // fallback
        cb?.({ x: 0, y: 0, w: 0, h: 0 });
      }
    };

    const handlePressIn: PressableProps['onPressIn'] = (e) => {
      onPressIn?.(e);
      measureAnchor((r) => openWithDelay(r));
    };
    const handlePressOut: PressableProps['onPressOut'] = (e) => {
      onPressOut?.(e);
      closeWithDelay();
    };

    // RN Web: hover-события
    const handleHoverIn: any = (e: any) => {
      onHoverIn?.(e);
      measureAnchor((r) => openWithDelay(r));
    };
    const handleHoverOut: any = (e: any) => {
      onHoverOut?.(e);
      closeWithDelay();
    };

    return (
      <Pressable
        ref={setRefs}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        // Работает в RN Web
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        {...({ className, dataSet: { state: open ? 'open' : 'closed' } } as any)}
        {...rest}
      />
    );
  }
);

// ================= Content =================
export type HoverCardContentProps = ViewProps & WithClassName & {
  align?: 'start' | 'center' | 'end';   // default 'center'
  side?: 'top' | 'bottom' | 'left' | 'right'; // default 'top' как в Radix
  sideOffset?: number;                  // default 4
  width?: number;                       // default 256 (w-64)
  animationDuration?: number;           // default 150
};

const HoverCardContent = forwardRef<React.ElementRef<typeof View>, HoverCardContentProps>(
  (
    {
      className,
      style,
      align = 'center',
      side = 'top',
      sideOffset = 4,
      width = 256,
      animationDuration = 150,
      children,
      ...rest
    },
    ref
  ) => {
    const { open, setOpen, anchor, closeOnTouchOutside } = useHover();
    const [visible, setVisible] = useState(open);
    const [size, setSize] = useState({ w: width, h: 1 });

    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
      if (open) {
        setVisible(true);
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: animationDuration, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: animationDuration, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: animationDuration, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.95, duration: animationDuration, useNativeDriver: true }),
        ]).start(() => setVisible(false));
      }
    }, [open, animationDuration, opacity, scale]);

    const screen = Dimensions.get('window');

    const onLayout = (e: LayoutChangeEvent) => {
      const { width: w, height: h } = e.nativeEvent.layout;
      setSize({ w: Math.max(w, width), h });
    };

    const calcLeftTop = () => {
      if (!anchor) return { left: 0, top: 0 };
      let left = anchor.x;
      let top = anchor.y - size.h - sideOffset; // 'top' по умолчанию
      if (side === 'bottom') top = anchor.y + anchor.h + sideOffset;
      if (side === 'left') { left = anchor.x - size.w - sideOffset; top = anchor.y; }
      if (side === 'right') { left = anchor.x + anchor.w + sideOffset; top = anchor.y; }

      if (align === 'center') left = anchor.x + Math.max(0, anchor.w / 2 - size.w / 2);
      if (align === 'end') left = Math.max(0, anchor.x + anchor.w - size.w);

      // clamp к экрану
      left = Math.min(Math.max(8, left), screen.width - size.w - 8);
      top = Math.min(Math.max(8, top), screen.height - size.h - 8);
      return { left, top };
    };

    if (!visible || !anchor) return null;

    const { left, top } = calcLeftTop();

    const close = () => setOpen(false);

    return (
      <Modal transparent visible={visible} onRequestClose={close} animationType={Platform.OS === 'android' ? 'fade' : 'none'}>
        {/* "Оверлей": клики вне закроют (опционально) */}
        <Pressable
          onPress={closeOnTouchOutside ? close : undefined}
          {...({ className: 'flex-1' } as any)}
        >
          <Animated.View
            ref={ref as any}
            onLayout={onLayout}
            style={[
              {
                position: 'absolute',
                left,
                top,
                width,
                transform: [{ scale }],
                opacity,
              },
              style,
            ]}
            {...({
              className: cn(
                'rounded-md border bg-popover p-4 shadow-md',
                // В качестве подсказки для вариантов стилей в NativeWind
                className
              ),
              dataSet: {
                state: open ? 'open' : 'closed',
                side,
                align,
              },
            } as any)}
            {...rest}
          >
            {children}
          </Animated.View>
        </Pressable>
      </Modal>
    );
  }
);
HoverCardContent.displayName = 'HoverCardContent';

// ================= exports =================
export { HoverCard, HoverCardTrigger, HoverCardContent };