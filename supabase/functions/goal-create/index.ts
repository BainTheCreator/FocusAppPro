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
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'POST,OPTIONS',
      },
    });
  }

  const rid = crypto.randomUUID();
  try {
    const authHeader = req.headers.get('authorization') || '';
    const supa = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: u } = await supa.auth.getUser();
    if (!u?.user) return json({ error: 'UNAUTHORIZED', rid }, 401);
    const uid = u.user.id;

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title ?? '').trim();
    if (!title) return json({ error: 'TITLE_REQUIRED', rid }, 400);

    const description = body?.description == null ? null : String(body.description);
    const icon = body?.icon == null ? null : String(body.icon);
    const date_end = body?.date_end == null ? null : String(body.date_end);
    const status = (body?.status ?? 'active') as string;
    const subtasks = Array.isArray(body?.subtasks) ? body.subtasks as Array<{ name?: string; title?: string; is_complete?: boolean }> : [];

    // user_id (int8) по auth_uid
    const prof = await admin.from('user').select('id, auth_uid').eq('auth_uid', uid).maybeSingle();
    if (prof.error || !prof.data?.id) return json({ error: 'PROFILE_NOT_FOUND', rid }, 400);
    const user_id = prof.data.id as number;

    const now = new Date().toISOString();

    const ins = await admin
      .from('user_targets')
      .insert({
        name: title,
        description,
        icon,
        date_end,
        status,
        user_id,
        last_activity_at: now, // при создании считаем активностью
      })
      .select('id, created_at, name, description, icon, date_end, status, user_id, last_activity_at, completed_at')
      .single();

    if (ins.error || !ins.data) return json({ error: String(ins.error?.message ?? 'INSERT_TARGET_FAILED'), rid }, 400);

    const target = ins.data;
    let insertedSubtasks: any[] = [];

    if (subtasks.length > 0) {
      const rows = subtasks
        .map((s) => ({
          name: String(s.name ?? s.title ?? '').trim(),
          is_complete: !!s.is_complete,
          target_id: target.id,
        }))
        .filter((r) => r.name.length > 0);

      if (rows.length > 0) {
        const insSubs = await admin.from('target_target').insert(rows).select('id, created_at, name, is_complete, target_id');
        if (insSubs.error) {
          console.warn('[goal-create] subtasks insert error', rid, insSubs.error);
        } else {
          insertedSubtasks = insSubs.data ?? [];
        }
      }
    }

    return json({ target, subtasks: insertedSubtasks, rid }, 201);
  } catch (e: any) {
    console.error('[goal-create] fatal', rid, e?.message ?? e);
    return json({ error: String(e?.message ?? e), rid }, 500);
  }
});