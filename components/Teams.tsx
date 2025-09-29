import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Users,
  Crown,
  Target as TargetIcon,
  UserPlus,
  Plus,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  Archive,
  Link as LinkIcon,
  LogOut,
} from 'lucide-react-native';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import {
  fetchTeams,
  createTeam,
  createInvite,
  joinTeam,
  setTeamStatus,
  leaveTeam,
  type TeamListItem,
} from '@/lib/api/teams';

type TeamStatus = 'active' | 'paused' | 'archived';

const StatusPill = ({ status }: { status: TeamStatus }) => {
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
};

const MemberDots = ({ members, extra }: { members: string[]; extra?: number }) => {
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
};

const TeamCard = ({
  team,
  onOpen,
  onInvite,
  onToggleStatus,
  onArchive,
  onLeave,
}: {
  team: TeamListItem;
  onOpen: (t: TeamListItem) => void;
  onInvite: (t: TeamListItem) => void;
  onToggleStatus: (t: TeamListItem) => void;
  onArchive: (t: TeamListItem) => void;
  onLeave: (t: TeamListItem) => void;
}) => (
  <Card {...({ className: 'p-4 bg-card shadow-soft border-0' } as any)}>
    <View {...({ className: 'flex-row items-start justify-between' } as any)}>
      <View {...({ className: 'flex-1 pr-3' } as any)}>
        <View {...({ className: 'flex-row items-center mb-1' } as any)}>
          <Text {...({ className: 'text-xl mr-2' } as any)}>{team.emoji ?? '👥'}</Text>
          <Text {...({ className: 'font-semibold text-foreground mr-1' } as any)}>{team.name}</Text>
          {team.isOwner ? <Crown size={14} color={'#35D07F'} {...({ className: 'ml-1 text-primary' } as any)} /> : null}
        </View>
        {team.description ? (
          <Text {...({ className: 'text-sm text-muted-foreground mb-2' } as any)}>{team.description}</Text>
        ) : null}

        <View {...({ className: 'flex-row items-center mb-2' } as any)}>
          <MemberDots
            members={team.membersInitials ?? []}
            extra={Math.max(team.membersCount - (team.membersInitials?.length ?? 0), 0)}
          />
          <Text {...({ className: 'ml-2 text-xs text-muted-foreground' } as any)}>
            {team.membersCount} участников •{' '}
            <Text {...({ className: 'text-foreground' } as any)}>
              {team.goalsDone}/{team.goalsTotal}
            </Text>{' '}
            goals
          </Text>
        </View>

        <Text {...({ className: 'text-xs text-muted-foreground mb-1' } as any)}>Прогресс команды</Text>
        <Progress value={team.progress} {...({ className: 'h-2', indicatorClassName: 'bg-primary' } as any)} />

        <View {...({ className: 'mt-3 w-full flex-row gap-2 flex-wrap' } as any)}>
          <Button size="sm" variant="outline" onPress={() => onOpen(team)} {...({ className: 'rounded-xl px-3 py-2' } as any)}>
            <Text {...({ className: 'text-primary' } as any)}>Открыть</Text>
          </Button>

          {team.status !== 'archived' && team.isOwner && (
            <>
              <Button size="sm" variant="outline" onPress={() => onInvite(team)} {...({ className: 'rounded-xl px-3 py-2' } as any)}>
                <View {...({ className: 'flex-row items-center' } as any)}>
                  <LinkIcon size={14} color={'#35D07F'} />
                  <Text {...({ className: 'text-primary ml-1' } as any)}>Инвайт</Text>
                </View>
              </Button>

              <Button size="sm" variant="outline" onPress={() => onToggleStatus(team)} {...({ className: 'rounded-xl px-3 py-2' } as any)}>
                <View {...({ className: 'flex-row items-center' } as any)}>
                  {team.status === 'active' ? <PauseCircle size={14} color={'#35D07F'} /> : <PlayCircle size={14} color={'#35D07F'} />}
                  <Text {...({ className: 'text-primary ml-1' } as any)}>{team.status === 'active' ? 'Пауза' : 'Активировать'}</Text>
                </View>
              </Button>

              <Button size="sm" variant="outline" onPress={() => onArchive(team)} {...({ className: 'rounded-xl px-3 py-2' } as any)}>
                <View {...({ className: 'flex-row items-center' } as any)}>
                  <Archive size={14} color={'#35D07F'} />
                  <Text {...({ className: 'text-primary ml-1' } as any)}>Архив</Text>
                </View>
              </Button>
            </>
          )}

          {!team.isOwner && (
            <Button size="sm" variant="outline" onPress={() => onLeave(team)} {...({ className: 'rounded-xl px-3 py-2' } as any)}>
              <View {...({ className: 'flex-row items-center' } as any)}>
                <LogOut size={14} color={'#f87171'} />
                <Text {...({ className: 'text-destructive ml-1' } as any)}>Выйти</Text>
              </View>
            </Button>
          )}
        </View>
      </View>

      <View {...({ className: 'items-end' } as any)}>
        <StatusPill status={team.status as TeamStatus} />
      </View>
    </View>
  </Card>
);

interface TeamsProps {
  onBack: () => void;
  extraBottomPadding?: number;
  isAuthed: boolean; // ← добавили
}

export const Teams = ({ onBack, extraBottomPadding = 0, isAuthed }: TeamsProps) => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | TeamStatus>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteModal, setInviteModal] = useState<{ open: boolean; code?: string; expires_at?: string }>({ open: false });

  const [teamName, setTeamName] = useState('');
  const [teamEmoji, setTeamEmoji] = useState('👥');
  const [teamDesc, setTeamDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: teams = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    staleTime: 10_000,
    enabled: !!isAuthed, // ← грузим только после авторизации
  });

  // Realtime invalidate — только когда авторизованы
  useEffect(() => {
    if (!isAuthed) return;
    const ch1 = supabase
      .channel('rt:teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        qc.invalidateQueries({ queryKey: ['teams'] });
      })
      .subscribe();
    const ch2 = supabase
      .channel('rt:team_members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        qc.invalidateQueries({ queryKey: ['teams'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [qc, isAuthed]);

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => (filter === 'all' ? true : t.status === filter));
  }, [filter, teams]);

  const stats = useMemo(() => {
    const activeTeams = teams.filter((t) => t.status === 'active').length;
    const totalMembers = teams.reduce((sum, t) => sum + t.membersCount, 0);
    const completedGoals = teams.reduce((sum, t) => sum + t.goalsDone, 0);
    return { activeTeams, totalMembers, completedGoals };
  }, [teams]);

  // Actions — блокируем без авторизации на всякий случай
  const guardAuth = () => {
    if (!isAuthed) {
      Alert.alert('Требуется вход', 'Войдите, чтобы управлять командами.');
      return false;
    }
    return true;
  };

  const handleCreateTeam = async () => {
    if (!guardAuth() || !teamName.trim()) return;
    setBusy(true);
    try {
      await createTeam({ name: teamName.trim(), emoji: teamEmoji || undefined, description: teamDesc || undefined });
      setCreateOpen(false);
      setTeamName(''); setTeamEmoji('👥'); setTeamDesc('');
      qc.invalidateQueries({ queryKey: ['teams'] });
    } catch (e) {
      console.warn('createTeam error', e);
    } finally {
      setBusy(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!guardAuth()) return;
    const code = inviteCode.trim();
    if (!code) return;
    setBusy(true);
    try {
      await joinTeam(code);
      setJoinOpen(false);
      setInviteCode('');
      qc.invalidateQueries({ queryKey: ['teams'] });
    } catch (e) {
      console.warn('joinTeam error', e);
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async (t: TeamListItem) => {
    if (!guardAuth()) return;
    setBusy(true);
    try {
      const inv = await createInvite(t.id, { ttl_minutes: 24 * 60, max_uses: null });
      setInviteModal({ open: true, code: inv.code, expires_at: inv.expires_at });
    } catch (e) {
      console.warn('invite error', e);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = async (t: TeamListItem) => {
    if (!guardAuth()) return;
    const next: TeamStatus = t.status === 'active' ? 'paused' : 'active';
    setBusy(true);
    try {
      await setTeamStatus(t.id, next);
      qc.invalidateQueries({ queryKey: ['teams'] });
    } catch (e) {
      console.warn('setTeamStatus error', e);
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async (t: TeamListItem) => {
    if (!guardAuth()) return;
    setBusy(true);
    try {
      await setTeamStatus(t.id, 'archived');
      qc.invalidateQueries({ queryKey: ['teams'] });
    } catch (e) {
      console.warn('archive error', e);
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async (t: TeamListItem) => {
    if (!guardAuth()) return;
    setBusy(true);
    try {
      await leaveTeam(t.id);
      qc.invalidateQueries({ queryKey: ['teams'] });
    } catch (e) {
      console.warn('leave team error', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View {...({ className: 'flex-1 bg-background' } as any)}>
      {/* Header */}
      <View {...({ className: 'bg-gradient-primary p-4' } as any)}>
        <View {...({ className: 'flex-row items-center justify-between mb-4' } as any)}>
          <Button variant="ghost" size="sm" onPress={onBack} {...({ className: 'text-white' } as any)}>
            <ArrowLeft size={16} color="#fff" />
          </Button>
          <Text {...({ className: 'font-semibold text-white' } as any)}>Команды</Text>
          <View {...({ className: 'flex-row gap-2' } as any)}>
            <Pressable onPress={() => isAuthed && refetch()} disabled={!isAuthed} {...({ className: 'px-3 py-2 rounded-lg bg-white/10 active:opacity-80' } as any)}>
              <View {...({ className: 'flex-row items-center' } as any)}>
                <RefreshCw size={14} color="#fff" />
                <Text {...({ className: 'text-white text-xs ml-1' } as any)}>{isFetching ? '...' : 'Обновить'}</Text>
              </View>
            </Pressable>
            <Button variant="ghost" size="sm" onPress={() => isAuthed && setCreateOpen(true)} disabled={!isAuthed} {...({ className: 'text-white' } as any)}>
              <Plus size={16} color="#fff" />
            </Button>
          </View>
        </View>

        <View {...({ className: 'items-start' } as any)}>
          <View {...({ className: 'flex-row items-center mb-1' } as any)}>
            <Users size={18} color="#fff" {...({ className: 'mr-2' } as any)} />
            <Text {...({ className: 'text-2xl font-bold text-white ml-2' } as any)}>Команды</Text>
          </View>
          <Text {...({ className: 'text-white/80' } as any)}>
            Совместная работа над общими целями
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 + extraBottomPadding }}
        {...({ className: 'px-4 -mt-2' } as any)}
        showsVerticalScrollIndicator={false}
      >
        {!isAuthed ? (
          <View {...({ className: 'w-full items-center py-16' } as any)}>
            <View {...({ className: 'w-16 h-16 rounded-full bg-muted items-center justify-center mb-4' } as any)}>
              <Users size={32} color="#9ca3af" />
            </View>
            <Text {...({ className: 'font-semibold text-foreground mb-2' } as any)}>Требуется вход</Text>
            <Text {...({ className: 'text-sm text-muted-foreground text-center' } as any)}>
              Авторизуйтесь, чтобы видеть команды и управлять ими.
            </Text>
          </View>
        ) : (
          <>
            {/* Top stats */}
            <View {...({ className: 'grid grid-cols-3 gap-3 mb-4' } as any)}>
              <Card {...({ className: 'p-4 bg-card border-0 shadow-soft items-center' } as any)}>
                <Text {...({ className: 'text-2xl font-extrabold text-primary' } as any)}>{stats.activeTeams}</Text>
                <Text {...({ className: 'text-xs text-muted-foreground mt-1' } as any)}>Активные команды</Text>
              </Card>
              <Card {...({ className: 'p-4 bg-card border-0 shadow-soft items-center' } as any)}>
                <Text {...({ className: 'text-2xl font-extrabold text-foreground' } as any)}>{stats.totalMembers}</Text>
                <Text {...({ className: 'text-xs text-muted-foreground mt-1' } as any)}>Всего участников</Text>
              </Card>
              <Card {...({ className: 'p-4 bg-card border-0 shadow-soft items-center' } as any)}>
                <Text {...({ className: 'text-2xl font-extrabold text-yellow-400' } as any)}>{stats.completedGoals}</Text>
                <Text {...({ className: 'text-xs text-muted-foreground mt-1' } as any)}>Законченные цели</Text>
              </Card>
            </View>

            {/* Filter tabs */}
            <View {...({ className: 'flex-row bg-muted rounded-xl p-1 mb-3' } as any)}>
              {[
                { key: 'all', label: 'Все' },
                { key: 'active', label: 'Активные' },
                { key: 'paused', label: 'На паузе' },
                { key: 'archived', label: 'Архив' },
              ].map((t) => {
                const active = filter === (t.key as any);
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setFilter(t.key as any)}
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
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* My teams */}
            <Text {...({ className: 'mb-2 text-foreground font-semibold' } as any)}>Мои команды</Text>

            {isLoading ? (
              <View {...({ className: 'items-center py-8' } as any)}>
                <ActivityIndicator />
                <Text {...({ className: 'mt-2 text-muted-foreground' } as any)}>Загрузка…</Text>
              </View>
            ) : filteredTeams.length === 0 ? (
              <View {...({ className: 'items-center py-10' } as any)}>
                <View {...({ className: 'w-16 h-16 rounded-full bg-muted items-center justify-center mb-4' } as any)}>
                  <TargetIcon size={32} color={'#35D07F'} />
                </View>
                <Text {...({ className: 'font-semibold text-foreground mb-2' } as any)}>Пока пусто</Text>
                <Text {...({ className: 'text-sm text-muted-foreground mb-4 text-center' } as any)}>
                  {filter === 'all' ? 'Создайте свою первую команду' : 'Нет команд в этом статусе'}
                </Text>
                <Button onPress={() => setCreateOpen(true)} variant="outline" {...({ className: 'border-primary' } as any)}>
                  <View {...({ className: 'flex-row items-center' } as any)}>
                    <Plus size={16} color={'#35D07F'} />
                    <Text {...({ className: 'text-primary ml-2' } as any)}>Создать команду</Text>
                  </View>
                </Button>
              </View>
            ) : (
              <View {...({ className: 'space-y-3 flex flex-col gap-3' } as any)}>
                {filteredTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onOpen={(t) => console.log('open team', t.id)}
                    onInvite={handleInvite}
                    onToggleStatus={handleToggleStatus}
                    onArchive={handleArchive}
                    onLeave={handleLeave}
                  />
                ))}
              </View>
            )}

            {/* Quick actions */}
            <View {...({ className: 'mt-6 grid grid-cols-2 gap-3' } as any)}>
              <Button onPress={() => setCreateOpen(true)} {...({ className: 'rounded-2xl h-12' } as any)}>
                <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                  <Plus size={16} color="#fff" {...({ className: 'mr-2' } as any)} />
                  <Text {...({ className: 'text-primary-foreground ml-1' } as any)}>Создать команду</Text>
                </View>
              </Button>
              <Button variant="outline" onPress={() => setJoinOpen(true)} {...({ className: 'rounded-2xl h-12' } as any)}>
                <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                  <UserPlus color={'#35D07F'} size={16} {...({ className: 'text-primary mr-2' } as any)} />
                  <Text {...({ className: 'text-primary ml-1' } as any)}>Вступить по коду</Text>
                </View>
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modals — только если авторизованы */}
      {isAuthed && (
        <>
          {/* Create Team Modal */}
          <Modal transparent visible={createOpen} onRequestClose={() => setCreateOpen(false)} animationType="slide">
            <View {...({ className: 'flex-1 bg-black/60 justify-end' } as any)}>
              <View {...({ className: 'rounded-t-2xl bg-card px-5 pt-4 pb-6' } as any)}>
                <Text {...({ className: 'text-foreground text-lg font-semibold mb-3' } as any)}>Создать команду</Text>
                <View {...({ className: 'gap-3' } as any)}>
                  <View>
                    <Text {...({ className: 'text-xs text-muted-foreground mb-1' } as any)}>Название</Text>
                    <Input value={teamName} onChangeText={setTeamName} placeholder="Например, Команда A" />
                  </View>
                  <View>
                    <Text {...({ className: 'text-xs text-muted-foreground mb-1' } as any)}>Эмодзи</Text>
                    <Input value={teamEmoji} onChangeText={setTeamEmoji} placeholder="👥" />
                  </View>
                  <View>
                    <Text {...({ className: 'text-xs text-muted-foreground mb-1' } as any)}>Описание</Text>
                    <Input value={teamDesc} onChangeText={setTeamDesc} placeholder="Опционально" />
                  </View>
                  <View {...({ className: 'flex-row gap-3 mt-2' } as any)}>
                    <Button variant="outline" onPress={() => setCreateOpen(false)} {...({ className: 'flex-1 h-11' } as any)}>
                      <Text {...({ className: 'text-foreground' } as any)}>Отмена</Text>
                    </Button>
                    <Button onPress={handleCreateTeam} disabled={busy || !teamName.trim()} {...({ className: 'flex-1 h-11' } as any)}>
                      <Text {...({ className: 'text-primary-foreground' } as any)}>{busy ? 'Создаю…' : 'Создать'}</Text>
                    </Button>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          {/* Join Team Modal */}
          <Modal transparent visible={joinOpen} onRequestClose={() => setJoinOpen(false)} animationType="slide">
            <View {...({ className: 'flex-1 bg-black/60 justify-end' } as any)}>
              <View {...({ className: 'rounded-t-2xl bg-card px-5 pt-4 pb-6' } as any)}>
                <Text {...({ className: 'text-foreground text-lg font-semibold mb-3' } as any)}>Вступить по коду</Text>
                <View {...({ className: 'gap-3' } as any)}>
                  <View>
                    <Text {...({ className: 'text-xs text-muted-foreground mb-1' } as any)}>Код приглашения</Text>
                    <Input value={inviteCode} onChangeText={setInviteCode} placeholder="Вставьте код" autoCapitalize="none" />
                  </View>
                  <View {...({ className: 'flex-row gap-3 mt-2' } as any)}>
                    <Button variant="outline" onPress={() => setJoinOpen(false)} {...({ className: 'flex-1 h-11' } as any)}>
                      <Text {...({ className: 'text-foreground' } as any)}>Отмена</Text>
                    </Button>
                    <Button onPress={handleJoinTeam} disabled={busy || !inviteCode.trim()} {...({ className: 'flex-1 h-11' } as any)}>
                      <Text {...({ className: 'text-primary-foreground' } as any)}>{busy ? 'Вступаю…' : 'Вступить'}</Text>
                    </Button>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          {/* Invite code modal */}
          <Modal transparent visible={inviteModal.open} onRequestClose={() => setInviteModal({ open: false })} animationType="fade">
            <View {...({ className: 'flex-1 bg-black/60 justify-center items-center' } as any)}>
              <View {...({ className: 'rounded-2xl bg-card px-5 pt-4 pb-5 w-11/12 max-w-md' } as any)}>
                <Text {...({ className: 'text-foreground text-lg font-semibold mb-2' } as any)}>Приглашение</Text>
                {inviteModal.code ? (
                  <>
                    <Text {...({ className: 'text-muted-foreground mb-3' } as any)}>Код:</Text>
                    <View {...({ className: 'rounded-xl border border-border px-3 py-2 mb-2 bg-muted/10' } as any)}>
                      <Text {...({ className: 'text-foreground font-mono' } as any)}>{inviteModal.code}</Text>
                    </View>
                    {inviteModal.expires_at ? (
                      <Text {...({ className: 'text-xs text-muted-foreground mb-3' } as any)}>
                        Действителен до: {new Date(inviteModal.expires_at).toLocaleString()}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text {...({ className: 'text-muted-foreground' } as any)}>Не удалось создать приглашение</Text>
                )}
                <Button onPress={() => setInviteModal({ open: false })} {...({ className: 'mt-2 h-11' } as any)}>
                  <Text {...({ className: 'text-primary-foreground' } as any)}>Закрыть</Text>
                </Button>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
};