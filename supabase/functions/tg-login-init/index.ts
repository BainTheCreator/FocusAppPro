import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BOT_USERNAME = Deno.env.get('TELEGRAM_BOT_USERNAME')!; // без @

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async () => {
  const nonce = crypto.randomUUID();
  await admin.from('tg_login').insert({ nonce });

  const tme = `https://t.me/${BOT_USERNAME}?start=${nonce}`;
  const tg = `tg://resolve?domain=${BOT_USERNAME}&start=${nonce}`;

  return new Response(JSON.stringify({ nonce, tme, tg }), {
    headers: { 'content-type': 'application/json' },
    status: 201,
  });
});