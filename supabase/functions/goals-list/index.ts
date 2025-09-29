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
    // аутентификация пользователя по заголовку Authorization из клиента
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
    if (prof.error || !prof.data?.id) {
      // пользователя нет в таблице профилей — отдаём пусто
      return json({ goals: [] }, 200);
    }
    const user_id = prof.data.id as number;

    // команды, где пользователь член
    const mem = await admin.from('team_members').select('team_id').eq('user_id', user_id);
    if (mem.error) {
      // даже если команды не прочитались — отдаём только персональные
      const personal = await admin
        .from('user_targets')
        .select('id, created_at, name, description, icon, date_end, status, last_activity_at, completed_at, team_id, user_id')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });
      if (personal.error) return json({ error: personal.error.message }, 400);

      // подзадачи
      const goalIds = (personal.data ?? []).map((g: any) => g.id);
      if (!goalIds.length) return json({ goals: [] }, 200);
      const subsQ = await admin
        .from('target_target')
        .select('id, name, is_complete, target_id')
        .in('target_id', goalIds)
        .order('id', { ascending: true });

      const subs = (subsQ.data ?? []) as Array<{ id: number; name: string | null; is_complete: boolean; target_id: number }>;
      const byTarget = new Map<number, typeof subs>();
      for (const s of subs) {
        const arr = byTarget.get(s.target_id) ?? [];
        arr.push(s);
        byTarget.set(s.target_id, arr);
      }
      const enriched = (personal.data ?? []).map((g: any) => ({ ...g, target_target: byTarget.get(g.id) ?? [] }));
      return json({ goals: enriched }, 200);
    }

    const teamIds = (mem.data ?? [])
      .map((r: any) => r.team_id)
      .filter((x: any) => typeof x === 'number' && Number.isFinite(x)) as number[];

    // цели: персональные + командные
    let q = admin
      .from('user_targets')
      .select('id, created_at, name, description, icon, date_end, status, last_activity_at, completed_at, team_id, user_id')
      .order('created_at', { ascending: false });

    if (teamIds.length > 0) {
      // персональные ИЛИ командные, где user состоит
      q = q.or(`user_id.eq.${user_id},team_id.in.(${teamIds.join(',')})`);
    } else {
      // только персональные (без попыток eq.null!)
      q = q.eq('user_id', user_id);
    }

    const goalsQ = await q;
    if (goalsQ.error) return json({ error: goalsQ.error.message }, 400);

    const goals = goalsQ.data ?? [];
    if (!goals.length) return json({ goals: [] }, 200);

    // подзадачи одним запросом
    const goalIds = goals.map((g: any) => g.id);
    const subsQ = await admin
      .from('target_target')
      .select('id, name, is_complete, target_id')
      .in('target_id', goalIds)
      .order('id', { ascending: true });

    if (subsQ.error) {
      return json({ goals: goals.map((g: any) => ({ ...g, target_target: [] })) }, 200);
    }

    const subs = (subsQ.data ?? []) as Array<{ id: number; name: string | null; is_complete: boolean; target_id: number }>;
    const byTarget = new Map<number, typeof subs>();
    for (const s of subs) {
      const arr = byTarget.get(s.target_id) ?? [];
      arr.push(s);
      byTarget.set(s.target_id, arr);
    }

    const enriched = goals.map((g: any) => ({ ...g, target_target: byTarget.get(g.id) ?? [] }));
    return json({ goals: enriched }, 200);
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});