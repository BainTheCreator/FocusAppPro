// Toaster.tsx — React Native + NativeWind версия (под наши Toast-примитивы)
import React from 'react';
import { View } from 'react-native';
import { cn } from '@/lib/utils';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useToast } from './use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {/* В RN наша Viewport — это контейнер, в который нужно поместить тосты как children */}
      <ToastViewport position="top" {...({ className: 'self-end w-full' } as any)}>
        {toasts.map(({ id, title, description, action, ...props }) => (
          <Toast key={id} {...props}>
            <View {...({ className: cn('flex-col gap-1 flex-1') } as any)}>
              {title ? <ToastTitle>{String(title)}</ToastTitle> : null}
              {description ? <ToastDescription>{String(description)}</ToastDescription> : null}
            </View>
            {action}
            <ToastClose />
          </Toast>
        ))}
      </ToastViewport>
    </ToastProvider>
  );
}