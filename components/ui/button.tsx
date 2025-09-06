import React, { forwardRef } from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, { container: string; text: string }> = {
  default:     { container: 'bg-blue-600',                                  text: 'text-white' },
  destructive: { container: 'bg-rose-600',                                  text: 'text-white' },
  outline:     { container: 'bg-transparent border border-slate-300 dark:border-slate-700', text: 'text-slate-900 dark:text-slate-100' },
  secondary:   { container: 'bg-slate-100 dark:bg-slate-800',               text: 'text-slate-900 dark:text-slate-100' },
  ghost:       { container: 'bg-transparent',                                text: 'text-slate-900 dark:text-slate-100' },
  link:        { container: 'bg-transparent',                                text: 'text-blue-600 underline' },
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4',
  sm:      'h-9 px-3 rounded-md',
  lg:      'h-11 px-8 rounded-md',
  icon:    'h-10 w-10 p-0',
};

export type RNButtonProps = Omit<PressableProps, 'children'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;      // контейнер
  textClassName?: string;  // текст, если children — строка
  children?: React.ReactNode;
};

export const Button = forwardRef<React.ElementRef<typeof Pressable>, RNButtonProps>(
  ({ variant = 'default', size = 'default', className, textClassName, disabled, children, style, ...props }, ref) => {
    const base = 'flex-row items-center justify-center gap-2 rounded-md active:opacity-90';
    const variantCls = variantClasses[variant];
    const sizeCls = sizeClasses[size];

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        disabled={disabled}
        className={cn(base, variantCls.container, sizeCls, disabled && 'opacity-50', className)}
        style={style}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text className={cn('text-sm font-medium', variantCls.text, textClassName)}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }
);
Button.displayName = 'Button';

export function buttonVariants(opts?: { variant?: ButtonVariant; size?: ButtonSize; className?: string }) {
  const v = opts?.variant ?? 'default';
  const s = opts?.size ?? 'default';
  return cn('flex-row items-center justify-center gap-2 rounded-md', variantClasses[v].container, sizeClasses[s], opts?.className);
}