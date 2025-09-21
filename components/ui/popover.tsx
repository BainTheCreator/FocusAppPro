// Popover.tsx — React Native + NativeWind адаптация Radix Popover
// Иконки не требуются. Позиционируется относительно Trigger, контент в Modal c анимацией.

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

// ============ Context / Root ============
type PopoverCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  anchor: Rect | null;
  setAnchor: (r: Rect | null) => void;
  closeOnPressOutside: boolean;
};

const Ctx = createContext<PopoverCtx | null>(null);
const usePopover = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('Popover.* must be used within <Popover>');
  return v;
};

export type PopoverProps = {
  open?: boolean;                  // controlled
  defaultOpen?: boolean;           // uncontrolled
  onOpenChange?: (open: boolean) => void;
  closeOnPressOutside?: boolean;   // default: true
  children?: React.ReactNode;
};

const Popover = ({ open, defaultOpen = false, onOpenChange, closeOnPressOutside = true, children }: PopoverProps) => {
  const controlled = open !== undefined;
  const [internal, setInternal] = useState(defaultOpen);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const value = controlled ? !!open : internal;

  const setOpen = useCallback((v: boolean) => {
    if (!controlled) setInternal(v);
    onOpenChange?.(v);
    if (!v) setAnchor(null);
  }, [controlled, onOpenChange]);

  const ctx = useMemo(
    () => ({ open: value, setOpen, anchor, setAnchor, closeOnPressOutside }),
    [value, anchor, closeOnPressOutside, setOpen]
  );

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
};

// ============ Trigger ============
export type PopoverTriggerProps = PressableProps & WithClassName;

const PopoverTrigger = forwardRef<React.ElementRef<typeof Pressable>, PopoverTriggerProps>(
  ({ className, onPress, ...rest }, ref) => {
    const { open, setOpen, setAnchor } = usePopover();
    const innerRef = useRef<any>(null);

    const setRefs = (node: any) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as any).current = node;
    };

    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      if (open) {
        setOpen(false);
        return;
      }
      try {
        innerRef.current?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
          setAnchor({ x, y, w, h });
          setOpen(true);
        });
      } catch {
        const { pageX, pageY } = (e as any).nativeEvent || {};
        setAnchor({ x: pageX ?? 0, y: pageY ?? 0, w: 0, h: 0 });
        setOpen(true);
      }
    };

    return (
      <Pressable
        ref={setRefs}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        {...({ className, dataSet: { state: open ? 'open' : 'closed' } } as any)}
        {...rest}
      />
    );
  }
);

// ============ Content ============
export type PopoverContentProps = ViewProps & WithClassName & {
  align?: 'start' | 'center' | 'end';             // default: 'center'
  side?: 'top' | 'bottom' | 'left' | 'right';     // default: 'bottom'
  sideOffset?: number;                             // default: 4
  width?: number;                                  // default: 288 (w-72)
  animationDuration?: number;                      // default: 150
  onRequestClose?: () => void;
};

const PopoverContent = forwardRef<React.ElementRef<typeof View>, PopoverContentProps>(
  (
    {
      className,
      style,
      align = 'center',
      side = 'bottom',
      sideOffset = 4,
      width = 288,
      animationDuration = 150,
      onRequestClose,
      children,
      ...rest
    },
    ref
  ) => {
    const { open, setOpen, anchor, closeOnPressOutside } = usePopover();
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

    const close = useCallback(() => {
      onRequestClose?.();
      setOpen(false);
    }, [onRequestClose, setOpen]);

    if (!visible || !anchor) return null;

    const screen = Dimensions.get('window');

    const onLayout = (e: LayoutChangeEvent) => {
      const { width: w, height: h } = e.nativeEvent.layout;
      setSize({ w, h });
    };

    // позиция
    let left = anchor.x;
    let top = anchor.y + anchor.h + sideOffset; // bottom by default

    if (side === 'top') top = anchor.y - size.h - sideOffset;
    if (side === 'left') { left = anchor.x - (size.w || width) - sideOffset; top = anchor.y; }
    if (side === 'right') { left = anchor.x + anchor.w + sideOffset; top = anchor.y; }

    // align
    if (side === 'top' || side === 'bottom') {
      if (align === 'center') left = anchor.x + anchor.w / 2 - (size.w || width) / 2;
      if (align === 'end') left = anchor.x + anchor.w - (size.w || width);
    } else {
      if (align === 'center') top = anchor.y + anchor.h / 2 - size.h / 2;
      if (align === 'end') top = anchor.y + anchor.h - size.h;
    }

    // clamp
    const maxLeft = screen.width - (size.w || width) - 8;
    const maxTop = screen.height - size.h - 8;
    left = Math.min(Math.max(8, left), maxLeft);
    top = Math.min(Math.max(8, top), maxTop);

    return (
      <Modal
        transparent
        visible={visible}
        onRequestClose={close}
        animationType={Platform.OS === 'android' ? 'fade' : 'none'}
      >
        {/* Overlay-клик вне поповера для закрытия (прозрачный) */}
        <Pressable
          onPress={closeOnPressOutside ? close : undefined}
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
                'z-50 rounded-md border bg-popover p-4 shadow-md',
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
PopoverContent.displayName = 'PopoverContent';

// ============ exports ============
export { Popover, PopoverTrigger, PopoverContent };