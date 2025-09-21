// Select.tsx — React Native + NativeWind адаптация Radix Select
// Зависимости: npm i lucide-react-native react-native-svg

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  type PressableProps,
  ScrollView,
  Text,
  View,
  type ViewProps,
  type LayoutChangeEvent,
  Platform,
} from 'react-native';
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };
type Rect = { x: number; y: number; w: number; h: number };

// ====== Select Root Context ======
type SelectCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  anchor: Rect | null;
  setAnchor: (r: Rect | null) => void;

  value?: string;
  setValue: (v: string) => void;
  onValueChange?: (v: string) => void;

  registerItem: (val: string, label: string) => void;
  unregisterItem: (val: string) => void;
  getLabel: (val?: string) => string | undefined;

  closeOnSelect: boolean;
  disabled?: boolean;
};
const Ctx = createContext<SelectCtx | null>(null);
const useSelect = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('Select.* must be used within <Select>');
  return v;
};

// ====== Select (Root) ======
export type SelectProps = {
  value?: string;                // controlled
  defaultValue?: string;         // uncontrolled
  onValueChange?: (v: string) => void;

  open?: boolean;                // controlled
  defaultOpen?: boolean;         // uncontrolled
  onOpenChange?: (open: boolean) => void;

  closeOnSelect?: boolean;       // default: true
  disabled?: boolean;
  children?: React.ReactNode;
};

const Select = ({
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  closeOnSelect = true,
  disabled,
  children,
}: SelectProps) => {
  const controlledVal = value !== undefined;
  const [internalVal, setInternalVal] = useState<string | undefined>(defaultValue);
  const current = controlledVal ? value : internalVal;

  const controlledOpen = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen ? !!open : internalOpen;

  const [anchor, setAnchor] = useState<Rect | null>(null);
  const itemsRef = useRef<Map<string, string>>(new Map());

  const setValue = useCallback((v: string) => {
    if (!controlledVal) setInternalVal(v);
    onValueChange?.(v);
  }, [controlledVal, onValueChange]);

  const setOpen = useCallback((v: boolean) => {
    if (!controlledOpen) setInternalOpen(v);
    onOpenChange?.(v);
    if (!v) setAnchor(null);
  }, [controlledOpen, onOpenChange]);

  const registerItem = useCallback((val: string, label: string) => {
    const next = new Map(itemsRef.current);
    next.set(val, label);
    itemsRef.current = next;
  }, []);
  const unregisterItem = useCallback((val: string) => {
    const next = new Map(itemsRef.current);
    next.delete(val);
    itemsRef.current = next;
  }, []);
  const getLabel = useCallback((val?: string) => (val ? itemsRef.current.get(val) : undefined), []);

  const ctx: SelectCtx = useMemo(() => ({
    open: isOpen,
    setOpen,
    anchor,
    setAnchor,
    value: current,
    setValue,
    onValueChange,
    registerItem,
    unregisterItem,
    getLabel,
    closeOnSelect,
    disabled,
  }), [anchor, closeOnSelect, current, disabled, getLabel, isOpen, onValueChange, registerItem, setOpen, setValue, unregisterItem]);

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
};

// ====== Trigger ======
export type SelectTriggerProps = PressableProps & WithClassName;
const SelectTrigger = forwardRef<React.ElementRef<typeof Pressable>, SelectTriggerProps>(
  ({ className, onPress, children, disabled: disabledProp, ...rest }, ref) => {
    const { open, setOpen, setAnchor, disabled } = useSelect();
    const isDisabled = disabled || !!disabledProp;

    const innerRef = useRef<any>(null);
    const setRefs = (node: any) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as any).current = node;
    };

    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      if (isDisabled) return;
      if (open) {
        setOpen(false);
        return;
      }
      try {
        innerRef.current?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
          setAnchor({ x, y, w, h });
          setOpen(true);
        });
      } catch {
        setAnchor({ x: 0, y: 0, w: 280, h: 40 });
        setOpen(true);
      }
    };

    return (
      <Pressable
        ref={setRefs}
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, expanded: open }}
        {...({
          className: cn(
            'h-10 w-full flex-row items-center justify-between rounded-md border border-input bg-background px-3 py-2',
            'text-sm',
            'active:opacity-80',
            'disabled:opacity-50',
            className
          ),
          dataSet: { state: open ? 'open' : 'closed' },
        } as any)}
        {...rest}
      >
        {/* Children могут включать <SelectValue /> */}
        {children}
        <ChevronDown size={16} {...({ className: 'opacity-50' } as any)} />
      </Pressable>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

// ====== Value ======
export type SelectValueProps = WithClassName & {
  placeholder?: string;
};
const SelectValue = ({ className, placeholder }: SelectValueProps) => {
  const { value, getLabel } = useSelect();
  const label = getLabel(value);
  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      {...({
        className: cn(
          'text-sm',
          'text-foreground',
          !value ? 'text-muted-foreground' : '',
          className
        ),
      } as any)}
    >
      {value ? label ?? value : placeholder ?? ''}
    </Text>
  );
};

// ====== Content ======
type ContentCtx = {
  scrollBy: (dy: number) => void;
};
const ContentContext = createContext<ContentCtx | null>(null);
const useContent = () => useContext(ContentContext);

export type SelectContentProps = ViewProps & WithClassName & {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  width?: number;          // если не задано — берём ширину триггера
  maxHeight?: number;      // default 384 (max-h-96)
};

const SelectContent = forwardRef<React.ElementRef<typeof View>, SelectContentProps>(
  ({ className, style, children, align = 'center', side = 'bottom', sideOffset = 4, width, maxHeight = 384, ...rest }, ref) => {
    const { open, setOpen, anchor } = useSelect();
    const [visible, setVisible] = useState(open);
    useEffect(() => setVisible(open), [open]);

    if (!visible || !anchor) return null;

    const screen = Dimensions.get('window');

    const w = Math.max(width ?? anchor.w, 128);
    let left = anchor.x;
    let top = anchor.y + anchor.h + sideOffset;

    if (side === 'top') top = anchor.y - sideOffset;
    if (side === 'left') { left = anchor.x - w - sideOffset; top = anchor.y; }
    if (side === 'right') { left = anchor.x + anchor.w + sideOffset; top = anchor.y; }

    if (side === 'top' || side === 'bottom') {
      if (align === 'center') left = anchor.x + Math.max(0, anchor.w / 2 - w / 2);
      if (align === 'end') left = anchor.x + anchor.w - w;
    } else {
      if (align === 'center') top = anchor.y + anchor.h / 2;
      if (align === 'end') top = anchor.y + anchor.h;
    }

    // clamp X
    left = Math.min(Math.max(8, left), screen.width - w - 8);

    const [measuredH, setMeasuredH] = useState(0);
    const onLayout = (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      setMeasuredH(h);
    };
    const clampedTop = Math.min(Math.max(8, top), screen.height - measuredH - 8);

    const close = () => setOpen(false);

    const scrollRef = useRef<ScrollView>(null);
    const contentCtx: ContentCtx = {
      scrollBy: (dy) => scrollRef.current?.scrollTo({
        y: Math.max(0, (scrollRef as any).current?._scrollPosY ?? 0) + dy,
        animated: true,
      }),
    };

    const onScroll = (e: any) => {
      (scrollRef as any).current._scrollPosY = e?.nativeEvent?.contentOffset?.y ?? 0;
    };

    return (
      <Modal
        transparent
        visible={visible}
        onRequestClose={close}
        animationType={Platform.OS === 'android' ? 'fade' : 'none'}
      >
        <Pressable onPress={close} {...({ className: 'flex-1' } as any)}>
          <View
            ref={ref}
            onLayout={onLayout}
            style={[{ position: 'absolute', left, top: clampedTop, width: w, maxHeight }, style]}
            {...({
              className: cn(
                'z-50 overflow-hidden rounded-md border bg-popover shadow-md',
                className
              ),
              dataSet: { state: open ? 'open' : 'closed' },
            } as any)}
            {...rest}
          >
            <ContentContext.Provider value={contentCtx}>
              <SelectScrollUpButton />
              <ScrollView
                ref={scrollRef}
                onScroll={onScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                {...({ className: 'p-1' } as any)}
              >
                {children}
              </ScrollView>
              <SelectScrollDownButton />
            </ContentContext.Provider>
          </View>
        </Pressable>
      </Modal>
    );
  }
);
SelectContent.displayName = 'SelectContent';

// ====== Group / Label / Separator ======
const SelectGroup = ({ className, ...rest }: ViewProps & WithClassName) => (
  <View {...({ className, } as any)} {...rest} />
);

export type SelectLabelProps = ViewProps & WithClassName;
const SelectLabel = forwardRef<React.ElementRef<typeof View>, SelectLabelProps>(
  ({ className, children, ...rest }, ref) => (
    <View ref={ref} {...({ className: cn('py-1.5 pl-8 pr-2', className) } as any)} {...rest}>
      {typeof children === 'string' ? (
        <Text {...({ className: 'text-sm font-semibold' } as any)}>{children}</Text>
      ) : children}
    </View>
  )
);
SelectLabel.displayName = 'SelectLabel';

const SelectSeparator = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, ...rest }, ref) => (
    <View
      ref={ref}
      {...({ className: cn('-mx-1 my-1 h-px bg-muted', className) } as any)}
      {...rest}
    />
  )
);
SelectSeparator.displayName = 'SelectSeparator';

// ====== Item ======
export type SelectItemProps = PressableProps & WithClassName & {
  value: string;
  label?: string;        // если не задано — возьмём из children (если строка)
  disabled?: boolean;
};

const SelectItem = forwardRef<React.ElementRef<typeof Pressable>, SelectItemProps>(
  ({ className, value, label, disabled, onPress, children, ...rest }, ref) => {
    const { value: current, setValue, registerItem, unregisterItem, closeOnSelect, setOpen } = useSelect();
    const isSelected = current === value;
    const text = label ?? (typeof children === 'string' ? children : value);

    useEffect(() => {
      registerItem(value, text);
      return () => unregisterItem(value);
    }, [registerItem, unregisterItem, value, text]);

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
        accessibilityRole="button"
        {...({
          className: cn(
            'relative w-full flex-row items-center rounded-sm py-1.5 pl-8 pr-2',
            'active:opacity-80',
            'data-[disabled=true]:opacity-50',
            className
          ),
          dataSet: { disabled: disabled ? 'true' : 'false', selected: isSelected ? 'true' : 'false' },
        } as any)}
        {...rest}
      >
        <View {...({ className: 'absolute left-2 h-3.5 w-3.5 items-center justify-center' } as any)}>
          {isSelected ? <Check size={16} /> : null}
        </View>
        {typeof children === 'string' ? (
          <Text {...({ className: 'text-sm text-foreground' } as any)}>{children}</Text>
        ) : children}
      </Pressable>
    );
  }
);
SelectItem.displayName = 'SelectItem';

// ====== Scroll Buttons ======
export type SelectScrollButtonProps = ViewProps & WithClassName;

const BaseScrollButton = forwardRef<React.ElementRef<typeof View>, SelectScrollButtonProps>(
  ({ className, children, ...rest }, ref) => (
    <View
      ref={ref}
      {...({ className: cn('items-center justify-center py-1', className) } as any)}
      {...rest}
    >
      {children}
    </View>
  )
);

const SelectScrollUpButton = forwardRef<React.ElementRef<typeof View>, SelectScrollButtonProps>(
  ({ className, ...rest }, ref) => {
    const content = useContent();
    return (
      <BaseScrollButton ref={ref} className={className} {...rest}>
        <Pressable
          onPress={() => content?.scrollBy(-120)}
          {...({ className: 'items-center justify-center py-1' } as any)}
        >
          <ChevronUp size={16} />
        </Pressable>
      </BaseScrollButton>
    );
  }
);
SelectScrollUpButton.displayName = 'SelectScrollUpButton';

const SelectScrollDownButton = forwardRef<React.ElementRef<typeof View>, SelectScrollButtonProps>(
  ({ className, ...rest }, ref) => {
    const content = useContent();
    return (
      <BaseScrollButton ref={ref} className={className} {...rest}>
        <Pressable
          onPress={() => content?.scrollBy(120)}
          {...({ className: 'items-center justify-center py-1' } as any)}
        >
          <ChevronDown size={16} />
        </Pressable>
      </BaseScrollButton>
    );
  }
);
SelectScrollDownButton.displayName = 'SelectScrollDownButton';

// ====== Exports ======
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};