// Progress.tsx — React Native + NativeWind адаптация Radix Progress
import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View, type ViewProps, type LayoutChangeEvent } from 'react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

export type ProgressProps = ViewProps &
  WithClassName & {
    value?: number;                 // 0..max; если undefined — indeterminate
    max?: number;                   // по умолчанию 100
    animationDuration?: number;     // мс, по умолчанию 300
    indicatorClassName?: string;    // стили для внутренней полосы
  };

const clamp = (n: number, min = 0, max = 1) => Math.min(Math.max(n, min), max);

export const Progress = forwardRef<React.ElementRef<typeof View>, ProgressProps>(
  (
    {
      className,
      style,
      value,
      max = 100,
      animationDuration = 300,
      indicatorClassName,
      ...rest
    },
    ref
  ) => {
    const indeterminate = value === undefined || value === null;
    const ratio = clamp(((value as number) ?? 0) / max, 0, 1);

    const [trackW, setTrackW] = useState(0);
    const onLayout = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width);

    // Determinate animation (width)
    const progress = useRef(new Animated.Value(ratio)).current;
    useEffect(() => {
      if (indeterminate) return;
      Animated.timing(progress, {
        toValue: ratio,
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // анимируем width
      }).start();
    }, [ratio, animationDuration, indeterminate, progress]);

    // Indeterminate animation (moving segment)
    const slide = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      let loop: Animated.CompositeAnimation | null = null;
      if (indeterminate) {
        slide.setValue(0);
        loop = Animated.loop(
          Animated.timing(slide, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          })
        );
        loop.start();
      }
      return () => {
        slide.stopAnimation();
      };
    }, [indeterminate, slide]);

    const determinateStyle = useMemo(() => {
      const width = trackW
        ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, trackW] })
        : 0;
      return [{ width }];
    }, [progress, trackW]);

    const indeterminateStyle = useMemo(() => {
      const segW = Math.max(24, trackW * 0.35); // ширина бегущего сегмента
      const translateX = slide.interpolate({
        inputRange: [0, 1],
        outputRange: [-segW, trackW],
      });
      return [
        { width: segW, transform: [{ translateX }] },
      ];
    }, [slide, trackW]);

    return (
      <View
        ref={ref}
        onLayout={onLayout}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max, now: indeterminate ? undefined : Math.round(ratio * max) }}
        style={style}
        {...({
          className: cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className),
        } as any)}
        {...rest}
      >
        {indeterminate ? (
          <Animated.View
            {...({
              className: cn('absolute left-0 top-0 h-full rounded-full bg-primary', indicatorClassName),
            } as any)}
            style={indeterminateStyle}
          />
        ) : (
          <Animated.View
            {...({
              className: cn('h-full rounded-full bg-primary', indicatorClassName),
            } as any)}
            style={determinateStyle}
          />
        )}
      </View>
    );
  }
);
Progress.displayName = 'Progress';

export default Progress;