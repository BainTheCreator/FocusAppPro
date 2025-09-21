// Table.tsx — React Native + NativeWind адаптация Table
import React, { forwardRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  type ViewProps,
  type TextProps,
} from 'react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

// Корневой контейнер с горизонтальным скроллом при переполнении
export type TableProps = ViewProps & WithClassName & {
  horizontalScroll?: boolean; // по умолчанию true
};
const Table = forwardRef<React.ElementRef<typeof View>, TableProps>(
  ({ className, style, children, horizontalScroll = true, ...props }, ref) => {
    const content = (
      <View
        ref={ref}
        style={style}
        {...({ className: cn('w-full', className) } as any)}
        {...props}
      >
        {children}
      </View>
    );

    if (!horizontalScroll) return content;

    return (
      <View {...({ className: 'relative w-full' } as any)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {content}
        </ScrollView>
      </View>
    );
  }
);
Table.displayName = 'Table';

// Шапка таблицы (контейнер строк шапки)
export type TableHeaderProps = ViewProps & WithClassName;
const TableHeader = forwardRef<React.ElementRef<typeof View>, TableHeaderProps>(
  ({ className, style, children, ...props }, ref) => (
    <View
      ref={ref}
      style={style}
      {...({ className: cn('border-b', className) } as any)}
      {...props}
    >
      {children}
    </View>
  )
);
TableHeader.displayName = 'TableHeader';

// Тело таблицы
export type TableBodyProps = ViewProps & WithClassName;
const TableBody = forwardRef<React.ElementRef<typeof View>, TableBodyProps>(
  ({ className, style, children, ...props }, ref) => (
    <View
      ref={ref}
      style={style}
      {...({ className: cn('', className) } as any)}
      {...props}
    >
      {children}
    </View>
  )
);
TableBody.displayName = 'TableBody';

// Футер таблицы
export type TableFooterProps = ViewProps & WithClassName;
const TableFooter = forwardRef<React.ElementRef<typeof View>, TableFooterProps>(
  ({ className, style, children, ...props }, ref) => (
    <View
      ref={ref}
      style={style}
      {...({ className: cn('border-t bg-muted/50', className) } as any)}
      {...props}
    >
      {children}
    </View>
  )
);
TableFooter.displayName = 'TableFooter';

// Строка таблицы
export type TableRowProps = ViewProps & WithClassName & {
  selected?: boolean; // для data-state=selected
};
const TableRow = forwardRef<React.ElementRef<typeof View>, TableRowProps>(
  ({ className, style, children, selected, ...props }, ref) => (
    <View
      ref={ref}
      style={style}
      {...({
        className: cn(
          'flex-row items-center border-b',
          // hover в RN нет; стилизуйте по data-state или pressable при необходимости
          className
        ),
        dataSet: { state: selected ? 'selected' : undefined },
      } as any)}
      {...props}
    >
      {children}
    </View>
  )
);
TableRow.displayName = 'TableRow';

// Заголовочная ячейка (th)
export type TableHeadProps = ViewProps & WithClassName;
const TableHead = forwardRef<React.ElementRef<typeof View>, TableHeadProps>(
  ({ className, style, children, ...props }, ref) => (
    <View
      ref={ref}
      style={style}
      {...({
        className: cn(
          'h-12 px-4 justify-center',
          className
        ),
      } as any)}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text {...({ className: 'font-medium text-muted-foreground' } as any)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
);
TableHead.displayName = 'TableHead';

// Обычная ячейка (td)
export type TableCellProps = ViewProps & WithClassName;
const TableCell = forwardRef<React.ElementRef<typeof View>, TableCellProps>(
  ({ className, style, children, ...props }, ref) => (
    <View
      ref={ref}
      style={style}
      {...({ className: cn('p-4 justify-center', className) } as any)}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-foreground' } as any)}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
);
TableCell.displayName = 'TableCell';

// Подпись таблицы
export type TableCaptionProps = TextProps & WithClassName;
const TableCaption = forwardRef<React.ElementRef<typeof Text>, TableCaptionProps>(
  ({ className, style, children, ...props }, ref) => (
    <Text
      ref={ref}
      style={style}
      {...({ className: cn('mt-4 text-sm text-muted-foreground', className) } as any)}
      {...props}
    >
      {children}
    </Text>
  )
);
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};