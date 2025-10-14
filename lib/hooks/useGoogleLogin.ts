// hooks/useGoogleLogin.ts
import 'react-native-url-polyfill/auto'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Prompt = 'none' | 'consent' | 'select_account' | 'login'

export type UseGoogleLoginOptions = {
  auto?: boolean
  autoSilent?: boolean
  debug?: boolean
  loginHint?: string
}

export type UseGoogleLoginReturn = {
  user: User | null
  loading: boolean
  error: string | null
  loginSilent: () => Promise<User | null>
  loginInteractive: (prompt?: Prompt) => Promise<User | null>
  ensureLoggedIn: () => Promise<User | null>
  logout: () => Promise<void>
  triedSilent: boolean
}

export type LoginWithGoogleOptions = {
  debug?: boolean
  prompt?: Prompt
  loginHint?: string
  trySilentFirst?: boolean
}

const isWeb = Platform.OS === 'web'

// ---------- утилиты без expo-зависимостей ----------
async function getAppOwnership(): Promise<'expo' | 'standalone' | 'guest' | undefined> {
  try {
    const Constants: any = (await import('expo-constants')).default
    return Constants?.appOwnership
  } catch {
    return undefined
  }
}

async function getExpoClientId(): Promise<string | undefined> {
  const env = (typeof process !== 'undefined' ? (process as any).env : undefined) || {}
  if (env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID) return env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID as string
  try {
    const Constants: any = (await import('expo-constants')).default
    return (Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID
  } catch {
    return undefined
  }
}

async function makeNonce(len = 32): Promise<string> {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(len)
    globalThis.crypto.getRandomValues(bytes)
    let out = ''
    for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length]
    return out
  }
  try {
    const Random: any = await import('expo-random')
    const bytes: Uint8Array = Random.getRandomBytes(len)
    let out = ''
    for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length]
    return out
  } catch {
    // очень редко: псевдорандом
    let out = ''
    for (let i = 0; i < len; i++) out += alphabet[(Math.random() * alphabet.length) | 0]
    return out
  }
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
  return {
    access_token: sp.get('access_token') ?? undefined,
    refresh_token: sp.get('refresh_token') ?? undefined,
  }
}

async function exchangeCodeFlexible(code: string) {
  const authAny: any = supabase.auth as any
  if (typeof authAny.exchangeCodeForSession === 'function') {
    try {
      return await authAny.exchangeCodeForSession(code)
    } catch {
      return await authAny.exchangeCodeForSession({ code })
    }
  }
  // @ts-ignore
  return await supabase.auth.exchangeCodeForSession({ code })
}

// ---------- реализации платформ ----------

// Web: редирект на Google
async function loginWeb(debug?: boolean, prompt?: Prompt): Promise<User | null> {
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined
  if (debug) console.log('[google][web] redirectTo:', origin, 'prompt:', prompt)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: origin,
      queryParams: prompt ? { prompt } : undefined,
    } as any,
  })
  if (error) throw error
  return null
}

// Expo Go: id_token → Supabase (ленивые импорты expo-* внутри)
async function loginExpoGo(debug?: boolean, prompt: Prompt = 'none', loginHint?: string): Promise<User> {
  const clientId = await getExpoClientId()
  if (!clientId) throw new Error('Нет EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID (expo.extra или env)')

  const AuthSession: any = await import('expo-auth-session')
  const Google: any = await import('expo-auth-session/providers/google')
  const WebBrowser: any = await import('expo-web-browser')
  WebBrowser.maybeCompleteAuthSession()

  const redirectUri = AuthSession.makeRedirectUri()
  const nonce = await makeNonce()

  if (debug) {
    console.log('[google][expo-go] clientId:', clientId)
    console.log('[google][expo-go] redirectUri:', redirectUri)
  }

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    usePKCE: false,
    scopes: ['openid', 'email', 'profile'],
    extraParams: { prompt, nonce, ...(loginHint ? { login_hint: loginHint } : {}) },
  })

  const result = await (request as any).promptAsync(Google.discovery, {
    useProxy: true,
    preferEphemeralSession: false,
  } as any)

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

// Dev Client / Standalone: OAuth PKCE + deep link
async function loginNativePKCE(debug?: boolean, prompt: Prompt = 'select_account', loginHint?: string): Promise<User> {
  const AuthSession: any = await import('expo-auth-session')
  const WebBrowser: any = await import('expo-web-browser')
  WebBrowser.maybeCompleteAuthSession()

  const redirectTo = AuthSession.makeRedirectUri()
  if (debug) console.log('[google][native] redirectTo:', redirectTo, 'prompt:', prompt)

  const { data: oAuthData, error: oAuthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        ...(prompt ? { prompt } : {}),
        ...(loginHint ? { login_hint: loginHint } : {}),
      },
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

  const { access_token, refresh_token } = extractHashTokens(result.url)
  if (access_token && refresh_token) {
    const { data: sessionData, error: setError } = await supabase.auth.setSession({ access_token, refresh_token })
    if (setError) throw setError
    return sessionData.user
  }

  throw new Error('Не получили code или токены из редиректа')
}

// ---------- публичная функция, которую зовёшь из App.tsx ----------

export async function loginWithGoogle(opts: LoginWithGoogleOptions = {}): Promise<User | null> {
  const { debug = false, prompt, loginHint, trySilentFirst = true } = opts

  if (isWeb) {
    return await loginWeb(debug, prompt)
  }

  const ownership = await getAppOwnership()
  const isExpoGo = ownership === 'expo'

  if (isExpoGo) {
    if (trySilentFirst) {
      try {
        return await loginExpoGo(debug, 'none', loginHint)
      } catch (e) {
        if (debug) console.log('[google] silent (Expo Go) failed → interactive:', e)
        return await loginExpoGo(debug, prompt ?? 'select_account', loginHint)
      }
    }
    return await loginExpoGo(debug, prompt ?? 'select_account', loginHint)
  }

  // Dev Client / Standalone
  if (trySilentFirst) {
    try {
      return await loginNativePKCE(debug, 'none', loginHint)
    } catch (e) {
      if (debug) console.log('[google] silent (native) failed → interactive:', e)
      return await loginNativePKCE(debug, prompt ?? 'select_account', loginHint)
    }
  }
  return await loginNativePKCE(debug, prompt ?? 'select_account', loginHint)
}

// ---------- хук ----------

function parseError(e: unknown): string {
  if (!e) return 'Unknown error'
  if (typeof e === 'string') return e
  if (e instanceof Error) return e.message
  try { return JSON.stringify(e) } catch { return String(e) }
}

export function useGoogleLogin(options: UseGoogleLoginOptions = {}): UseGoogleLoginReturn {
  const { auto = true, autoSilent = true, debug = false, loginHint } = options

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const triedSilentRef = useRef(false)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (debug) console.log('[auth] event:', _event, 'user:', session?.user?.id)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => { data.subscription.unsubscribe() }
  }, [debug])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await supabase.auth.getSession()
        if (cancelled) return

        if (data.session?.user) {
          setUser(data.session.user)
          return
        }

        // тихий вход только в Expo Go
        if (auto && autoSilent && !triedSilentRef.current) {
          const ownership = await getAppOwnership()
          if (ownership === 'expo') {
            triedSilentRef.current = true
            try {
              if (debug) console.log('[google] trying silent login (prompt=none) on Expo Go')
              await loginExpoGo(debug, 'none', loginHint)
            } catch (e) {
              if (debug) console.log('[google] silent login failed:', e)
              setError(parseError(e))
            }
          }
        }
      } catch (e) {
        setError(parseError(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [auto, autoSilent, loginHint, debug])

  const refreshCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const { data } = await supabase.auth.getUser()
      const u = data.user ?? null
      setUser(u)
      return u
    } catch (e) {
      setError(parseError(e))
      return null
    }
  }, [])

  const loginSilent = useCallback(async (): Promise<User | null> => {
    setLoading(true); setError(null); triedSilentRef.current = true
    try {
      if (isWeb) throw new Error('Silent login на Web приведёт к редиректу — используйте loginInteractive()')
      const ownership = await getAppOwnership()
      if (ownership === 'expo') {
        await loginExpoGo(debug, 'none', loginHint)
      } else {
        await loginNativePKCE(debug, 'none', loginHint)
      }
      return await refreshCurrentUser()
    } catch (e) {
      setError(parseError(e)); throw e
    } finally {
      setLoading(false)
    }
  }, [debug, loginHint, refreshCurrentUser])

  const loginInteractive = useCallback(
    async (prompt?: Prompt): Promise<User | null> => {
      setLoading(true); setError(null)
      try {
        if (isWeb) {
          await loginWeb(debug, prompt); return null
        }
        const ownership = await getAppOwnership()
        if (ownership === 'expo') {
          await loginExpoGo(debug, prompt ?? 'select_account', loginHint)
        } else {
          await loginNativePKCE(debug, prompt ?? 'select_account', loginHint)
        }
        return await refreshCurrentUser()
      } catch (e) {
        setError(parseError(e)); throw e
      } finally {
        setLoading(false)
      }
    }, [debug, loginHint, refreshCurrentUser]
  )

  const ensureLoggedIn = useCallback(async (): Promise<User | null> => {
    setError(null); setLoading(true)
    try {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) { setUser(data.session.user); return data.session.user }
      if (!triedSilentRef.current && (await getAppOwnership()) === 'expo') {
        try { return await loginSilent() } catch {}
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [loginSilent])

  const logout = useCallback(async () => {
    setLoading(true); setError(null)
    try { await supabase.auth.signOut(); setUser(null) }
    catch (e) { setError(parseError(e)); throw e }
    finally { setLoading(false) }
  }, [])

  return { user, loading, error, loginSilent, loginInteractive, ensureLoggedIn, logout, triedSilent: triedSilentRef.current }
}