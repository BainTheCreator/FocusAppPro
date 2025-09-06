import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  forwardRef,
} from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  type ViewProps,
  type TextProps,
  type PressableProps,
} from 'react-native';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ==== Контекст / Root ====

type Ctx = { open: boolean; setOpen: (v: boolean) => void };
const DialogCtx = createContext<Ctx | null>(null);
const useDialog = () => {
  const ctx = useContext(DialogCtx);
  if (!ctx) throw new Error('AlertDialog.* must be used within <AlertDialog>');
  return ctx;
};

type RootProps = React.PropsWithChildren<{
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}>;

export function AlertDialog({ open, defaultOpen = false, onOpenChange, children }: RootProps) {
  const isControlled = open !== undefined;
  const [internal, setInternal] = useState<boolean>(defaultOpen);
  const value = isControlled ? (open as boolean) : internal;

  const setOpen = useCallback(
    (v: boolean) => {
      if (!isControlled) setInternal(v);
      onOpenChange?.(v);
    },
    [isControlled, onOpenChange]
  );

  const ctx = useMemo(() => ({ open: value, setOpen }), [value, setOpen]);
  return <DialogCtx.Provider value={ctx}>{children}</DialogCtx.Provider>;
}

// ==== Trigger ====

type TriggerProps = PressableProps & { asChild?: boolean; className?: string; children?: React.ReactNode };

export const AlertDialogTrigger = ({ asChild, className, children, onPress, ...props }: TriggerProps) => {
  const { setOpen } = useDialog();
  const handlePress = useCallback(() => {
    onPress?.({} as any);
    setOpen(true);
  }, [onPress, setOpen]);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, {
      onPress: (...args: any[]) => {
        (children as any).props?.onPress?.(...args);
        handlePress();
      },
    });
  }

  return (
    <Pressable className={cn('active:opacity-90', className)} onPress={handlePress} {...props}>
      {typeof children === 'string' ? <Text className="text-slate-900 dark:text-slate-100">{children}</Text> : children}
    </Pressable>
  );
};

// ==== Content (с overlay) ====

type ContentProps = React.PropsWithChildren<{
  className?: string;
  overlayClassName?: string;
  dismissOnOverlayPress?: boolean;
}>;

export const AlertDialogContent = ({ className, overlayClassName, dismissOnOverlayPress = true, children }: ContentProps) => {
  const { open, setOpen } = useDialog();

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)} statusBarTranslucent>
      <Pressable
        onPress={dismissOnOverlayPress ? () => setOpen(false) : undefined}
        className={cn('absolute inset-0 bg-black/60', overlayClassName)}
      />
      <View className="flex-1 items-center justify-center px-5">
        <View className={cn('w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg', className)}>
          {children}
        </View>
      </View>
    </Modal>
  );
};

// ==== Header / Footer / Title / Description ====

export const AlertDialogHeader = ({ className, children, ...props }: ViewProps & { className?: string }) => (
  <View className={cn('mb-4', className)} {...props}>
    {children}
  </View>
);

export const AlertDialogFooter = ({ className, children, ...props }: ViewProps & { className?: string }) => (
  <View className={cn('mt-4 flex-row justify-end gap-2', className)} {...props}>
    {children}
  </View>
);

export const AlertDialogTitle = forwardRef<React.ElementRef<typeof Text>, TextProps & { className?: string }>(
  ({ className, children, ...props }, ref) => (
    <Text ref={ref} className={cn('text-lg font-semibold', className)} {...props}>
      {children}
    </Text>
  )
);
AlertDialogTitle.displayName = 'AlertDialogTitle';

export const AlertDialogDescription = forwardRef<React.ElementRef<typeof Text>, TextProps & { className?: string }>(
  ({ className, children, ...props }, ref) => (
    <Text ref={ref} className={cn('text-sm text-slate-600 dark:text-slate-400', className)} {...props}>
      {children}
    </Text>
  )
);
AlertDialogDescription.displayName = 'AlertDialogDescription';

// ==== Action / Cancel ====

type ActionProps = React.ComponentProps<typeof Button> & { closeOnPress?: boolean };

export const AlertDialogAction = forwardRef<React.ElementRef<typeof Pressable>, ActionProps>(
  ({ className, children, onPress, closeOnPress = true, ...props }, ref) => {
    const { setOpen } = useDialog();
    const handle = () => {
      onPress?.({} as any);
      if (closeOnPress) setOpen(false);
    };
    return (
      <Button ref={ref} className={className} onPress={handle} {...props}>
        {children}
      </Button>
    );
  }
);
AlertDialogAction.displayName = 'AlertDialogAction';

export const AlertDialogCancel = forwardRef<React.ElementRef<typeof Pressable>, ActionProps>(
  ({ className, children, onPress, closeOnPress = true, ...props }, ref) => {
    const { setOpen } = useDialog();
    const handle = () => {
      onPress?.({} as any);
      if (closeOnPress) setOpen(false);
    };
    return (
      <Button ref={ref} variant="outline" className={cn('mt-0', className)} onPress={handle} {...props}>
        {children}
      </Button>
    );
  }
);
AlertDialogCancel.displayName = 'AlertDialogCancel';

// Совместимые экспорты
export const AlertDialogPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
export const AlertDialogOverlay = () => null;