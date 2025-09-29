// lib/api/goals.ts
import { supabase, FUNCTIONS_BASE } from '@/lib/supabase';

export type CreateGoalPayload = {
  title: string;
  description?: string | null;
  icon?: string | null;
  date_end?: string | null;
  status?: 'active' | 'paused' | 'completed';
  subtasks?: Array<{ name: string; is_complete?: boolean }>;
};

export type DbSubtask = {
  id: number;
  name: string | null;
  is_complete: boolean;
  target_id: number;
};

export type DbGoal = {
  id: number;
  created_at: string | null;
  name: string | null;
  description: string | null;
  icon: string | null;
  date_end: string | null;
  status: 'active' | 'paused' | 'completed' | string | null;
  last_activity_at?: string | null;
  completed_at?: string | null;
  target_target?: DbSubtask[];
};

export type UiGoal = {
  id: number;
  title: string;
  description: string | null;
  icon: string;
  deadline: string | null;
  status: 'active' | 'paused' | 'completed';
  progress: number;
  subtasksCount: number;
  createdAt?: number | null;
  lastActivityAt?: number | null;
  completedAt?: number | null;
  subtasks?: DbSubtask[];
};

async function requireToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  console.log('[auth] token?', !!token); // лог ДО проверки
  // if (!token) throw new Error('Not authenticated');
  return token;
}

export async function createUserGoal(payload: CreateGoalPayload & { team_id?: number }) {
  const token = await requireToken();
  const res = await fetch(`${FUNCTIONS_BASE}/goal-create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `goal-create failed (${res.status})`);
  return text ? (JSON.parse(text) as { target: any; subtasks: any[]; rid: string }) : { target: null, subtasks: [], rid: '' };
}

export async function fetchGoals(): Promise<UiGoal[]> {
  const token = await requireToken();
  console.log('[goals] start');

  // простой таймаут, чтобы не висеть бесконечно (диагностика)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  const res = await fetch(`${FUNCTIONS_BASE}/goals-list`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: '{}',
    signal: controller.signal,
  }).catch((e) => {
    console.warn('[goals] fetch error', e?.message || e);
    throw e;
  })
  .finally(() => clearTimeout(timer));

  const text = await res.text();
  if (!res.ok) {
    console.warn('[goals] http error', res.status, text);
    throw new Error(text || 'goals-list failed');
  }

  const json = JSON.parse(text || '{}');
  const rows = (json.goals ?? []) as DbGoal[];

  console.log('[goals] ok, count:', rows.length);

  return rows.map((g) => {
    const subs = g.target_target ?? [];
    const done = subs.filter((s) => s.is_complete).length;
    const total = subs.length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      id: g.id,
      title: g.name || 'Без названия',
      description: g.description ?? null,
      icon: g.icon || '🎯',
      deadline: g.date_end ?? null,
      status: (g.status as any) || 'active',
      progress,
      subtasksCount: total,
      createdAt: g.created_at ? Date.parse(g.created_at) : null,
      lastActivityAt: g.last_activity_at ? Date.parse(g.last_activity_at) : null,
      completedAt: g.completed_at ? Date.parse(g.completed_at) : null,
      subtasks: subs,
    } as UiGoal;
  });
}

export async function toggleSubtask(subtaskId: number, next?: boolean) {
  const token = await requireToken();
  const res = await fetch(`${FUNCTIONS_BASE}/goal-toggle-subtask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ subtask_id: subtaskId, is_complete: next }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'toggle-subtask failed');
  return JSON.parse(text) as { subtask: DbSubtask; progress: number; rid: string };
}

export async function setGoalStatus(targetId: number, status: 'active' | 'paused' | 'completed') {
  const token = await requireToken();
  const res = await fetch(`${FUNCTIONS_BASE}/goal-set-status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ target_id: targetId, status }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'goal-set-status failed');
  return JSON.parse(text) as { target: any; rid: string };
}

export async function addSubtasks(targetId: number, steps: { name: string }[]) {
  const token = await requireToken();
  const res = await fetch(`${FUNCTIONS_BASE}/goal-add-subtasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ target_id: targetId, steps }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'goal-add-subtasks failed');
  return JSON.parse(text) as { subtasks: DbSubtask[] };
}