import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
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
    const body = await req.json().catch(() => ({}));
    const nonce = body?.nonce as string | undefined;
    if (!nonce) return json({ error: 'nonce required', rid }, 400);

    const { data, error } = await admin.from('tg_login').select('*').eq('nonce', nonce).single();
    if (error) {
      console.warn(`[status][${rid}] db error`, error);
      return json({ status: 'error', rid }, 500);
    }
    if (!data) return json({ status: 'not_found', rid }, 404);

    const age = Date.now() - new Date(data.created_at).getTime();
    const expired = age > 10 * 60 * 1000;

    if (expired) return json({ status: 'expired', rid }, 410);

    if (data.telegram_id && !data.used) {
      console.log(`[status][${rid}] ready`, { nonce, tg: data.telegram_id });
      return json({ status: 'ready', telegram_id: data.telegram_id, rid });
    }

    console.log(`[status][${rid}] pending`, { nonce });
    return json({ status: 'pending', rid });
  } catch (e: any) {
    console.error(`[status][${rid}] fatal`, e?.message ?? e);
    return json({ status: 'error', rid }, 500);
  }
});