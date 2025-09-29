// lib/hooks/useGoogleLogin.ts
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type LoginOptions = { debug?: boolean; scheme?: string; path?: string };

function log(dbg: boolean | undefined, ...a: any[]) {
  if (dbg) console.log('[auth/google]', ...a);
}

function parseParams(urlStr: string) {
  try {
    const u = new URL(urlStr);
    return {
      code: u.searchParams.get('code') ?? undefined,
      error: u.searchParams.get('error_description') || u.searchParams.get('error') || undefined,
      url: urlStr,
    };
  } catch {
    return { url: urlStr };
  }
}

function buildRedirectTo(opts?: LoginOptions) {
  const path = opts?.path || 'auth/callback';
  const scheme = opts?.scheme || 'goalsapp';

  if (Platform.OS === 'web') {
    return window.location.origin; // напр. http://localhost:8081
  }

  const isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo) {
    // Expo Go: форсируем proxy → https://auth.expo.dev/@username/slug
    // TS может ругаться на useProxy — даём as any.
    return makeRedirectUri({ path, useProxy: true } as any);
  }

  // Dev Build / Standalone: deeplink
  return Linking.createURL('/' + path); // -> goalsapp://auth/callback
}

export async function loginWithGoogle(opts?: LoginOptions) {
  const dbg = opts?.debug ?? false;
  const redirectTo = buildRedirectTo(opts);
  const isWeb = Platform.OS === 'web';
  const isExpoGo = Constants.appOwnership === 'expo';

  log(dbg, 'ownership:', Constants.appOwnership);
  log(dbg, 'platform:', Platform.OS);
  log(dbg, 'redirectTo:', redirectTo);

  // WEB: полный редирект. Supabase сам разберёт URL (detectSessionInUrl: true).
  if (isWeb) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, scopes: 'email profile' }, // без skipBrowserRedirect
    });
    if (error) {
      log(dbg, 'signInWithOAuth error (web):', error);
      throw error;
    }
    return; // произойдёт редирект → Google → обратно на redirectTo
  }

  // MOBILE: инициируем OAuth, получаем authUrl
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true, // вернёт data.url
      scopes: 'email profile',
    },
  });
  if (error) {
    log(dbg, 'signInWithOAuth error (mobile):', error);
    throw error;
  }

  const authUrl = data?.url;
  if (!authUrl) throw new Error('Не удалось получить URL авторизации');

  try {
    const u = new URL(authUrl);
    log(dbg, 'authUrl redirect_to param:', u.searchParams.get('redirect_to'));
  } catch {}
  log(dbg, 'authUrl:', authUrl);

  // Expo Go: используем startAsync (работает с proxy лучше всего)
  if (isExpoGo && typeof (AuthSession as any).startAsync === 'function') {
    const res = await (AuthSession as any).startAsync({ authUrl, returnUrl: redirectTo });
    log(dbg, 'startAsync result:', res);

    if (res.type !== 'success' || !res.url) {
      if (res.type === 'dismiss') {
        throw new Error('Сессия закрыта. Проверь, что redirectTo = https://auth.expo.dev/@username/slug и этот домен добавлен в Supabase → Redirect URLs.');
      }
      if (res.type === 'cancel') throw new Error('Вход отменён пользователем');
      throw new Error(`Авторизация не завершена (type=${res.type})`);
    }

    const parsed = parseParams(res.url);
    log(dbg, 'returned params (expo):', parsed);
    if (parsed.error) throw new Error('Провайдер вернул ошибку: ' + parsed.error);
    if (!parsed.code) throw new Error('Код авторизации не получен');

    const { error: ex } = await supabase.auth.exchangeCodeForSession(parsed.code);
    if (ex) {
      log(dbg, 'exchangeCodeForSession error:', ex);
      throw ex;
    }
    log(dbg, 'exchangeCodeForSession ok (expo)');
    return;
  }

  // Dev Build / Standalone: обычная сессия в браузере
  const res = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo, { showInRecents: true });
  log(dbg, 'openAuthSessionAsync result:', res);

  if (res.type !== 'success' || !res.url) {
    if (res.type === 'dismiss') {
      throw new Error('Сессия закрыта (dismiss). Убедись, что goalsapp://auth/callback добавлен в Supabase → Redirect URLs.');
    }
    if (res.type === 'cancel') throw new Error('Вход отменён пользователем');
    throw new Error(`Авторизация не завершена (type=${res.type})`);
  }

  const parsed = parseParams(res.url);
  log(dbg, 'returned params (native):', parsed);
  if (parsed.error) throw new Error('Провайдер вернул ошибку: ' + parsed.error);
  if (!parsed.code) throw new Error('Код авторизации не получен');

  const { error: ex2 } = await supabase.auth.exchangeCodeForSession(parsed.code);
  if (ex2) {
    log(dbg, 'exchangeCodeForSession error:', ex2);
    throw ex2;
  }
  log(dbg, 'exchangeCodeForSession ok (native)');
}