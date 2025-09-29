// lib/api/walletAuth.ts
import { supabase, FUNCTIONS_BASE } from '@/lib/supabase';

export async function getWalletNonce(): Promise<string> {
  const res = await fetch(`${FUNCTIONS_BASE}/wallet-auth`, { method: 'GET' });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || 'wallet-nonce failed');
  return j.nonce as string;
}

export async function verifyWalletAndLogin(params: { address: string; message: string; signature: string }) {
  const res = await fetch(`${FUNCTIONS_BASE}/wallet-auth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || 'wallet-verify failed');

  const email = j.email as string;
  if (j.token) {
    // Завершаем вход через magiclink-токен без писем
    const { data, error } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token: j.token as string,
      email,
    });
    if (error) throw error;
    return data?.session;
  }

  if (j.email_otp) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: 'email',
      email,
      token: j.email_otp as string,
    });
    if (error) throw error;
    return data?.session;
  }

  throw new Error('No token received from server');
}