// components/Dashboard.tsx — цели из БД + модалка подзадач + AI помощь
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Brain,
  BookOpen,
  Play,
  Target as TargetIcon,
  TrendingUp,
  Clock,
  CheckSquare,
  Square,
  PauseCircle,
  PlayCircle,
  X,
  RefreshCw,
} from 'lucide-react-native';

import {
  fetchGoals,
  toggleSubtask,
  setGoalStatus,
  type UiGoal,
  type DbSubtask,
} from '@/lib/api/goals';
import { aiInsights } from '@/lib/api/ai';
import { supabase } from '@/lib/supabase';

const PRIMARY = '#35D07F';

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
        <Icon size={20} color={PRIMARY} />
      </View>
    </View>
  </Card>
);

const GoalCard = ({ goal, onOpen }: { goal: UiGoal; onOpen: () => void }) => (
  <Card {...({ className: 'p-4 bg-gradient-card shadow-medium border-0 transition-all duration-300' } as any)}>
    <View {...({ className: 'flex-row items-start justify-between mb-3' } as any)}>
      <View {...({ className: 'flex-row items-center space-x-3' } as any)}>
        <Text {...({ className: 'w-8 h-8 text-xl' } as any)}>{goal.icon}</Text>
        <View>
          <Text {...({ className: 'font-semibold text-foreground' } as any)}>{goal.title}</Text>
          <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>{goal.deadline || '—'}</Text>
        </View>
      </View>
      <Badge
        variant={
          goal.status === 'active' ? 'default' : goal.status === 'paused' ? 'secondary' : 'outline'
        }
      >
        <Text className="text-white">
          {goal.status === 'completed' ? 'Завершена' : goal.status === 'paused' ? 'На паузе' : 'Активна'}
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
          <Clock size={12} color={PRIMARY} />
          <Text {...({ className: 'text-sm text-muted-foreground ml-1' } as any)}>{goal.subtasksCount} шагов</Text>
        </View>
        <Button size="sm" variant="ghost" onPress={onOpen} {...({ className: 'h-8 px-3' } as any)}>
          <View {...({ className: 'flex-row items-center' } as any)}>
            <Play size={12} color={PRIMARY} />
            <Text {...({ className: 'text-sm text-primary ml-1' } as any)}>Открыть</Text>
          </View>
        </Button>
      </View>
    </View>
  </Card>
);

interface DashboardProps {
  onCreateGoal: () => void;
  onLibrary: () => void;
  onAnalytics: () => void;
  extraBottomPadding?: number;
  isAuthed: boolean; // ← важный флаг
}

export const Dashboard = ({
  onCreateGoal,
  onLibrary,
  onAnalytics,
  extraBottomPadding = 0,
  isAuthed,
}: DashboardProps) => {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused' | 'completed'>('active');

  // Список целей — только после авторизации
  const { data: goals = [], isFetching, refetch, error, isLoading, isError } = useQuery({
    queryKey: ['goals'],
    queryFn: () => fetchGoals(),
    staleTime: 10_000,
    enabled: !!isAuthed,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Realtime invalidate — только если авторизованы
  useEffect(() => {
    if (!isAuthed) return;
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
  }, [qc, isAuthed]);

  // Быстрые метрики
  const stats = useMemo(() => {
    const total = goals.length;
    const active = goals.filter((g) => g.status === 'active').length;
    const paused = goals.filter((g) => g.status === 'paused').length;
    const completed = goals.filter((g) => g.status === 'completed').length;
    const avgProgress = total ? Math.round(goals.reduce((a, g) => a + (g.progress || 0), 0) / total) : 0;
    return { total, active, paused, completed, avgProgress };
  }, [goals]);

  const filteredGoals = useMemo(() => {
    if (activeTab === 'all') return goals;
    return goals.filter((g) => g.status === activeTab);
  }, [goals, activeTab]);

  // Модалка детали цели
  const [openGoal, setOpenGoal] = useState<UiGoal | null>(null);
  const openSubtasks: DbSubtask[] = useMemo(() => openGoal?.subtasks ?? [], [openGoal]);

  // Тоггл подзадачи
  const handleToggleSubtask = async (s: DbSubtask) => {
    if (!openGoal) return;
    setOpenGoal((prev) =>
      prev ? { ...prev, subtasks: (prev.subtasks ?? []).map((x) => (x.id === s.id ? { ...x, is_complete: !x.is_complete } : x)) } : prev
    );
    try {
      const res = await toggleSubtask(s.id, !s.is_complete);
      qc.setQueryData(['goals'], (prev: any) => {
        const list: UiGoal[] = (prev as UiGoal[]) ?? [];
        return list.map((g) => (g.id === s.target_id ? { ...g, progress: res.progress } : g));
      });
    } catch {
      setOpenGoal((prev) =>
        prev ? { ...prev, subtasks: (prev.subtasks ?? []).map((x) => (x.id === s.id ? { ...x, is_complete: s.is_complete } : x)) } : prev
      );
      await refetch();
    }
  };

  // Смена статуса цели
  const handleSetGoalStatus = async (goal: UiGoal, status: 'active' | 'paused' | 'completed') => {
    qc.setQueryData(['goals'], (prev: any) => {
      const list: UiGoal[] = (prev as UiGoal[]) ?? [];
      return list.map((g) => (g.id === goal.id ? { ...g, status } : g));
    });
    setOpenGoal((prev) => (prev && prev.id === goal.id ? { ...prev, status } : prev));
    try {
      await setGoalStatus(goal.id, status);
    } catch {
      await refetch();
    }
  };

  /* ========================= AI ПОМОЩЬ ========================= */
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState<string>('');

  const summarizeGoals = (arr: UiGoal[]) => {
    const total = arr.length;
    const completed = arr.filter((g) => g.status === 'completed').length;
    const active = arr.filter((g) => g.status === 'active').length;
    const paused = arr.filter((g) => g.status === 'paused').length;
    const top = [...arr]
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5)
      .map((g) => `- ${g.title} [${g.status}] • прогресс ${g.progress}% • шагов ${g.subtasksCount}`)
      .join('\n');

    return `Всего целей: ${total}, активных: ${active}, на паузе: ${paused}, завершено: ${completed}.
Топ по прогрессу:
${top || '- нет'}`;
  };

  const fetchAiHelp = async () => {
    if (!isAuthed) return;
    try {
      setAiLoading(true);
      const summary = summarizeGoals(goals);
      const text = await aiInsights(summary);
      setAiText(text);
    } catch {
      setAiText('Не удалось получить советы. Попробуйте ещё раз.');
    } finally {
      setAiLoading(false);
    }
  };

  const openAiModal = () => {
    setAiOpen(true);
    setAiText('');
    fetchAiHelp();
  };

  return (
    <View {...({ className: 'bg-background' } as any)}>
      {/* Header */}
      <View {...({ className: 'bg-gradient-primary py-6' } as any)}>
        <View {...({ className: 'max-w-md px-5 flex-row items-center justify-between' } as any)}>
          <View>
            <Text {...({ className: 'text-2xl font-bold text-white mb-1' } as any)}>FocusAppPro</Text>
            {isError && (
              <Text>{String(error)}</Text>
            )}
            <Text {...({ className: 'text-white/80' } as any)}>
              {!isAuthed ? 'Войдите, чтобы видеть цели' : isFetching ? 'Обновляем цели…' : 'Добро пожаловать! 🎯'}
            </Text>
          </View>
          <Pressable onPress={() => isAuthed && refetch()} disabled={!isAuthed} {...({ className: 'px-3 py-2 rounded-lg bg-white/10 active:opacity-80' } as any)}>
            <View {...({ className: 'flex-row items-center' } as any)}>
              <RefreshCw size={14} color="#fff" />
              <Text {...({ className: 'text-white text-xs ml-1' } as any)}>{isFetching ? '...' : 'Обновить'}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 + extraBottomPadding }} {...({ className: 'mt-4' } as any)}>
        {!isAuthed ? (
          <View {...({ className: 'items-center py-12' } as any)}>
            <View {...({ className: 'w-16 h-16 rounded-full bg-muted items-center justify-center mb-4' } as any)}>
              <TargetIcon size={32} color={PRIMARY} />
            </View>
            <Text {...({ className: 'font-semibold text-foreground mb-2' } as any)}>Требуется вход</Text>
            <Text {...({ className: 'text-sm text-muted-foreground text-center' } as any)}>
              Авторизуйтесь, чтобы просматривать и управлять целями.
            </Text>
          </View>
        ) : (
          <>
            {/* Quick Stats */}
            <View {...({ className: 'grid grid-cols-2 gap-3 mb-6' } as any)}>
              <StatCard icon={TargetIcon} label="Всего целей" value={String(stats.total)} />
              <StatCard icon={TrendingUp} label="Средний прогресс" value={`${stats.avgProgress}%`} />
            </View>

            {/* Actions */}
            <View {...({ className: 'grid grid-cols-3 gap-3 mb-6' } as any)}>
              <Button onPress={onCreateGoal} {...({ className: 'flex-col items-center justify-center h-16 bg-primary rounded-2xl' } as any)}>
                <Plus size={20} color="#fff" {...({ className: 'mb-1' } as any)} />
                <Text {...({ className: 'text-xs text-white' } as any)}>Создать</Text>
              </Button>

              <Button onPress={openAiModal} variant="outline" {...({ className: 'flex-col items-center justify-center h-16 border-primary rounded-2xl' } as any)}>
                <Brain size={20} color={PRIMARY} {...({ className: 'mb-1' } as any)} />
                <Text {...({ className: 'text-xs text-primary' } as any)}>AI помощь</Text>
              </Button>

              <Button onPress={onLibrary} variant="outline" {...({ className: 'flex-col items-center justify-center h-16 border-primary rounded-2xl' } as any)}>
                <BookOpen size={20} color={PRIMARY} {...({ className: 'mb-1' } as any)} />
                <Text {...({ className: 'text-xs text-primary' } as any)}>Библиотека</Text>
              </Button>
            </View>

            {/* Tabs */}
            <View {...({ className: 'flex-row bg-muted rounded-xl p-1 mb-4' } as any)}>
              {[
                { key: 'active', label: 'Активные' },
                { key: 'paused', label: 'На паузе' },
                { key: 'completed', label: 'Завершенные' },
                { key: 'all', label: 'Все' },
              ].map((tab) => {
                const isActive = activeTab === (tab.key as any);
                return (
                  <Pressable key={tab.key} onPress={() => setActiveTab(tab.key as any)} {...({ className: 'flex-1 rounded-lg items-center justify-center py-2 px-3 transition-all ' + (isActive ? 'bg-primary/15 border border-primary/30' : 'bg-transparent') } as any)}>
                    <Text {...({ className: 'text-sm font-medium ' + (isActive ? 'text-primary' : 'text-muted-foreground') } as any)}>{tab.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Goals */}
            <View {...({ className: 'space-y-3 flex flex-col gap-3' } as any)}>
              {filteredGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onOpen={() => setOpenGoal(goal)} />
              ))}

              {filteredGoals.length === 0 && (
                <View {...({ className: 'items-center py-8' } as any)}>
                  <View {...({ className: 'w-16 h-16 rounded-full bg-muted items-center justify-center mb-4' } as any)}>
                    <TargetIcon size={32} color={PRIMARY} />
                  </View>
                  <Text {...({ className: 'font-semibold text-foreground mb-2' } as any)}>Пока пусто</Text>
                  <Text {...({ className: 'text-sm text-muted-foreground mb-4 text-center' } as any)}>
                    {activeTab === 'active' ? 'Создайте свою первую цель' : 'Нет целей в этой вкладке'}
                  </Text>
                  {activeTab === 'active' && (
                    <Button onPress={onCreateGoal} variant="outline" {...({ className: 'border-primary' } as any)}>
                      <View {...({ className: 'flex-row items-center' } as any)}>
                        <Plus size={16} color={PRIMARY} />
                        <Text {...({ className: 'text-primary ml-2' } as any)}>Создать цель</Text>
                      </View>
                    </Button>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Goal Detail Modal */}
      <Modal transparent visible={!!openGoal} onRequestClose={() => setOpenGoal(null)} animationType="slide">
        <View {...({ className: 'flex-1 bg-black/60 justify-end' } as any)}>
          <View {...({ className: 'rounded-t-2xl bg-card px-5 pt-4 pb-6' } as any)}>
            <View {...({ className: 'flex-row items-center justify-between mb-2' } as any)}>
              <Text {...({ className: 'text-foreground text-lg font-semibold' } as any)}>
                {openGoal?.icon} {openGoal?.title}
              </Text>
              <Pressable onPress={() => setOpenGoal(null)} {...({ className: 'p-2 rounded-lg active:opacity-70' } as any)}>
                <X size={18} color="#9CA3AF" />
              </Pressable>
            </View>

            {openGoal?.description ? <Text {...({ className: 'text-muted-foreground mb-2' } as any)}>{openGoal.description}</Text> : null}

            <View {...({ className: 'flex-row items-center mb-3' } as any)}>
              <Clock size={14} color={PRIMARY} />
              <Text {...({ className: 'text-sm text-muted-foreground ml-1' } as any)}>Дедлайн: {openGoal?.deadline || '—'}</Text>
            </View>

            {openGoal && (
              <View {...({ className: 'flex-row gap-2 mb-3' } as any)}>
                <Button variant={openGoal.status === 'active' ? 'default' : 'outline'} onPress={() => handleSetGoalStatus(openGoal, 'active')} {...({ className: 'flex-1 h-10' } as any)}>
                  <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                    <PlayCircle size={14} color={openGoal.status === 'active' ? '#fff' : PRIMARY} />
                    <Text {...({ className: 'ml-1 ' + (openGoal.status === 'active' ? 'text-primary-foreground' : 'text-primary') } as any)}>Активна</Text>
                  </View>
                </Button>
                <Button variant={openGoal.status === 'paused' ? 'default' : 'outline'} onPress={() => handleSetGoalStatus(openGoal, 'paused')} {...({ className: 'flex-1 h-10' } as any)}>
                  <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                    <PauseCircle size={14} color={openGoal.status === 'paused' ? '#fff' : PRIMARY} />
                    <Text {...({ className: 'ml-1 ' + (openGoal.status === 'paused' ? 'text-primary-foreground' : 'text-primary') } as any)}>Пауза</Text>
                  </View>
                </Button>
                <Button variant={openGoal.status === 'completed' ? 'default' : 'outline'} onPress={() => handleSetGoalStatus(openGoal, 'completed')} {...({ className: 'flex-1 h-10' } as any)}>
                  <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                    <CheckSquare size={14} color={openGoal.status === 'completed' ? '#fff' : PRIMARY} />
                    <Text {...({ className: 'ml-1 ' + (openGoal.status === 'completed' ? 'text-primary-foreground' : 'text-primary') } as any)}>Готово</Text>
                  </View>
                </Button>
              </View>
            )}

            <Text {...({ className: 'text-foreground/90 font-semibold mb-2' } as any)}>Подзадачи</Text>
            <View {...({ className: 'max-h-[50vh]' } as any)}>
              <ScrollView>
                {(openSubtasks?.length ?? 0) === 0 ? (
                  <Text {...({ className: 'text-muted-foreground' } as any)}>Подзадач нет</Text>
                ) : (
                  openSubtasks.map((s) => (
                    <Pressable key={s.id} onPress={() => handleToggleSubtask(s)} {...({ className: 'rounded-xl border border-border px-3 py-2 mb-2 active:opacity-80' } as any)}>
                      <View {...({ className: 'flex-row items-center justify-between' } as any)}>
                        <Text {...({ className: 'text-foreground flex-1 mr-3' } as any)}>{s.name || 'Без названия'}</Text>
                        {s.is_complete ? <CheckSquare size={18} color={PRIMARY} /> : <Square size={18} color="#9CA3AF" />}
                      </View>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Help Modal */}
      <Modal transparent visible={aiOpen} onRequestClose={() => setAiOpen(false)} animationType="slide">
        <View {...({ className: 'flex-1 bg-black/60 justify-end' } as any)}>
          <View {...({ className: 'rounded-t-2xl bg-card px-5 pt-4 pb-6' } as any)}>
            <View {...({ className: 'flex-row items-center justify-between mb-2' } as any)}>
              <Text {...({ className: 'text-foreground text-lg font-semibold' } as any)}>AI помощь</Text>
              <Pressable onPress={() => setAiOpen(false)} {...({ className: 'p-2 rounded-lg active:opacity-70' } as any)}>
                <X size={18} color="#9CA3AF" />
              </Pressable>
            </View>

            <Card {...({ className: 'p-4 bg-gradient-card border-0 mb-3' } as any)}>
              <Text {...({ className: 'text-white/90 mb-1' } as any)}>Советы по ускорению прогресса и приоритетам.</Text>
              <Text {...({ className: 'text-white/60 text-xs' } as any)}>Генерация на основе ваших текущих целей.</Text>
            </Card>

            <View {...({ className: 'min-h-[140px] rounded-2xl border border-border bg-card p-4' } as any)}>
              {aiLoading ? (
                <View {...({ className: 'flex-row items-center' } as any)}>
                  <ActivityIndicator color={PRIMARY} />
                  <Text {...({ className: 'text-muted-foreground ml-2' } as any)}>AI думает…</Text>
                </View>
              ) : (
                <Text {...({ className: 'text-foreground' } as any)}>{aiText || 'Нет данных'}</Text>
              )}
            </View>

            <View {...({ className: 'flex-row gap-2 mt-3' } as any)}>
              <Button variant="outline" onPress={() => fetchAiHelp()} disabled={aiLoading || !isAuthed} {...({ className: 'flex-1 h-11' } as any)}>
                <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                  <Brain size={14} color={PRIMARY} />
                  <Text {...({ className: 'text-primary ml-1' } as any)}>Обновить советы</Text>
                </View>
              </Button>
              <Button onPress={() => setAiOpen(false)} {...({ className: 'flex-1 h-11' } as any)}>
                <Text {...({ className: 'text-primary-foreground' } as any)}>Закрыть</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};