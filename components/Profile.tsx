import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, ScrollView, Modal,
  KeyboardAvoidingView, Platform, Dimensions, Image
} from 'react-native';
import {
  Gift, LogOut, Settings, Bell, Clock, HelpCircle, Shield, FileText,
  ChevronDown, ChevronRight
} from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, FUNCTIONS_BASE } from '@/lib/supabase';
import { Input } from '@/components/ui/input';

type ProfileProps = { onLogout: () => void; extraBottomPadding?: number; };

type DbUser = {
  id: number;
  created_at: string | null;
  name: string | null;
  email: string | null;
  login_id: number | string | null; // telegram id (не отображаем)
  have_premium: boolean | null;
  from_login: string | null;
  auth_uid?: string | null;
};

const AVATAR_BUCKET = 'avatars';

function getInitial(name?: string | null, fallback?: string | null) {
  const src = (name || fallback || 'Пользователь').trim();
  return src.charAt(0).toUpperCase();
}

async function loadAvatarUrl(uid: string, version: number) {
  const candidates = [`${uid}.jpg`, `${uid}.png`, `${uid}.webp`, `${uid}/avatar.jpg`, `${uid}/avatar.png`, `${uid}/avatar.webp`];
  for (const name of candidates) {
    const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(name, 3600);
    if (data?.signedUrl) return `${data.signedUrl}&v=${version}`;
  }
  return null;
}

async function fetchMe() {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const authUser = userRes.user;
  if (!authUser) throw new Error('Нет активной сессии');

  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const res = await fetch(`${FUNCTIONS_BASE}/profile-get`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: '{}',
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'profile-get failed');
  const json = text ? JSON.parse(text) : {};
  const profile = json?.profile as DbUser | null | undefined;

  return { authUser, profile: profile ?? null };
}

export function Profile({ onLogout, extraBottomPadding = 0 }: ProfileProps) {
  const qc = useQueryClient();
  const { height } = Dimensions.get('window');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    staleTime: 0,
    retry: false,
  });

  const authUser = data?.authUser;
  const profile = data?.profile ?? null;

  const displayName = useMemo(
    () => profile?.name ?? authUser?.email ?? 'Пользователь',
    [profile?.name, authUser?.email]
  );
  const displayEmail = profile?.email ?? authUser?.email ?? '—';
  const isPremium = !!profile?.have_premium;

  // Realtime: обновления своей строки user
  useEffect(() => {
    if (!authUser?.id) return;
    const ch = supabase
      .channel(`user:me:${authUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user', filter: `auth_uid=eq.${authUser.id}` },
        (payload: any) => {
          const nextRow = payload.new ?? payload.old ?? null;
          if (!nextRow) qc.invalidateQueries({ queryKey: ['me'] });
          else qc.setQueryData(['me'], (prev: any) => (prev ? { ...prev, profile: nextRow } : prev));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authUser?.id, qc]);

  // Аватар из Storage (подписка на изменения)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarVer, setAvatarVer] = useState(0);

  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;
    (async () => {
      const url = await loadAvatarUrl(authUser.id, avatarVer);
      if (!cancelled) setAvatarUrl(url);
    })();
    return () => { cancelled = true; };
  }, [authUser?.id, avatarVer]);

  useEffect(() => {
    if (!authUser?.id) return;
    const ch = supabase
      .channel(`storage:${AVATAR_BUCKET}:${authUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'storage', table: 'objects', filter: `bucket_id=eq.${AVATAR_BUCKET}` },
        (p: any) => {
          const name: string = p.new?.name || p.old?.name || '';
          const mine = name.startsWith(`${authUser.id}.`) || name.startsWith(`${authUser.id}/`);
          if (mine) setAvatarVer((v) => v + 1);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authUser?.id]);

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [formName, setFormName] = useState<string>(profile?.name ?? '');
  const [formEmail, setFormEmail] = useState<string>(profile?.email ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFormName(profile?.name ?? '');
    setFormEmail(profile?.email ?? '');
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasChanges =
    (formName ?? '') !== (profile?.name ?? '') ||
    (formEmail ?? '') !== (profile?.email ?? '');

  function openSettings() {
    setFormName(profile?.name ?? '');
    setFormEmail(profile?.email ?? '');
    setIsSettingsOpen(true);
  }
  function closeSettings() { if (!saving) setIsSettingsOpen(false); }

  async function handleSave() {
    if (!authUser) return;
    if (!hasChanges) return closeSettings();
    setSaving(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${FUNCTIONS_BASE}/profile-save`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: formName?.trim() || null, email: formEmail?.trim() || null }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'profile-save failed');
      const json = text ? JSON.parse(text) : {};
      const updated = json?.profile as DbUser | undefined;

      if (updated) {
        qc.setQueryData(['me'], (prev: any) => (prev ? { ...prev, profile: updated } : prev));
      } else {
        await qc.invalidateQueries({ queryKey: ['me'] });
      }
      closeSettings();
    } catch (e) {
      console.warn('save profile error', e);
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    await refetch();
    setAvatarVer((v) => v + 1);
  }

  return (
    <View style={{ flex: 1 }} {...({ className: 'bg-background' } as any)}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: extraBottomPadding + 24 }}
        keyboardShouldPersistTaps="handled"
        {...({ className: 'px-5' } as any)}
      >
        {/* Header */}
        <View {...({ className: 'py-4 flex-row items-center justify-between' } as any)}>
          <Text {...({ className: 'text-foreground text-xl font-semibold' } as any)}>Профиль</Text>
          <Pressable
            onPress={handleRefresh}
            disabled={isRefetching || isLoading}
            {...({ className: 'px-3 py-1 rounded-lg border border-border active:opacity-90' } as any)}
          >
            {isRefetching || isLoading ? (
              <ActivityIndicator color="#9CA3AF" />
            ) : (
              <Text {...({ className: 'text-foreground/80 text-xs' } as any)}>Обновить</Text>
            )}
          </Pressable>
        </View>

        {/* Loading */}
        {(isLoading && !data) ? (
          <View {...({ className: 'mt-4 rounded-2xl border border-border bg-card p-4' } as any)}>
            <Text {...({ className: 'text-foreground/80' } as any)}>Загрузка профиля…</Text>
          </View>
        ) : (
          <>
            {/* User card */}
            <View {...({ className: 'rounded-2xl border border-border bg-card p-4' } as any)}>
              <View {...({ className: 'flex-row items-center' } as any)}>
                <View
                  {...({
                    className:
                      'w-12 h-12 rounded-full items-center justify-center bg-primary/20 border border-primary/30 overflow-hidden',
                  } as any)}
                >
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{ width: 48, height: 48, borderRadius: 24 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text {...({ className: 'text-primary font-semibold' } as any)}>
                      {getInitial(displayName, displayEmail)}
                    </Text>
                  )}
                </View>
                <View {...({ className: 'ml-3 flex-1' } as any)}>
                  <Text {...({ className: 'text-foreground font-semibold text-base' } as any)}>
                    {displayName}
                  </Text>
                  <Text {...({ className: 'text-muted-foreground text-xs mt-0.5' } as any)}>
                    {displayEmail}
                  </Text>

                  <View {...({ className: 'flex-row gap-2 mt-2 flex-wrap' } as any)}>
                    {/* Тег: тариф */}
                    <View
                      {...({
                        className:
                          'self-start px-2 py-0.5 rounded-full border ' +
                          (isPremium
                            ? 'border-[#35D07F]/40 bg-[#35D07F]/10'
                            : 'border-border/60 bg-muted/20'),
                      } as any)}
                    >
                      <Text
                        {...({
                          className:
                            'text-xs ' + (isPremium ? 'text-[#35D07F]' : 'text-foreground/70'),
                        } as any)}
                      >
                        {isPremium ? 'Премиум' : 'Бесплатный'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View {...({ className: 'mt-4 flex-row gap-3' } as any)}>
                <Pressable
                  onPress={() => console.log('gift_subscription')}
                  {...({
                    className:
                      'flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-[#35D07F]/50 py-3 active:opacity-90',
                  } as any)}
                >
                  <Gift size={18} color="#35D07F" />
                  <Text {...({ className: 'text-[#35D07F] font-medium' } as any)}>
                    Подарить подписку
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onLogout}
                  {...({
                    className:
                      'w-36 flex-row items-center justify-center gap-2 rounded-xl border border-destructive/60 py-3 active:opacity-90',
                  } as any)}
                >
                  <LogOut size={18} color="#f87171" />
                  <Text {...({ className: 'text-destructive font-medium' } as any)}>Выйти</Text>
                </Pressable>
              </View>
            </View>

            {/* Quick settings */}
            <View {...({ className: 'mt-6' } as any)}>
              <Text {...({ className: 'text-foreground/90 text-lg font-semibold mb-3' } as any)}>
                Быстрые настройки
              </Text>

              <View {...({ className: 'rounded-2xl border border-border bg-card' } as any)}>
                <Pressable
                  onPress={openSettings}
                  {...({ className: 'px-4 py-4 border-b border-border/60 active:opacity-90' } as any)}
                >
                  <View {...({ className: 'flex-row items-center justify-between' } as any)}>
                    <View {...({ className: 'flex-row items-center gap-3' } as any)}>
                      <Settings size={18} color="#f3f4f6" />
                      <Text {...({ className: 'text-foreground' } as any)}>Настройки</Text>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => console.log('activity_history')}
                  {...({ className: 'px-4 py-4 border-b border-border/60 active:opacity-90' } as any)}
                >
                  <View {...({ className: 'flex-row items-center gap-3' } as any)}>
                    <Clock size={18} color="#f3f4f6" />
                    <Text {...({ className: 'text-foreground' } as any)}>История активности</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => console.log('notifications')}
                  {...({ className: 'px-4 py-4 active:opacity-90' } as any)}
                >
                  <View {...({ className: 'flex-row items-center gap-3' } as any)}>
                    <Bell size={18} color="#f3f4f6" />
                    <Text {...({ className: 'text-foreground' } as any)}>Уведомления</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Help & legal */}
            <View {...({ className: 'mt-6 mb-2' } as any)}>
              <Text {...({ className: 'text-foreground/90 text-lg font-semibold mb-3' } as any)}>
                Помощь и юридическая информация
              </Text>

              <View {...({ className: 'rounded-2xl border border-border bg-card' } as any)}>
                <Pressable
                  onPress={() => console.log('help_faq')}
                  {...({ className: 'px-4 py-4 border-b border-border/60 active:opacity-90' } as any)}
                >
                  <View {...({ className: 'flex-row items-center gap-3' } as any)}>
                    <HelpCircle size={18} color="#f3f4f6" />
                    <Text {...({ className: 'text-foreground' } as any)}>Помощь и FAQ</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => console.log('privacy_policy')}
                  {...({ className: 'px-4 py-4 border-b border-border/60 active:opacity-90' } as any)}
                >
                  <View {...({ className: 'flex-row items-center gap-3' } as any)}>
                    <Shield size={18} color="#f3f4f6" />
                    <Text {...({ className: 'text-foreground' } as any)}>Политика конфиденциальности</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => console.log('terms_of_use')}
                  {...({ className: 'px-4 py-4 active:opacity-90' } as any)}
                >
                  <View {...({ className: 'flex-row items-center gap-3' } as any)}>
                    <FileText size={18} color="#f3f4f6" />
                    <Text {...({ className: 'text-foreground' } as any)}>Условия использования</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Settings modal */}
      <Modal animationType="slide" transparent visible={isSettingsOpen} onRequestClose={closeSettings}>
        <View {...({ className: 'flex-1 bg-black/60 justify-end' } as any)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={{ maxHeight: height * 0.9 }} {...({ className: 'rounded-t-2xl border-t border-border bg-card px-5 pt-3 pb-6' } as any)}>
              <View {...({ className: 'flex-row items-center justify-between py-1' } as any)}>
                <Text {...({ className: 'text-foreground text-lg font-semibold' } as any)}>Настройки</Text>
                <Pressable onPress={closeSettings} disabled={saving} {...({ className: 'p-2 rounded-full active:opacity-80' } as any)}>
                  <ChevronDown size={20} color="#9CA3AF" />
                </Pressable>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 8 }} {...({ className: 'gap-4' } as any)}>
                <View>
                  <Text {...({ className: 'text-foreground/70 text-xs mb-1' } as any)}>Имя</Text>
                  <Input value={formName} onChangeText={setFormName} placeholder="Ваше имя" />
                </View>
                <View>
                  <Text {...({ className: 'text-foreground/70 text-xs mb-1' } as any)}>Email</Text>
                  <Input value={formEmail} onChangeText={setFormEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
                </View>
              </ScrollView>

              <View {...({ className: 'flex-row gap-3 mt-3' } as any)}>
                <Pressable disabled={saving} onPress={closeSettings} {...({ className: 'flex-1 items-center justify-center rounded-xl border border-border py-3 active:opacity-90' } as any)}>
                  <Text {...({ className: 'text-foreground' } as any)}>Отмена</Text>
                </Pressable>
                <Pressable disabled={saving || !hasChanges} onPress={handleSave} {...({ className: 'flex-1 items-center justify-center rounded-xl border border-[#35D07F]/60 bg-[#35D07F]/10 py-3 active:opacity-90 ' + (saving || !hasChanges ? 'opacity-50' : '') } as any)}>
                  {saving ? <ActivityIndicator color="#35D07F" /> : <Text {...({ className: 'text-[#35D07F] font-medium' } as any)}>Сохранить</Text>}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}