// lib/api/goals.ts
import { supabase, FUNCTIONS_BASE } from '@/lib/supabase';

/* ===== Типы ===== */
export type CreateGoalPayload = {
  title: string;
  description?: string | null;
  icon?: string | null;
  date_end?: string | null; // YYYY-MM-DD
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
};

/* ===== Создание ===== */
export async function createUserGoal(payload: CreateGoalPayload) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${FUNCTIONS_BASE}/goal-create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `goal-create failed (${res.status})`);
  return text ? (JSON.parse(text) as { target: any; subtasks: any[]; rid: string }) : { target: null, subtasks: [], rid: '' };
}

/* ===== Список целей (с прогрессом) ===== */
export async function fetchGoals(): Promise<UiGoal[]> {
  const { data, error } = await supabase
    .from('user_targets')
    .select(
      'id, created_at, name, description, icon, date_end, status, last_activity_at, completed_at, target_target ( id, is_complete, target_id )'
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as DbGoal[];

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
    };
  });
}

/* ===== Детали цели ===== */
export async function fetchGoalDetail(goalId: number) {
  const { data, error } = await supabase
    .from('target_target')
    .select('id, name, is_complete, target_id')
    .eq('target_id', goalId)
    .order('id', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbSubtask[];
}

/* ===== Тоггл подзадачи ===== */
export async function toggleSubtask(subtaskId: number, next?: boolean) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${FUNCTIONS_BASE}/goal-toggle-subtask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ subtask_id: subtaskId, is_complete: next }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || 'toggle-subtask failed');
  return JSON.parse(text) as { subtask: DbSubtask; progress: number; rid: string };
}

/* ===== Смена статуса ===== */
export async function setGoalStatus(targetId: number, status: 'active' | 'paused' | 'completed') {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${FUNCTIONS_BASE}/goal-set-status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ target_id: targetId, status }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || 'goal-set-status failed');
  return JSON.parse(text) as { target: any; rid: string };
}