import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const PASSWORD_SALT = Deno.env.get('TELEGRAM_PASSWORD_SALT') || BOT_TOKEN;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const enc = new TextEncoder();
function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function passwordFor(tgId: string) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(`${tgId}:salt:${PASSWORD_SALT}:v1`));
  return toHex(d);
}
async function findUserByEmail(email: string) {
  let page = 1;
  while (true) {
    const r = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (r.error) throw r.error;
    const u = r.data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (r.data.users.length < 1000) break;
    page++;
  }
  return null;
}
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
  // CORS preflight
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
  const t0 = Date.now();
  try {
    const { nonce } = await req.json().catch(() => ({}));
    if (!nonce) return json({ error_code: 'BAD_REQUEST', error: 'nonce required', rid }, 400);

    // Проверяем nonce
    const row = await admin.from('tg_login').select('*').eq('nonce', nonce).single();
    if (row.error) return json({ error_code: 'DB_ERROR', error: row.error.message, rid }, 500);
    if (!row.data || !row.data.telegram_id)
      return json({ error_code: 'NOT_READY', error: 'Not ready', rid }, 409);
    if (row.data.used)
      return json({ error_code: 'ALREADY_USED', error: 'Already used', rid }, 409);

    const tgId = String(row.data.telegram_id);
    const email = `tg-${tgId}@telegram.local`;
    const name = `tg_${tgId}`;
    const password = await passwordFor(tgId);

    // Создаём/логиним пользователя Supabase Auth
    const create = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, telegram_id: tgId, from_login: 'telegram' },
    });
    if (create.error) {
      const msg = String(create.error.message ?? create.error).toLowerCase();
      // допускаем "already registered"
      if (!(create.error.status === 422 || /already\s+.*registered/i.test(msg))) {
        return json({ error_code: 'CREATE_USER', error: create.error.message, rid }, 500);
      }
    }

    // Логин (с автосбросом пароля при смене соли)
    let sign = await anon.auth.signInWithPassword({ email, password });
    if (sign.error) {
      const msg = String(sign.error.message ?? sign.error);
      if (/invalid login credentials/i.test(msg)) {
        const u = await findUserByEmail(email);
        if (!u) return json({ error_code: 'AUTH', error: msg, rid }, 401);
        const upd = await admin.auth.admin.updateUserById(u.id, { password });
        if (upd.error) return json({ error_code: 'AUTH_RESET', error: upd.error.message, rid }, 500);
        sign = await anon.auth.signInWithPassword({ email, password });
        if (sign.error) return json({ error_code: 'AUTH_AFTER_RESET', error: String(sign.error.message ?? sign.error), rid }, 401);
      } else {
        return json({ error_code: 'AUTH', error: msg, rid }, 401);
      }
    }
    if (!sign.data.session) return json({ error_code: 'NO_SESSION', error: 'No session', rid }, 500);

    const uid = sign.data.user.id;

    // 1) Если запись с этим login_id уже есть — аккуратно проставим auth_uid, не трогая name/email
    await admin
      .from('user')
      .update({ auth_uid: uid, from_login: 'telegram' })
      .eq('login_id', tgId)
      .is('auth_uid', null);

    // 2) Вставим запись, если её не было (на конфликте — ничего не обновляем)
    await admin
      .from('user')
      .upsert([{ auth_uid: uid, login_id: tgId, name, email, from_login: 'telegram' }], {
        onConflict: 'login_id',
        ignoreDuplicates: true,
      });

    // 3) Помечаем nonce использованным
    await admin.from('tg_login').update({ used: true }).eq('nonce', nonce);

    const s = sign.data.session;
    console.log(`[exch][${rid}] success in ${Date.now() - t0}ms`);
    return json({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_in: s.expires_in,
      token_type: s.token_type,
      user: sign.data.user,
      rid,
    }, 200);
  } catch (e: any) {
    console.error(`[exch][${rid}] fatal`, e?.message ?? e);
    return json({ error_code: 'UNCAUGHT', error: String(e?.message ?? e), rid }, 500);
  }
});