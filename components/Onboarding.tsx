// Onboarding.tsx — React Native + NativeWind версия (фикс обрезания текста в нижней кнопке)
import React, { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { Button } from '@/components/ui/button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Brain,
  BarChart3,
} from 'lucide-react-native';

type Slide = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description: string;
};

const OnboardingSlide = ({ icon: Icon, title, description }: Slide) => (
  <View {...({ className: 'items-center px-6 py-8' } as any)}>
    <View
      {...({
        className:
          'w-20 h-20 rounded-full bg-gradient-primary items-center justify-center mb-6 shadow-medium',
      } as any)}
    >
      <Icon size={40} color="#fff" />
    </View>
    <Text {...({ className: 'text-2xl font-bold text-foreground mb-4 text-center' } as any)}>
      {title}
    </Text>
    <Text
      {...({
        className:
          'text-muted-foreground text-lg leading-relaxed text-center max-w-sm',
      } as any)}
    >
      {description}
    </Text>
  </View>
);

const slides: Slide[] = [
  {
    icon: Target,
    title: 'Структурируйте свою жизнь',
    description:
      'Создавайте цели по сферам жизни и следите за прогрессом с помощью AI',
  },
  {
    icon: Brain,
    title: 'AI декомпозиция задач',
    description:
      'Умный помощник разбивает сложные цели на простые шаги',
  },
  {
    icon: BarChart3,
    title: 'Аналитика и инсайты',
    description:
      'Получайте персональные рекомендации и отслеживайте достижения',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const insets = useSafeAreaInsets();

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((s) => s + 1);
    } else {
      onComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide((s) => s - 1);
  };

  return (
    <View {...({ className: 'flex-1 bg-gradient-hero' } as any)}>
      {/* Header */}
      <View {...({ className: 'flex-row items-center justify-between p-6' } as any)}>
        <Button
          variant="ghost"
          size="sm"
          onPress={prevSlide}
          disabled={currentSlide === 0}
          {...({ className: 'text-white' } as any)}
        >
          <ChevronLeft size={16} color="#fff" />
        </Button>

        <View {...({ className: 'flex-row gap-2' } as any)}>
          {slides.map((_, index) => (
            <View
              key={index}
              {...({
                className:
                  'w-2 h-2 rounded-full transition-all ' +
                  (index === currentSlide ? 'bg-white' : 'bg-white/30'),
              } as any)}
            />
          ))}
        </View>

        <Button
          variant="ghost"
          size="sm"
          onPress={onComplete}
          {...({ className: 'text-white' } as any)}
        >
          Пропустить
        </Button>
      </View>

      {/* Content */}
      <View {...({ className: 'flex-1 items-center justify-center' } as any)}>
        <View {...({ className: 'w-full max-w-md mx-auto' } as any)}>
          <OnboardingSlide {...slides[currentSlide]} />
        </View>
      </View>

      {/* Footer: добавляем safe-area отступ и явную высоту кнопки */}
      <View
        {...({ className: 'px-6' } as any)}
        style={{
          paddingBottom: (insets?.bottom ?? 0) + 12, // чтобы не уезжала под панель
          paddingTop: 12,
        }}
      >
        <Button
          onPress={nextSlide}
          // ВАЖНО: высота кнопки h-14, без внутренних py-4
          {...({
            className:
              'w-full bg-white rounded-2xl shadow-medium h-14',
          } as any)}
        >
          <View {...({ className: 'flex-row items-center justify-center' } as any)}>
            <Text {...({ className: 'font-semibold text-primary text-base' } as any)}>
              {currentSlide === slides.length - 1 ? 'Начать' : 'Далее'}
            </Text>
            {currentSlide < slides.length - 1 && (
              <ChevronRight size={18} color="#6366f1" {...({ className: 'ml-2' } as any)} />
            )}
          </View>
        </Button>
      </View>
    </View>
  );
};