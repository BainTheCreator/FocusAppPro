// lib/api/user.ts
import { supabase } from '@/lib/supabase';

export type EnsureProfileResult = {
  created: boolean;
  userId: number | null;
};

export async function ensureUserProfile(): Promise<EnsureProfileResult> {
  const { data: { session }, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) {
    console.warn('ensureUserProfile getSession error', sessErr);
    return { created: false, userId: null };
  }

  const u = session?.user;
  if (!u) return { created: false, userId: null };

  const name =
    (u.user_metadata?.full_name as string) ||
    (u.user_metadata?.name as string) ||
    u.email ||
    'Без имени';

  const email = u.email ?? null;

  // 1) Проверяем, есть ли запись в public."user"
  const { data: existing, error: selErr } = await supabase
    .from('user') // public."user"
    .select('id, name, email')
    .eq('auth_uid', u.id)
    .maybeSingle();

  if (selErr) {
    console.warn('ensureUserProfile select error', selErr);
    return { created: false, userId: null };
  }

  // 2) Нет записи — создаём (это и есть “регистрация” внутри приложения)
  if (!existing) {
    const { data: inserted, error: insErr } = await supabase
      .from('user')
      .insert({ auth_uid: u.id, name, email })
      .select('id')
      .single();

    if (insErr) {
      console.warn('ensureUserProfile insert error', insErr);
      return { created: false, userId: null };
    }
    return { created: true, userId: inserted?.id ?? null };
  }

  // 3) Запись есть — мягко обновим имя/почту (если изменились)
  const needUpdate = (existing.name || '') !== name || (existing.email || '') !== (email || '');
  if (needUpdate) {
    const { error: upErr } = await supabase
      .from('user')
      .update({ name, email })
      .eq('auth_uid', u.id);
    if (upErr) console.warn('ensureUserProfile update error', upErr);
  }

  return { created: false, userId: existing.id };
}