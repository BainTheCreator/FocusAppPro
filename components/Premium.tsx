// Premium.tsx — React Native + NativeWind
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Crown,
  Check,
  Star,
  Gem,
  ChevronDown,
} from 'lucide-react-native';

const primaryFeatures = [
  'Неограниченные цели',
  'Расширенная статистика',
  'AI-декомпозиция целей',
];

const moreFeatures = [
  'Командные цели',
  'Приоритетная поддержка',
  'Экспорт данных',
];

interface PremiumProps {
  onSubscribe: (planId: string) => void;  // вызов покупки через Stars
  extraBottomPadding?: number;            // под таб-бар/сейф-ареа
}

export const Premium = ({ onSubscribe, extraBottomPadding = 0 }: PremiumProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View {...({ className: 'flex-1 bg-background' } as any)}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 + extraBottomPadding }}
        {...({ className: 'w-full self-center px-5 pt-6' } as any)}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View {...({ className: 'items-center mb-5' } as any)}>
          <View {...({ className: 'w-10 h-10 rounded-full bg-primary/10 items-center justify-center mb-2' } as any)}>
            <Gem size={22} color={'green'} {...({ className: 'text-primary' } as any)} />
          </View>
          <Text {...({ className: 'text-xl font-bold text-foreground' } as any)}>Магазин</Text>
          <Text {...({ className: 'mt-1 text-center text-sm text-muted-foreground' } as any)}>
            Разблокируйте премиум‑функции и повысьте продуктивность
          </Text>
        </View>

        {/* Premium Access card */}
        <Card {...({ className: 'rounded-2xl p-5 bg-card border-0 shadow-medium mb-5' } as any)}>
          {/* Header row inside card */}
          <View {...({ className: 'flex-row items-center justify-between mb-4' } as any)}>
            <View {...({ className: 'flex-row items-center' } as any)}>
              <View {...({ className: 'w-8 h-8 rounded-full bg-emerald-500/15 items-center justify-center mr-2' } as any)}>
                <Crown size={18} color="#10b981" />
              </View>
              <Text {...({ className: 'text-base font-semibold text-foreground' } as any)}>
                Premium Access
              </Text>
            </View>

            <Badge {...({ className: 'bg-emerald-500/20 border-0' } as any)}>
              <Text {...({ className: 'text-xs text-emerald-400 font-medium' } as any)}>Most Popular</Text>
            </Badge>
          </View>

          {/* Features list */}
          <View>
            {[...primaryFeatures, ...(expanded ? moreFeatures : [])].map((title) => (
              <View key={title} {...({ className: 'flex-row items-center mb-2.5' } as any)}>
                <View {...({ className: 'w-5 h-5 rounded-[6px] bg-emerald-500/20 items-center justify-center mr-2' } as any)}>
                  <Check size={14} color="#22c55e" />
                </View>
                <Text {...({ className: 'text-sm text-foreground' } as any)}>{title}</Text>
              </View>
            ))}

            {/* Подробнее toggler */}
            <Pressable onPress={() => setExpanded((s) => !s)}>
              <View {...({ className: 'flex-row items-center mt-1' } as any)}>
                <Text {...({ className: 'text-sm font-medium text-emerald-500 mr-1' } as any)}>
                  Подробнее
                </Text>
                <ChevronDown
                  size={16}
                  color={'white'}
                  {...({ className: 'text-emerald-500' } as any)}
                  style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
                />
              </View>
            </Pressable>
          </View>

          {/* Price */}
          <View {...({ className: 'mt-5 flex-row items-center' } as any)}>
            <Text {...({ className: 'text-2xl font-extrabold text-foreground mr-2' } as any)}>1499</Text>
            <Star color={'white'} size={16} />
            <Text {...({ className: 'text-muted-foreground ml-1' } as any)}>Stars</Text>
          </View>

          {/* CTA — fixed height and safe text metrics */}
          <Button
            onPress={() => onSubscribe('monthly-stars')}
            {...({ className: 'mt-4 h-12 w-full rounded-xl bg-emerald-500 active:bg-emerald-600' } as any)}
          >
            <View {...({ className: 'min-w-0 flex-row items-center justify-center' } as any)}>
              <Crown size={16} color="#fff" {...({ className: 'mr-2' } as any)} />
              <Text
                {...({ className: 'text-white font-semibold text-[15px] leading-[20px] text-center shrink ml-2' } as any)}
                numberOfLines={1}
                ellipsizeMode="clip"
                style={{ includeFontPadding: false, textAlignVertical: 'center' as any }}
              >
                Разблокировать премиум
              </Text>
            </View>
          </Button>
        </Card>

        {/* Telegram Stars footer */}
        <Card {...({ className: 'rounded-2xl p-5 bg-card border-0 shadow-medium mb-2 items-center' } as any)}>
          <Star color={'yellow'} size={22} {...({ className: 'text-yellow-400 mb-1' } as any)} />
          <Text {...({ className: 'text-base font-semibold text-foreground' } as any)}>Telegram Stars</Text>
          <Text {...({ className: 'mt-1 text-xs text-muted-foreground' } as any)}>
            Secure payments powered by Telegram
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
};