import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'POST,OPTIONS',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(null);
  try {
    // аутентификация пользователя
    const auth = req.headers.get('authorization') || '';
    const supa = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: u } = await supa.auth.getUser();
    if (!u?.user) return json({ error: 'UNAUTHORIZED' }, 401);
    const uid = u.user.id;

    // numeric user_id по auth_uid
    const prof = await admin.from('user').select('id').eq('auth_uid', uid).maybeSingle();
    if (prof.error || !prof.data?.id) return json({ goals: [] }, 200);
    const user_id = prof.data.id as number;

    // команды, где пользователь член
    const mem = await admin.from('team_members').select('team_id').eq('user_id', user_id);
    const teamIds = (mem.data ?? []).map((r: any) => r.team_id);

    // цели: персональные + командные
    const goalsQ = await admin
      .from('user_targets')
      .select('id, created_at, name, description, icon, date_end, status, last_activity_at, completed_at, team_id, user_id')
      .or([
        `user_id.eq.${user_id}`,
        teamIds.length ? `team_id.in.(${teamIds.join(',')})` : 'team_id.eq.null',
      ].join(','))
      .order('created_at', { ascending: false });

    if (goalsQ.error) return json({ error: goalsQ.error.message }, 400);
    const goals = goalsQ.data ?? [];
    if (!goals.length) return json({ goals: [] }, 200);

    // подтянем подзадачи отдельным запросом и сгруппируем
    const goalIds = goals.map((g: any) => g.id);
    const subsQ = await admin
      .from('target_target')
      .select('id, name, is_complete, target_id')
      .in('target_id', goalIds)
      .order('id', { ascending: true });

    if (subsQ.error) {
      // даже если подзадачи не вернулись — отдаём цели
      return json({ goals: goals.map((g: any) => ({ ...g, target_target: [] })) }, 200);
    }

    const subs = (subsQ.data ?? []) as Array<{ id: number; name: string | null; is_complete: boolean; target_id: number }>;
    const byTarget = new Map<number, typeof subs>();
    for (const s of subs) {
      const arr = byTarget.get(s.target_id) ?? [];
      arr.push(s);
      byTarget.set(s.target_id, arr);
    }

    const enriched = goals.map((g: any) => ({
      ...g,
      target_target: byTarget.get(g.id) ?? [],
    }));

    return json({ goals: enriched }, 200);
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});