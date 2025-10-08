// services/googleAuth.ts
import 'react-native-url-polyfill/auto'
import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import * as Google from 'expo-auth-session/providers/google'
import Constants from 'expo-constants'
import { supabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

type LoginOptions = {
  debug?: boolean
  prompt?: 'none' | 'consent' | 'select_account' | 'login'
}

const EXPO_PROXY_REDIRECT = 'https://auth.expo.dev/@jardaxion/focusapppro'
const NATIVE_REDIRECT = 'goalsapp://auth'

// утилиты
const isWeb = Platform.OS === 'web'
const isExpoGo = Constants.appOwnership === 'expo'
const expoClientId = (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID

function makeNonce(len = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[(Math.random() * chars.length) | 0]
  return out
}
function extractIdTokenFromUrl(url?: string): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url)
    const q = u.searchParams.get('id_token')
    if (q) return q
    const hash = u.hash?.startsWith('#') ? u.hash.slice(1) : u.hash
    if (hash) {
      const sp = new URLSearchParams(hash)
      return sp.get('id_token') ?? undefined
    }
  } catch {}
  return undefined
}
function extractHashTokens(url?: string): { access_token?: string; refresh_token?: string } {
  if (!url) return {}
  const hashPart = url.includes('#') ? url.split('#')[1] : ''
  if (!hashPart) return {}
  const sp = new URLSearchParams(hashPart)
  return { access_token: sp.get('access_token') ?? undefined, refresh_token: sp.get('refresh_token') ?? undefined }
}
async function exchangeCodeFlexible(code: string) {
  // поддержка старой и новой сигнатуры
  const authAny: any = supabase.auth as any
  if (typeof authAny.exchangeCodeForSession === 'function') {
    try {
      return await authAny.exchangeCodeForSession(code) // старые типы: string
    } catch {
      return await authAny.exchangeCodeForSession({ code }) // новые типы: { code }
    }
  }
  // fallback на новые типы
  // @ts-ignore
  return await supabase.auth.exchangeCodeForSession({ code })
}

// WEB (ПК): Supabase OAuth, редирект на текущий origin, сессия подхватится автоматически
async function loginWeb(debug?: boolean) {
  const origin = window.location.origin
  if (debug) console.log('[google][web] redirectTo:', origin)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: origin, // вернёмся на тот же origin
      // scopes: 'email profile', // по желанию
      // По умолчанию skipBrowserRedirect=false — браузер сам уйдёт на Google
    },
  })
  if (error) throw error
  // дальше произойдёт реальный редирект страницы; сессия подтянется автоматически (detectSessionInUrl: true)
  return null as any
}

// iOS в Expo Go: берём id_token у Google и логинимся в Supabase через signInWithIdToken
async function loginExpoGo(debug?: boolean, prompt?: LoginOptions['prompt']) {
  if (!expoClientId) throw new Error('Нет EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID')
  const redirectUri = EXPO_PROXY_REDIRECT
  const nonce = makeNonce()

  if (debug) {
    console.log('[google][expo-go] clientId:', expoClientId)
    console.log('[google][expo-go] redirectUri:', redirectUri)
  }

  const request = new AuthSession.AuthRequest({
    clientId: expoClientId,
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    usePKCE: false, // для id_token PKCE запрещён (иначе invalid_request: code_challenge_method)
    scopes: ['openid', 'email', 'profile'],
    extraParams: { prompt: prompt ?? 'select_account', nonce },
  })

  const result = await (request as any).promptAsync(Google.discovery, { useProxy: true } as any)
  if (debug) console.log('[google][expo-go] result:', result)

  if (result.type !== 'success') {
    if (result.type === 'dismiss' || result.type === 'cancel') throw new Error('Вход отменён пользователем')
    const reason = (result as any)?.params?.error || (result as any)?.error || 'Авторизация не завершена'
    throw new Error(String(reason))
  }

  const idToken =
    extractIdTokenFromUrl((result as any).url) ||
    (result as any).params?.id_token ||
    (result as any).authentication?.idToken

  if (!idToken) throw new Error('Не удалось получить id_token от Google')

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    nonce,
  })
  if (error) throw error
  return data.user
}

// iOS (Dev Client/Standalone): Supabase OAuth с PKCE и deep link goalsapp://auth
async function loginNativePKCE(debug?: boolean) {
  const redirectTo = NATIVE_REDIRECT
  if (debug) console.log('[google][native] redirectTo:', redirectTo)

  const { data: oAuthData, error: oAuthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      // flowType: 'pkce' // если типы старые — не указываем, PKCE включится по умолчанию
    } as any,
  })
  if (oAuthError) throw oAuthError

  const result = await WebBrowser.openAuthSessionAsync(oAuthData.url, redirectTo)
  if (debug) console.log('[google][native] openAuthSession result:', result)

  if (result.type !== 'success' || !result.url) {
    if (result.type === 'cancel' || result.type === 'dismiss') throw new Error('Вход отменён пользователем')
    throw new Error('Авторизация не завершена')
  }

  const returned = new URL(result.url)
  const code = returned.searchParams.get('code')
  if (code) {
    const { data: sessionData, error: exchangeError } = await exchangeCodeFlexible(code)
    if (exchangeError) throw exchangeError
    return (sessionData as any).user
  }

  // fallback: implicit токены
  const { access_token, refresh_token } = extractHashTokens(result.url)
  if (access_token && refresh_token) {
    const { data: sessionData, error: setError } = await supabase.auth.setSession({ access_token, refresh_token })
    if (setError) throw setError
    return sessionData.user
  }

  throw new Error('Не получили code или токены из редиректа')
}

export async function loginWithGoogle(opts: LoginOptions = {}) {
  const debug = !!opts.debug
  if (isWeb) return await loginWeb(debug)
  if (isExpoGo) return await loginExpoGo(debug, opts.prompt)
  return await loginNativePKCE(debug)
}

export async function logout() {
  await supabase.auth.signOut()
}