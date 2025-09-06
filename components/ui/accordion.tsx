import React, { createContext, useContext, useMemo, useState } from 'react';
import { View, Pressable, Text, ViewProps, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

// Простой helper для классов
function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

type AccordionType = 'single' | 'multiple';

type AccordionContextValue = {
  type: AccordionType;
  values: string[];
  isOpen: (v: string) => boolean;
  toggle: (v: string) => void;
};

const AccordionCtx = createContext<AccordionContextValue | null>(null);
const useAccordion = () => {
  const ctx = useContext(AccordionCtx);
  if (!ctx) throw new Error('Accordion components must be used inside <Accordion>');
  return ctx;
};

type AccordionProps = React.PropsWithChildren<{
  type?: AccordionType;
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (val: string | string[]) => void;
  collapsible?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
}>;

const toArray = (val: string | string[] | undefined, type: AccordionType): string[] => {
  if (!val) return [];
  return Array.isArray(val) ? (type === 'single' ? val.slice(0, 1) : val) : [val];
};

export function Accordion({
  type = 'single',
  defaultValue,
  value,
  onValueChange,
  collapsible = false,
  className,
  style,
  children,
}: AccordionProps) {
  const [internal, setInternal] = useState<string[]>(toArray(defaultValue, type));
  const values = value !== undefined ? toArray(value, type) : internal;

  const setValues = (next: string[]) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(type === 'single' ? (next[0] ?? '') : next);
  };

  const toggle = (v: string) => {
    if (type === 'single') {
      const isSame = values[0] === v;
      const next = isSame ? (collapsible ? [] : [v]) : [v];
      setValues(next);
    } else {
      const exists = values.includes(v);
      const next = exists ? values.filter((x) => x !== v) : [...values, v];
      setValues(next);
    }
  };

  const ctx = useMemo<AccordionContextValue>(
    () => ({ type, values, isOpen: (v) => values.includes(v), toggle }),
    [type, values]
  );

  return (
    <AccordionCtx.Provider value={ctx}>
      <View className={className} style={style}>
        {children}
      </View>
    </AccordionCtx.Provider>
  );
}

// Item context, чтобы Trigger/Content знали своё value
const ItemCtx = createContext<{ value: string } | null>(null);
const useItem = () => {
  const ctx = useContext(ItemCtx);
  if (!ctx) throw new Error('AccordionTrigger/AccordionContent must be inside <AccordionItem>');
  return ctx;
};

type AccordionItemProps = React.PropsWithChildren<
  ViewProps & { value: string; className?: string }
>;

export const AccordionItem = ({ value, className, children, ...props }: AccordionItemProps) => {
  return (
    <ItemCtx.Provider value={{ value }}>
      <View className={cn('border-b border-slate-200 dark:border-slate-800', className)} {...props}>
        {children}
      </View>
    </ItemCtx.Provider>
  );
};

type AccordionTriggerProps = React.PropsWithChildren<
  PressableProps & { className?: string; chevronColor?: string; chevronSize?: number }
>;

export const AccordionTrigger = ({
  className,
  children,
  chevronColor = '#0f172a',
  chevronSize = 16,
  ...props
}: AccordionTriggerProps) => {
  const { isOpen, toggle } = useAccordion();
  const { value } = useItem();
  const open = isOpen(value);

  return (
    <View className="flex flex-row">
      <Pressable
        onPress={() => toggle(value)}
        className={cn(
          'flex flex-1 flex-row items-center justify-between py-4',
          // hover:underline и сложные [&[data-state=open]>svg] — веб-специфика, обходимся без них
          className
        )}
        {...props}
      >
        {/* Если children — текст, оборачиваем в Text; иначе оставляем как есть */}
        {typeof children === 'string' ? (
          <Text className="font-medium text-slate-900 dark:text-slate-100">{children}</Text>
        ) : (
          children
        )}
        <ChevronDown
          size={chevronSize}
          color={chevronColor}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>
    </View>
  );
};

type AccordionContentProps = React.PropsWithChildren<ViewProps & { className?: string }>;

export const AccordionContent = ({ className, children, ...props }: AccordionContentProps) => {
  const { isOpen } = useAccordion();
  const { value } = useItem();
  const open = isOpen(value);

  if (!open) return null; // Простая версия без анимации. При желании добавим Animated.

  return (
    <View
      className={cn('pt-0 pb-4', className)}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className="text-sm text-slate-600 dark:text-slate-300">{children}</Text>
      ) : (
        children
      )}
    </View>
  );
};