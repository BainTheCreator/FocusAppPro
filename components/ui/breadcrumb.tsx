import React, { createContext, useContext, forwardRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { ViewProps, TextProps, PressableProps } from 'react-native';
import { ChevronRight, MoreHorizontal } from 'lucide-react-native';
import { cn } from '@/lib/utils';

type Ctx = { separator?: React.ReactNode };
const BreadcrumbCtx = createContext<Ctx>({});
const useBreadcrumb = () => useContext(BreadcrumbCtx);

// Root
export type BreadcrumbProps = ViewProps & { separator?: React.ReactNode; className?: string };
export const Breadcrumb = forwardRef<React.ElementRef<typeof View>, BreadcrumbProps>(
  ({ separator, className, children, ...props }, ref) => (
    <BreadcrumbCtx.Provider value={{ separator }}>
      <View ref={ref} className={cn('w-full', className)} {...props}>
        {children}
      </View>
    </BreadcrumbCtx.Provider>
  )
);
Breadcrumb.displayName = 'Breadcrumb';

// List
export type BreadcrumbListProps = ViewProps & { className?: string };
export const BreadcrumbList = forwardRef<React.ElementRef<typeof View>, BreadcrumbListProps>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('flex-row flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400', className)}
      {...props}
    />
  )
);
BreadcrumbList.displayName = 'BreadcrumbList';

// Item
export type BreadcrumbItemProps = ViewProps & { className?: string };
export const BreadcrumbItem = forwardRef<React.ElementRef<typeof View>, BreadcrumbItemProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn('flex-row items-center gap-1.5', className)} {...props} />
  )
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

// Link
type BreadcrumbLinkProps = Omit<PressableProps, 'children'> & {
  asChild?: boolean;
  className?: string;
  textClassName?: string;
  children?: React.ReactNode;
};

// Кортеж аргументов для onPress, чтобы корректно использовать спред
type OnPress = NonNullable<PressableProps['onPress']>;
type OnPressArgs = Parameters<OnPress>; // [GestureResponderEvent]

export const BreadcrumbLink = forwardRef<React.ElementRef<typeof Pressable>, BreadcrumbLinkProps>(
  ({ asChild, className, textClassName, children, onPress, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      const child = children as any;
      const mergedClass = cn('text-slate-600 dark:text-slate-300', child.props?.className, className);

      const mergedOnPress = (...args: OnPressArgs) => {
        child.props?.onPress?.(...args);
        onPress?.(...args);
      };

      return React.cloneElement(child, {
        className: mergedClass,
        onPress: mergedOnPress,
        ref,
      });
    }

    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        accessibilityRole="link"
        className={cn('active:opacity-70', className)}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text className={cn('text-slate-600 dark:text-slate-300', textClassName)}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }
);
BreadcrumbLink.displayName = 'BreadcrumbLink';

// Page
export type BreadcrumbPageProps = TextProps & { className?: string };
export const BreadcrumbPage = forwardRef<React.ElementRef<typeof Text>, BreadcrumbPageProps>(
  ({ className, children, ...props }, ref) => (
    <Text ref={ref} className={cn('font-normal text-slate-900 dark:text-slate-100', className)} {...props}>
      {children}
    </Text>
  )
);
BreadcrumbPage.displayName = 'BreadcrumbPage';

// Separator
export type BreadcrumbSeparatorProps = ViewProps & { className?: string; children?: React.ReactNode };
export const BreadcrumbSeparator = ({ className, children, ...props }: BreadcrumbSeparatorProps) => {
  const { separator } = useBreadcrumb();
  const content = children ?? separator ?? <ChevronRight size={14} color="#94a3b8" />;
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      className={cn('mx-1', className)}
      {...props}
    >
      {content}
    </View>
  );
};
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

// Ellipsis
export type BreadcrumbEllipsisProps = ViewProps & { className?: string };
export const BreadcrumbEllipsis = ({ className, ...props }: BreadcrumbEllipsisProps) => (
  <View
    accessible={false}
    accessibilityElementsHidden
    importantForAccessibility="no"
    className={cn('h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal size={16} color="#475569" />
  </View>
);
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';