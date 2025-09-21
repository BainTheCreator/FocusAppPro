// ScrollArea.tsx — React Native + NativeWind адаптация Radix ScrollArea

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
  ScrollView,
  type ScrollViewProps,
  View,
  type ViewProps,
  type LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

type Ctx = {
  cw: number;
  ch: number;
  contentW: number;
  contentH: number;
  x: number;
  y: number;
  vOpacity: Animated.Value;
  hOpacity: Animated.Value;
  thickness: number;
  minThumb: number;
};
const ScrollAreaCtx = createContext<Ctx | null>(null);
const useScrollArea = () => {
  const v = useContext(ScrollAreaCtx);
  if (!v) throw new Error('ScrollBar must be used within <ScrollArea>');
  return v;
};

export type ScrollAreaProps = ViewProps &
  WithClassName & {
    horizontal?: boolean;
    // FIX: оставляем onScroll в типе, чтобы можно было передавать и вызывать
    scrollViewProps?: Omit<ScrollViewProps, 'horizontal'>;
    viewportClassName?: string;
    scrollbarThickness?: number;
    minThumbSize?: number;
    autoHideDelayMs?: number;
    fadeDurationMs?: number;
  };

const ScrollArea = forwardRef<React.ElementRef<typeof ScrollView>, ScrollAreaProps>(
  (
    {
      className,
      style,
      children,
      horizontal = false,
      scrollViewProps,
      viewportClassName,
      scrollbarThickness = 10,
      minThumbSize = 20,
      autoHideDelayMs = 700,
      fadeDurationMs = 180,
      ...rest
    },
    ref
  ) => {
    const [cw, setCw] = useState(0);
    const [ch, setCh] = useState(0);
    const [contentW, setContentW] = useState(0);
    const [contentH, setContentH] = useState(0);
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);

    const vOpacity = useRef(new Animated.Value(0)).current;
    const hOpacity = useRef(new Animated.Value(0)).current;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null); // FIX: тип таймера

    const animateOpacity = useCallback(
      (target: Animated.Value, toValue: number) => {
        Animated.timing(target, {
          toValue,
          duration: fadeDurationMs,
          useNativeDriver: true,
        }).start();
      },
      [fadeDurationMs]
    );

    const ensureVisible = useCallback(() => {
      if (contentH > ch) animateOpacity(vOpacity, 1);
      if (horizontal && contentW > cw) animateOpacity(hOpacity, 1);

      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        animateOpacity(vOpacity, 0);
        animateOpacity(hOpacity, 0);
      }, autoHideDelayMs);
    }, [animateOpacity, autoHideDelayMs, ch, contentH, contentW, cw, hOpacity, horizontal, vOpacity]);

    useEffect(() => {
      return () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
      };
    }, []);

    const onContainerLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setCw(width);
      setCh(height);
    };
    const onContentSizeChange = (w: number, h: number) => {
      setContentW(w);
      setContentH(h);
    };

    // FIX: забираем пользовательский onScroll из scrollViewProps, остальное пробрасываем
    const { onScroll: userOnScroll, scrollEventThrottle: userThrottle, ...restSVProps } =
      scrollViewProps ?? {};

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = e.nativeEvent;
      setX(contentOffset.x);
      setY(contentOffset.y);
      ensureVisible();
      userOnScroll?.(e); // вызываем пользовательский обработчик
    };

    const ctx = useMemo<Ctx>(
      () => ({
        cw,
        ch,
        contentW,
        contentH,
        x,
        y,
        vOpacity,
        hOpacity,
        thickness: scrollbarThickness,
        minThumb: minThumbSize,
      }),
      [cw, ch, contentW, contentH, x, y, vOpacity, hOpacity, scrollbarThickness, minThumbSize]
    );

    return (
      <View
        onLayout={onContainerLayout}
        style={style}
        {...({ className: cn('relative overflow-hidden', className) } as any)}
        {...rest}
      >
        <ScrollAreaCtx.Provider value={ctx}>
          <ScrollView
            ref={ref}
            horizontal={horizontal}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={onContentSizeChange}
            onScroll={onScroll}
            scrollEventThrottle={userThrottle ?? 16} // FIX: учитываем throttle пользователя
            {...({ className: cn('w-full h-full', viewportClassName) } as any)}
            {...restSVProps}
          >
            {children}
          </ScrollView>

          <ScrollBar orientation="vertical" />
          {horizontal && <ScrollBar orientation="horizontal" />}
        </ScrollAreaCtx.Provider>
      </View>
    );
  }
);
ScrollArea.displayName = 'ScrollArea';

// -------- ScrollBar ----------
export type ScrollBarProps = ViewProps &
  WithClassName & {
    orientation?: 'vertical' | 'horizontal';
  };

const ScrollBar = forwardRef<React.ElementRef<typeof View>, ScrollBarProps>(
  ({ className, style, orientation = 'vertical', ...rest }, ref) => {
    const { cw, ch, contentW, contentH, x, y, vOpacity, hOpacity, thickness, minThumb } = useScrollArea();

    const isVertical = orientation === 'vertical';
    const canScroll = isVertical ? contentH > ch + 1 : contentW > cw + 1;
    if (!canScroll) return null;

    const trackLen = isVertical ? ch : cw;
    const contentLen = isVertical ? contentH : contentW;
    const offset = isVertical ? y : x;

    const thumbLen = Math.max(minThumb, (trackLen * (isVertical ? ch : cw)) / contentLen);
    const maxThumbPos = Math.max(0, trackLen - thumbLen);
    const scrollRange = Math.max(1, contentLen - (isVertical ? ch : cw));
    const thumbPos = Math.min(maxThumbPos, (offset / scrollRange) * maxThumbPos);

    const opacity = isVertical ? vOpacity : hOpacity;

    return (
      <Animated.View
        ref={ref as any}
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            right: isVertical ? 0 : undefined,
            top: isVertical ? 0 : undefined,
            bottom: isVertical ? 0 : 0,
            left: isVertical ? undefined : 0,
            width: isVertical ? thickness : '100%',
            height: isVertical ? '100%' : thickness,
            opacity,
          },
          style,
        ]}
        {...({
          className: cn(
            'select-none',
            isVertical ? 'border-l border-l-transparent p-[1px]' : 'border-t border-t-transparent p-[1px]',
            className
          ),
          'aria-hidden': true,
        } as any)}
        {...rest}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            borderRadius: 9999,
            backgroundColor: 'rgba(0,0,0,0.15)',
            width: isVertical ? thickness - 2 : undefined,
            height: isVertical ? undefined : thickness - 2,
            transform: isVertical
              ? [{ translateY: thumbPos }, { translateX: 1 }]
              : [{ translateX: thumbPos }, { translateY: 1 }],
            right: isVertical ? 0 : undefined,
            bottom: !isVertical ? 0 : undefined,
          }}
          {...({ className: 'relative rounded-full bg-border' } as any)}
        >
          {/* Сам "бегунок" — занимает всю толщину, длина уже учитывается трансформом */}
          <View
            style={{
              width: isVertical ? thickness - 2 : Math.max(minThumb, thumbLenFallback(trackLen, contentLen, minThumb)),
              height: isVertical ? Math.max(minThumb, thumbLenFallback(trackLen, contentLen, minThumb)) : thickness - 2,
            }}
          />
        </View>
      </Animated.View>
    );
  }
);
ScrollBar.displayName = 'ScrollBar';

// Вспомогательное вычисление для fallback
function thumbLenFallback(trackLen: number, contentLen: number, minThumb: number) {
  return Math.max(minThumb, (trackLen * trackLen) / Math.max(contentLen, 1));
}

export { ScrollArea, ScrollBar };