import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase, FUNCTIONS_BASE } from '../supabase';

WebBrowser.maybeCompleteAuthSession();

async function pollStatus(nonce: string, timeoutMs = 120_000, intervalMs = 1500) {
  const start = Date.now();
  let tick = 0;
  while (Date.now() - start < timeoutMs) {
    tick++;
    try {
      const { data } = await supabase.functions.invoke('tg-login-status', { body: { nonce } });
      const st = (data as any)?.status;
      console.log(`status#${tick}`, st, (data as any)?.rid || '');
      if (st === 'ready' && (data as any)?.telegram_id) return true;
      if (st === 'expired' || st === 'not_found') return false;
    } catch (e: any) {
      console.warn(`status#${tick} error`, e?.message ?? e);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function invokeWithFetch<T = any>(name: string, body: any): Promise<T> {
  const url = `${FUNCTIONS_BASE}/${name}`;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
  };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  console.log(`[fn ${name}] ${res.status}`, text || '<empty>');
  if (!res.ok) {
    const errMsg = (json && (json.error || json.error_code)) || text || `HTTP ${res.status}`;
    throw new Error(`Function ${name} failed: ${errMsg}`);
  }
  return json as T;
}

export async function loginWithTelegram() {
  const init = await supabase.functions.invoke('tg-login-init', { body: {} });
  if (init.error) throw init.error;
  const { nonce, tme, tg, rid } = init.data as any;
  console.log('tg nonce', nonce, rid || '');

  if (Platform.OS === 'web') {
    const w = window.open(tme, '_blank', 'noopener,noreferrer');
    if (!w) window.location.assign(tme);
  } else {
    const canOpen = await Linking.canOpenURL(tg);
    if (canOpen) await Linking.openURL(tg);
    else await WebBrowser.openBrowserAsync(tme);
  }

  const ok = await pollStatus(nonce);
  if (!ok) throw new Error('Вход через Telegram не подтверждён (нет ready)');

  const exchange = await invokeWithFetch('tg-exchange-direct', { nonce });

  if (!exchange?.access_token || !exchange?.refresh_token) {
    throw new Error(`Нет токенов в ответе обмена: ${JSON.stringify(exchange)}`);
  }

  await supabase.auth.setSession({
    access_token: exchange.access_token,
    refresh_token: exchange.refresh_token,
  });

  const { data: sess } = await supabase.auth.getSession();
  console.log('session set?', !!sess.session);
}