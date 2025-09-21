// Command.tsx — React Native + NativeWind версия командной палитры (без cmdk/radix)
// Установка иконок: npm i lucide-react-native react-native-svg

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import {
  Modal,
  Pressable,
  type PressableProps,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Search as SearchIcon } from 'lucide-react-native';

// Быстрая утилита объединения классов
const cn = (...args: Array<string | undefined | false | null>) =>
  args.filter(Boolean).join(' ');

// ----- Контекст корня -----
type CommandCtxValue = {
  query: string;
  setQuery: (v: string) => void;
  reportItem: (id: string, visible: boolean) => void;
  unregisterItem: (id: string) => void;
  visibleCount: number;
};
const CommandCtx = createContext<CommandCtxValue | null>(null);
const useCommand = () => {
  const ctx = useContext(CommandCtx);
  if (!ctx) throw new Error('Command.* must be used within <Command>');
  return ctx;
};

type WithClassName = { className?: string };

export type CommandProps = ViewProps & WithClassName & {
  defaultQuery?: string;
};

const Command = forwardRef<React.ElementRef<typeof View>, CommandProps>(
  ({ className, style, defaultQuery = '', children, ...rest }, ref) => {
    const [query, setQuery] = useState(defaultQuery);
    const itemsRef = useRef<Map<string, boolean>>(new Map());

    const [tick, setTick] = useState(0);
    const reportItem = useCallback((id: string, visible: boolean) => {
      const map = itemsRef.current;
      const prev = map.get(id);
      if (prev === visible) return;
      const next = new Map(map);
      next.set(id, visible);
      itemsRef.current = next;
      setTick(t => t + 1);
    }, []);

    const unregisterItem = useCallback((id: string) => {
      const map = itemsRef.current;
      if (!map.has(id)) return;
      const next = new Map(map);
      next.delete(id);
      itemsRef.current = next;
      setTick(t => t + 1);
    }, []);

    const visibleCount = useMemo(
      () => Array.from(itemsRef.current.values()).filter(Boolean).length,
      [tick]
    );

    const value: CommandCtxValue = {
      query,
      setQuery,
      reportItem,
      unregisterItem,
      visibleCount,
    };

    return (
      <CommandCtx.Provider value={value}>
        <View
          ref={ref}
          style={style}
          {...({ className: cn('flex-1 w-full rounded-md bg-popover', className) } as any)}
          {...rest}
        >
          {children}
        </View>
      </CommandCtx.Provider>
    );
  }
);
Command.displayName = 'Command';

// ----- Диалог -----
export type CommandDialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  overlayClassName?: string;
  contentClassName?: string;
};

const CommandDialog = ({
  open,
  onOpenChange,
  children,
  overlayClassName,
  contentClassName,
}: CommandDialogProps) => {
  const close = useCallback(() => onOpenChange?.(false), [onOpenChange]);

  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1 }}
      >
        <Pressable
          onPress={close}
          {...({ className: cn('flex-1 bg-black/50', overlayClassName) } as any)}
        >
          <Pressable
            onPress={() => {}}
            {...({
              className: cn(
                'mx-4 mt-24 rounded-xl border border-border bg-popover shadow-xl',
                'overflow-hidden',
                contentClassName
              ),
            } as any)}
          >
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ----- Input -----
export type CommandInputProps = TextInputProps & WithClassName;
const CommandInput = forwardRef<React.ElementRef<typeof TextInput>, CommandInputProps>(
  ({ className, style, onChangeText, value, placeholder = 'Search…', ...rest }, ref) => {
    const { query, setQuery } = useCommand();
    const controlled = value !== undefined;

    const handleChange = (text: string) => {
      onChangeText?.(text);
      setQuery(text);
    };

    return (
      <View
        {...({ className: 'flex-row items-center border-b px-3' } as any)}
        style={style}
      >
        <SearchIcon size={18} color="rgba(0,0,0,0.5)" {...({ className: 'mr-2 opacity-50' } as any)} />
        <TextInput
          ref={ref}
          value={controlled ? value : query}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor="rgba(0,0,0,0.4)"
          {...({
            className: cn(
              'h-11 flex-1 rounded-md bg-transparent py-3 text-sm',
              'text-foreground',
              className
            ),
          } as any)}
          {...rest}
        />
      </View>
    );
  }
);
CommandInput.displayName = 'CommandInput';

// ----- List -----
export type CommandListProps = ViewProps & WithClassName & {
  scrollProps?: React.ComponentProps<typeof ScrollView>;
};
const CommandList = forwardRef<React.ElementRef<typeof View>, CommandListProps>(
  ({ className, style, children, scrollProps, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        style={style}
        {...({ className: cn('max-h-80 overflow-hidden', className) } as any)}
        {...rest}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          {...scrollProps}
          {...({ className: 'overflow-hidden' } as any)}
        >
          {children}
        </ScrollView>
      </View>
    );
  }
);
CommandList.displayName = 'CommandList';

// ----- Empty -----
export type CommandEmptyProps = ViewProps & WithClassName & {
  textClassName?: string;
};
const CommandEmpty = forwardRef<React.ElementRef<typeof View>, CommandEmptyProps>(
  ({ className, textClassName, style, children, ...rest }, ref) => {
    const { visibleCount } = useCommand();
    if (visibleCount > 0) return null;

    const content =
      typeof children === 'string' ? (
        <Text {...({ className: cn('text-center text-sm text-muted-foreground', textClassName) } as any)}>
          {children}
        </Text>
      ) : (
        children
      );

    return (
      <View
        ref={ref}
        style={style}
        {...({ className: cn('py-6', className) } as any)}
        {...rest}
      >
        {content}
      </View>
    );
  }
);
CommandEmpty.displayName = 'CommandEmpty';

// ----- Group -----
export type CommandGroupProps = ViewProps & WithClassName & {
  heading?: string;
  headingClassName?: string;
};
const CommandGroup = forwardRef<React.ElementRef<typeof View>, CommandGroupProps>(
  ({ className, heading, headingClassName, style, children, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        style={style}
        {...({ className: cn('overflow-hidden p-1', className) } as any)}
        {...rest}
      >
        {heading ? (
          <Text
            {...({
              className: cn(
                'px-2 py-1.5 text-xs font-medium text-muted-foreground',
                headingClassName
              ),
            } as any)}
          >
            {heading}
          </Text>
        ) : null}
        {children}
      </View>
    );
  }
);
CommandGroup.displayName = 'CommandGroup';

// ----- Separator -----
export type CommandSeparatorProps = ViewProps & WithClassName;
const CommandSeparator = forwardRef<React.ElementRef<typeof View>, CommandSeparatorProps>(
  ({ className, style, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        style={style}
        {...({ className: cn('-mx-1 h-px bg-border', className) } as any)}
        {...rest}
      />
    );
  }
);
CommandSeparator.displayName = 'CommandSeparator';

// ----- Item -----
export type CommandItemProps = PressableProps & WithClassName & {
  value: string;                 // уникальный id/метка для поиска
  keywords?: string[];           // дополнительные ключевые слова
  disabled?: boolean;
  onSelect?: (value: string) => void;
};

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize?.('NFKD')
    .replace(/[\u0300-\u036f]/g, '') || (s || '').toLowerCase();

const CommandItem = forwardRef<React.ElementRef<typeof Pressable>, CommandItemProps>(
  ({ className, value, keywords = [], disabled, onPress, onSelect, style, children, ...rest }, ref) => {
    const { query, reportItem, unregisterItem } = useCommand();
    const id = value;
    const q = normalize(query.trim());
    const hay = normalize([value, ...keywords].join(' '));
    const isVisible = q.length === 0 || hay.includes(q);

    useEffect(() => {
      reportItem(id, isVisible && !disabled);
      return () => unregisterItem(id);
    }, [id, isVisible, disabled, reportItem, unregisterItem]);

    const handlePress: PressableProps['onPress'] = (e) => {
      if (disabled) return;
      onPress?.(e);
      onSelect?.(value);
    };

    const combinedStyle = [{ display: isVisible ? 'flex' : 'none' }, style];

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        style={combinedStyle}
        {...({
          className: cn(
            'relative flex-row items-center rounded-sm px-2 py-2',
            'active:opacity-80',
            "data-[disabled=true]:opacity-50",
            className
          ),
          dataSet: { disabled: disabled ? 'true' : 'false', selected: 'false' },
          android_ripple: { color: 'rgba(0,0,0,0.06)' },
        } as any)}
        {...rest}
      >
        {typeof children === 'string' ? (
          <Text {...({ className: 'text-sm text-foreground' } as any)}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }
);
CommandItem.displayName = 'CommandItem';

// ----- Shortcut -----
export type CommandShortcutProps = ViewProps & WithClassName;
const CommandShortcut = ({ className, children, ...rest }: CommandShortcutProps) => {
  return (
    <View
      {...({ className: cn('ml-auto', className) } as any)}
      {...rest}
    >
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-xs tracking-widest text-muted-foreground' } as any)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
};
(CommandShortcut as any).displayName = 'CommandShortcut';

// ----- Экспорты -----
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};