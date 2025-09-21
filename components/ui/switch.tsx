// Switch.tsx — React Native + NativeWind адаптация Radix Switch
import React, {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  Platform,
} from 'react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

export type SwitchProps = Omit<PressableProps, 'onPress'> &
  WithClassName & {
    checked?: boolean;                 // controlled
    defaultChecked?: boolean;          // uncontrolled
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;

    width?: number;                    // трек, по умолчанию 44 (w-11)
    height?: number;                   // трек, по умолчанию 24 (h-6)
    thumbSize?: number;                // по умолчанию height - 4
    onColor?: string;                  // цвет трека в состоянии checked
    offColor?: string;                 // цвет трека в состоянии unchecked
    thumbColor?: string;               // цвет бегунка
    trackClassName?: string;
    thumbClassName?: string;
  };

const DEFAULT_ON = '#3b82f6';    // primary (blue-500)
const DEFAULT_OFF = '#e5e7eb';   // input (zinc-200)
const DEFAULT_THUMB = '#ffffff'; // background

export const Switch = forwardRef<React.ElementRef<typeof Pressable>, SwitchProps>(
  (
    {
      className,
      trackClassName,
      thumbClassName,
      checked,
      defaultChecked = false,
      onCheckedChange,
      disabled = false,

      width = 44,
      height = 24,
      thumbSize,
      onColor = DEFAULT_ON,
      offColor = DEFAULT_OFF,
      thumbColor = DEFAULT_THUMB,

      android_ripple = { color: 'rgba(0,0,0,0.06)', radius: 24 },
      hitSlop = 6,

      ...rest
    },
    ref
  ) => {
    const isControlled = checked !== undefined;
    const [internal, setInternal] = useState<boolean>(defaultChecked);
    const value = isControlled ? !!checked : internal;

    const pad = 2;
    const H = height;
    const W = width;
    const TH = thumbSize ?? Math.max(10, H - pad * 2);
    const travel = Math.max(0, W - TH - pad * 2); // расстояние сдвига бегунка

    const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
    useEffect(() => {
      Animated.timing(progress, {
        toValue: value ? 1 : 0,
        duration: 180,
        useNativeDriver: true, // только для transform
      }).start();
    }, [value, progress]);

    const translateX = useMemo(
      () =>
        progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, travel],
        }),
      [progress, travel]
    );

    const handlePress = () => {
      if (disabled) return;
      const next = !value;
      if (!isControlled) setInternal(next);
      onCheckedChange?.(next);
    };

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        hitSlop={hitSlop}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        android_ripple={Platform.OS === 'android' ? android_ripple : undefined}
        style={{
          width: W,
          height: H,
          borderRadius: H / 2,
          padding: pad,
          backgroundColor: value ? onColor : offColor,
          opacity: disabled ? 0.5 : 1,
        }}
        {...({
          className: cn(
            // базовые стили контейнера/трека
            'inline-flex shrink-0 items-center',
            trackClassName,
            className
          ),
          // для NativeWind вариантов вида data-[state=checked]/unchecked
          dataSet: { state: value ? 'checked' : 'unchecked' },
        } as any)}
        {...rest}
      >
        <Animated.View
          style={{
            width: TH,
            height: TH,
            borderRadius: TH / 2,
            backgroundColor: thumbColor,
            transform: [{ translateX }],
            // тень под бегунком (примерно как shadow-lg)
            ...(Platform.OS === 'ios'
              ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2 }
              : { elevation: 2 }),
          }}
          {...({
            className: cn(
              'ring-0',
              thumbClassName
            ),
          } as any)}
        />
      </Pressable>
    );
  }
);
Switch.displayName = 'Switch';

export default Switch;