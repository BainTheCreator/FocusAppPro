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
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const supa = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: u, error: uErr } = await supa.auth.getUser();
    if (uErr || !u?.user) return json({ error: 'UNAUTHORIZED', rid }, 401);

    const user = u.user;
    const uid = user.id;
    const tgId = user.user_metadata?.telegram_id ? String(user.user_metadata.telegram_id) : null;

    const body = await req.json().catch(() => ({}));
    // Частичное обновление: только переданные поля
    const hasName = Object.prototype.hasOwnProperty.call(body, 'name');
    const hasEmail = Object.prototype.hasOwnProperty.call(body, 'email');
    const name: string | null | undefined = hasName
      ? (body.name === null ? null : String(body.name ?? '').trim() || null)
      : undefined;
    const email: string | null | undefined = hasEmail
      ? (body.email === null ? null : String(body.email ?? '').trim() || null)
      : undefined;

    const payload: any = { auth_uid: uid };
    if (tgId) payload.login_id = tgId, payload.from_login = 'telegram';
    if (hasName) payload.name = name;
    if (hasEmail) payload.email = email;

    const onConflict = tgId ? 'login_id' : 'auth_uid';

    const up = await admin
      .from('user')
      .upsert(payload, { onConflict })
      .select('id, auth_uid, login_id, name, email, have_premium, from_login')
      .single();

    if (up.error) {
      console.error('[profile-save]', rid, up.error);
      return json({ error: up.error.message, rid }, 400);
    }
    return json({ profile: up.data, rid }, 200);
  } catch (e: any) {
    console.error('[profile-save] fatal', rid, e?.message ?? e);
    return json({ error: String(e?.message ?? e), rid }, 500);
  }
});