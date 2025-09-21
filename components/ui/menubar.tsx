// Menubar.tsx — React Native + NativeWind адаптация Radix Menubar
// Зависимости иконок: npm i lucide-react-native react-native-svg

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
const cn = (...args: Array<string | undefined | null | false>) => args.filter(Boolean).join(' ');

type Rect = { x: number; y: number; w: number; h: number };

// ================= Root Menubar =================
export type MenubarProps = ViewProps & WithClassName;

const Menubar = forwardRef<React.ElementRef<typeof View>, MenubarProps>(
  ({ className, style, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        style={style}
        {...({
          className: cn(
            'flex-row h-10 items-center rounded-md border bg-background p-1',
            className
          ),
        } as any)}
        {...rest}
      />
    );
  }
);
Menubar.displayName = 'Menubar';

// ================= Menu (single dropdown context) =================
type MenuCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  anchor: Rect | null;
  setAnchor: (r: Rect | null) => void;
  closeOnSelect: boolean;
};
const MenuContext = createContext<MenuCtx | null>(null);
const useMenu = () => {
  const v = useContext(MenuContext);
  if (!v) throw new Error('Menubar components must be used within <MenubarMenu>');
  return v;
};

export type MenubarMenuProps = {
  open?: boolean;                // controlled
  defaultOpen?: boolean;         // uncontrolled
  onOpenChange?: (open: boolean) => void;
  closeOnSelect?: boolean;       // default: true
  children?: React.ReactNode;
};

const MenubarMenu = ({ open, defaultOpen = false, onOpenChange, closeOnSelect = true, children }: MenubarMenuProps) => {
  const controlled = open !== undefined;
  const [internal, setInternal] = useState(defaultOpen);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const value = controlled ? !!open : internal;

  const setOpen = useCallback((v: boolean) => {
    if (!controlled) setInternal(v);
    onOpenChange?.(v);
    if (!v) setAnchor(null);
  }, [controlled, onOpenChange]);

  const ctx = useMemo(() => ({ open: value, setOpen, anchor, setAnchor, closeOnSelect }), [value, setOpen, anchor, closeOnSelect]);
  return <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>;
};

// ================= Trigger =================
export type MenubarTriggerProps = PressableProps & WithClassName;

const MenubarTrigger = forwardRef<React.ElementRef<typeof Pressable>, MenubarTriggerProps>(
  ({ className, onPress, ...rest }, ref) => {
    const { open, setOpen, setAnchor } = useMenu();
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
        setAnchor({ x: pageX ?? 0, y: (pageY ?? 0) + 8, w: 0, h: 0 });
        setOpen(true);
      }
    };

    return (
      <Pressable
        ref={setRefs}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        {...({
          className: cn(
            'flex-row items-center rounded-sm px-3 py-1.5 text-sm font-medium',
            'active:opacity-80',
            "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
            className
          ),
          dataSet: { state: open ? 'open' : 'closed' },
        } as any)}
        {...rest}
      />
    );
  }
);
MenubarTrigger.displayName = 'MenubarTrigger';

// ================= Content (dropdown panel) =================
type SurfaceCtx = { containerOffset: { left: number; top: number } };
const SurfaceContext = createContext<SurfaceCtx | null>(null);
const useSurface = () => useContext(SurfaceContext);

export type MenubarContentProps = ViewProps & WithClassName & {
  align?: 'start' | 'center' | 'end';   // default 'start'
  alignOffset?: number;                 // default -4
  sideOffset?: number;                  // default 8
  minWidth?: number;                    // default 192 (12rem)
  closeOnOverlayPress?: boolean;        // default true (но фон прозрачный)
};

const MenubarContent = forwardRef<React.ElementRef<typeof View>, MenubarContentProps>(
  (
    {
      className,
      style,
      align = 'start',
      alignOffset = -4,
      sideOffset = 8,
      minWidth = 192,
      closeOnOverlayPress = true,
      children,
      ...rest
    },
    ref
  ) => {
    const { open, setOpen, anchor } = useMenu();
    const [size, setSize] = useState<{ w: number; h: number }>({ w: minWidth, h: 1 });

    const screen = Dimensions.get('window');
    const onLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setSize({ w: Math.max(width, minWidth), h: height });
    };
    const close = () => setOpen(false);

    if (!open || !anchor) return null;

    let left = anchor.x;
    let top = anchor.y + anchor.h + sideOffset;

    if (align === 'center') left = anchor.x + Math.max(0, anchor.w / 2 - size.w / 2) + alignOffset;
    if (align === 'end') left = anchor.x + anchor.w - size.w + alignOffset;
    if (align === 'start') left = anchor.x + alignOffset;

    left = Math.min(Math.max(8, left), screen.width - size.w - 8);
    top = Math.min(Math.max(8, top), screen.height - size.h - 8);

    return (
      <Modal transparent visible={open} onRequestClose={close} animationType="fade">
        {/* Прозрачный клик-аут закрывает меню */}
        <Pressable onPress={closeOnOverlayPress ? close : undefined} {...({ className: 'flex-1' } as any)}>
          <View {...({ className: 'absolute left-0 top-0 right-0 bottom-0' } as any)} pointerEvents="box-none">
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
MenubarContent.displayName = 'MenubarContent';

// ================= Group / Portal =================
const MenubarGroup = ({ className, ...rest }: ViewProps & WithClassName) => (
  <View {...({ className } as any)} {...rest} />
);

const MenubarPortal = ({ children }: { children?: React.ReactNode }) => <Fragment>{children}</Fragment>;

// ================= Item =================
export type MenubarItemProps = PressableProps & WithClassName & { inset?: boolean };

const MenubarItem = forwardRef<React.ElementRef<typeof Pressable>, MenubarItemProps>(
  ({ className, inset, onPress, disabled, ...rest }, ref) => {
    const { closeOnSelect, setOpen } = useMenu();
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
MenubarItem.displayName = 'MenubarItem';

// ================= Checkbox Item =================
export type MenubarCheckboxItemProps = PressableProps & WithClassName & {
  checked?: boolean;              // controlled
  defaultChecked?: boolean;       // uncontrolled
  onCheckedChange?: (v: boolean) => void;
};

const MenubarCheckboxItem = forwardRef<React.ElementRef<typeof Pressable>, MenubarCheckboxItemProps>(
  ({ className, checked, defaultChecked = false, onCheckedChange, onPress, disabled, children, ...rest }, ref) => {
    const controlled = checked !== undefined;
    const [internal, setInternal] = useState(defaultChecked);
    const value = controlled ? !!checked : internal;
    const { closeOnSelect, setOpen } = useMenu();

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
MenubarCheckboxItem.displayName = 'MenubarCheckboxItem';

// ================= Radio Group / Item =================
type RadioCtx = { value: string | undefined; setValue: (v: string) => void };
const RadioContext = createContext<RadioCtx | null>(null);
const useRadio = () => {
  const v = useContext(RadioContext);
  if (!v) throw new Error('MenubarRadioItem must be used within MenubarRadioGroup');
  return v;
};

export type MenubarRadioGroupProps = ViewProps & WithClassName & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
};

const MenubarRadioGroup = ({
  className,
  style,
  value,
  defaultValue,
  onValueChange,
  children,
  ...rest
}: MenubarRadioGroupProps) => {
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

export type MenubarRadioItemProps = PressableProps & WithClassName & { value: string };

const MenubarRadioItem = forwardRef<React.ElementRef<typeof Pressable>, MenubarRadioItemProps>(
  ({ className, value, onPress, disabled, children, ...rest }, ref) => {
    const { value: current, setValue } = useRadio();
    const { closeOnSelect, setOpen } = useMenu();
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
MenubarRadioItem.displayName = 'MenubarRadioItem';

// ================= Label / Separator / Shortcut =================
export type MenubarLabelProps = ViewProps & WithClassName & { inset?: boolean };
const MenubarLabel = forwardRef<React.ElementRef<typeof View>, MenubarLabelProps>(
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
MenubarLabel.displayName = 'MenubarLabel';

const MenubarSeparator = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, ...rest }, ref) => (
    <View
      ref={ref}
      {...({ className: cn('-mx-1 my-1 h-px bg-muted', className) } as any)}
      {...rest}
    />
  )
);
MenubarSeparator.displayName = 'MenubarSeparator';

const MenubarShortcut = ({ className, children, ...rest }: ViewProps & WithClassName) => (
  <View {...({ className: cn('ml-auto', className) } as any)} {...rest}>
    {typeof children === 'string' ? (
      <Text {...({ className: 'text-xs tracking-widest text-muted-foreground' } as any)}>{children}</Text>
    ) : children}
  </View>
);

// ================= Sub (submenu) =================
type SubCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  anchor: Rect | null;
  setAnchor: (r: Rect | null) => void;
};
const SubContext = createContext<SubCtx | null>(null);
const useSub = () => {
  const v = useContext(SubContext);
  if (!v) throw new Error('Sub components must be used within <MenubarSub>');
  return v;
};

const MenubarSub = ({ children }: { children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const value = useMemo(() => ({ open, setOpen, anchor, setAnchor }), [open, anchor]);
  return <SubContext.Provider value={value}>{children}</SubContext.Provider>;
};

export type MenubarSubTriggerProps = PressableProps & WithClassName & { inset?: boolean };
const MenubarSubTrigger = forwardRef<React.ElementRef<typeof Pressable>, MenubarSubTriggerProps>(
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
MenubarSubTrigger.displayName = 'MenubarSubTrigger';

export type MenubarSubContentProps = ViewProps & WithClassName & {
  minWidth?: number;
  sideOffset?: number; // default 8
};
const MenubarSubContent = forwardRef<React.ElementRef<typeof View>, MenubarSubContentProps>(
  ({ className, style, minWidth = 128, sideOffset = 8, children, ...rest }, ref) => {
    const { open, setOpen, anchor } = useSub();
    const surface = useSurface();
    const screen = Dimensions.get('window');
    const [size, setSize] = useState({ w: minWidth, h: 1 });

    if (!open || !anchor || !surface) return null;

    const onLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setSize({ w: Math.max(width, minWidth), h: height });
    };

    const absLeft = (() => {
      const right = anchor.x + anchor.w + sideOffset;
      const fitsRight = right + size.w + 8 <= screen.width;
      return fitsRight ? right : Math.max(8, anchor.x - size.w - sideOffset);
    })();
    const absTop = Math.min(Math.max(8, anchor.y), screen.height - size.h - 8);

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
MenubarSubContent.displayName = 'MenubarSubContent';

// ================= Exports =================
export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
};