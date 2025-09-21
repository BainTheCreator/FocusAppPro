// Tooltip.tsx — React Native + NativeWind адаптация Radix Tooltip
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
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };
type Rect = { x: number; y: number; w: number; h: number };

// ====== Provider (поддержка задержек, как у Radix) ======
type ProviderCtx = {
  delayDuration: number;
};
const ProviderContext = createContext<ProviderCtx>({ delayDuration: 200 });

export type TooltipProviderProps = {
  delayDuration?: number; // ms, по умолчанию 200
  children?: React.ReactNode;
};
const TooltipProvider = ({ delayDuration = 200, children }: TooltipProviderProps) => {
  const value = useMemo(() => ({ delayDuration }), [delayDuration]);
  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>;
};

// ====== Root ======
type TooltipCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  anchor: Rect | null;
  setAnchor: (r: Rect | null) => void;
  openWithDelay: (anchor: Rect) => void;
  closeWithDelay: () => void;
  closeNow: () => void;
};
const TooltipContext = createContext<TooltipCtx | null>(null);
const useTooltip = () => {
  const v = useContext(TooltipContext);
  if (!v) throw new Error('Tooltip.* must be used within <Tooltip>');
  return v;
};

export type TooltipProps = {
  open?: boolean;                 // controlled
  defaultOpen?: boolean;          // uncontrolled
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};
const Tooltip = ({ open, defaultOpen = false, onOpenChange, children }: TooltipProps) => {
  const { delayDuration } = useContext(ProviderContext);
  const controlled = open !== undefined;
  const [internal, setInternal] = useState(defaultOpen);
  const value = controlled ? !!open : internal;

  const [anchor, setAnchor] = useState<Rect | null>(null);
  const showTO = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTO = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setOpen = useCallback((v: boolean) => {
    if (!controlled) setInternal(v);
    onOpenChange?.(v);
    if (!v) setAnchor(null);
  }, [controlled, onOpenChange]);

  const openWithDelay = useCallback((a: Rect) => {
    setAnchor(a);
    if (hideTO.current) { clearTimeout(hideTO.current); hideTO.current = null; }
    if (showTO.current) clearTimeout(showTO.current);
    showTO.current = setTimeout(() => setOpen(true), delayDuration);
  }, [delayDuration, setOpen]);

  const closeWithDelay = useCallback(() => {
    if (showTO.current) { clearTimeout(showTO.current); showTO.current = null; }
    if (hideTO.current) clearTimeout(hideTO.current);
    hideTO.current = setTimeout(() => setOpen(false), 100);
  }, [setOpen]);

  const closeNow = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    return () => {
      if (showTO.current) clearTimeout(showTO.current);
      if (hideTO.current) clearTimeout(hideTO.current);
    };
  }, []);

  const ctx = useMemo<TooltipCtx>(() => ({
    open: value,
    setOpen,
    anchor,
    setAnchor,
    openWithDelay,
    closeWithDelay,
    closeNow,
  }), [anchor, closeNow, closeWithDelay, openWithDelay, setOpen, value]);

  return <TooltipContext.Provider value={ctx}>{children}</TooltipContext.Provider>;
};

// ====== Trigger ======
export type TooltipTriggerProps = PressableProps & WithClassName;
const TooltipTrigger = forwardRef<React.ElementRef<typeof Pressable>, TooltipTriggerProps>(
  ({ className, onPressIn, onPressOut, onLongPress, onHoverIn, onHoverOut, children, ...rest }, ref) => {
    const { open, openWithDelay, closeWithDelay, setAnchor } = useTooltip();
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
        cb?.({ x: 0, y: 0, w: 0, h: 0 });
      }
    };

    const handlePressIn: PressableProps['onPressIn'] = (e) => {
      onPressIn?.(e);
      // На мобильных показываем по pressIn с задержкой провайдера
      measureAnchor((r) => openWithDelay(r));
    };
    const handlePressOut: PressableProps['onPressOut'] = (e) => {
      onPressOut?.(e);
      closeWithDelay();
    };
    const handleLongPress: PressableProps['onLongPress'] = (e) => {
      onLongPress?.(e);
      // страховка: если pressIn не успел, откроем тут
      measureAnchor((r) => openWithDelay(r));
    };

    // RN Web — hover
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
        onLongPress={handleLongPress}
        // Web
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        {...({ className, dataSet: { state: open ? 'open' : 'closed' } } as any)}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }
);
TooltipTrigger.displayName = 'TooltipTrigger';

// ====== Content ======
export type TooltipContentProps = ViewProps & WithClassName & {
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;         // default 4
  align?: 'start' | 'center' | 'end';
  maxWidth?: number;           // ограничение ширины, по умолчанию 280
};
const TooltipContent = forwardRef<React.ElementRef<typeof View>, TooltipContentProps>(
  (
    {
      className,
      style,
      side = 'top',
      sideOffset = 4,
      align = 'center',
      maxWidth = 280,
      children,
      ...rest
    },
    ref
  ) => {
    const { open, closeNow, anchor } = useTooltip();
    const [visible, setVisible] = useState(open);
    useEffect(() => setVisible(open), [open]);

    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.98)).current;

    useEffect(() => {
      if (open) {
        setVisible(true);
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.98, duration: 120, useNativeDriver: true }),
        ]).start(() => setVisible(false));
      }
    }, [open, opacity, scale]);

    if (!visible || !anchor) return null;

    const screen = Dimensions.get('window');
    const [measured, setMeasured] = useState({ w: 0, h: 0 });

    // предварительное позиционирование, скорректируем после onLayout
    const calcLeftTop = (w: number, h: number) => {
      let left = anchor.x;
      let top = anchor.y - h - sideOffset; // top by default
      if (side === 'bottom') top = anchor.y + anchor.h + sideOffset;
      if (side === 'left') { left = anchor.x - w - sideOffset; top = anchor.y; }
      if (side === 'right') { left = anchor.x + anchor.w + sideOffset; top = anchor.y; }

      if (side === 'top' || side === 'bottom') {
        if (align === 'center') left = anchor.x + Math.max(0, anchor.w / 2 - w / 2);
        if (align === 'end') left = anchor.x + anchor.w - w;
      } else {
        if (align === 'center') top = anchor.y + Math.max(0, anchor.h / 2 - h / 2);
        if (align === 'end') top = anchor.y + anchor.h - h;
      }

      // clamp
      left = Math.min(Math.max(8, left), screen.width - w - 8);
      top = Math.min(Math.max(8, top), screen.height - h - 8);
      return { left, top };
    };

    const { left, top } = calcLeftTop(measured.w || 1, measured.h || 1);

    const onLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setMeasured({ w: width, h: height });
    };

    return (
      <Modal
        transparent
        visible={visible}
        onRequestClose={closeNow}
        animationType={Platform.OS === 'android' ? 'fade' : 'none'}
      >
        {/* Прозрачная подложка, чтобы закрывать по тапу вне */}
        <Pressable onPress={closeNow} {...({ className: 'flex-1' } as any)}>
          <Animated.View
            ref={ref as any}
            onLayout={onLayout}
            style={[
              {
                position: 'absolute',
                left,
                top,
                maxWidth,
                transform: [{ scale }],
                opacity,
              },
              style,
            ]}
            {...({
              className: cn(
                'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5',
                'shadow-md',
                className
              ),
              dataSet: { state: open ? 'open' : 'closed', side, align },
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
TooltipContent.displayName = 'TooltipContent';

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };