import React, { createContext, useContext, forwardRef } from 'react';
import { View, Text, ViewProps, TextProps } from 'react-native';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'destructive';

type Ctx = { variant: Variant };
const AlertCtx = createContext<Ctx>({ variant: 'default' });
const useAlert = () => useContext(AlertCtx);

// Маппинг под Tailwind-классы для каждого варианта
const containerByVariant: Record<Variant, string> = {
  default:
    'bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800',
  destructive:
    'border border-rose-500/50 bg-rose-50 dark:bg-rose-950/10 dark:border-rose-900/50',
};

const titleByVariant: Record<Variant, string> = {
  default: 'text-slate-900 dark:text-slate-100',
  destructive: 'text-rose-700 dark:text-rose-300',
} as any;

const descByVariant: Record<Variant, string> = {
  default: 'text-slate-600 dark:text-slate-400',
  destructive: 'text-rose-600 dark:text-rose-400',
};

export interface AlertProps extends ViewProps {
  variant?: Variant;
  className?: string;
  children?: React.ReactNode;
  // опционально: можно сразу передать React-иконку через проп
  icon?: React.ReactNode;
}

// Контейнер
export const Alert = forwardRef<View, AlertProps>(
  ({ variant = 'default', className, children, icon, ...props }, ref) => {
    return (
      <AlertCtx.Provider value={{ variant }}>
        <View
          ref={ref}
          // В вебе: "relative w-full rounded-lg border p-4 ..."
          className={cn(
            'w-full rounded-lg p-4',
            containerByVariant[variant],
            className
          )}
          {...props}
        >
          {/* Если передали icon пропом — автоматически подставим слот слева */}
          {icon ? (
            <View className="flex-row">
              <View className="mr-3 mt-0.5">{icon}</View>
              <View className="flex-1">{children}</View>
            </View>
          ) : (
            // Иначе рендерим детей как есть — используйте <AlertIcon> для выравнивания
            children
          )}
        </View>
      </AlertCtx.Provider>
    );
  }
);
Alert.displayName = 'Alert';

// Заголовок
export const AlertTitle = forwardRef<Text, TextProps & { className?: string }>(
  ({ className, children, ...props }, ref) => {
    const { variant } = useAlert();
    return (
      <Text
        ref={ref}
        // В вебе: "mb-1 font-medium leading-none tracking-tight"
        className={cn(
          'mb-1 font-medium leading-none tracking-tight',
          titleByVariant[variant],
          className
        )}
        {...props}
      >
        {children}
      </Text>
    );
  }
);
AlertTitle.displayName = 'AlertTitle';

// Описание
export const AlertDescription = forwardRef<
  Text,
  TextProps & { className?: string }
>(({ className, children, ...props }, ref) => {
  const { variant } = useAlert();
  return (
    <Text
      ref={ref}
      // В вебе: "text-sm [&_p]:leading-relaxed"
      className={cn('text-sm', descByVariant[variant], className)}
      {...props}
    >
      {children}
    </Text>
  );
});
AlertDescription.displayName = 'AlertDescription';

// Необязательный помощник для иконки слева (рекомендуется для RN)
export function AlertIcon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { variant } = useAlert();

  // Попробуем задать дефолтные размер/цвет lucide-иконке, если они не переданы.
  let content = children;
  if (React.isValidElement(children)) {
    const defaultColor =
      variant === 'destructive' ? '#e11d48' /* rose-600 */ : '#0f172a'; // slate-900
    content = React.cloneElement(children as any, {
      size: (children as any).props?.size ?? 16,
      color: (children as any).props?.color ?? defaultColor,
    });
  }

  return <View className={cn('mr-3 mt-0.5', className)}>{content}</View>;
}