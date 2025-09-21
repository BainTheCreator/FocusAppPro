// skeleton.tsx — React Native + NativeWind версия Skeleton
import React, { useEffect, useRef } from 'react';
import { Animated, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

export type SkeletonProps = ViewProps &
  WithClassName & {
    animation?: 'pulse' | 'none'; // по умолчанию pulse
  };

export function Skeleton({
  className,
  style,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(animation === 'pulse' ? 0.6 : 1)).current;

  useEffect(() => {
    if (animation !== 'pulse') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animation, opacity]);

  return (
    <Animated.View
      style={[style, animation === 'pulse' ? { opacity } : undefined]}
      {...({
        className: cn('rounded-md bg-muted', className),
      } as any)}
      {...props}
    />
  );
}

export default Skeleton;