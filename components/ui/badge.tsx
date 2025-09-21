import React from 'react';
import { View, Text } from 'react-native';
import type { ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const baseContainer =
  'flex-row items-center rounded-full border px-2.5 py-0.5';

// контейнерные классы по вариантам (через дизайн-токены)
const containerByVariant: Record<BadgeVariant, string> = {
  default: 'bg-primary border-transparent',         // #35D07F
  secondary: 'bg-secondary border-transparent',     // тёмный серый из темы
  destructive: 'bg-destructive border-transparent', // красный из темы
  outline: 'bg-transparent border-border',          // системная граница
};

// цвет текста (в RN не наследуется от контейнера)
const textByVariant: Record<BadgeVariant, string> = {
  default: 'text-primary-foreground',         // обычно #fff
  secondary: 'text-secondary-foreground',
  destructive: 'text-destructive-foreground',
  outline: 'text-foreground',
};

export type BadgeProps = ViewProps & {
  variant?: BadgeVariant;
  className?: string;      // контейнер
  textClassName?: string;  // текст, если children — строка
  children?: React.ReactNode;
};

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

// helper как аналог cva — возвращает классы контейнера
export function badgeVariants(opts?: { variant?: BadgeVariant; className?: string }) {
  const v = opts?.variant ?? 'default';
  return cn(baseContainer, containerByVariant[v], opts?.className);
}