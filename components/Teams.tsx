// Teams.tsx — React Native + NativeWind
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Users,
  Crown,
  Target,
  UserPlus,
  Plus,
} from 'lucide-react-native';

type TeamStatus = 'active' | 'paused' | 'archived';

type Team = {
  id: number;
  name: string;
  emoji: string;
  description: string;
  members: string[];       // инициалы или эмодзи участников
  membersCount: number;    // если членов больше чем мы показываем
  goalsDone: number;
  goalsTotal: number;
  progress: number;        // 0..100
  status: TeamStatus;
  isOwner?: boolean;
};

const mockTeams: Team[] = [
  {
    id: 1,
    name: 'Семейные цели',
    emoji: '👪',
    description: 'Общие цели нашей семьи на этот год',
    members: ['А', 'М', 'С', 'Д'],
    membersCount: 4,
    goalsDone: 3,
    goalsTotal: 5,
    progress: 78,
    status: 'active',
    isOwner: true,
  },
  {
    id: 2,
    name: 'Рабочая команда',
    emoji: '💼',
    description: 'Проекты и задачи нашего отдела',
    members: ['Е', 'Д', 'О', 'К', 'С', 'И', 'Т', 'А'],
    membersCount: 8,
    goalsDone: 8,
    goalsTotal: 12,
    progress: 65,
    status: 'active',
  },
  {
    id: 3,
    name: 'Учебная группа',
    emoji: '📚',
    description: 'Изучаем программирование вместе',
    members: ['В', 'М', 'Н', 'Э', 'Ф'],
    membersCount: 6,
    goalsDone: 6,
    goalsTotal: 8,
    progress: 82,
    status: 'paused',
  },
];

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
  onJoin,
}: {
  team: Team;
  onOpen: (t: Team) => void;
  onJoin: (t: Team) => void;
}) => (
  <Card {...({ className: 'p-4 bg-card shadow-soft border-0' } as any)}>
    <View {...({ className: 'flex-row items-start justify-between' } as any)}>
      <View {...({ className: 'flex-1 pr-3' } as any)}>
        <View {...({ className: 'flex-row items-center mb-1' } as any)}>
          <Text {...({ className: 'text-xl mr-2' } as any)}>{team.emoji}</Text>
          <Text {...({ className: 'font-semibold text-foreground mr-1' } as any)}>{team.name}</Text>
          {team.isOwner ? <Crown size={14} color={'#35D07F'} {...({ className: 'ml-1 text-primary' } as any)} /> : null}
        </View>
        <Text {...({ className: 'text-sm text-muted-foreground mb-2' } as any)}>{team.description}</Text>

        <View {...({ className: 'flex-row items-center mb-2' } as any)}>
          <MemberDots members={team.members} extra={Math.max(team.membersCount - team.members.length, 0)} />
          <Text {...({ className: 'ml-2 text-xs text-muted-foreground' } as any)}>
            {team.membersCount} участников • <Text {...({ className: 'text-foreground' } as any)}>{team.goalsDone}/{team.goalsTotal}</Text> goals
          </Text>
        </View>

        <Text {...({ className: 'text-xs text-muted-foreground mb-1' } as any)}>Прогресс команды</Text>
        <Progress value={team.progress} {...({ className: 'h-2', indicatorClassName: 'bg-primary' } as any)} />

        <View {...({ className: 'mt-2 w-full' } as any)}>
          {team.status === 'archived' ? null : (
            <Button
              size="sm"
              variant={team.status === 'active' ? 'outline' : 'default'}
              onPress={() => (team.status === 'active' ? onOpen(team) : onJoin(team))}
              {...({ className: 'rounded-xl px-3 py-2' } as any)}
            >
              <View {...({ className: ''} as any)}>
                {team.status === 'active' ? (
                  <>
                    <Text {...({ className: 'text-primary' } as any)}>Открыть</Text>
                  </>
                ) : (
                  <>
                    <Text {...({ className: 'text-primary-foreground' } as any)}>Присоедениться</Text>
                  </>
                )}
              </View>
            </Button>
          )}
        </View>
      </View>

      <View {...({ className: 'items-end' } as any)}>
        <StatusPill status={team.status} />
      </View>
    </View>
  </Card>
);

interface TeamsProps {
  onBack: () => void;
  extraBottomPadding?: number;
}

export const Teams = ({ onBack, extraBottomPadding = 0 }: TeamsProps) => {
  const [filter, setFilter] = useState<'all' | TeamStatus>('all');

  const teams = useMemo(() => {
    return mockTeams.filter((t) => (filter === 'all' ? true : t.status === filter));
  }, [filter]);

  const stats = useMemo(() => {
    const activeTeams = mockTeams.filter((t) => t.status === 'active').length;
    const totalMembers = mockTeams.reduce((sum, t) => sum + t.membersCount, 0);
    const completedGoals = mockTeams.reduce((sum, t) => sum + t.goalsDone, 0);
    return { activeTeams, totalMembers, completedGoals };
  }, []);

  return (
    <View {...({ className: 'flex-1 bg-background' } as any)}>
      {/* Header */}
      <View {...({ className: 'bg-gradient-primary p-4' } as any)}>
        <View {...({ className: 'flex-row items-center justify-between mb-4' } as any)}>
          <Button variant="ghost" size="sm" onPress={onBack} {...({ className: 'text-white' } as any)}>
            <ArrowLeft size={16} color="#fff" />
          </Button>
          <Text {...({ className: 'font-semibold text-white' } as any)}>Команды</Text>
          <Button variant="ghost" size="sm" {...({ className: 'text-white' } as any)}>
            <Plus size={16} color="#fff" />
          </Button>
        </View>

        <View {...({ className: 'items-start' } as any)}>
          <View {...({ className: 'flex-row items-center mb-1' } as any)}>
            <Users size={18} color="#fff" {...({ className: 'mr-2' } as any)} />
            <Text {...({ className: 'text-2xl font-bold text-white ml-2' } as any)}>Команды</Text>
          </View>
          <Text {...({ className: 'text-white/80' } as any)}>Совместная работа над общими целями</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 + extraBottomPadding }}
        {...({ className: 'px-4 -mt-2' } as any)}
        showsVerticalScrollIndicator={false}
      >
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
        <View {...({ className: 'space-y-3 flex flex-col gap-3' } as any)}>
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onOpen={() => {}}
              onJoin={() => {}}
            />
          ))}
        </View>

        {/* Quick actions */}
        <View {...({ className: 'mt-6 grid grid-cols-2 gap-3' } as any)}>
          <Button {...({ className: 'rounded-2xl h-12' } as any)}>
            <View {...({ className: 'flex-row items-center justify-center' } as any)}>
              <Plus size={16} color="#fff" {...({ className: 'mr-2' } as any)} />
              <Text {...({ className: 'text-primary-foreground ml-1' } as any)}>Создать команду</Text>
            </View>
          </Button>
          <Button variant="outline" {...({ className: 'rounded-2xl h-12' } as any)}>
            <View {...({ className: 'flex-row items-center justify-center' } as any)}>
              <Target color={'#35D07F'} size={16} {...({ className: 'text-primary mr-2' } as any)} />
              <Text {...({ className: 'text-primary ml-1' } as any)}>Командная цель</Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};