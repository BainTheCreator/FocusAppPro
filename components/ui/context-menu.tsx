// ContextMenu.tsx — React Native + NativeWind версия контекстного меню
import React, {
  Fragment,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  type PressableProps,
  Text,
  View,
  type ViewProps,
  type LayoutChangeEvent,
} from 'react-native';
import { Check, ChevronRight, Circle } from 'lucide-react-native';

type WithClassName = { className?: string };

// простая утилита
const cn = (...args: Array<string | undefined | null | false>) =>
  args.filter(Boolean).join(' ');

// ================= Root Context =================
type Point = { x: number; y: number };

type RootCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  openAt: (p: Point) => void;
  anchor: Point | null;
  closeOnSelect: boolean;
};
const RootContext = createContext<RootCtx | null>(null);
const useRoot = () => {
  const v = useContext(RootContext);
  if (!v) throw new Error('ContextMenu components must be used within <ContextMenu>');
  return v;
};

export type ContextMenuProps = WithClassName & {
  open?: boolean;                // controlled
  defaultOpen?: boolean;         // uncontrolled
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  closeOnSelect?: boolean;       // default true
};

const ContextMenu = ({ open, defaultOpen = false, onOpenChange, children, closeOnSelect = true }: ContextMenuProps) => {
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [anchor, setAnchor] = useState<Point | null>(null);
  const valueOpen = controlled ? !!open : internalOpen;

  const setOpen = useCallback((v: boolean) => {
    if (!controlled) setInternalOpen(v);
    onOpenChange?.(v);
    if (!v) setAnchor(null);
  }, [controlled, onOpenChange]);

  const openAt = useCallback((p: Point) => {
    setAnchor(p);
    setOpen(true);
  }, [setOpen]);

  const ctx: RootCtx = useMemo(() => ({ open: valueOpen, setOpen, openAt, anchor, closeOnSelect }), [valueOpen, setOpen, openAt, anchor, closeOnSelect]);

  return (
    <RootContext.Provider value={ctx}>
      {children}
    </RootContext.Provider>
  );
};

// ================= Trigger =================
export type ContextMenuTriggerProps = PressableProps & WithClassName;

const ContextMenuTrigger = forwardRef<React.ElementRef<typeof Pressable>, ContextMenuTriggerProps>(
  ({ className, onLongPress, delayLongPress = 250, ...rest }, ref) => {
    const { open, openAt } = useRoot();

    const handleLongPress: PressableProps['onLongPress'] = (e) => {
      onLongPress?.(e);
      const { pageX, pageY } = e.nativeEvent;
      openAt({ x: pageX, y: pageY });
    };

    return (
      <Pressable
        ref={ref}
        onLongPress={handleLongPress}
        delayLongPress={delayLongPress}
        {...({ className, dataSet: { state: open ? 'open' : 'closed' } } as any)}
        {...rest}
      />
    );
  }
);

// ================= Content/Portal =================
export type ContextMenuContentProps = ViewProps & WithClassName & {
  inset?: boolean;
  minWidth?: number;     // default 128
  offset?: number;       // default 6
  onRequestClose?: () => void;
};

const ContextMenuContent = forwardRef<React.ElementRef<typeof View>, ContextMenuContentProps>(
  ({ className, style, minWidth = 128, offset = 6, onRequestClose, children, ...rest }, ref) => {
    const { open, setOpen, anchor } = useRoot();
    const [size, setSize] = useState<{ w: number; h: number }>({ w: minWidth, h: 1 });

    const onLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setSize({ w: Math.max(width, minWidth), h: height });
    };

    const close = useCallback(() => {
      onRequestClose?.();
      setOpen(false);
    }, [onRequestClose, setOpen]);

    const screen = Dimensions.get('window');
    const left = anchor ? Math.min(Math.max(8, anchor.x + offset), screen.width - size.w - 8) : 0;
    const top = anchor ? Math.min(Math.max(8, anchor.y + offset), screen.height - size.h - 8) : 0;

    return (
      <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
        <Pressable
          onPress={close}
          {...({ className: 'flex-1 bg-black/30' } as any)}
        >
          <View
            ref={ref}
            onLayout={onLayout}
            style={[{ position: 'absolute', left, top, minWidth }, style]}
            {...({
              className: cn(
                'rounded-md border bg-popover p-1 shadow-md',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                className
              ),
              dataSet: { state: open ? 'open' : 'closed' },
            } as any)}
            {...rest}
          >
            {children}
          </View>
        </Pressable>
      </Modal>
    );
  }
);

// For compatibility (no-op in RN, content already portals via Modal)
const ContextMenuPortal = ({ children }: { children?: React.ReactNode }) => <Fragment>{children}</Fragment>;

// ================= Item =================
export type ContextMenuItemProps = PressableProps & WithClassName & { inset?: boolean };

const ContextMenuItem = forwardRef<React.ElementRef<typeof Pressable>, ContextMenuItemProps>(
  ({ className, inset, onPress, disabled, ...rest }, ref) => {
    const { closeOnSelect, setOpen } = useRoot();

    const handlePress: PressableProps['onPress'] = (e) => {
      if (disabled) return;
      onPress?.(e);
      if (closeOnSelect) setOpen(false);
    };

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
        {...({
          className: cn(
            'relative flex-row items-center rounded-sm px-2 py-1.5 text-sm',
            'active:opacity-80',
            'data-[disabled=true]:opacity-50',
            inset ? 'pl-8' : '',
            className
          ),
          dataSet: { disabled: disabled ? 'true' : 'false' },
        } as any)}
        {...rest}
      />
    );
  }
);

// ================= Checkbox Item =================
export type ContextMenuCheckboxItemProps = PressableProps & WithClassName & {
  checked?: boolean;              // controlled
  defaultChecked?: boolean;       // uncontrolled
  onCheckedChange?: (v: boolean) => void;
};

const ContextMenuCheckboxItem = forwardRef<React.ElementRef<typeof Pressable>, ContextMenuCheckboxItemProps>(
  ({ className, checked, defaultChecked = false, onCheckedChange, onPress, disabled, children, ...rest }, ref) => {
    const controlled = checked !== undefined;
    const [internal, setInternal] = useState(defaultChecked);
    const value = controlled ? !!checked : internal;
    const { closeOnSelect, setOpen } = useRoot();

    const toggle = () => {
      const next = !value;
      if (!controlled) setInternal(next);
      onCheckedChange?.(next);
    };

    const handlePress: PressableProps['onPress'] = (e) => {
      if (disabled) return;
      onPress?.(e);
      toggle();
      if (closeOnSelect) setOpen(false);
    };

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
        {...({
          className: cn(
            'relative flex-row items-center rounded-sm py-1.5 pl-8 pr-2 text-sm',
            'active:opacity-80',
            'data-[disabled=true]:opacity-50',
            className
          ),
          dataSet: { disabled: disabled ? 'true' : 'false', checked: value ? 'true' : 'false' },
        } as any)}
        {...rest}
      >
        <View {...({ className: 'absolute left-2 h-3.5 w-3.5 items-center justify-center' } as any)}>
          {value ? <Check size={16} /> : null}
        </View>
        {typeof children === 'string' ? <Text {...({ className: 'text-sm text-foreground' } as any)}>{children}</Text> : children}
      </Pressable>
    );
  }
);

// ================= Radio Group / Item =================
type RadioCtx = {
  value: string | undefined;
  setValue: (v: string) => void;
};
const RadioContext = createContext<RadioCtx | null>(null);
const useRadio = () => {
  const v = useContext(RadioContext);
  if (!v) throw new Error('ContextMenuRadioItem must be used within ContextMenuRadioGroup');
  return v;
};

export type ContextMenuRadioGroupProps = WithClassName & ViewProps & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
};

const ContextMenuRadioGroup = ({ className, style, value, defaultValue, onValueChange, children, ...rest }: ContextMenuRadioGroupProps) => {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState<string | undefined>(defaultValue);
  const val = controlled ? value : internal;

  const setValue = useCallback((v: string) => {
    if (!controlled) setInternal(v);
    onValueChange?.(v);
  }, [controlled, onValueChange]);

  return (
    <RadioContext.Provider value={{ value: val, setValue }}>
      <View {...({ className, } as any)} style={style} {...rest}>
        {children}
      </View>
    </RadioContext.Provider>
  );
};

export type ContextMenuRadioItemProps = PressableProps & WithClassName & {
  value: string;
};

const ContextMenuRadioItem = forwardRef<React.ElementRef<typeof Pressable>, ContextMenuRadioItemProps>(
  ({ className, value, onPress, disabled, children, ...rest }, ref) => {
    const { value: current, setValue } = useRadio();
    const { closeOnSelect, setOpen } = useRoot();
    const checked = current === value;

    const handlePress: PressableProps['onPress'] = (e) => {
      if (disabled) return;
      onPress?.(e);
      setValue(value);
      if (closeOnSelect) setOpen(false);
    };

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
        {...({
          className: cn(
            'relative flex-row items-center rounded-sm py-1.5 pl-8 pr-2 text-sm',
            'active:opacity-80',
            'data-[disabled=true]:opacity-50',
            className
          ),
          dataSet: { disabled: disabled ? 'true' : 'false', checked: checked ? 'true' : 'false' },
        } as any)}
        {...rest}
      >
        <View {...({ className: 'absolute left-2 h-3.5 w-3.5 items-center justify-center' } as any)}>
          {checked ? <Circle size={10} {...({ className: 'text-foreground' } as any)} /> : null}
        </View>
        {typeof children === 'string' ? <Text {...({ className: 'text-sm text-foreground' } as any)}>{children}</Text> : children}
      </Pressable>
    );
  }
);

// ================= Label / Group / Separator / Shortcut =================
export type ContextMenuLabelProps = ViewProps & WithClassName & { inset?: boolean };
const ContextMenuLabel = forwardRef<React.ElementRef<typeof View>, ContextMenuLabelProps>(
  ({ className, inset, children, ...rest }, ref) => (
    <View
      ref={ref}
      {...({
        className: cn('px-2 py-1.5', inset ? 'pl-8' : '', className)
      } as any)}
      {...rest}
    >
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-sm font-semibold text-foreground' } as any)}>{children}</Text>
      ) : children}
    </View>
  )
);

const ContextMenuGroup = ({ className, ...rest }: ViewProps & WithClassName) => (
  <View {...({ className, } as any)} {...rest} />
);

const ContextMenuSeparator = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, ...rest }, ref) => (
    <View
      ref={ref}
      {...({ className: cn('-mx-1 my-1 h-px bg-border', className) } as any)}
      {...rest}
    />
  )
);

const ContextMenuShortcut = ({ className, children, ...rest }: ViewProps & WithClassName) => (
  <View {...({ className: cn('ml-auto', className) } as any)} {...rest}>
    {typeof children === 'string' ? (
      <Text {...({ className: 'text-xs tracking-widest text-muted-foreground' } as any)}>{children}</Text>
    ) : children}
  </View>
);

// ================= Submenu =================
type SubCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  anchor: { x: number; y: number; h: number; w: number } | null;
  setAnchor: (a: { x: number; y: number; h: number; w: number } | null) => void;
};
const SubContext = createContext<SubCtx | null>(null);
const useSub = () => {
  const v = useContext(SubContext);
  if (!v) throw new Error('Sub components must be used within <ContextMenuSub>');
  return v;
};

const ContextMenuSub = ({ children }: { children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<SubCtx['anchor']>(null);
  const value = useMemo(() => ({ open, setOpen, anchor, setAnchor }), [open, anchor]);
  return <SubContext.Provider value={value}>{children}</SubContext.Provider>;
};

export type ContextMenuSubTriggerProps = PressableProps & WithClassName & { inset?: boolean };
const ContextMenuSubTrigger = forwardRef<React.ElementRef<typeof Pressable>, ContextMenuSubTriggerProps>(
  ({ className, inset, onPress, disabled, children, ...rest }, ref) => {
    const { open, setOpen, setAnchor } = useSub();

    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      if (disabled) return;
      const target = (ref as any)?.current ?? (e.target as any);
      // Пытаемся замерить позицию элемента
      try {
        target?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
          setAnchor({ x, y, w, h });
          setOpen(true);
        });
      } catch {
        setOpen(true);
      }
    };

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
        {...({
          className: cn(
            'relative flex-row items-center rounded-sm px-2 py-1.5 text-sm',
            'active:opacity-80',
            inset ? 'pl-8' : '',
            className
          ),
          dataSet: { state: open ? 'open' : 'closed' },
        } as any)}
        {...rest}
      >
        {children}
        <ChevronRight size={16} {...({ className: 'ml-auto' } as any)} />
      </Pressable>
    );
  }
);

export type ContextMenuSubContentProps = ViewProps & WithClassName & {
  minWidth?: number;
  offset?: number;   // отступ от SubTrigger
};
const ContextMenuSubContent = forwardRef<React.ElementRef<typeof View>, ContextMenuSubContentProps>(
  ({ className, style, minWidth = 128, offset = 4, children, ...rest }, ref) => {
    const { open, setOpen, anchor } = useSub();
    const screen = Dimensions.get('window');

    // Позиционируем рядом с SubTrigger
    const [size, setSize] = useState({ w: minWidth, h: 1 });
    const onLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setSize({ w: Math.max(width, minWidth), h: height });
    };

    const left = (() => {
      if (!anchor) return 0;
      const right = anchor.x + anchor.w + offset;
      const fitsRight = right + size.w + 8 <= screen.width;
      return fitsRight ? right : Math.max(8, anchor.x - size.w - offset);
    })();

    const top = (() => {
      if (!anchor) return 0;
      const t = anchor.y;
      const maxTop = screen.height - size.h - 8;
      return Math.min(Math.max(8, t), maxTop);
    })();

    if (!open) return null;

    return (
      <View
        ref={ref}
        onLayout={onLayout}
        style={[{ position: 'absolute', left, top, minWidth, zIndex: 1000 }, style]}
        {...({
          className: cn('rounded-md border bg-popover p-1 shadow-md', className),
          dataSet: { state: open ? 'open' : 'closed' },
        } as any)}
        {...rest}
      >
        {children}
      </View>
    );
  }
);

// ================= Exports =================
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};