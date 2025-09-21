// DropdownMenu.tsx — React Native + NativeWind версия выпадающего меню (аналог Radix)
// Зависимости: npm i lucide-react-native react-native-svg

import React, {
  Fragment,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
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
const cn = (...args: Array<string | undefined | null | false>) => args.filter(Boolean).join(' ');

type Rect = { x: number; y: number; w: number; h: number };

// ================= Root =================
type RootCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  anchor: Rect | null;
  setAnchor: (r: Rect | null) => void;
  closeOnSelect: boolean;
};
const RootContext = createContext<RootCtx | null>(null);
const useRoot = () => {
  const v = useContext(RootContext);
  if (!v) throw new Error('DropdownMenu components must be used within <DropdownMenu>');
  return v;
};

export type DropdownMenuProps = WithClassName & {
  open?: boolean;              // controlled
  defaultOpen?: boolean;       // uncontrolled
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  closeOnSelect?: boolean;     // default: true
};

const DropdownMenu = ({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
  closeOnSelect = true,
}: DropdownMenuProps) => {
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const valueOpen = controlled ? !!open : internalOpen;

  const setOpen = useCallback((v: boolean) => {
    if (!controlled) setInternalOpen(v);
    onOpenChange?.(v);
    if (!v) setAnchor(null);
  }, [controlled, onOpenChange]);

  const ctx = useMemo(() => ({ open: valueOpen, setOpen, anchor, setAnchor, closeOnSelect }), [valueOpen, setOpen, anchor, closeOnSelect]);

  return <RootContext.Provider value={ctx}>{children}</RootContext.Provider>;
};

// ================= Trigger =================
export type DropdownMenuTriggerProps = PressableProps & WithClassName;

const DropdownMenuTrigger = forwardRef<React.ElementRef<typeof Pressable>, DropdownMenuTriggerProps>(
  ({ className, onPress, ...rest }, ref) => {
    const { setOpen, setAnchor, open } = useRoot();
    const innerRef = useRef<any>(null);

    const setRefs = (node: any) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as any).current = node;
    };

    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      try {
        innerRef.current?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
          setAnchor({ x, y, w, h });
          setOpen(true);
        });
      } catch {
        const { pageX, pageY } = (e as any).nativeEvent || {};
        setAnchor({ x: pageX ?? 0, y: (pageY ?? 0) - 4, w: 0, h: 0 });
        setOpen(true);
      }
    };

    return (
      <Pressable
        ref={setRefs}
        onPress={handlePress}
        {...({ className, dataSet: { state: open ? 'open' : 'closed' } } as any)}
        {...rest}
      />
    );
  }
);

// ================= Content =================
type SurfaceCtx = { containerOffset: { left: number; top: number } };
const SurfaceContext = createContext<SurfaceCtx | null>(null);
const useSurface = () => useContext(SurfaceContext);

export type DropdownMenuContentProps = ViewProps & WithClassName & {
  side?: 'bottom' | 'top' | 'left' | 'right'; // default bottom
  sideOffset?: number;                         // default 6
  align?: 'start' | 'center' | 'end';          // default start
  minWidth?: number;                           // default 128
  closeOnOverlayPress?: boolean;               // default true
};

const DropdownMenuContent = forwardRef<React.ElementRef<typeof View>, DropdownMenuContentProps>(
  ({ className, style, side = 'bottom', sideOffset = 6, align = 'start', minWidth = 128, closeOnOverlayPress = true, children, ...rest }, ref) => {
    const { open, setOpen, anchor } = useRoot();
    const [size, setSize] = useState<{ w: number; h: number }>({ w: minWidth, h: 1 });

    const onLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setSize({ w: Math.max(width, minWidth), h: height });
    };

    const close = () => setOpen(false);

    const screen = Dimensions.get('window');

    // Позиционирование относительно anchor
    const calcLeftTop = () => {
      if (!anchor) return { left: 0, top: 0 };
      let left = anchor.x;
      let top = anchor.y + anchor.h + sideOffset;
      if (side === 'top') top = anchor.y - size.h - sideOffset;
      if (side === 'left') { left = anchor.x - size.w - sideOffset; top = anchor.y; }
      if (side === 'right') { left = anchor.x + anchor.w + sideOffset; top = anchor.y; }

      if (align === 'center') left = anchor.x + Math.max(0, anchor.w / 2 - size.w / 2);
      if (align === 'end') left = Math.max(0, anchor.x + anchor.w - size.w);

      // кламп к экрану
      left = Math.min(Math.max(8, left), screen.width - size.w - 8);
      top = Math.min(Math.max(8, top), screen.height - size.h - 8);
      return { left, top };
    };

    const { left, top } = calcLeftTop();

    if (!open || !anchor) return null;

    return (
      <Modal transparent visible={open} onRequestClose={close} animationType="fade">
        {/* Overlay */}
        <Pressable
          onPress={closeOnOverlayPress ? close : undefined}
          {...({ className: 'flex-1 bg-black/30' } as any)}
        >
          {/* Полотно, чтобы абсолюты были от экрана */}
          <View
            {...({ className: 'absolute left-0 top-0 right-0 bottom-0' } as any)}
            pointerEvents="box-none"
          >
            <SurfaceContext.Provider value={{ containerOffset: { left, top } }}>
              <View
                ref={ref}
                onLayout={onLayout}
                style={[{ position: 'absolute', left, top, minWidth }, style]}
                {...({
                  className: cn(
                    'rounded-md border bg-popover p-1 shadow-md',
                    className
                  ),
                  dataSet: { state: open ? 'open' : 'closed' },
                } as any)}
                {...rest}
              >
                {children}
              </View>
            </SurfaceContext.Provider>
          </View>
        </Pressable>
      </Modal>
    );
  }
);

// ================= Group =================
const DropdownMenuGroup = ({ className, ...rest }: ViewProps & WithClassName) => (
  <View {...({ className } as any)} {...rest} />
);

// ================= Item =================
export type DropdownMenuItemProps = PressableProps & WithClassName & { inset?: boolean };

const DropdownMenuItem = forwardRef<React.ElementRef<typeof Pressable>, DropdownMenuItemProps>(
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
export type DropdownMenuCheckboxItemProps = PressableProps & WithClassName & {
  checked?: boolean;              // controlled
  defaultChecked?: boolean;       // uncontrolled
  onCheckedChange?: (v: boolean) => void;
};

const DropdownMenuCheckboxItem = forwardRef<React.ElementRef<typeof Pressable>, DropdownMenuCheckboxItemProps>(
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
  if (!v) throw new Error('DropdownMenuRadioItem must be used within DropdownMenuRadioGroup');
  return v;
};

export type DropdownMenuRadioGroupProps = ViewProps & WithClassName & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
};

const DropdownMenuRadioGroup = ({
  className,
  style,
  value,
  defaultValue,
  onValueChange,
  children,
  ...rest
}: DropdownMenuRadioGroupProps) => {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState<string | undefined>(defaultValue);
  const val = controlled ? value : internal;

  const setValue = useCallback((v: string) => {
    if (!controlled) setInternal(v);
    onValueChange?.(v);
  }, [controlled, onValueChange]);

  return (
    <RadioContext.Provider value={{ value: val, setValue }}>
      <View {...({ className } as any)} style={style} {...rest}>
        {children}
      </View>
    </RadioContext.Provider>
  );
};

export type DropdownMenuRadioItemProps = PressableProps & WithClassName & {
  value: string;
};

const DropdownMenuRadioItem = forwardRef<React.ElementRef<typeof Pressable>, DropdownMenuRadioItemProps>(
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

// ================= Label / Separator / Shortcut =================
export type DropdownMenuLabelProps = ViewProps & WithClassName & { inset?: boolean };
const DropdownMenuLabel = forwardRef<React.ElementRef<typeof View>, DropdownMenuLabelProps>(
  ({ className, inset, children, ...rest }, ref) => (
    <View
      ref={ref}
      {...({ className: cn('px-2 py-1.5', inset ? 'pl-8' : '', className) } as any)}
      {...rest}
    >
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-sm font-semibold' } as any)}>{children}</Text>
      ) : children}
    </View>
  )
);

const DropdownMenuSeparator = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, ...rest }, ref) => (
    <View
      ref={ref}
      {...({ className: cn('-mx-1 my-1 h-px bg-muted', className) } as any)}
      {...rest}
    />
  )
);

const DropdownMenuShortcut = ({ className, children, ...rest }: ViewProps & WithClassName) => (
  <View {...({ className: cn('ml-auto', className) } as any)} {...rest}>
    {typeof children === 'string' ? (
      <Text {...({ className: 'text-xs tracking-widest opacity-60' } as any)}>{children}</Text>
    ) : children}
  </View>
);

// ================= Submenu =================
type SubCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  anchor: Rect | null;
  setAnchor: (r: Rect | null) => void;
};
const SubContext = createContext<SubCtx | null>(null);
const useSub = () => {
  const v = useContext(SubContext);
  if (!v) throw new Error('Sub components must be used within <DropdownMenuSub>');
  return v;
};

const DropdownMenuSub = ({ children }: { children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const value = useMemo(() => ({ open, setOpen, anchor, setAnchor }), [open, anchor]);
  return <SubContext.Provider value={value}>{children}</SubContext.Provider>;
};

export type DropdownMenuSubTriggerProps = PressableProps & WithClassName & { inset?: boolean };
const DropdownMenuSubTrigger = forwardRef<React.ElementRef<typeof Pressable>, DropdownMenuSubTriggerProps>(
  ({ className, inset, onPress, disabled, children, ...rest }, ref) => {
    const { open, setOpen, setAnchor } = useSub();
    const innerRef = useRef<any>(null);

    const setRefs = (node: any) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as any).current = node;
    };

    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      if (disabled) return;
      try {
        innerRef.current?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
          setAnchor({ x, y, w, h });
          setOpen(true);
        });
      } catch {
        const { pageX, pageY } = (e as any).nativeEvent || {};
        setAnchor({ x: pageX ?? 0, y: pageY ?? 0, w: 0, h: 0 });
        setOpen(true);
      }
    };

    return (
      <Pressable
        ref={setRefs}
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

export type DropdownMenuSubContentProps = ViewProps & WithClassName & {
  minWidth?: number;
  sideOffset?: number; // default 6
};
const DropdownMenuSubContent = forwardRef<React.ElementRef<typeof View>, DropdownMenuSubContentProps>(
  ({ className, style, minWidth = 128, sideOffset = 6, children, ...rest }, ref) => {
    const { open, setOpen, anchor } = useSub();
    const surface = useSurface();
    const screen = Dimensions.get('window');
    const [size, setSize] = useState({ w: minWidth, h: 1 });
    useEffect(() => { if (!open) setOpen(false); }, [open, setOpen]);

    if (!open || !anchor || !surface) return null;

    const onLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setSize({ w: Math.max(width, minWidth), h: height });
    };

    // Абсолютные координаты относительно экрана
    const absLeft = (() => {
      const right = anchor.x + anchor.w + sideOffset;
      const fitsRight = right + size.w + 8 <= screen.width;
      return fitsRight ? right : Math.max(8, anchor.x - size.w - sideOffset);
    })();
    const absTop = Math.min(Math.max(8, anchor.y), screen.height - size.h - 8);

    // Переводим к координатам контейнера (см. SurfaceContext)
    const relLeft = absLeft - surface.containerOffset.left;
    const relTop = absTop - surface.containerOffset.top;

    return (
      <View
        ref={ref}
        onLayout={onLayout}
        style={[{ position: 'absolute', left: relLeft, top: relTop, minWidth, zIndex: 1000 }, style]}
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

// ================= Portal (no-op для совместимости API) =================
const DropdownMenuPortal = ({ children }: { children?: React.ReactNode }) => <Fragment>{children}</Fragment>;

// ================= Exports =================
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};