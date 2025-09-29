import { FUNCTIONS_BASE } from '@/lib/supabase';

export async function siweGetNonce(address: string) {
  const r = await fetch(`${FUNCTIONS_BASE}/auth-web3`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'nonce', address }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ nonce: string; domain: string; uri: string }>;
}

export async function siweVerify(message: string, signature: string) {
  const r = await fetch(`${FUNCTIONS_BASE}/auth-web3`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'verify', message, signature }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ email: string; email_otp: string }>;
}