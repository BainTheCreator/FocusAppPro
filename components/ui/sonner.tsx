// Toaster.tsx — React Native + NativeWind версия Toaster (аналог sonner)
// Установка: npm i react-native-toast-message react-native-svg lucide-react-native

import React from 'react';
import {
  View,
  Text,
  Pressable,
  useColorScheme,
  type ViewProps,
} from 'react-native';
import Toast, { type ToastConfig } from 'react-native-toast-message';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

export type ToasterProps = WithClassName & {
  theme?: 'light' | 'dark' | 'system';
  position?: 'top' | 'bottom';
  topOffset?: number;
  bottomOffset?: number;
  visibilityTime?: number;
};

const Card = ({
  title,
  description,
  onPress,
  variant = 'default',
  theme = 'light',
  className,
  style,
  ...rest
}: {
  title?: string;
  description?: string;
  onPress?: () => void;
  variant?: 'default' | 'success' | 'error' | 'info';
  theme?: 'light' | 'dark';
} & ViewProps &
  WithClassName) => {
  const isDark = theme === 'dark';
  const accent =
    variant === 'success'
      ? 'bg-green-500/80'
      : variant === 'error'
      ? 'bg-red-500/80'
      : variant === 'info'
      ? 'bg-blue-500/80'
      : 'bg-muted';

  return (
    <Pressable
      onPress={onPress}
      style={style}
      {...({
        className: cn(
          'mx-3 mb-2 flex-row items-start rounded-lg border shadow-lg',
          isDark
            ? 'bg-background border-border'
            : 'bg-background border-border',
          className
        ),
      } as any)}
      {...rest}
    >
      {/* Левая акцентная полоса */}
      <View
        {...({
          className: cn('h-full w-1.5 rounded-l-lg', accent),
        } as any)}
      />
      <View {...({ className: 'flex-1 p-3' } as any)}>
        {!!title && (
          <Text
            numberOfLines={2}
            {...({
              className: cn('text-base font-semibold text-foreground'),
            } as any)}
          >
            {title}
          </Text>
        )}
        {!!description && (
          <Text
            numberOfLines={3}
            {...({
              className: cn('mt-0.5 text-sm text-muted-foreground'),
            } as any)}
          >
            {description}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

export function Toaster({
  theme = 'system',
  position = 'top',
  topOffset = 12,
  bottomOffset = 24,
  visibilityTime = 3500,
  className, // не используется тут, оставлено для совместимости
}: ToasterProps) {
  const scheme = useColorScheme();
  const resolved = theme === 'system' ? (scheme ?? 'light') : theme;

  const config: ToastConfig = {
    default: ({ text1, text2, onPress }) => (
      <Card
        title={text1 as string}
        description={text2 as string}
        onPress={onPress}
        theme={resolved}
        variant="default"
      />
    ),
    success: ({ text1, text2, onPress }) => (
      <Card
        title={text1 as string}
        description={text2 as string}
        onPress={onPress}
        theme={resolved}
        variant="success"
      />
    ),
    error: ({ text1, text2, onPress }) => (
      <Card
        title={text1 as string}
        description={text2 as string}
        onPress={onPress}
        theme={resolved}
        variant="error"
      />
    ),
    info: ({ text1, text2, onPress }) => (
      <Card
        title={text1 as string}
        description={text2 as string}
        onPress={onPress}
        theme={resolved}
        variant="info"
      />
    ),
  };

  return (
    <Toast
      config={config}
      position={position}
      topOffset={topOffset}
      bottomOffset={bottomOffset}
      visibilityTime={visibilityTime}
    />
  );
}

// Совместимый API с sonner: import { Toaster, toast } from '...'
type ShowOpts = {
  title?: string;
  description?: string;
  position?: 'top' | 'bottom';
  duration?: number;
  id?: string | number;
};

export const toast = {
  show: (opts: ShowOpts = {}) =>
    Toast.show({
      type: 'default',
      text1: opts.title,
      text2: opts.description,
      position: opts.position,
      visibilityTime: opts.duration,
      props: {},
    }),
  success: (title: string, opts?: Omit<ShowOpts, 'title'>) =>
    Toast.show({
      type: 'success',
      text1: title,
      text2: opts?.description,
      position: opts?.position,
      visibilityTime: opts?.duration,
    }),
  error: (title: string, opts?: Omit<ShowOpts, 'title'>) =>
    Toast.show({
      type: 'error',
      text1: title,
      text2: opts?.description,
      position: opts?.position,
      visibilityTime: opts?.duration,
    }),
  info: (title: string, opts?: Omit<ShowOpts, 'title'>) =>
    Toast.show({
      type: 'info',
      text1: title,
      text2: opts?.description,
      position: opts?.position,
      visibilityTime: opts?.duration,
    }),
  dismiss: (id?: string | number) => {
    // react-native-toast-message не управляет конкретным id через API скрытия,
    // скрываем текущий (или все активные)
    Toast.hide();
  },
};

export default Toaster;