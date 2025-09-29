// supabase/functions/wallet-auth/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { recoverMessageAddress, isAddress, getAddress } from 'npm:viem/utils';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    },
  });
}

function randNonce(len = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

// Простейший парсер Nonce из SIWE-текста (строка "Nonce: <nonce>")
function extractSiweNonce(message: string): string | null {
  const m = message.match(/^\s*Nonce:\s*([a-zA-Z0-9]+)\s*$/m);
  return m ? m[1] : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(null);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  try {
    if (req.method === 'GET') {
      const nonce = randNonce(24);
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 минут
      const { error } = await admin.from('wallet_nonces').insert({
        nonce,
        expires_at: expires,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ nonce });
    }

    if (req.method === 'POST') {
      const { address, message, signature } = await req.json().catch(() => ({}));
      if (!message || !signature) return json({ error: 'MESSAGE_AND_SIGNATURE_REQUIRED' }, 400);

      // 1) Валидируем nonce из сообщения
      const siweNonce = extractSiweNonce(message);
      if (!siweNonce) return json({ error: 'NONCE_NOT_FOUND_IN_MESSAGE' }, 400);

      // Проверим что nonce существует и не использован/не просрочен
      const { data: nrows, error: nerr } = await admin
        .from('wallet_nonces')
        .select('*')
        .eq('nonce', siweNonce)
        .maybeSingle();

      if (nerr) return json({ error: nerr.message }, 500);
      if (!nrows) return json({ error: 'NONCE_NOT_ISSUED' }, 400);
      if (nrows.used) return json({ error: 'NONCE_USED' }, 400);
      if (nrows.expires_at && new Date(nrows.expires_at).getTime() < Date.now()) {
        return json({ error: 'NONCE_EXPIRED' }, 400);
      }

      // 2) Восстанавливаем адрес из подписи и сверяем
      let recovered = '';
      try {
        recovered = await recoverMessageAddress({ message, signature });
      } catch (e) {
        return json({ error: 'SIGNATURE_RECOVER_FAILED' }, 400);
      }
      const checksumRecovered = isAddress(recovered) ? getAddress(recovered) : '';
      const checksumProvided = isAddress(address) ? getAddress(address) : checksumRecovered;

      if (!checksumRecovered || checksumRecovered !== checksumProvided) {
        return json({ error: 'ADDRESS_MISMATCH', recovered: checksumRecovered, provided: checksumProvided }, 400);
      }

      // 3) Отметим nonce использованным
      await admin
        .from('wallet_nonces')
        .update({ used: true, used_by: checksumRecovered })
        .eq('nonce', siweNonce);

      // 4) Создаём/находим пользователя в Supabase Auth
      const email = `eth_${checksumRecovered.toLowerCase()}@wallet.local`; // псевдо-емейл для Auth
      // попробуем создать (если уже есть — ок)
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { wallet_address: checksumRecovered, provider: 'siwe' },
      }).catch(() => { /* ignore if exists */ });

      // 5) Генерим magiclink и возвращаем токен для verifyOtp
      const linkRes = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { data: { provider: 'siwe', wallet: checksumRecovered } },
      });

      if (linkRes.error) return json({ error: linkRes.error.message }, 500);

      // Достаём token из action_link, чтобы не парсить e-mail OTP
      const action = linkRes.data?.properties?.action_link as string | undefined;
      let token: string | undefined;
      if (action) {
        try {
          const u = new URL(action);
          token = u.searchParams.get('token') ?? undefined;
        } catch {}
      }
      // Фолбек: если вдруг нет token, отдадим email_otp (6 цифр) — можно верифицировать type: 'email'
      const emailOtp = (linkRes.data as any)?.properties?.email_otp as string | undefined;

      return json({
        email,
        token,                 // использовать с type: 'magiclink'
        email_otp: emailOtp,  // альтернативно, type: 'email'
        type: token ? 'magiclink' : (emailOtp ? 'email' : null),
        address: checksumRecovered,
      });
    }

    return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});