// Sidebar.tsx — React Native + NativeWind адаптация Sidebar
// Иконки: npm i lucide-react-native react-native-svg

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
  Pressable,
  type PressableProps,
  View,
  type ViewProps,
  Text,
} from 'react-native';
import { PanelLeft } from 'lucide-react-native';
import { cn } from '@/lib/utils';

import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import Skeleton from './skeleton';

// Константы (в dp)
const SIDEBAR_WIDTH = 16 * 16;       // 16rem ~ 256
const SIDEBAR_WIDTH_MOBILE = 18 * 16; // 18rem ~ 288
const SIDEBAR_WIDTH_ICON = 3 * 16;    // 3rem ~ 48

type WithClassName = { className?: string };

function useIsMobile(threshold = 768) {
  const [w, setW] = useState(Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setW(window.width));
    return () => sub?.remove?.();
  }, []);
  return w < threshold;
}

type SidebarContext = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContext | null>(null);
export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider.');
  return ctx;
}

// Provider
export type SidebarProviderProps = ViewProps & WithClassName & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};
const SidebarProvider = forwardRef<React.ElementRef<typeof View>, SidebarProviderProps>(
  (
    { defaultOpen = true, open: openProp, onOpenChange, className, style, children, ...props },
    ref
  ) => {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = useState(false);

    const [_open, _setOpen] = useState(defaultOpen);
    const open = openProp ?? _open;
    const setOpen = useCallback((value: boolean | ((v: boolean) => boolean)) => {
      const next = typeof value === 'function' ? (value as any)(open) : value;
      onOpenChange ? onOpenChange(next) : _setOpen(next);
    }, [onOpenChange, open]);

    const toggleSidebar = useCallback(() => {
      return isMobile ? setOpenMobile((v) => !v) : setOpen((v) => !v);
    }, [isMobile, setOpen]);

    const state: 'expanded' | 'collapsed' = open ? 'expanded' : 'collapsed';

    const ctx = useMemo<SidebarContext>(() => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }), [isMobile, open, openMobile, setOpen, toggleSidebar]);

    return (
      <SidebarContext.Provider value={ctx}>
        <View
          ref={ref}
          style={style}
          {...({
            className: cn(
              'flex min-h-svh w-full',
              className
            ),
            dataSet: { variant: '' },
          } as any)}
          {...props}
        >
          {children}
        </View>
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = 'SidebarProvider';

// Sidebar
export type SidebarProps = ViewProps & WithClassName & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
};
const Sidebar = forwardRef<React.ElementRef<typeof View>, SidebarProps>(
  ({ side = 'left', variant = 'sidebar', collapsible = 'offcanvas', className, children, ...props }, ref) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (collapsible === 'none') {
      return (
        <View
          ref={ref}
          {...({
            className: cn('h-full bg-sidebar text-sidebar-foreground', className),
          } as any)}
          style={{ width: SIDEBAR_WIDTH }}
          {...props}
        >
          {children}
        </View>
      );
    }

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent
            side={side}
            {...({
              className: 'bg-sidebar p-0 text-sidebar-foreground',
            } as any)}
            style={{ width: SIDEBAR_WIDTH_MOBILE }}
          >
            <View {...({ className: 'h-full w-full flex-col' } as any)}>{children}</View>
          </SheetContent>
        </Sheet>
      );
    }

    const collapsed = state === 'collapsed';
    const stubWidth =
      collapsed
        ? (collapsible === 'icon' ? SIDEBAR_WIDTH_ICON : 0)
        : SIDEBAR_WIDTH;

    const panelWidth =
      collapsed
        ? (collapsible === 'icon' ? SIDEBAR_WIDTH_ICON : SIDEBAR_WIDTH)
        : SIDEBAR_WIDTH;

    const offcanvasTranslate =
      collapsible === 'offcanvas' && collapsed
        ? (side === 'left' ? -SIDEBAR_WIDTH : SIDEBAR_WIDTH)
        : 0;

    return (
      <View
        ref={ref}
        {...({
          className: cn('relative hidden md:block text-sidebar-foreground', className),
          dataSet: { state, side, variant, collapsible },
        } as any)}
        {...props}
      >
        {/* Gap stub */}
        <View
          {...({
            className: 'bg-transparent',
          } as any)}
          style={{
            width: stubWidth,
            height: '100%',
          }}
        />
        {/* Fixed panel */}
        <View
          {...({
            className: cn(
              'absolute inset-y-0 z-10',
              variant === 'floating' || variant === 'inset'
                ? 'p-2'
                : ''
            ),
          } as any)}
          style={[
            side === 'left' ? { left: 0 } : { right: 0 },
            { width: panelWidth, height: '100%' },
          ]}
        >
          <View
            {...({
              className: cn(
                'h-full w-full flex-col bg-sidebar',
                variant === 'floating' ? 'rounded-lg border border-sidebar-border shadow' : '',
                variant === 'inset' ? 'rounded-lg' : ''
              ),
            } as any)}
            style={{
              transform: [{ translateX: offcanvasTranslate }],
            }}
          >
            {children}
          </View>
        </View>
      </View>
    );
  }
);
Sidebar.displayName = 'Sidebar';

// Trigger
export type SidebarTriggerProps = PressableProps & WithClassName;
const SidebarTrigger = forwardRef<React.ElementRef<typeof Pressable>, SidebarTriggerProps>(
  ({ className, onPress, ...props }, ref) => {
    const { toggleSidebar } = useSidebar();
    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      toggleSidebar();
    };
    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        {...({
          className: cn('h-7 w-7 items-center justify-center rounded-md', className),
        } as any)}
        {...props}
      >
        <PanelLeft size={18} />
      </Pressable>
    );
  }
);
SidebarTrigger.displayName = 'SidebarTrigger';

// Rail
export type SidebarRailProps = PressableProps & WithClassName;
const SidebarRail = forwardRef<React.ElementRef<typeof Pressable>, SidebarRailProps>(
  ({ className, onPress, ...props }, ref) => {
    const { toggleSidebar } = useSidebar();
    const handlePress: PressableProps['onPress'] = (e) => {
      onPress?.(e);
      toggleSidebar();
    };
    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        accessibilityLabel="Toggle Sidebar"
        {...({
          className: cn(
            'absolute inset-y-0 z-20 hidden w-4 md:flex',
            className
          ),
        } as any)}
        {...props}
      />
    );
  }
);
SidebarRail.displayName = 'SidebarRail';

// Inset (main)
export type SidebarInsetProps = ViewProps & WithClassName;
const SidebarInset = forwardRef<React.ElementRef<typeof View>, SidebarInsetProps>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      {...({
        className: cn('relative flex min-h-svh flex-1 flex-col bg-background', className),
      } as any)}
      {...props}
    />
  )
);
SidebarInset.displayName = 'SidebarInset';

// Input wrapper
export type SidebarInputProps = React.ComponentProps<typeof Input>;
const SidebarInput = forwardRef<React.ElementRef<typeof Input>, SidebarInputProps>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      {...({
        className: cn('h-8 w-full bg-background shadow-none', className),
      } as any)}
      {...props}
    />
  )
);
SidebarInput.displayName = 'SidebarInput';

// Simple wrappers
const SidebarHeader = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, ...props }, ref) => (
    <View ref={ref} {...({ className: cn('flex flex-col gap-2 p-2', className) } as any)} {...props} />
  )
);
SidebarHeader.displayName = 'SidebarHeader';

const SidebarFooter = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, ...props }, ref) => (
    <View ref={ref} {...({ className: cn('flex flex-col gap-2 p-2', className) } as any)} {...props} />
  )
);
SidebarFooter.displayName = 'SidebarFooter';

const SidebarSeparator = forwardRef<React.ElementRef<typeof Separator>, React.ComponentProps<typeof Separator>>(
  ({ className, ...props }, ref) => (
    <Separator
      ref={ref}
      {...({ className: cn('mx-2 w-auto bg-sidebar-border', className) } as any)}
      {...props}
    />
  )
);
SidebarSeparator.displayName = 'SidebarSeparator';

const SidebarContent = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      {...({
        className: cn('min-h-0 flex-1 flex-col gap-2', className),
      } as any)}
      {...props}
    />
  )
);
SidebarContent.displayName = 'SidebarContent';

const SidebarGroup = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      {...({ className: cn('relative w-full min-w-0 flex-col p-2', className) } as any)}
      {...props}
    />
  )
);
SidebarGroup.displayName = 'SidebarGroup';

const SidebarGroupLabel = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName & { asChild?: boolean }>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      {...({
        className: cn(
          'flex h-8 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70',
          className
        ),
      } as any)}
      {...props}
    />
  )
);
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

const SidebarGroupAction = forwardRef<React.ElementRef<typeof Pressable>, PressableProps & WithClassName & { asChild?: boolean; showOnHover?: boolean }>(
  ({ className, ...props }, ref) => (
    <Pressable
      ref={ref}
      {...({
        className: cn(
          'absolute right-3 top-3.5 aspect-square w-5 items-center justify-center rounded-md',
          className
        ),
      } as any)}
      {...props}
    />
  )
);
SidebarGroupAction.displayName = 'SidebarGroupAction';

const SidebarGroupContent = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, ...props }, ref) => (
    <View ref={ref} {...({ className: cn('w-full text-sm', className) } as any)} {...props} />
  )
);
SidebarGroupContent.displayName = 'SidebarGroupContent';

// Menu
const SidebarMenu = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, ...props }, ref) => (
    <View ref={ref} {...({ className: cn('w-full min-w-0 flex-col gap-1', className) } as any)} {...props} />
  )
);
SidebarMenu.displayName = 'SidebarMenu';

const SidebarMenuItem = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, ...props }, ref) => (
    <View ref={ref} {...({ className: cn('relative', className) } as any)} {...props} />
  )
);
SidebarMenuItem.displayName = 'SidebarMenuItem';

// Варианты кнопок меню
type MenuVariant = 'default' | 'outline';
type MenuSize = 'default' | 'sm' | 'lg';
function menuButtonClasses(variant: MenuVariant, size: MenuSize, extra?: string) {
  return cn(
    'w-full flex-row items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm',
    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground',
    variant === 'outline' ? 'bg-background' : '',
    size === 'default' ? 'h-8' : '',
    size === 'sm' ? 'h-7 text-xs' : '',
    size === 'lg' ? 'h-12' : '',
    extra
  );
}

export type SidebarMenuButtonProps = PressableProps & WithClassName & {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string | any;
  variant?: MenuVariant;
  size?: MenuSize;
};
const SidebarMenuButton = forwardRef<React.ElementRef<typeof Pressable>, SidebarMenuButtonProps>(
  ({ className, isActive = false, variant = 'default', size = 'default', children, ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        {...({
          className: menuButtonClasses(variant, size, className),
          dataSet: { active: isActive ? 'true' : 'false', size },
        } as any)}
        {...props}
      >
        {typeof children === 'string' ? <Text>{children}</Text> : children}
      </Pressable>
    );
  }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

const SidebarMenuAction = forwardRef<React.ElementRef<typeof Pressable>, PressableProps & WithClassName & { asChild?: boolean; showOnHover?: boolean }>(
  ({ className, ...props }, ref) => (
    <Pressable
      ref={ref}
      {...({
        className: cn('absolute right-1 top-1.5 aspect-square w-5 items-center justify-center rounded-md', className),
      } as any)}
      {...props}
    />
  )
);
SidebarMenuAction.displayName = 'SidebarMenuAction';

const SidebarMenuBadge = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      {...({
        className: cn(
          'absolute right-1 h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs',
          className
        ),
      } as any)}
      pointerEvents="none"
      {...props}
    >
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </View>
  )
);
SidebarMenuBadge.displayName = 'SidebarMenuBadge';

const SidebarMenuSkeleton = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName & { showIcon?: boolean }>(
  ({ className, showIcon = false, ...props }, ref) => {
    const width = useMemo(() => `${Math.floor(Math.random() * 40) + 50}%`, []);
    return (
      <View
        ref={ref}
        {...({ className: cn('h-8 flex-row items-center gap-2 px-2', className) } as any)}
        {...props}
      >
        {showIcon && <Skeleton {...({ className: 'size-4 rounded-md' } as any)} />}
        <Skeleton
          {...({
            className: 'h-4 flex-1',
          } as any)}
          style={{ maxWidth: width as any }}
        />
      </View>
    );
  }
);
SidebarMenuSkeleton.displayName = 'SidebarMenuSkeleton';

const SidebarMenuSub = forwardRef<React.ElementRef<typeof View>, ViewProps & WithClassName>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      {...({
        className: cn('mx-3.5 min-w-0 flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5', className),
      } as any)}
      {...props}
    />
  )
);
SidebarMenuSub.displayName = 'SidebarMenuSub';

const SidebarMenuSubItem = forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ ...props }, ref) => <View ref={ref} {...props} />
);
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem';

export type SidebarMenuSubButtonProps = PressableProps & WithClassName & {
  asChild?: boolean;
  size?: 'sm' | 'md';
  isActive?: boolean;
};
const SidebarMenuSubButton = forwardRef<React.ElementRef<typeof Pressable>, SidebarMenuSubButtonProps>(
  ({ className, size = 'md', isActive, children, ...props }, ref) => (
    <Pressable
      ref={ref}
      {...({
        className: cn(
          'min-w-0 -translate-x-px flex-row items-center gap-2 rounded-md px-2',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          size === 'sm' ? 'h-7 text-xs' : 'h-7 text-sm',
          className
        ),
        dataSet: { active: isActive ? 'true' : 'false', size },
      } as any)}
      {...props}
    >
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Pressable>
  )
);
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton';

// Exports
export {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
};