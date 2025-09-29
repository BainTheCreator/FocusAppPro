import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'POST,OPTIONS',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(null as any);
  try {
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
    if (prof.error || !prof.data?.id) return json({ teams: [] }, 200);
    const user_id = prof.data.id as number;

    // команды, где я член
    const m = await admin.from('team_members').select('team_id').eq('user_id', user_id);
    const memberIds = (m.data ?? []).map((r: any) => r.team_id);

    // команды, где я владелец
    const own = await admin.from('teams').select('id').eq('owner_user_id', user_id);
    const ownIds = (own.data ?? []).map((r: any) => r.id);

    const ids = Array.from(new Set([...memberIds, ...ownIds]));
    if (ids.length === 0) return json({ teams: [] }, 200);

    // основной запрос по командам
    const teamsQ = await admin
      .from('teams')
      .select('id,name,emoji,description,status,created_at,owner_user_id')
      .in('id', ids)
      .order('created_at', { ascending: false });

    if (teamsQ.error) return json({ error: teamsQ.error.message }, 400);
    const teams = teamsQ.data || [];

    // агрегаты: члены, цели
    const result = [];
    for (const t of teams) {
      const memQ = await admin
        .from('team_members')
        .select('user_id, role, user:user_id ( id, name )')
        .eq('team_id', t.id);
      const members = (memQ.data ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        name: m.user?.name ?? null,
      }));
      const membersCount = members.length;
      const initials = members.slice(0, 5).map((m: any) => {
        const s = (m.name || '').trim();
        return s ? s[0].toUpperCase() : '•';
      });

      const goalsQ = await admin.from('user_targets').select('id,status').eq('team_id', t.id);
      const goals = goalsQ.data ?? [];
      const goalsTotal = goals.length;
      const goalsDone = goals.filter((g: any) => g.status === 'completed').length;
      const progress = goalsTotal > 0 ? Math.round((goalsDone / goalsTotal) * 100) : 0;

      result.push({
        id: t.id,
        name: t.name,
        emoji: t.emoji,
        description: t.description,
        status: t.status,
        created_at: t.created_at,
        membersCount,
        membersInitials: initials,
        goalsTotal,
        goalsDone,
        progress,
        isOwner: t.owner_user_id === user_id,
      });
    }

    return json({ teams: result }, 200);
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});