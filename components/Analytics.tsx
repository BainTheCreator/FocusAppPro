// Analytics.tsx — данные из БД (React Query + Realtime), история с датами: создана / активность / завершена
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft,
  Target as TargetIcon,
  Clock,
  Zap,
  Calendar,
  Award,
  Brain,
  RefreshCw,
} from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGoals, type UiGoal } from '@/lib/api/goals';
import { supabase } from '@/lib/supabase';

type Trend = 'up' | 'down' | 'neutral';
const PRIMARY = '#35D07F';

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
        <Icon color={PRIMARY} size={20} />
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

const fmt = (ts?: number | null) => {
  if (!ts) return '—';
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yy} ${hh}:${mi}`;
};

const HistoryItem = ({ g }: { g: UiGoal }) => (
  <Card {...({ className: 'p-4 bg-card shadow-soft border-0' } as any)}>
    <View {...({ className: 'flex-row items-center justify-between mb-2' } as any)}>
      <View {...({ className: 'flex-row items-center gap-3' } as any)}>
        <Text {...({ className: 'text-lg' } as any)}>{g.icon}</Text>
        <Text {...({ className: 'font-medium text-sm text-foreground' } as any)}>{g.title}</Text>
      </View>
      <Text {...({ className: 'text-xs text-muted-foreground' } as any)}>
        {g.status === 'completed' ? 'Завершена' : g.status === 'paused' ? 'На паузе' : 'Активна'}
      </Text>
    </View>
    <View {...({ className: 'gap-2' } as any)}>
      <View {...({ className: 'flex-row items-center gap-2' } as any)}>
        <Calendar size={14} color="#9CA3AF" />
        <Text {...({ className: 'text-xs text-muted-foreground' } as any)}>Создана: {fmt(g.createdAt)}</Text>
      </View>
      <View {...({ className: 'flex-row items-center gap-2' } as any)}>
        <Zap size={14} color="#9CA3AF" />
        <Text {...({ className: 'text-xs text-muted-foreground' } as any)}>Активность: {fmt(g.lastActivityAt)}</Text>
      </View>
      <View {...({ className: 'flex-row items-center gap-2' } as any)}>
        <Award size={14} color="#9CA3AF" />
        <Text {...({ className: 'text-xs text-muted-foreground' } as any)}>Завершена: {fmt(g.completedAt)}</Text>
      </View>
    </View>
  </Card>
);

interface AnalyticsProps {
  onBack: () => void;
  extraBottomPadding?: number;
}

export const Analytics = ({ onBack, extraBottomPadding = 0 }: AnalyticsProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const qc = useQueryClient();

  // Список целей из БД
  const { data: goals = [], isFetching, refetch } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
    staleTime: 10_000,
  });

  // Realtime: инвалидируем, если что-то поменялось
  useEffect(() => {
    const ch1 = supabase
      .channel('rt:user_targets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_targets' }, () => {
        qc.invalidateQueries({ queryKey: ['goals'] });
      })
      .subscribe();
    const ch2 = supabase
      .channel('rt:target_target')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'target_target' }, () => {
        qc.invalidateQueries({ queryKey: ['goals'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [qc]);

  // Быстрые метрики
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;
  const activeGoals = goals.filter((g) => g.status === 'active').length;
  const successRate = totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // История: сортируем по последней активности, потом по дате создания
  const recentGoals = useMemo(() => {
    const sortKey = (x: UiGoal) => x.lastActivityAt ?? x.createdAt ?? 0;
    return [...goals].sort((a, b) => sortKey(b) - sortKey(a)).slice(0, 10);
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
          <Pressable onPress={() => refetch()} {...({ className: 'flex-row items-center gap-2 px-3 py-2 rounded-lg bg-white/10 active:opacity-80' } as any)}>
            <RefreshCw size={14} color="#fff" />
            <Text {...({ className: 'text-white text-xs' } as any)}>{isFetching ? 'Обновляем...' : 'Обновить'}</Text>
          </Pressable>
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
                <StatCard icon={TargetIcon} label="Всего целей" value={String(totalGoals)} />
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

            {/* AI Insights */}
            <Card {...({ className: 'p-4 bg-gradient-primary text-white shadow-medium border-0 mb-6' } as any)}>
              <View {...({ className: 'flex-row items-center mb-4' } as any)}>
                <Brain size={20} color="white" />
                <Text {...({ className: 'font-semibold text-white ml-2' } as any)}>AI Инсайты</Text>
              </View>
              <View {...({ className: 'space-y-2' } as any)}>
                <Text {...({ className: 'text-sm text-white' } as any)}>🎯 Завершайте цели с высоким прогрессом — это быстрые победы.</Text>
                <Text {...({ className: 'text-sm text-white' } as any)}>⚡ Маленькие шаги каждый день повышают успешность.</Text>
              </View>
            </Card>
          </>
        ) : (
          <>
            {/* History */}
            <View {...({ className: 'space-y-3' } as any)}>
              {recentGoals.map((g) => (
                <HistoryItem key={g.id} g={g} />
              ))}
              {recentGoals.length === 0 && (
                <Text {...({ className: 'text-center text-muted-foreground' } as any)}>Пока нет целей</Text>
              )}
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