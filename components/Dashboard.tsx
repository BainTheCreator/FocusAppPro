// Dashboard.tsx — React Native + NativeWind (зелёные акценты #35D07F, данные из локального стора)
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Brain,
  BookOpen,
  Play,
  Target,
  TrendingUp,
  Clock,
} from 'lucide-react-native';
import { useGoals } from '@/state/goals';

const categoryIdToLabel: Record<string, string> = {
  health: 'Состояние',
  mind: 'Мышление',
  skills: 'Навыки',
  actions: 'Действия',
  capital: 'Капитал',
  meaning: 'Смыслы',
  family: 'Семья',
  environment: 'Окружение',
};

const showCategory = (v?: string) => (v ? categoryIdToLabel[v] || v : '—');

const GoalCard = ({
  goal,
  onPlay,
}: {
  goal: any;
  onPlay: () => void;
}) => (
  <Card {...({ className: 'p-4 bg-gradient-card shadow-medium border-0 transition-all duration-300' } as any)}>
    <View {...({ className: 'flex-row items-start justify-between mb-3' } as any)}>
      <View {...({ className: 'flex-row items-center space-x-3' } as any)}>
        <Text {...({ className: 'w-8 h-8 text-xl' } as any)}>{goal.icon}</Text>
        <View>
          <Text {...({ className: 'font-semibold text-foreground' } as any)}>{goal.title}</Text>
          <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>{showCategory(goal.category)}</Text>
        </View>
      </View>
      <Badge variant={goal.status === 'active' ? 'default' : goal.status === 'paused' ? 'secondary' : 'outline'}>
        <Text className='text-white'>
          {goal.status === 'active' ? 'Активна' : goal.status === 'paused' ? 'На паузе' : 'Завершена'}
        </Text>
      </Badge>
    </View>

    <View {...({ className: 'space-y-3' } as any)}>
      <View>
        <View {...({ className: 'flex-row justify-between mb-1' } as any)}>
          <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>Прогресс</Text>
          <Text {...({ className: 'text-sm font-medium text-white' } as any)}>{goal.progress}%</Text>
        </View>
        <Progress value={goal.progress} {...({ className: 'h-2' } as any)} />
      </View>

      <View {...({ className: 'flex-row items-center justify-between' } as any)}>
        <View {...({ className: 'flex-row items-center' } as any)}>
          <Clock size={12} color="#35D07F" />
          <Text {...({ className: 'text-sm text-muted-foreground ml-1' } as any)}>{goal.deadline || '—'}</Text>
        </View>
        <Button size="sm" variant="ghost" onPress={onPlay} {...({ className: 'h-8 px-3' } as any)}>
          <View {...({ className: 'flex-row items-center' } as any)}>
            <Play size={12} color="#35D07F" />
            <Text {...({ className: 'text-sm text-primary ml-1' } as any)}>Открыть</Text>
          </View>
        </Button>
      </View>
    </View>
  </Card>
);

const StatCard = ({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  trend?: string;
}) => (
  <Card {...({ className: 'p-4 bg-card shadow-soft border-0' } as any)}>
    <View {...({ className: 'flex-row items-center justify-between' } as any)}>
      <View>
        <Text {...({ className: 'text-sm text-muted-foreground mb-1' } as any)}>{label}</Text>
        <Text {...({ className: 'text-2xl font-bold text-foreground' } as any)}>{value}</Text>
        {trend ? <Text {...({ className: 'text-xs text-primary font-medium mt-1' } as any)}>{trend}</Text> : null}
      </View>
      <View {...({ className: 'w-10 h-10 rounded-lg bg-primary/10 items-center justify-center' } as any)}>
        <Icon size={20} color="#35D07F" />
      </View>
    </View>
  </Card>
);

interface DashboardProps {
  onCreateGoal: () => void;
  onLibrary: () => void;
  onAnalytics: () => void;
  extraBottomPadding?: number;
}

export const Dashboard = ({ onCreateGoal, onLibrary, onAnalytics, extraBottomPadding = 0 }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState<'active' | 'paused' | 'completed'>('active');
  const { goals, incrementProgress } = useGoals();

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => (activeTab === 'active' ? g.status === 'active' : activeTab === 'paused' ? g.status === 'paused' : g.status === 'completed'));
  }, [goals, activeTab]);

  const activeCount = goals.filter((g) => g.status === 'active').length;
  const avgProgress = useMemo(() => {
    if (!goals.length) return 0;
    const sum = goals.reduce((acc, g) => acc + (g.progress || 0), 0);
    return Math.round(sum / goals.length);
  }, [goals]);

  return (
    <View {...({ className: 'bg-background' } as any)}>
      {/* Header */}
      <View {...({ className: 'bg-gradient-primary py-6' } as any)}>
        <View {...({ className: 'max-w-md px-5' } as any)}>
          <Text {...({ className: 'text-2xl font-bold text-white mb-2' } as any)}>FocusAppPro</Text>
          <Text {...({ className: 'text-white/80' } as any)}>Доброе утро! Время достигать целей 🎯</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 + extraBottomPadding }} {...({ className: 'mt-4' } as any)}>
        {/* Quick Stats */}
        <View {...({ className: 'grid grid-cols-2 gap-3 mb-6' } as any)}>
          <StatCard icon={Target} label="Активных целей" value={String(activeCount)} trend={activeCount ? '+1 за неделю' : undefined} />
          <StatCard icon={TrendingUp} label="Средний прогресс" value={`${avgProgress}%`} trend={avgProgress ? '+3% за месяц' : undefined} />
        </View>

        {/* Action Buttons */}
        <View {...({ className: 'grid grid-cols-3 gap-3 mb-6' } as any)}>
          <Button onPress={onCreateGoal} {...({ className: 'flex-col items-center justify-center h-16 bg-primary rounded-2xl' } as any)}>
            <Plus size={20} color="#fff" {...({ className: 'mb-1' } as any)} />
            <Text {...({ className: 'text-xs text-white' } as any)}>Создать</Text>
          </Button>

          <Button onPress={() => {}} variant="outline" {...({ className: 'flex-col items-center justify-center h-16 border-primary rounded-2xl' } as any)}>
            <Brain size={20} color="#35D07F" {...({ className: 'mb-1' } as any)} />
            <Text {...({ className: 'text-xs text-primary' } as any)}>AI помощь</Text>
          </Button>

          <Button onPress={onLibrary} variant="outline" {...({ className: 'flex-col items-center justify-center h-16 border-primary rounded-2xl' } as any)}>
            <BookOpen size={20} color="#35D07F" {...({ className: 'mb-1' } as any)} />
            <Text {...({ className: 'text-xs text-primary' } as any)}>Библиотека</Text>
          </Button>
        </View>

        {/* Goals Tabs */}
        <View {...({ className: 'flex-row bg-muted rounded-xl p-1 mb-4' } as any)}>
          {[
            { key: 'active', label: 'Активные' },
            { key: 'paused', label: 'На паузе' },
            { key: 'completed', label: 'Завершенные' },
          ].map((tab) => {
            const isActive = activeTab === (tab.key as any);
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                {...({
                  className:
                    'flex-1 rounded-lg items-center justify-center py-2 px-3 transition-all ' +
                    (isActive ? 'bg-primary/15 border border-primary/30' : 'bg-transparent'),
                } as any)}
              >
                <Text
                  {...({
                    className:
                      'text-sm font-medium ' +
                      (isActive ? 'text-primary' : 'text-muted-foreground'),
                  } as any)}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Goals List */}
        <View {...({ className: 'space-y-3 flex flex-col gap-3' } as any)}>
          {filteredGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onPlay={() => incrementProgress(goal.id, 10)} />
          ))}

          {filteredGoals.length === 0 && (
            <View {...({ className: 'items-center py-8' } as any)}>
              <View {...({ className: 'w-16 h-16 rounded-full bg-muted items-center justify-center mb-4' } as any)}>
                <Target size={32} color="#35D07F" />
              </View>
              <Text {...({ className: 'font-semibold text-foreground mb-2' } as any)}>Пока пусто</Text>
              <Text {...({ className: 'text-sm text-muted-foreground mb-4 text-center' } as any)}>
                {activeTab === 'active' ? 'Создайте свою первую цель' : 'Нет целей в этой категории'}
              </Text>
              {activeTab === 'active' && (
                <Button onPress={onCreateGoal} variant="outline" {...({ className: 'border-primary' } as any)}>
                  <View {...({ className: 'flex-row items-center' } as any)}>
                    <Plus size={16} color="#35D07F" />
                    <Text {...({ className: 'text-primary ml-2' } as any)}>Создать цель</Text>
                  </View>
                </Button>
              )}
            </View>
          )}
        </View>

        {/* Bottom Action */}
        <View {...({ className: 'mt-8 items-center' } as any)}>
          <Button onPress={onAnalytics} variant="outline" {...({ className: 'w-full rounded-2xl border-primary' } as any)}>
            <View {...({ className: 'flex-row items-center justify-center' } as any)}>
              <TrendingUp size={16} color="#35D07F" />
              <Text {...({ className: 'text-primary ml-2' } as any)}>Посмотреть аналитику</Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};