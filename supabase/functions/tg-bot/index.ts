import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sendMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  const rid = crypto.randomUUID();
  try {
    const secret = req.headers.get('x-telegram-bot-api-secret-token');
    if (secret !== WEBHOOK_SECRET) {
      console.warn(`[tg-bot][${rid}] bad secret`);
      return new Response('Forbidden', { status: 403 });
    }

    const update = await req.json();
    console.log(`[tg-bot][${rid}] update`, JSON.stringify(update));

    const msg = update?.message;
    if (!msg || !msg.text) return new Response('ok');

    const chatId = msg.chat?.id;
    const fromId = msg.from?.id;
    const text: string = msg.text;

    const parts = text.trim().split(/\s+/);
    const cmd = parts[0];
    const nonce = parts[1];

    if (cmd === '/start' && nonce && fromId) {
      const { data, error } = await admin
        .from('tg_login')
        .update({ telegram_id: fromId })
        .eq('nonce', nonce)
        .is('telegram_id', null)
        .select('nonce')
        .single();

      if (!error && data) {
        console.log(`[tg-bot][${rid}] nonce confirmed`, nonce, 'tgId', fromId);
        await sendMessage(chatId, '✅ Вход подтверждён. Вернитесь в приложение.');
      } else {
        console.warn(`[tg-bot][${rid}] update failed`, error);
        await sendMessage(chatId, '⚠️ Ссылка устарела или уже использована. Начните вход заново.');
      }
    } else if (cmd === '/start' && !nonce) {
      if (chatId) await sendMessage(chatId, 'Откройте бота через ссылку из приложения, чтобы подтвердить вход.');
    }

    return new Response('ok');
  } catch (e: any) {
    console.error(`[tg-bot][${rid}] fatal`, e?.message ?? e);
    return new Response('ok');
  }
});