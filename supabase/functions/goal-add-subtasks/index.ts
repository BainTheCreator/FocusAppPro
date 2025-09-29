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
    const auth = req.headers.get('authorization') || '';
    const supa = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: u } = await supa.auth.getUser();
    if (!u?.user) return json({ error: 'UNAUTHORIZED' }, 401);
    const uid = u.user.id;

    const body = await req.json().catch(() => ({}));
    const target_id = Number(body?.target_id);
    const steps = (Array.isArray(body?.steps) ? body.steps : []) as Array<{ name?: string }>;

    if (!target_id || !steps.length) return json({ error: 'BAD_REQUEST' }, 400);

    // numeric user_id по auth_uid
    const prof = await admin.from('user').select('id').eq('auth_uid', uid).maybeSingle();
    if (prof.error || !prof.data?.id) return json({ error: 'PROFILE_NOT_FOUND' }, 400);
    const user_id = prof.data.id as number;

    // Проверка: цель принадлежит пользователю ИЛИ это командная цель команды, где он участник
    const goalQ = await admin
      .from('user_targets')
      .select('id, user_id, team_id')
      .eq('id', target_id)
      .maybeSingle();

    if (goalQ.error || !goalQ.data) return json({ error: 'NOT_FOUND' }, 404);

    const g = goalQ.data as { id: number; user_id: number; team_id: number | null };

    let allowed = false;
    if (g.team_id == null) {
      allowed = g.user_id === user_id;
    } else {
      const member = await admin
        .from('team_members')
        .select('id')
        .eq('team_id', g.team_id)
        .eq('user_id', user_id)
        .maybeSingle();
      allowed = !!member.data;
    }

    if (!allowed) return json({ error: 'FORBIDDEN' }, 403);

    // Подготовим строки вставки
    const rows = steps
      .map((s) => ({ name: String(s?.name || '').trim(), is_complete: false, target_id }))
      .filter((r) => r.name.length > 0);

    if (!rows.length) return json({ error: 'NO_VALID_STEPS' }, 400);

    const ins = await admin
      .from('target_target')
      .insert(rows)
      .select('id, name, is_complete, target_id');

    if (ins.error) return json({ error: ins.error.message }, 400);

    // Обновим last_activity_at у цели
    await admin.from('user_targets').update({ last_activity_at: new Date().toISOString() }).eq('id', target_id);

    return json({ subtasks: ins.data || [] }, 200);
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});