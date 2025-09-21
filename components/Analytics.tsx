// Analytics.tsx — React Native + NativeWind (зелёные акценты, табы снизу, история на полную ширину, данные из стора)
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import { useGoals } from '@/state/goals';

type Trend = 'up' | 'down' | 'neutral';

const StatCard = ({
  icon: Icon,
  label,
  value,
  change,
  trend,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  change?: string;
  trend?: Trend;
}) => (
  <Card {...({ className: 'p-4 bg-gradient-card shadow-medium border-0' } as any)}>
    <View {...({ className: 'flex-row items-center justify-between mb-2' } as any)}>
      <View {...({ className: 'w-10 h-10 rounded-lg bg-primary/10 items-center justify-center mb-2' } as any)}>
        <Icon color="#35D07F" size={20} />
      </View>
      {change ? (
        <Text
          {...({
            className:
              'text-xs font-medium ' +
              (trend === 'up'
                ? 'text-primary'
                : trend === 'down'
                ? 'text-red-400'
                : 'text-muted-foreground'),
          } as any)}
        >
          {change}
        </Text>
      ) : null}
    </View>
    <View>
      <Text {...({ className: 'text-2xl font-bold text-foreground mb-1' } as any)}>{value}</Text>
      <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>{label}</Text>
    </View>
  </Card>
);

const CategoryProgress = ({
  category,
  progress,
  color = 'bg-primary',
}: {
  category: string;
  progress: number;
  color?: string;
}) => (
  <View {...({ className: 'space-y-2' } as any)}>
    <View {...({ className: 'flex-row justify-between' } as any)}>
      <Text {...({ className: 'text-sm font-medium text-foreground' } as any)}>{category}</Text>
      <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>{progress}%</Text>
    </View>
    <Progress value={progress} {...({ className: 'h-2', indicatorClassName: color } as any)} />
  </View>
);

const GoalHistory = ({ goal }: { goal: any }) => {
  const statusContainer =
    goal.status === 'completed'
      ? 'bg-primary/15'
      : goal.status === 'active'
      ? 'bg-white/10'
      : 'bg-muted';
  const statusText =
    goal.status === 'completed'
      ? 'text-primary'
      : goal.status === 'active'
      ? 'text-white'
      : 'text-muted-foreground';

  return (
    <Card {...({ className: 'p-4 bg-card shadow-soft border-0' } as any)}>
      <View {...({ className: 'flex-row items-center justify-between' } as any)}>
        <View {...({ className: 'flex-row items-center space-x-3' } as any)}>
          <Text {...({ className: 'text-lg' } as any)}>{goal.icon}</Text>
          <View>
            <Text {...({ className: 'font-medium text-sm text-foreground' } as any)}>{goal.title}</Text>
            <Text {...({ className: 'text-xs text-muted-foreground' } as any)}>{goal._date}</Text>
          </View>
        </View>
        <View {...({ className: `px-2 py-1 rounded-full ${statusContainer}` } as any)}>
          <Text {...({ className: `text-xs font-medium ${statusText}` } as any)}>
            {goal.status === 'completed' ? 'Завершена' : goal.status === 'active' ? 'Активна' : 'На паузе'}
          </Text>
        </View>
      </View>
    </Card>
  );
};

interface AnalyticsProps {
  onBack: () => void;
  extraBottomPadding?: number;
}

export const Analytics = ({ onBack, extraBottomPadding = 0 }: AnalyticsProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const { goals } = useGoals();

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;
  const activeGoals = goals.filter((g) => g.status === 'active').length;
  const successRate = totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const categoryData = useMemo(() => {
    const map = new Map<string, { sum: number; cnt: number }>();
    goals.forEach((g) => {
      const key = g.category || 'Прочее';
      const rec = map.get(key) ?? { sum: 0, cnt: 0 };
      rec.sum += g.progress || 0;
      rec.cnt += 1;
      map.set(key, rec);
    });
    const arr = Array.from(map.entries()).map(([category, { sum, cnt }]) => ({
      category,
      progress: cnt ? Math.round(sum / cnt) : 0,
    }));
    return arr.map((it, i) => ({
      ...it,
      color: ['bg-primary', 'bg-primary/90', 'bg-primary/80', 'bg-primary/70', 'bg-primary/60'][i % 5],
    }));
  }, [goals]);

  const recentGoals = useMemo(() => {
    const fmt = (ts: number) => {
      const d = new Date(ts);
      return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1)
        .toString()
        .padStart(2, '0')}.${d.getFullYear().toString().slice(-2)}`;
    };
    return [...goals]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 10)
      .map((g) => ({ ...g, _date: fmt(g.createdAt) }));
  }, [goals]);

  const TABS_HEIGHT = 60;

  return (
    <View {...({ className: 'flex-1 bg-background' } as any)}>
      {/* Header */}
      <View {...({ className: 'bg-gradient-primary p-4' } as any)}>
        <View {...({ className: 'flex-row items-center justify-between mb-4' } as any)}>
          <Button variant="ghost" size="sm" onPress={onBack} {...({ className: 'text-white hover:bg-white/10' } as any)}>
            <ArrowLeft size={16} color="white" />
          </Button>
        </View>

        {activeTab === 'overview' && (
          <View {...({ className: 'items-center' } as any)}>
            <Text {...({ className: 'text-2xl font-bold text-white mb-1' } as any)}>Ваш прогресс</Text>
            <Text {...({ className: 'text-white/80' } as any)}>По вашим целям</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 + TABS_HEIGHT + extraBottomPadding }}
        {...({ className: 'px-4 -mt-2' } as any)}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' ? (
          <>
            {/* Quick Stats */}
            <View {...({ className: 'bg-card rounded-2xl p-4 shadow-medium mb-6' } as any)}>
              <View {...({ className: 'grid grid-cols-2 gap-4 mb-4' } as any)}>
                <StatCard icon={Target} label="Всего целей" value={String(totalGoals)} />
                <StatCard icon={Award} label="Завершено" value={String(completedGoals)} />
              </View>
              <View {...({ className: 'grid grid-cols-2 gap-4' } as any)}>
                <StatCard
                  icon={Zap}
                  label="Успешность"
                  value={`${successRate}%`}
                  change={successRate ? '+5%' : undefined}
                  trend={successRate ? 'up' : 'neutral'}
                />
                <StatCard icon={Clock} label="Активные" value={`${activeGoals}`} />
              </View>
            </View>

            {/* Progress by Category */}
            <Card {...({ className: 'p-4 shadow-medium border-0 mb-6' } as any)}>
              <View {...({ className: 'flex-row items-center mb-4' } as any)}>
                <TrendingUp color="#35D07F" size={16} />
                <Text {...({ className: 'font-semibold text-foreground ml-2' } as any)}>Прогресс по сферам</Text>
              </View>
              <View {...({ className: 'space-y-4' } as any)}>
                {categoryData.map((item) => (
                  <CategoryProgress key={item.category} category={item.category} progress={item.progress} color={item.color} />
                ))}
              </View>
            </Card>

            {/* AI Insights */}
            <Card {...({ className: 'p-4 bg-gradient-primary text-white shadow-medium border-0 mb-6' } as any)}>
              <View {...({ className: 'flex-row items-center mb-4' } as any)}>
                <Brain size={20} color="white" />
                <Text {...({ className: 'font-semibold text-white ml-2' } as any)}>AI Инсайты</Text>
              </View>
              <View {...({ className: 'space-y-2' } as any)}>
                <Text {...({ className: 'text-sm text-white' } as any)}>🎯 Сделайте фокус на сферах с низким прогрессом для быстрого роста.</Text>
                <Text {...({ className: 'text-sm text-white' } as any)}>⚡ Маленькие ежедневные шаги ускоряют завершение целей.</Text>
              </View>
            </Card>
          </>
        ) : (
          <>
            {/* Recent Goals */}
            <View {...({ className: 'space-y-3' } as any)}>
              {recentGoals.map((goal) => (
                <GoalHistory key={goal.id} goal={goal} />
              ))}
              {recentGoals.length === 0 && <Text {...({ className: 'text-center text-muted-foreground' } as any)}>Пока нет целей</Text>}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Tabs */}
      <View style={{ paddingBottom: 12, paddingTop: 8 }} {...({ className: 'px-4 border-t border-border bg-card/95' } as any)}>
        <View {...({ className: 'flex-row bg-muted rounded-xl p-1' } as any)}>
          {[
            { key: 'overview', label: 'Обзор' },
            { key: 'history', label: 'История' },
          ].map((tab) => {
            const active = activeTab === (tab.key as any);
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as 'overview' | 'history')}
                {...({
                  className:
                    'flex-1 rounded-lg items-center justify-center py-2 px-3 transition-all ' +
                    (active ? 'bg-primary/15 border border-primary/30' : 'bg-transparent'),
                } as any)}
              >
                <Text
                  {...({
                    className:
                      'text-sm font-medium ' +
                      (active ? 'text-primary' : 'text-muted-foreground'),
                  } as any)}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};