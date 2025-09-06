import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import type { ViewProps, TextProps } from 'react-native';
import { cn } from '@/lib/utils';

export type CardProps = ViewProps & { className?: string };
export const Card = forwardRef<View, CardProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('rounded-lg border bg-card shadow-sm', className)}
    {...props}
  />
));
Card.displayName = 'Card';

export type CardHeaderProps = ViewProps & { className?: string };
export const CardHeader = forwardRef<View, CardHeaderProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export type CardTitleProps = TextProps & { className?: string };
export const CardTitle = forwardRef<Text, CardTitleProps>(({ className, ...props }, ref) => (
  <Text
    ref={ref}
    className={cn('text-2xl font-semibold leading-none tracking-tight text-card-foreground', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export type CardDescriptionProps = TextProps & { className?: string };
export const CardDescription = forwardRef<Text, CardDescriptionProps>(({ className, ...props }, ref) => (
  <Text
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export type CardContentProps = ViewProps & { className?: string };
export const CardContent = forwardRef<View, CardContentProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export type CardFooterProps = ViewProps & { className?: string };
export const CardFooter = forwardRef<View, CardFooterProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';