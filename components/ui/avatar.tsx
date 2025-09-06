import React, { createContext, useContext, useEffect, useRef, useState, forwardRef } from 'react';
import { View, Image, Text, type ViewProps, type ImageProps, type ImageSourcePropType } from 'react-native';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'loading' | 'loaded' | 'error';
type Ctx = { status: Status; setStatus: (s: Status) => void };
const AvatarCtx = createContext<Ctx | null>(null);

function useAvatarCtx() {
  const ctx = useContext(AvatarCtx);
  if (!ctx) throw new Error('Avatar subcomponents must be used within <Avatar>');
  return ctx;
}

export type AvatarProps = ViewProps & {
  className?: string;
  children?: React.ReactNode;
};

export const Avatar = forwardRef<React.ElementRef<typeof View>, AvatarProps>(
  ({ className, children, ...props }, ref) => {
    const [status, setStatus] = useState<Status>('idle');
    return (
      <AvatarCtx.Provider value={{ status, setStatus }}>
        <View
          ref={ref}
          className={cn(
            // "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full"
            'relative h-10 w-10 overflow-hidden rounded-full',
            className
          )}
          {...props}
        >
          {children}
        </View>
      </AvatarCtx.Provider>
    );
  }
);
Avatar.displayName = 'Avatar';

export type AvatarImageProps = Omit<ImageProps, 'source'> & {
  className?: string;
  src?: string;                   // удобство: можно передать строку
  source?: ImageSourcePropType;   // стандартный RN source
};

export const AvatarImage = forwardRef<React.ElementRef<typeof Image>, AvatarImageProps>(
  ({ className, src, source, onLoadStart, onLoad, onError, ...props }, ref) => {
    const { setStatus } = useAvatarCtx();
    const resolvedSource = source ?? (src ? { uri: src } : undefined);

    useEffect(() => {
      setStatus(resolvedSource ? 'loading' : 'idle');
    }, [resolvedSource, setStatus]);

    return (
      <Image
        ref={ref}
        source={resolvedSource as any}
        onLoadStart={() => {
          setStatus('loading');
          // у некоторых типизаций onLoadStart без аргументов
          (onLoadStart as undefined | (() => void))?.();
        }}
        onLoad={(e) => {
          setStatus('loaded');
          (onLoad as undefined | ((ev: any) => void))?.(e);
        }}
        onError={(e) => {
          setStatus('error');
          (onError as undefined | ((ev: any) => void))?.(e);
        }}
        className={cn('h-full w-full rounded-full', className)}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = 'AvatarImage';

export type AvatarFallbackProps = ViewProps & {
  className?: string;
  delayMs?: number;     // как в Radix: показать фолбек через задержку
  children?: React.ReactNode;
};

export const AvatarFallback = forwardRef<React.ElementRef<typeof View>, AvatarFallbackProps>(
  ({ className, delayMs = 0, children, ...props }, ref) => {
    const { status } = useAvatarCtx();
    const [ready, setReady] = useState(delayMs === 0);
    const timer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      if (delayMs > 0) {
        timer.current && clearTimeout(timer.current);
        setReady(false);
        timer.current = setTimeout(() => setReady(true), delayMs);
        return () => {
          if (timer.current) clearTimeout(timer.current);
        };
      }
      setReady(true);
    }, [delayMs]);

    // Показываем фолбек, если ошибка или (ещё не загружено и таймер готов)
    const show = status === 'error' || ((status === 'idle' || status === 'loading') && ready);
    if (!show) return null;

    return (
      <View
        ref={ref}
        className={cn(
          // "flex h-full w-full items-center justify-center rounded-full bg-muted"
          'h-full w-full items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800',
          className
        )}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text className="text-slate-700 dark:text-slate-200 font-medium">{children}</Text>
        ) : (
          children
        )}
      </View>
    );
  }
);
AvatarFallback.displayName = 'AvatarFallback';