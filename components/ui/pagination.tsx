// Pagination.tsx — React Native + NativeWind версия пагинации
// Иконки: npm i lucide-react-native react-native-svg

import React, { forwardRef } from 'react';
import {
  Pressable,
  type PressableProps,
  View,
  type ViewProps,
  Text,
} from 'react-native';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

// -------- Root --------
export type PaginationProps = ViewProps & WithClassName;

const Pagination = forwardRef<React.ElementRef<typeof View>, PaginationProps>(
  ({ className, style, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        style={style}
        accessibilityRole="menu"
        {...({ className: cn('mx-auto w-full items-center justify-center', className) } as any)}
        {...rest}
      />
    );
  }
);
Pagination.displayName = 'Pagination';

// -------- Content (list) --------
export type PaginationContentProps = ViewProps & WithClassName;

const PaginationContent = forwardRef<React.ElementRef<typeof View>, PaginationContentProps>(
  ({ className, style, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        style={style}
        {...({ className: cn('flex-row items-center gap-1', className) } as any)}
        {...rest}
      />
    );
  }
);
PaginationContent.displayName = 'PaginationContent';

// -------- Item (li) --------
export type PaginationItemProps = ViewProps & WithClassName;

const PaginationItem = forwardRef<React.ElementRef<typeof View>, PaginationItemProps>(
  ({ className, style, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        style={style}
        {...({ className: cn('', className) } as any)}
        {...rest}
      />
    );
  }
);
PaginationItem.displayName = 'PaginationItem';

// -------- Link (button-like) --------
type ButtonSize = 'icon' | 'default';

export type PaginationLinkProps = PressableProps &
  WithClassName & {
    isActive?: boolean;
    size?: ButtonSize;
  };

const linkClasses = (isActive?: boolean, size: ButtonSize = 'icon') =>
  cn(
    'rounded-md text-sm font-medium active:opacity-80',
    size === 'icon'
      ? 'h-9 w-9 items-center justify-center'
      : 'h-9 px-3 flex-row items-center',
    isActive
      ? 'border border-input bg-background'
      : 'bg-transparent'
  );

const PaginationLink = ({
  className,
  isActive,
  size = 'icon',
  children,
  ...rest
}: PaginationLinkProps) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!isActive }}
      {...({
        className: cn(linkClasses(isActive, size), className),
        dataSet: { active: isActive ? 'true' : 'false' },
      } as any)}
      {...rest}
    >
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-foreground' } as any)}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
};
(PaginationLink as any).displayName = 'PaginationLink';

// -------- Previous --------
const PaginationPrevious = ({
  className,
  ...props
}: Omit<PaginationLinkProps, 'children' | 'size'>) => (
  <PaginationLink
    accessibilityLabel="Go to previous page"
    size="default"
    {...({ className: cn('flex-row items-center gap-1 pl-2.5', className) } as any)}
    {...props}
  >
    <ChevronLeft size={16} />
    <Text {...({ className: 'text-foreground' } as any)}>Previous</Text>
  </PaginationLink>
);
(PaginationPrevious as any).displayName = 'PaginationPrevious';

// -------- Next --------
const PaginationNext = ({
  className,
  ...props
}: Omit<PaginationLinkProps, 'children' | 'size'>) => (
  <PaginationLink
    accessibilityLabel="Go to next page"
    size="default"
    {...({ className: cn('flex-row items-center gap-1 pr-2.5', className) } as any)}
    {...props}
  >
    <Text {...({ className: 'text-foreground' } as any)}>Next</Text>
    <ChevronRight size={16} />
  </PaginationLink>
);
(PaginationNext as any).displayName = 'PaginationNext';

// -------- Ellipsis --------
export type PaginationEllipsisProps = ViewProps & WithClassName;

const PaginationEllipsis = forwardRef<React.ElementRef<typeof View>, PaginationEllipsisProps>(
  ({ className, style, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={style}
        {...({ className: cn('h-9 w-9 items-center justify-center', className) } as any)}
        {...rest}
      >
        <MoreHorizontal size={16} />
      </View>
    );
  }
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

// -------- Exports --------
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};