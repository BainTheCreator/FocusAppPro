import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SiweMessage } from 'npm:siwe@2.3.2';

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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') || Deno.env.get('SUPABASE_URL')!;
const siweDomain = Deno.env.get('SIWE_DOMAIN') || (new URL(APP_ORIGIN)).hostname;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function randomNonce(len = 16) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(null);
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as 'nonce' | 'verify';
    if (!action) return json({ error: 'ACTION_REQUIRED' }, 400);

    if (action === 'nonce') {
      const address = String(body?.address || '').toLowerCase();
      if (!address) return json({ error: 'ADDRESS_REQUIRED' }, 400);
      const nonce = randomNonce(16);
      return json({ nonce, domain: siweDomain, uri: APP_ORIGIN });
    }

    if (action === 'verify') {
      const message = String(body?.message || '');
      const signature = String(body?.signature || '');
      if (!message || !signature) return json({ error: 'MESSAGE_OR_SIGNATURE_REQUIRED' }, 400);

      const siwe = new SiweMessage(message);
      const result = await siwe.verify({ signature, domain: siweDomain });
      if (!result.success) return json({ error: 'SIWE_VERIFY_FAILED', details: result }, 400);

      const address = siwe.address.toLowerCase();
      const email = `${address}@wallet.local`;

      // ищем/создаём пользователя
      let user = null as any;
      const found = await admin.auth.admin.getUserByEmail(email).catch(() => null);
      user = found?.data?.user ?? null;

      if (!user) {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { wallet_address: address, wallet_chain: siwe.chainId, provider: 'siwe' },
        });
        if (error) return json({ error: 'CREATE_USER_FAILED', details: error }, 500);
        user = data.user;
      } else {
        await admin.auth.admin.updateUserById(user.id, {
          user_metadata: { ...user.user_metadata, wallet_address: address, wallet_chain: siwe.chainId, provider: 'siwe' },
        }).catch(() => {});
      }

      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });
      if (linkErr) return json({ error: 'GENERATE_LINK_FAILED', details: linkErr }, 500);

      return json({ email, email_otp: link.email_otp });
    }

    return json({ error: 'UNKNOWN_ACTION' }, 400);
  } catch (e: any) {
    console.error('auth-web3 error:', e?.message || e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});