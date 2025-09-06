import React from 'react';
import { View, Text } from 'react-native';
import type { ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const baseContainer =
  'flex-row items-center rounded-full border px-2.5 py-0.5';

// контейнерные классы по вариантам
const containerByVariant: Record<BadgeVariant, string> = {
  default: 'bg-blue-600 border-transparent',
  secondary: 'bg-slate-100 dark:bg-slate-800 border-transparent',
  destructive: 'bg-rose-600 border-transparent',
  outline: 'bg-transparent border-slate-300 dark:border-slate-700',
};

// цвет текста (в RN цвет не наследуется от контейнера)
const textByVariant: Record<BadgeVariant, string> = {
  default: 'text-white',
  secondary: 'text-slate-900 dark:text-slate-100',
  destructive: 'text-white',
  outline: 'text-slate-900 dark:text-slate-100',
};

export type BadgeProps = ViewProps & {
  variant?: BadgeVariant;
  className?: string;      // контейнер
  textClassName?: string;  // текст, если children — строка
  children?: React.ReactNode;
};

// сам компонент
export function Badge({
  variant = 'default',
  className,
  textClassName,
  children,
  ...props
}: BadgeProps) {
  return (
    <View
      className={cn(baseContainer, containerByVariant[variant], className)}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className={cn('text-xs font-semibold', textByVariant[variant], textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

// helper как аналог cva — возвращает классы контейнера (как на вебе)
export function badgeVariants(opts?: { variant?: BadgeVariant; className?: string }) {
  const v = opts?.variant ?? 'default';
  return cn(baseContainer, containerByVariant[v], opts?.className);
}