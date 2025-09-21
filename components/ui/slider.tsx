// Slider.tsx — React Native + NativeWind адаптация Radix Slider (одиночный ползунок)
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PanResponder,
  View,
  type ViewProps,
  type LayoutChangeEvent,
  AccessibilityActionEvent,
} from 'react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

export type SliderProps = ViewProps &
  WithClassName & {
    value?: number;                  // controlled
    defaultValue?: number;           // uncontrolled
    onValueChange?: (v: number) => void;
    onValueCommit?: (v: number) => void; // при отпускании
    min?: number;                    // default 0
    max?: number;                    // default 100
    step?: number;                   // default 1
    disabled?: boolean;
    orientation?: 'horizontal' | 'vertical'; // сейчас ориентирован на horizontal
    trackClassName?: string;
    rangeClassName?: string;
    thumbClassName?: string;
    trackThickness?: number;         // px, default 8
    thumbSize?: number;              // px, default 20
  };

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const roundToStep = (n: number, min: number, step: number) =>
  Math.round((n - min) / step) * step + min;

export const Slider = forwardRef<React.ElementRef<typeof View>, SliderProps>(
  (
    {
      className,
      style,
      value,
      defaultValue,
      onValueChange,
      onValueCommit,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      orientation = 'horizontal',
      trackClassName,
      rangeClassName,
      thumbClassName,
      trackThickness = 8,
      thumbSize = 20,
      ...rest
    },
    ref
  ) => {
    const controlled = value !== undefined;
    const [internal, setInternal] = useState<number>(defaultValue ?? min);
    const val = useMemo(() => clamp(controlled ? (value as number) : internal, min, max), [controlled, value, internal, min, max]);
    const range = Math.max(0.0001, max - min);
    const ratio = (val - min) / range;

    // Измерения трека
    const trackRef = useRef<View>(null);
    const [trackLen, setTrackLen] = useState(0);
    const trackWinRect = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

    const measureTrack = useCallback(() => {
      trackRef.current?.measureInWindow?.((x, y, w, h) => {
        trackWinRect.current = { x, y, w, h };
      });
    }, []);

    const onTrackLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setTrackLen(orientation === 'vertical' ? height : width);
      // Перемеряем абсолютные координаты
      setTimeout(measureTrack, 0);
    };

    // Установка значения
    const setVal = useCallback(
      (next: number, emitChange = true) => {
        const q = clamp(roundToStep(next, min, step), min, max);
        if (!controlled) setInternal(q);
        if (emitChange) onValueChange?.(q);
      },
      [controlled, max, min, onValueChange, step]
    );

    // Перевод координат в значение
    const pageToValue = useCallback(
      (pageX: number, pageY: number) => {
        const rect = trackWinRect.current;
        if (!rect) return val;
        let frac = 0;
        if (orientation === 'horizontal') {
          frac = (pageX - rect.x) / (rect.w || 1);
        } else {
          // вертикальный — сверху вниз
          frac = (pageY - rect.y) / (rect.h || 1);
        }
        frac = clamp(frac, 0, 1);
        // Для вертикали делаем bottom→top
        if (orientation === 'vertical') frac = 1 - frac;
        return min + frac * range;
      },
      [min, orientation, range, val]
    );

    // Жесты
    const dragging = useRef(false);
    const pan = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (e) => {
          measureTrack();
          const { pageX, pageY } = e.nativeEvent;
          const next = pageToValue(pageX, pageY);
          setVal(next);
          dragging.current = true;
        },
        onPanResponderMove: (_, g) => {
          if (!dragging.current) return;
          const rect = trackWinRect.current;
          if (!rect) return;
          const pageX = g.moveX;
          const pageY = g.moveY;
          const next = pageToValue(pageX, pageY);
          setVal(next);
        },
        onPanResponderRelease: () => {
          dragging.current = false;
          onValueCommit?.(val);
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          onValueCommit?.(val);
        },
      })
    ).current;

    // Позиционирование элементов
    const rootSizeStyle =
      orientation === 'horizontal'
        ? { height: Math.max(thumbSize, trackThickness) }
        : { width: Math.max(thumbSize, trackThickness) };

    const trackStyle =
      orientation === 'horizontal'
        ? { height: trackThickness, width: '100%', marginVertical: (Math.max(thumbSize, trackThickness) - trackThickness) / 2 }
        : { width: trackThickness, height: '100%', marginHorizontal: (Math.max(thumbSize, trackThickness) - trackThickness) / 2 };

    const rangeStyle =
      orientation === 'horizontal'
        ? { width: trackLen * ratio, height: '100%' }
        : { height: trackLen * ratio, width: '100%', position: 'absolute', bottom: 0 }; // снизу вверх

    // Позиция большой ручки
    const thumbPosPx = trackLen * ratio;
    const thumbStyle =
      orientation === 'horizontal'
        ? {
            position: 'absolute' as const,
            left: clamp(thumbPosPx - thumbSize / 2, 0, Math.max(0, trackLen - thumbSize)),
            top: (Math.max(thumbSize, trackThickness) - thumbSize) / 2,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
          }
        : {
            position: 'absolute' as const,
            bottom: clamp(thumbPosPx - thumbSize / 2, 0, Math.max(0, trackLen - thumbSize)),
            left: (Math.max(thumbSize, trackThickness) - thumbSize) / 2,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
          };

    // Accessibility (increment/decrement)
    const onAccessibilityAction = (e: AccessibilityActionEvent) => {
      if (disabled) return;
      const { actionName } = e.nativeEvent;
      if (actionName === 'increment') setVal(val + step);
      if (actionName === 'decrement') setVal(val - step);
      onValueCommit?.(val);
    };

    return (
      <View
        ref={ref}
        // Контейнер жестов
        {...pan.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityActions={[
          { name: 'increment' as const, label: 'Increase' },
          { name: 'decrement' as const, label: 'Decrease' },
        ]}
        onAccessibilityAction={onAccessibilityAction}
        accessibilityValue={{ min, max, now: Math.round(val) }}
        pointerEvents={disabled ? 'none' : 'auto'}
        style={[rootSizeStyle, style]}
        {...({
          className: cn('relative w-full items-center', className),
          dataSet: { orientation, disabled: disabled ? 'true' : 'false' },
        } as any)}
        {...rest}
      >
        {/* Track */}
        <View
          ref={trackRef}
          onLayout={onTrackLayout}
          style={trackStyle}
          {...({
            className: cn('rounded-full bg-secondary overflow-hidden', trackClassName),
          } as any)}
        >
          {/* Range */}
          <View
            style={rangeStyle}
            {...({
              className: cn('bg-primary', orientation === 'horizontal' ? '' : 'absolute left-0', rangeClassName),
            } as any)}
          />
        </View>

        {/* Thumb */}
        <View
          style={thumbStyle}
          {...({
            className: cn(
              'border-2 border-primary bg-background',
              'ring-offset-background',
              disabled ? 'opacity-50' : '',
              thumbClassName
            ),
          } as any)}
        />
      </View>
    );
  }
);
Slider.displayName = 'Slider';

export default Slider;