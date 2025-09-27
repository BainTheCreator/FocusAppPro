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

    // 1) Сначала ищем по auth_uid
    let q = await admin
      .from('user')
      .select('id, auth_uid, login_id, name, email, have_premium, from_login')
      .eq('auth_uid', uid)
      .maybeSingle();

    if (!q.error && q.data) {
      return json({ profile: q.data, rid });
    }

    // 2) Если нет строки, а есть telegram_id — ищем по login_id
    if (tgId) {
      const found = await admin
        .from('user')
        .select('id, auth_uid, login_id, name, email, have_premium, from_login')
        .eq('login_id', tgId)
        .maybeSingle();

      if (!found.error && found.data) {
        // Прикрепим auth_uid, если его нет/не совпадает
        if (found.data.auth_uid !== uid) {
          const upd = await admin
            .from('user')
            .update({ auth_uid: uid, from_login: 'telegram' })
            .eq('id', found.data.id)
            .select('id, auth_uid, login_id, name, email, have_premium, from_login')
            .single();
          if (!upd.error && upd.data) return json({ profile: upd.data, rid });
        }
        return json({ profile: found.data, rid });
      }
    }

    // 3) Вообще нет записи — создаём минимальную
    const payload: any = { auth_uid: uid };
    if (tgId) {
      payload.login_id = tgId;
      payload.from_login = 'telegram';
    }
    const ins = await admin
      .from('user')
      .upsert(payload, { onConflict: tgId ? 'login_id' : 'auth_uid' })
      .select('id, auth_uid, login_id, name, email, have_premium, from_login')
      .single();

    if (ins.error) return json({ error: ins.error.message, rid }, 400);
    return json({ profile: ins.data, rid });
  } catch (e: any) {
    console.error('[profile-get] fatal', rid, e?.message ?? e);
    return json({ error: String(e?.message ?? e), rid }, 500);
  }
});