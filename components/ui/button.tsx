import React, { forwardRef } from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, { container: string; text: string }> = {
  default:     { container: 'bg-primary',                         text: 'text-primary-foreground' },   // #35D07F
  destructive: { container: 'bg-destructive',                     text: 'text-destructive-foreground' },
  outline:     { container: 'bg-transparent border border-primary', text: 'text-primary' },
  secondary:   { container: 'bg-secondary',                       text: 'text-secondary-foreground' },
  ghost:       { container: 'bg-transparent',                     text: 'text-primary' },
  link:        { container: 'bg-transparent',                     text: 'text-primary underline' },
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 rounded-md',
  sm:      'h-9 px-3 rounded-md',
  lg:      'h-11 px-8 rounded-md',
  icon:    'h-10 w-10 p-0 rounded-md',
};

export type RNButtonProps = Omit<PressableProps, 'children'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  textClassName?: string;
  children?: React.ReactNode;
};

export const Button = forwardRef<React.ElementRef<typeof Pressable>, RNButtonProps>(
  ({ variant = 'default', size = 'default', className, textClassName, disabled, children, style, ...props }, ref) => {
    const base = 'flex-row items-center justify-center gap-2 active:opacity-90';
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
  return cn(
    'flex-row items-center justify-center gap-2 rounded-md',
    variantClasses[v].container,
    sizeClasses[s],
    opts?.className
  );
}