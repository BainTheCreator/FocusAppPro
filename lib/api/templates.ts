// lib/api/templates.ts
import { supabase } from '@/lib/supabase';

export type DbTemplate = {
  id: number;
  title: string;
  category: string;
  icon: string;
  duration: string | null;
  difficulty: string | null;
  rating: number | string | null;
  popularity_count: number | null;
  is_team: boolean;
  description: string | null;
  goal_template_steps?: Array<{ name: string; order_index: number }>;
};

export type UiTemplate = {
  id: number;
  title: string;
  category: string;
  icon: string;
  duration?: string;
  difficulty?: string;
  rating?: number;
  users: number;
  isTeam: boolean;
  subtasks: number;
  description?: string | null;
};

// Загрузка опубликованных шаблонов с количеством шагов
export async function fetchGoalTemplates(): Promise<UiTemplate[]> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  //if (!token) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('goal_templates')
    .select(`
      id, title, category, icon, duration, difficulty, rating,
      popularity_count, is_team, description,
      goal_template_steps ( name, order_index )
    `)
    .eq('is_published', true)
    .order('popularity_count', { ascending: false });

  if (error) throw new Error(error.message);

  const arr = (data as unknown as DbTemplate[]) || [];
  return arr.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    icon: t.icon,
    duration: t.duration || undefined,
    difficulty: t.difficulty || undefined,
    rating: t.rating != null ? Number(t.rating) : undefined,
    users: t.popularity_count || 0,
    isTeam: !!t.is_team,
    subtasks: (t.goal_template_steps || []).length,
    description: t.description || null,
  }));
}

// Создаёт личную цель из шаблона (RPC add_goal_from_template). Возвращает id user_targets
export async function addGoalFromTemplate(templateId: number, opts?: { teamId?: number | null }) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('add_goal_from_template', {
    p_template_id: templateId,
    p_team_id: opts?.teamId ?? null,
  });

  if (error) throw new Error(error.message);
  return data as number;
}