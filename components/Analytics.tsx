import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { cssInterop } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  TrendingUp,
  Target,
  Clock,
  Zap,
  Calendar,
  Award,
  Brain,
} from 'lucide-react-native';

// Разрешаем className у LinearGradient
cssInterop(LinearGradient, { className: 'style' });

// ============ UI PRIMITIVES ============

// Card
const Card = ({ className, ...props }: any) => (
  <View
    className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 ${className || ''}`}
    {...props}
  />
);

// Button (variant: 'solid' | 'ghost' | 'outline')
type ButtonProps = {
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: 'solid' | 'ghost' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
};
const Button = ({ children, onPress, variant = 'solid', size = 'md', className }: ButtonProps) => {
  const base = 'flex-row items-center justify-center rounded-xl';
  const sizes = size === 'sm' ? 'px-3 py-2' : 'px-4 py-3';
  const variants =
    variant === 'ghost'
      ? 'bg-transparent'
      : variant === 'outline'
      ? 'bg-transparent border border-slate-300 dark:border-slate-700'
      : 'bg-blue-600';
  return (
    <Pressable onPress={onPress} className={`${base} ${sizes} ${variants} ${className || ''}`}>
      {typeof children === 'string' ? (
        <Text className={variant === 'solid' ? 'text-white font-medium' : 'text-slate-900 dark:text-slate-100 font-medium'}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
};

// Progress
function Progress({ value = 0, color = '#2563eb', className }: { value: number; color?: string; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View className={`h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden ${className || ''}`}>
      <View style={{ width: `${clamped}%`, backgroundColor: color }} className="h-full rounded-full" />
    </View>
  );
}

// Градиенты используем напрямую (className работает через cssInterop)
const GHeader = LinearGradient;
const GCard = LinearGradient;

// ============ SMALL PARTS ============

type IconType = React.ComponentType<{ size?: number; color?: string }>;

const StatCard = ({
  icon: Icon,
  label,
  value,
  change,
  trend,
}: {
  icon: IconType;
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}) => (
  <Card className="p-4 shadow-md w-[48%]">
    <View className="flex-row items-center justify-between mb-2">
      <View className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 items-center justify-center">
        <Icon size={20} color="#2563eb" />
      </View>
      {change ? (
        <Text
          className={`text-xs font-medium ${
            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {change}
        </Text>
      ) : null}
    </View>
    <View>
      <Text className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">{value}</Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400">{label}</Text>
    </View>
  </Card>
);

const CategoryProgress = ({ category, progress, color }: { category: string; progress: number; color: string }) => (
  <View className="mb-3">
    <View className="flex-row justify-between mb-2">
      <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">{category}</Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400">{progress}%</Text>
    </View>
    <Progress value={progress} color={color} />
  </View>
);

const GoalHistory = ({ goal }: { goal: { title: string; icon: string; date: string; status: 'completed' | 'active' | 'paused' } }) => {
  const badge =
    goal.status === 'completed'
      ? { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Завершена' }
      : goal.status === 'active'
      ? { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Активна' }
      : { bg: 'bg-slate-100', text: 'text-slate-700', label: 'На паузе' };

  return (
    <Card className="p-3 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-lg mr-3">{goal.icon}</Text>
          <View>
            <Text className="font-medium text-sm text-slate-900 dark:text-slate-100">{goal.title}</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400">{goal.date}</Text>
          </View>
        </View>
        <View className={`px-2 py-1 rounded-full ${badge.bg}`}>
          <Text className={`text-xs font-medium ${badge.text}`}>{badge.label}</Text>
        </View>
      </View>
    </Card>
  );
};

// ============ MAIN SCREEN ============

export function Analytics({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  const mockStats = {
    totalGoals: 24,
    completedGoals: 8,
    activeGoals: 5,
    averageTime: '3.2 мес',
    successRate: 75,
    currentStreak: 12,
  };

  const categoryData = [
    { category: 'Навыки', progress: 85, color: '#3b82f6' },
    { category: 'Состояние', progress: 65, color: '#22c55e' },
    { category: 'Капитал', progress: 45, color: '#eab308' },
    { category: 'Семья', progress: 90, color: '#ec4899' },
    { category: 'Мышление', progress: 70, color: '#a855f7' },
  ];

  const recentGoals = [
    { id: 1, title: 'Изучить React', icon: '💻', date: '15 дек', status: 'completed' as const },
    { id: 2, title: 'Пробежать 10км', icon: '🏃‍♂️', date: '10 дек', status: 'completed' as const },
    { id: 3, title: 'Прочитать книгу', icon: '📚', date: '5 дек', status: 'active' as const },
    { id: 4, title: 'Выучить 100 слов', icon: '🗣️', date: '1 дек', status: 'paused' as const },
  ];

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <GHeader colors={['#4f46e5', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="px-4 pt-12 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onPress={onBack} className="bg-white/0">
            <ArrowLeft size={18} color="#fff" />
          </Button>
          <Text className="text-white font-semibold">Аналитика</Text>
          <Button variant="ghost" size="sm" className="bg-white/0">
            <Calendar size={18} color="#fff" />
          </Button>
        </View>

        <View className="items-center">
          <Text className="text-2xl font-bold text-white mb-1">Ваш прогресс</Text>
          <Text className="text-white/80">За последние 30 дней</Text>
        </View>
      </GHeader>

      {/* Tabs */}
      <View className="px-4 -mt-3">
        <View className="flex-row bg-slate-200/60 dark:bg-slate-800 rounded-xl p-1 mb-3">
          {[
            { key: 'overview', label: 'Обзор' },
            { key: 'history', label: 'История' },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex-1 py-2 px-3 rounded-lg ${active ? 'bg-white dark:bg-slate-900' : ''}`}
              >
                <Text
                  className={`text-center text-sm font-medium ${
                    active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {activeTab === 'overview' ? (
          <>
            {/* Quick Stats */}
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md mb-4">
              <View className="flex-row justify-between mb-4">
                <StatCard icon={Target as IconType} label="Всего целей" value={String(mockStats.totalGoals)} change="+3 за месяц" trend="up" />
                <StatCard icon={Award as IconType} label="Завершено" value={String(mockStats.completedGoals)} change="+2 за месяц" trend="up" />
              </View>
              <View className="flex-row justify-between">
                <StatCard icon={Zap as IconType} label="Успешность" value={`${mockStats.successRate}%`} change="+5%" trend="up" />
                <StatCard icon={Clock as IconType} label="Серия" value={`${mockStats.currentStreak} дней`} change="Новый рекорд!" trend="up" />
              </View>
            </View>

            {/* Progress by Category */}
            <Card className="p-4 shadow-md mb-4">
              <View className="flex-row items-center mb-4">
                <TrendingUp size={16} color="#0f172a" />
                <Text className="font-semibold ml-2 text-slate-900 dark:text-slate-100">Прогресс по сферам</Text>
              </View>
              <View>
                {categoryData.map((item) => (
                  <CategoryProgress key={item.category} category={item.category} progress={item.progress} color={item.color} />
                ))}
              </View>
            </Card>

            {/* AI Insights */}
            <GCard colors={['#4f46e5', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-4 rounded-2xl shadow-md mb-4">
              <View className="flex-row items-center mb-3">
                <Brain size={20} color="#fff" />
                <Text className="font-semibold text-white ml-2">AI Инсайты</Text>
              </View>
              <View>
                <Text className="text-white/90 text-sm">🎯 Вы отлично справляетесь с целями в сфере "Навыки" — 85% прогресс!</Text>
                <Text className="text-white/90 text-sm">⚡ Рекомендуем больше внимания уделить сфере "Капитал"</Text>
                <Text className="text-white/90 text-sm">🔥 Ваша серия из 12 дней — отличный результат!</Text>
              </View>
            </GCard>
          </>
        ) : (
          <>
            <Text className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Последние цели</Text>
            <View>
              {recentGoals.map((goal) => (
                <GoalHistory key={goal.id} goal={goal} />
              ))}
            </View>
            <View className="mt-6 items-center">
              <Button variant="outline" className="rounded-2xl">
                <Text className="text-slate-900 dark:text-slate-100 font-medium">Показать все цели</Text>
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}