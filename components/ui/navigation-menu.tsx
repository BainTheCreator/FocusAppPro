// NavigationMenu.tsx — React Native + NativeWind версия Radix NavigationMenu
// Зависимости иконок: npm i lucide-react-native react-native-svg

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
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  View,
  type ViewProps,
  Text,
  type LayoutChangeEvent,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';

// простая утилита
const cn = (...args: Array<string | null | undefined | false>) =>
  args.filter(Boolean).join(' ');

type WithClassName = { className?: string };
type Rect = { x: number; y: number; w: number; h: number };

// ================= Root Context =================
type RootCtx = {
  activeKey: string | null;
  setActiveKey: (k: string | null) => void;

  // для индикатора
  listLayout: Rect | null;
  setListLayout: (r: Rect) => void;
  setTriggerLayout: (key: string, r: Rect) => void;
  getTriggerLayout: (key: string) => Rect | undefined;

  // viewport контент
  registerContent: (key: string, node: React.ReactNode) => void;
  unregisterContent: (key: string) => void;
  getContent: (key: string) => React.ReactNode | null;
};
const Ctx = createContext<RootCtx | null>(null);
const useNM = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('NavigationMenu.* must be used within <NavigationMenu>');
  return v;
};

// ================= Item Context =================
type ItemCtx = { value: string };
const ItemContext = createContext<ItemCtx | null>(null);
const useItem = () => {
  const v = useContext(ItemContext);
  if (!v) throw new Error('NavigationMenuTrigger/Content must be inside <NavigationMenuItem value="...">');
  return v;
};

// ================= Root =================
export type NavigationMenuProps = ViewProps & WithClassName & {
  children?: React.ReactNode;
};

const NavigationMenu = forwardRef<React.ElementRef<typeof View>, NavigationMenuProps>(
  ({ className, style, children, ...rest }, ref) => {
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [listLayout, _setListLayout] = useState<Rect | null>(null);
    const triggersRef = useRef<Map<string, Rect>>(new Map());
    const [tick, setTick] = useState(0);
    const contentsRef = useRef<Map<string, React.ReactNode>>(new Map());

    const setListLayout = (r: Rect) => _setListLayout(r);
    const setTriggerLayout = (key: string, r: Rect) => {
      const prev = triggersRef.current.get(key);
      if (prev && prev.x === r.x && prev.y === r.y && prev.w === r.w && prev.h === r.h) return;
      const next = new Map(triggersRef.current);
      next.set(key, r);
      triggersRef.current = next;
      setTick((t) => t + 1);
    };
    const getTriggerLayout = (key: string) => triggersRef.current.get(key);

    const registerContent = (key: string, node: React.ReactNode) => {
      const next = new Map(contentsRef.current);
      next.set(key, node);
      contentsRef.current = next;
      setTick((t) => t + 1);
    };
    const unregisterContent = (key: string) => {
      const next = new Map(contentsRef.current);
      next.delete(key);
      contentsRef.current = next;
      setTick((t) => t + 1);
    };
    const getContent = (key: string) => contentsRef.current.get(key) ?? null;

    const ctx: RootCtx = useMemo(
      () => ({
        activeKey,
        setActiveKey,
        listLayout,
        setListLayout,
        setTriggerLayout,
        getTriggerLayout,
        registerContent,
        unregisterContent,
        getContent,
      }),
      [activeKey, listLayout, tick]
    );

    return (
      <Ctx.Provider value={ctx}>
        <View
          ref={ref}
          style={style}
          {...({
            className: cn(
              'relative z-10 max-w-max w-full items-center justify-center',
              className
            ),
          } as any)}
          {...rest}
        >
          {children}
          <NavigationMenuViewport />
        </View>
      </Ctx.Provider>
    );
  }
);
NavigationMenu.displayName = 'NavigationMenu';

// ================= List =================
export type NavigationMenuListProps = ViewProps & WithClassName;
const NavigationMenuList = forwardRef<React.ElementRef<typeof View>, NavigationMenuListProps>(
  ({ className, style, ...rest }, ref) => {
    const { setListLayout } = useNM();
    const onLayout = (e: LayoutChangeEvent) => {
      const { x, y, width, height } = e.nativeEvent.layout;
      setListLayout({ x, y, w: width, h: height });
    };

    return (
      <View
        ref={ref}
        onLayout={onLayout}
        style={style}
        {...({
          className: cn('flex-row flex-1 items-center justify-center space-x-1', className),
        } as any)}
        {...rest}
      />
    );
  }
);
NavigationMenuList.displayName = 'NavigationMenuList';

// ================= Item =================
export type NavigationMenuItemProps = ViewProps & WithClassName & {
  value: string; // обязательный id пункта
};
const NavigationMenuItem = ({ value, className, style, children, ...rest }: NavigationMenuItemProps) => {
  return (
    <ItemContext.Provider value={{ value }}>
      <View
        style={style}
        {...({ className, } as any)}
        {...rest}
      >
        {children}
      </View>
    </ItemContext.Provider>
  );
};

// ================= Trigger =================
export const navigationMenuTriggerStyle = () =>
  'items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium active:opacity-80 data-[state=open]:bg-accent/50';

export type NavigationMenuTriggerProps = PressableProps & WithClassName;
const NavigationMenuTrigger = forwardRef<React.ElementRef<typeof Pressable>, NavigationMenuTriggerProps>(
  ({ className, onPress, children, ...rest }, ref) => {
    const { value } = useItem();
    const { activeKey, setActiveKey, setTriggerLayout } = useNM();
    const open = activeKey === value;

    const onLayout = (e: LayoutChangeEvent) => {
      const { x, y, width, height } = e.nativeEvent.layout;
      setTriggerLayout(value, { x, y, w: width, h: height });
    };

    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      setActiveKey(open ? null : value);
    };

    return (
      <Pressable
        ref={ref}
        onLayout={onLayout}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        {...({
          className: cn(navigationMenuTriggerStyle(), 'flex-row', className),
          dataSet: { state: open ? 'open' : 'closed' },
        } as any)}
        {...rest}
      >
        {typeof children === 'string' ? (
          <Text {...({ className: 'text-sm text-foreground' } as any)}>{children}</Text>
        ) : (
          children
        )}
        <ChevronDown size={12} {...({ className: 'ml-1' } as any)} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
    );
  }
);
NavigationMenuTrigger.displayName = 'NavigationMenuTrigger';

// ================= Content (регистрация в viewport) =================
export type NavigationMenuContentProps = ViewProps & WithClassName;
const NavigationMenuContent = ({ className, style, children, ...rest }: NavigationMenuContentProps) => {
  const { value } = useItem();
  const { activeKey, registerContent, unregisterContent } = useNM();

  useEffect(() => {
    // регистрируем текущий контент, чтобы Viewport мог его отрисовать
    registerContent(
      value,
      <View
        {...({ className, } as any)}
        style={style}
        {...rest}
      >
        {children}
      </View>
    );
    return () => unregisterContent(value);
  }, [value, className, style, children, rest, registerContent, unregisterContent]);

  // Сам по себе контент не рендерится тут — он рендерится в Viewport
  return null;
};
NavigationMenuContent.displayName = 'NavigationMenuContent';

// ================= Link =================
export type NavigationMenuLinkProps = PressableProps & WithClassName;
const NavigationMenuLink = forwardRef<React.ElementRef<typeof Pressable>, NavigationMenuLinkProps>(
  ({ className, children, ...rest }, ref) => {
    return (
      <Pressable
        ref={ref}
        {...({ className, } as any)}
        {...rest}
      >
        {typeof children === 'string' ? (
          <Text {...({ className: 'text-foreground' } as any)}>{children}</Text>
        ) : children}
      </Pressable>
    );
  }
);
NavigationMenuLink.displayName = 'NavigationMenuLink';

// ================= Viewport =================
export type NavigationMenuViewportProps = ViewProps & WithClassName;
const NavigationMenuViewport = forwardRef<React.ElementRef<typeof View>, NavigationMenuViewportProps>(
  ({ className, style, ...rest }, ref) => {
    const { activeKey, getContent, listLayout, getTriggerLayout } = useNM();

    const [renderedKey, setRenderedKey] = useState<string | null>(null);
    const [content, setContent] = useState<React.ReactNode | null>(null);
    const [contentSize, setContentSize] = useState({ w: 0, h: 0 });

    const animatedH = useRef(new Animated.Value(0)).current;
    const animatedW = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const node = activeKey ? getContent(activeKey) : null;
      setContent(node);
      setRenderedKey(activeKey);
    }, [activeKey, getContent]);

    const animateTo = (w: number, h: number) => {
      Animated.parallel([
        Animated.timing(animatedH, { toValue: h, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(animatedW, { toValue: w, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    };

    const onContentLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setContentSize({ w: width, h: height });
      animateTo(width, height);
    };

    // Позиция индикатора
    const indicatorPos = (() => {
      if (!renderedKey || !listLayout) return null;
      const t = getTriggerLayout(renderedKey);
      if (!t) return null;
      const left = t.x + t.w / 2 - 4; // центр, минус половина индикатора
      const top = listLayout.y + listLayout.h; // под списком
      return { left, top };
    })();

    return (
      <View
        // контейнер viewport под списком: absolute нельзя (в RN нет нужды), просто ниже по дереву
        {...({ className: 'mt-1.5 w-full items-center' } as any)}
        pointerEvents="box-none"
      >
        {/* Индикатор (маленький ромб) */}
        {indicatorPos && renderedKey ? (
          <View
            style={{
              position: 'absolute',
              left: indicatorPos.left,
              top: 0, // так как контейнер уже под списком, топ=0
              width: 8,
              height: 8,
              transform: [{ rotate: '45deg' }, { translateY: -4 }],
              zIndex: 1,
            }}
            {...({ className: 'bg-border shadow-md rounded-tl-[1px]' } as any)}
          />
        ) : null}

        {/* Сам viewport (анимируемые размеры) */}
        <Animated.View
          ref={ref as any}
          style={[
            {
              width: '100%',
              overflow: 'hidden',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.1)',
              backgroundColor: 'rgba(255,255,255,1)',
              // адаптабельная ширина: ограничиваем по содержимому для md? В RN пусть растягивается на всю ширину.
              height: animatedH,
            },
            style,
          ]}
          {...({
            className: cn(
              'origin-top',
              'bg-popover border text-popover-foreground shadow-lg',
              className
            ),
            dataSet: { state: renderedKey ? 'open' : 'closed' },
          } as any)}
          {...rest}
        >
          {/* Внутренний измеритель */}
          <View onLayout={onContentLayout} {...({ className: 'w-full' } as any)}>
            {content}
          </View>
        </Animated.View>
      </View>
    );
  }
);
NavigationMenuViewport.displayName = 'NavigationMenuViewport';

// ================= Indicator (опционально отдельный экспорт) =================
export type NavigationMenuIndicatorProps = ViewProps & WithClassName;
const NavigationMenuIndicator = forwardRef<React.ElementRef<typeof View>, NavigationMenuIndicatorProps>(
  ({ className, style, ...rest }, ref) => {
    // Индикатор уже встроен в Viewport выше. Этот компонент оставлен для совместимости API.
    return <View ref={ref} style={style} {...({ className } as any)} {...rest} />;
  }
);
NavigationMenuIndicator.displayName = 'NavigationMenuIndicator';

// ================= Exports =================
export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
};