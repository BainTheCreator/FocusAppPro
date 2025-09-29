import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Send, Shield, ChevronLeft } from 'lucide-react-native';

type Provider = 'telegram' | 'qr' | 'apple' | 'google' | 'wallet';

type LoginProps = {
  onLoginWith?: (provider: Provider) => void;
  onSkip?: () => void;
};

export function Login({ onLoginWith, onSkip }: LoginProps) {
  return (
    <View {...({ className: 'flex-1 bg-background px-5' } as any)}>
      {/* Header */}
      <View {...({ className: 'flex-row items-center pt-3' } as any)}>
        <Pressable onPress={onSkip} {...({ className: 'p-2 -ml-2 rounded-lg active:opacity-70' } as any)}>
          <ChevronLeft size={20} color="#f3f4f6" />
        </Pressable>
        <View {...({ className: 'flex-1 items-center -ml-8' } as any)}>
          <Text {...({ className: 'text-foreground text-base font-medium' } as any)}>Вход</Text>
        </View>
      </View>

      {/* Content */}
      <View {...({ className: 'flex-1 items-center justify-center' } as any)}>
        <View {...({ className: 'w-24 h-24 rounded-full items-center justify-center bg-[#229ED9]/10 border border-[#229ED9]/30' } as any)}>
          <Send size={42} color="#229ED9" />
        </View>

        <Text {...({ className: 'mt-6 text-2xl font-semibold text-foreground' } as any)}>Войти</Text>
        <Text {...({ className: 'mt-2 text-center text-muted-foreground' } as any)}>
          Выберите удобный способ входа.
        </Text>

        <Pressable
          onPress={() => onLoginWith?.('telegram')}
          {...({ className: 'mt-6 w-full rounded-xl bg-[#229ED9] py-3 items-center justify-center active:opacity-90' } as any)}
        >
          <Text {...({ className: 'text-white text-base font-semibold' } as any)}>Продолжить в Telegram</Text>
        </Pressable>

        <Pressable
          onPress={() => onLoginWith?.('google')}
          {...({ className: 'mt-3 w-full rounded-xl bg-white border border-border py-3 items-center justify-center active:opacity-90' } as any)}
        >
          <Text {...({ className: 'text-black text-base font-semibold' } as any)}>Продолжить с Google</Text>
        </Pressable>

        <Pressable
          onPress={() => onLoginWith?.('wallet')}
          {...({ className: 'mt-3 w-full rounded-xl border border-primary bg-primary py-3 items-center justify-center active:opacity-90' } as any)}
        >
          <Text {...({ className: 'text-foreground text-base font-semibold' } as any)}>Войти через крипто-кошелёк</Text>
        </Pressable>

        <View {...({ className: 'mt-6 w-full px-4 py-3 rounded-xl bg-card border border-border' } as any)}>
          <View {...({ className: 'flex-row items-start' } as any)}>
            <Shield size={18} color="#35D07F" />
            <Text {...({ className: 'ml-2 flex-1 text-sm text-muted-foreground' } as any)}>
              Мы не получаем доступ к вашим личным данным без согласия. При входе подтверждается только ваш ID, имя и email.
            </Text>
          </View>
        </View>

        {/* <Pressable onPress={onSkip} {...({ className: 'mt-6' } as any)}>
          <Text {...({ className: 'text-muted-foreground underline' } as any)}>Продолжить без входа</Text>
        </Pressable> */}
      </View>

      {/* <View {...({ className: 'pb-6' } as any)}>
        <Text {...({ className: 'text-center text-xs text-muted-foreground' } as any)}>
          Нажимая «Продолжить», вы соглашаетесь с Условиями и Политикой конфиденциальности
        </Text>
      </View> */}
    </View>
  );
}