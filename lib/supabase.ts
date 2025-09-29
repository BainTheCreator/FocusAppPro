// supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://vcptshxtznnmjvrspztp.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_08-vBXg4aJ-ck7pBR_jZ5w_aDcAHwCx';

const isWeb = typeof window !== 'undefined';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: isWeb,                 // ВКЛЮЧЕНО на web
    storage: AsyncStorage, // web — localStorage по умолчанию
  },
});

// Правильная база для функций
export const FUNCTIONS_BASE =
  process.env.EXPO_PUBLIC_FUNCTIONS_BASE ?? `${SUPABASE_URL}/functions/v1`;