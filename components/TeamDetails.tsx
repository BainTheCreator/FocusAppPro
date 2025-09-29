// components/TeamDetails.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Users,
  Crown,
  Plus,
  Link as LinkIcon,
  PauseCircle,
  PlayCircle,
  Archive,
  LogOut,
  Target as TargetIcon,
  Clock,
  CheckSquare,
  Square,
  X,
  RefreshCw,
} from 'lucide-react-native';
import { toggleSubtask, setGoalStatus } from '@/lib/api/goals';
import { createInvite, leaveTeam, setTeamStatus } from '@/lib/api/teams';

type TeamStatus = 'active' | 'paused' | 'archived';
type GoalStatus = 'active' | 'paused' | 'completed';

type UiGoal = {
  id: number;
  title: string;
  description: string | null;
  icon: string;
  deadline: string | null;
  status: GoalStatus;
  progress: number;
  subtasksCount: number;
  createdAt?: number | null;
};

type DbSubtask = { id: number; name: string | null; is_complete: boolean; target_id: number };
type Member = { user_id: number; role: 'owner' | 'admin' | 'member'; name: string | null };
type TeamInfo = { id: number; name: string; emoji: string | null; description: string | null; status: TeamStatus; owner_user_id: number; created_at: string };

function TeamStatusPill({ status }: { status: TeamStatus }) {
  const map: Record<TeamStatus, { text: string; cl: string }> = {
    active: { text: 'active', cl: 'bg-primary/15 border border-primary/30 text-primary' },
    paused: { text: 'paused', cl: 'bg-white/10 border border-white/20 text-white' },
    archived: { text: 'archived', cl: 'bg-muted text-muted-foreground' },
  };
  return (
    <View {...({ className: `px-2 py-0.5 rounded-full ${map[status].cl}` } as any)}>
      <Text {...({ className: 'text-xs font-medium' } as any)}>{map[status].text}</Text>
    </View>
  );
}

function GoalStatusPill({ status }: { status: GoalStatus }) {
  const map: Record<GoalStatus, { text: string; cl: string }> = {
    active: { text: 'active', cl: 'bg-white/10 border border-white/20 text-white' },
    paused: { text: 'paused', cl: 'bg-white/10 border border-white/20 text-white' },
    completed: { text: 'completed', cl: 'bg-primary/15 border border-primary/30 text-primary' },
  };
  return (
    <View {...({ className: `px-2 py-0.5 rounded-full ${map[status].cl}` } as any)}>
      <Text {...({ className: 'text-xs font-medium' } as any)}>{map[status].text}</Text>
    </View>
  );
}

function MemberDots({ members, extra }: { members: string[]; extra?: number }) {
  const items = members.slice(0, 5);
  return (
    <View {...({ className: 'flex-row items-center' } as any)}>
      {items.map((m, i) => (
        <View
          key={`${m}-${i}`}
          {...({
            className:
              'w-6 h-6 rounded-full bg-primary/15 border border-primary/30 items-center justify-center mr-1',
          } as any)}
        >
          <Text {...({ className: 'text-[10px] text-primary font-semibold' } as any)}>{m}</Text>
        </View>
      ))}
      {extra && extra > 0 ? (
        <View
          {...({
            className:
              'w-6 h-6 rounded-full bg-muted items-center justify-center border border-border',
          } as any)}
        >
          <Text {...({ className: 'text-[10px] text-muted-foreground' } as any)}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

function GoalCard({ g, onOpen }: { g: UiGoal; onOpen: () => void }) {
  return (
    <Card {...({ className: 'p-4 bg-gradient-card shadow-medium border-0 transition-all duration-300' } as any)}>
      <View {...({ className: 'flex-row items-start justify-between mb-3' } as any)}>
        <View {...({ className: 'flex-row items-center space-x-3' } as any)}>
          <Text {...({ className: 'w-8 h-8 text-xl' } as any)}>{g.icon}</Text>
          <View>
            <Text {...({ className: 'font-semibold text-foreground' } as any)}>{g.title}</Text>
            <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>{g.deadline || '—'}</Text>
          </View>
        </View>
        <GoalStatusPill status={g.status} />
      </View>

      <View {...({ className: 'space-y-3' } as any)}>
        <View>
          <View {...({ className: 'flex-row justify-between mb-1' } as any)}>
            <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>Прогресс</Text>
            <Text {...({ className: 'text-sm font-medium text-white' } as any)}>{g.progress}%</Text>
          </View>
          <Progress value={g.progress} {...({ className: 'h-2' } as any)} />
        </View>

        <View {...({ className: 'flex-row items-center justify-between' } as any)}>
          <View {...({ className: 'flex-row items-center' } as any)}>
            <Clock size={12} color={'#35D07F'} />
            <Text {...({ className: 'text-sm text-muted-foreground ml-1' } as any)}>{g.subtasksCount} шагов</Text>
          </View>
          <Button size="sm" variant="ghost" onPress={onOpen} {...({ className: 'h-8 px-3' } as any)}>
            <View {...({ className: 'flex-row items-center' } as any)}>
              <TargetIcon size={12} color={'#35D07F'} />
              <Text {...({ className: 'text-sm text-primary ml-1' } as any)}>Открыть</Text>
            </View>
          </Button>
        </View>
      </View>
    </Card>
  );
}

async function getCurrentUserId(): Promise<number | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return null;
  const { data } = await supabase.from('user').select('id').eq('auth_uid', u.user.id).maybeSingle();
  return data?.id ?? null;
}

export function TeamDetails({
  teamId,
  onBack,
  onCreateGoal,
  extraBottomPadding = 0,
}: {
  teamId: number;
  onBack: () => void;
  onCreateGoal: (teamId: number) => void;
  extraBottomPadding?: number;
}) {
  const qc = useQueryClient();

  // team info
  const { data: team } = useQuery({
    queryKey: ['team', 'info', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id,name,emoji,description,status,owner_user_id,created_at')
        .eq('id', teamId)
        .maybeSingle<TeamInfo>();
      if (error) throw error;
      return data!;
    },
  });

  // members
  const { data: members = [] } = useQuery({
    queryKey: ['team', 'members', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('user_id, role, user:user_id ( id, name )')
        .eq('team_id', teamId)
        .order('role', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        name: m.user?.name ?? null,
      })) as Member[];
    },
  });

  // goals (team_id = teamId)
  const { data: goals = [], isFetching, refetch } = useQuery({
    queryKey: ['team', 'goals', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_targets')
        .select('id, created_at, name, description, icon, date_end, status, last_activity_at, completed_at, target_target ( id, is_complete, target_id )')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((g: any) => {
        const subs: DbSubtask[] = g.target_target ?? [];
        const done = subs.filter((s) => s.is_complete).length;
        const total = subs.length;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;
        const u: UiGoal = {
          id: g.id,
          title: g.name || 'Без названия',
          description: g.description ?? null,
          icon: g.icon || '🎯',
          deadline: g.date_end ?? null,
          status: (g.status as GoalStatus) || 'active',
          progress,
          subtasksCount: total,
          createdAt: g.created_at ? Date.parse(g.created_at) : null,
        };
        return u;
      });
    },
  });

  // derive role for current user
  const { data: meId } = useQuery({
    queryKey: ['me', 'numeric-id'],
    queryFn: getCurrentUserId,
  });

  const myRole = useMemo<'owner' | 'admin' | 'member' | null>(() => {
    if (!meId || !members?.length) return null;
    return (members.find((m) => m.user_id === meId)?.role ?? null) as any;
  }, [meId, members]);

  const isOwner = myRole === 'owner';
  const isAdmin = myRole === 'admin' || myRole === 'owner';

  // Realtime invalidation
  useEffect(() => {
    const ch1 = supabase
      .channel(`rt:team:${teamId}:base`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` }, () => {
        qc.invalidateQueries({ queryKey: ['team', 'info', teamId] });
      })
      .subscribe();
    const ch2 = supabase
      .channel(`rt:team:${teamId}:members`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `team_id=eq.${teamId}` }, () => {
        qc.invalidateQueries({ queryKey: ['team', 'members', teamId] });
      })
      .subscribe();
    const ch3 = supabase
      .channel(`rt:team:${teamId}:goals`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_targets', filter: `team_id=eq.${teamId}` }, () => {
        qc.invalidateQueries({ queryKey: ['team', 'goals', teamId] });
      })
      .subscribe();
    const ch4 = supabase
      .channel(`rt:team:${teamId}:subs`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'target_target' }, () => {
        qc.invalidateQueries({ queryKey: ['team', 'goals', teamId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
      supabase.removeChannel(ch4);
    };
  }, [teamId, qc]);

  // goal modal
  const [openGoal, setOpenGoal] = useState<UiGoal | null>(null);
  const [subtasks, setSubtasks] = useState<DbSubtask[]>([]);
  useEffect(() => {
    (async () => {
      if (!openGoal) return setSubtasks([]);
      const { data, error } = await supabase
        .from('target_target')
        .select('id, name, is_complete, target_id')
        .eq('target_id', openGoal.id)
        .order('id', { ascending: true });
      if (!error) setSubtasks((data ?? []) as DbSubtask[]);
    })();
  }, [openGoal]);

  const handleToggleSubtask = async (s: DbSubtask) => {
    setSubtasks((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_complete: !x.is_complete } : x)));
    try {
      const res = await toggleSubtask(s.id, !s.is_complete);
      qc.setQueryData(['team', 'goals', teamId], (prev: any) => {
        const list: UiGoal[] = (prev as UiGoal[]) ?? [];
        return list.map((g) => (g.id === s.target_id ? { ...g, progress: res.progress } : g));
      });
    } catch (e) {
      setSubtasks((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_complete: s.is_complete } : x)));
      await refetch();
    }
  };

  const handleSetGoalStatus = async (goal: UiGoal, status: GoalStatus) => {
    qc.setQueryData(['team', 'goals', teamId], (prev: any) => {
      const list: UiGoal[] = (prev as UiGoal[]) ?? [];
      return list.map((g) => (g.id === goal.id ? { ...g, status } : g));
    });
    try {
      await setGoalStatus(goal.id, status);
    } catch (e) {
      await refetch();
    }
  };

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState<{ code?: string; expires_at?: string }>({});

  const doInvite = async () => {
    if (!team) return;
    try {
      const inv = await createInvite(team.id, { ttl_minutes: 24 * 60, max_uses: null });
      setInviteData({ code: inv.code, expires_at: inv.expires_at });
      setInviteModalOpen(true);
    } catch (e) {
      setInviteData({});
      setInviteModalOpen(true);
    }
  };

  const toggleTeamStatus = async () => {
    if (!team) return;
    const next: TeamStatus = team.status === 'active' ? 'paused' : 'active';
    try {
      await setTeamStatus(team.id, next);
      qc.invalidateQueries({ queryKey: ['team', 'info', teamId] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    } catch (e) {}
  };

  const archiveTeam = async () => {
    if (!team) return;
    try {
      await setTeamStatus(team.id, 'archived');
      qc.invalidateQueries({ queryKey: ['team', 'info', teamId] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    } catch (e) {}
  };

  const leave = async () => {
    if (!team) return;
    try {
      await leaveTeam(team.id);
      onBack();
      qc.invalidateQueries({ queryKey: ['teams'] });
    } catch (e) {}
  };

  const initials = useMemo(() => {
    const arr = (members ?? []).map((m) => {
      const s = (m.name || '').trim();
      return s ? s[0]?.toUpperCase() : '•';
    });
    return arr;
  }, [members]);

  const membersCount = members.length;

  const goalsAgg = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((g) => g.status === 'completed').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, progress };
  }, [goals]);

  return (
    <View {...({ className: 'flex-1 bg-background' } as any)}>
      {/* Header */}
      <View {...({ className: 'bg-gradient-primary p-4' } as any)}>
        <View {...({ className: 'flex-row items-center justify-between mb-4' } as any)}>
          <Button variant="ghost" size="sm" onPress={onBack} {...({ className: 'text-white' } as any)}>
            <ArrowLeft size={16} color="#fff" />
          </Button>
          <View {...({ className: 'flex-row gap-2' } as any)}>
            <Pressable onPress={() => refetch()} {...({ className: 'px-3 py-2 rounded-lg bg-white/10 active:opacity-80' } as any)}>
              <View {...({ className: 'flex-row items-center' } as any)}>
                <RefreshCw size={14} color="#fff" />
                <Text {...({ className: 'text-white text-xs ml-1' } as any)}>{isFetching ? '...' : 'Обновить'}</Text>
              </View>
            </Pressable>
            {isAdmin && team?.status !== 'archived' && (
              <Pressable onPress={doInvite} {...({ className: 'px-3 py-2 rounded-lg bg-white/10 active:opacity-80' } as any)}>
                <View {...({ className: 'flex-row items-center' } as any)}>
                  <LinkIcon size={14} color="#fff" />
                  <Text {...({ className: 'text-white text-xs ml-1' } as any)}>Инвайт</Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>

        <View {...({ className: 'items-start' } as any)}>
          <View {...({ className: 'flex-row items-center mb-1' } as any)}>
            <Text {...({ className: 'text-2xl' } as any)}>{team?.emoji ?? '👥'}</Text>
            <Text {...({ className: 'text-2xl font-bold text-white ml-2' } as any)}>{team?.name ?? 'Команда'}</Text>
            {isOwner ? <Crown size={16} color="#fff" {...({ className: 'ml-2' } as any)} /> : null}
            {team ? <View {...({ className: 'ml-2' } as any)}><TeamStatusPill status={team.status} /></View> : null}
          </View>
          {team?.description ? (
            <Text {...({ className: 'text-white/80' } as any)}>{team?.description}</Text>
          ) : (
            <Text {...({ className: 'text-white/60' } as any)}>Совместная работа над общими целями</Text>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 + extraBottomPadding }}
        {...({ className: 'px-4 -mt-2' } as any)}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View {...({ className: 'grid grid-cols-3 gap-3 mb-4' } as any)}>
          <Card {...({ className: 'p-4 bg-card border-0 shadow-soft items-center' } as any)}>
            <Text {...({ className: 'text-2xl font-extrabold text-primary' } as any)}>{membersCount}</Text>
            <Text {...({ className: 'text-xs text-muted-foreground mt-1' } as any)}>Участников</Text>
          </Card>
          <Card {...({ className: 'p-4 bg-card border-0 shadow-soft items-center' } as any)}>
            <Text {...({ className: 'text-2xl font-extrabold text-foreground' } as any)}>{goalsAgg.total}</Text>
            <Text {...({ className: 'text-xs text-muted-foreground mt-1' } as any)}>Целей</Text>
          </Card>
          <Card {...({ className: 'p-4 bg-card border-0 shadow-soft items-center' } as any)}>
            <Text {...({ className: 'text-2xl font-extrabold text-yellow-400' } as any)}>{goalsAgg.completed}</Text>
            <Text {...({ className: 'text-xs text-muted-foreground mt-1' } as any)}>Завершено</Text>
          </Card>
        </View>

        {/* Members */}
        <Card {...({ className: 'p-4 bg-card border-0 shadow-soft mb-4' } as any)}>
          <Text {...({ className: 'text-foreground font-semibold mb-2' } as any)}>Участники</Text>
          <View {...({ className: 'flex-row items-center justify-between' } as any)}>
            <MemberDots
              members={initials}
              extra={Math.max(membersCount - initials.length, 0)}
            />
            {team && (
              <View {...({ className: 'flex-row gap-2' } as any)}>
                {isAdmin && team.status !== 'archived' && (
                  <Button size="sm" variant="outline" onPress={toggleTeamStatus} {...({ className: 'rounded-xl px-3 py-2' } as any)}>
                    <View {...({ className: 'flex-row items-center' } as any)}>
                      {team.status === 'active' ? <PauseCircle size={14} color={'#35D07F'} /> : <PlayCircle size={14} color={'#35D07F'} />}
                      <Text {...({ className: 'text-primary ml-1' } as any)}>{team.status === 'active' ? 'Пауза' : 'Активировать'}</Text>
                    </View>
                  </Button>
                )}
                {isAdmin && team.status !== 'archived' && (
                  <Button size="sm" variant="outline" onPress={archiveTeam} {...({ className: 'rounded-xl px-3 py-2' } as any)}>
                    <View {...({ className: 'flex-row items-center' } as any)}>
                      <Archive size={14} color={'#35D07F'} />
                      <Text {...({ className: 'text-primary ml-1' } as any)}>Архив</Text>
                    </View>
                  </Button>
                )}
                {!isOwner && (
                  <Button size="sm" variant="outline" onPress={leave} {...({ className: 'rounded-xl px-3 py-2' } as any)}>
                    <View {...({ className: 'flex-row items-center' } as any)}>
                      <LogOut size={14} color={'#f87171'} />
                      <Text {...({ className: 'text-destructive ml-1' } as any)}>Выйти</Text>
                    </View>
                  </Button>
                )}
                <Button size="sm" onPress={() => onCreateGoal(teamId)} {...({ className: 'rounded-xl px-3 py-2' } as any)}>
                  <View {...({ className: 'flex-row items-center' } as any)}>
                    <Plus size={14} color="#fff" />
                    <Text {...({ className: 'text-primary-foreground ml-1' } as any)}>Цель</Text>
                  </View>
                </Button>
              </View>
            )}
          </View>
        </Card>

        {/* Goals */}
        <Text {...({ className: 'mb-2 text-foreground font-semibold' } as any)}>Цели команды</Text>
        <View {...({ className: 'space-y-3 flex flex-col gap-3' } as any)}>
          {goals.map((g) => (
            <GoalCard key={g.id} g={g} onOpen={() => setOpenGoal(g)} />
          ))}
          {goals.length === 0 && (
            <View {...({ className: 'items-center py-10' } as any)}>
              <View {...({ className: 'w-16 h-16 rounded-full bg-muted items-center justify-center mb-4' } as any)}>
                <TargetIcon size={32} color={'#35D07F'} />
              </View>
              <Text {...({ className: 'font-semibold text-foreground mb-2' } as any)}>Пока пусто</Text>
              <Button onPress={() => onCreateGoal(teamId)} variant="outline" {...({ className: 'border-primary' } as any)}>
                <View {...({ className: 'flex-row items-center' } as any)}>
                  <Plus size={16} color={'#35D07F'} />
                  <Text {...({ className: 'text-primary ml-2' } as any)}>Создать цель</Text>
                </View>
              </Button>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Invite modal */}
      <Modal transparent visible={inviteModalOpen} onRequestClose={() => setInviteModalOpen(false)} animationType="fade">
        <View {...({ className: 'flex-1 bg-black/60 justify-center items-center' } as any)}>
          <View {...({ className: 'rounded-2xl bg-card px-5 pt-4 pb-5 w-11/12 max-w-md' } as any)}>
            <Text {...({ className: 'text-foreground text-lg font-semibold mb-3' } as any)}>Код приглашения</Text>
            {inviteData.code ? (
              <>
                <View {...({ className: 'rounded-xl border border-border px-3 py-2 mb-2 bg-muted/10' } as any)}>
                  <Text {...({ className: 'text-foreground font-mono' } as any)}>{inviteData.code}</Text>
                </View>
                {inviteData.expires_at ? (
                  <Text {...({ className: 'text-xs text-muted-foreground mb-2' } as any)}>
                    Действителен до: {new Date(inviteData.expires_at!).toLocaleString()}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text {...({ className: 'text-muted-foreground' } as any)}>Не удалось создать инвайт</Text>
            )}
            <Button onPress={() => setInviteModalOpen(false)} {...({ className: 'mt-2 h-11' } as any)}>
              <Text {...({ className: 'text-primary-foreground' } as any)}>Закрыть</Text>
            </Button>
          </View>
        </View>
      </Modal>

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
            {openGoal?.description ? (
              <Text {...({ className: 'text-muted-foreground mb-2' } as any)}>{openGoal.description}</Text>
            ) : null}

            {openGoal && (
              <View {...({ className: 'flex-row gap-2 mb-3' } as any)}>
                <Button
                  variant={openGoal.status === 'active' ? 'default' : 'outline'}
                  onPress={() => handleSetGoalStatus(openGoal, 'active')}
                  {...({ className: 'flex-1 h-10' } as any)}
                >
                  <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                    <PlayCircle size={14} color={openGoal.status === 'active' ? '#fff' : '#35D07F'} />
                    <Text {...({ className: 'ml-1 ' + (openGoal.status === 'active' ? 'text-primary-foreground' : 'text-primary') } as any)}>
                      Активна
                    </Text>
                  </View>
                </Button>
                <Button
                  variant={openGoal.status === 'paused' ? 'default' : 'outline'}
                  onPress={() => handleSetGoalStatus(openGoal, 'paused')}
                  {...({ className: 'flex-1 h-10' } as any)}
                >
                  <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                    <PauseCircle size={14} color={openGoal.status === 'paused' ? '#fff' : '#35D07F'} />
                    <Text {...({ className: 'ml-1 ' + (openGoal.status === 'paused' ? 'text-primary-foreground' : 'text-primary') } as any)}>
                      Пауза
                    </Text>
                  </View>
                </Button>
                <Button
                  variant={openGoal.status === 'completed' ? 'default' : 'outline'}
                  onPress={() => handleSetGoalStatus(openGoal, 'completed')}
                  {...({ className: 'flex-1 h-10' } as any)}
                >
                  <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                    <CheckSquare size={14} color={openGoal.status === 'completed' ? '#fff' : '#35D07F'} />
                    <Text {...({ className: 'ml-1 ' + (openGoal.status === 'completed' ? 'text-primary-foreground' : 'text-primary') } as any)}>
                      Готово
                    </Text>
                  </View>
                </Button>
              </View>
            )}

            <Text {...({ className: 'text-foreground/90 font-semibold mb-2' } as any)}>Подзадачи</Text>
            <View {...({ className: 'max-h-[50vh]' } as any)}>
              <ScrollView>
                {subtasks.length === 0 ? (
                  <Text {...({ className: 'text-muted-foreground' } as any)}>Подзадач нет</Text>
                ) : (
                  subtasks.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => handleToggleSubtask(s)}
                      {...({ className: 'rounded-xl border border-border px-3 py-2 mb-2 active:opacity-80' } as any)}
                    >
                      <View {...({ className: 'flex-row items-center justify-between' } as any)}>
                        <Text {...({ className: 'text-foreground flex-1 mr-3' } as any)}>
                          {s.name || 'Без названия'}
                        </Text>
                        {s.is_complete ? <CheckSquare size={18} color={'#35D07F'} /> : <Square size={18} color={'#9CA3AF'} />}
                      </View>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}