// App.tsx
import { setupWalletConnectCompat } from '@/lib/wc/setupCompat';
setupWalletConnectCompat();

import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { AppState, View, Pressable, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, focusManager, useQueryClient } from '@tanstack/react-query';

import { Onboarding } from '@/components/Onboarding';
import { Dashboard } from '@/components/Dashboard';
import { CreateGoal } from '@/components/CreateGoal';
import { Library } from '@/components/Library';
import { Analytics } from '@/components/Analytics'; // не забудь добавить проп isAuthed внутри файла
import { Premium } from '@/components/Premium';
import { Teams } from '@/components/Teams';
import { Login } from '@/components/Login';
import { Profile } from '@/components/Profile';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';

import { Home, TrendingUp, Crown, Users, User2, Target as TargetIcon, Sparkles, BookOpen, X as CloseIcon } from 'lucide-react-native';
import { GoalsProvider, useGoals } from '@/state/goals';

import './global.css';
import { supabase } from '@/lib/supabase';
import { testOpenTelegramPage } from './auth/testOpenTelegramPage';
import { loginWithTelegram } from './lib/hooks/useTelegramLogin';
import { loginWithGoogle } from '@/lib/hooks/useGoogleLogin';
import { ensureUserProfile } from '@/lib/api/user';
import { useWalletLoginWC } from '@/lib/hooks/useWalletLoginWC';

type Screen =
  | 'onboarding'
  | 'login'
  | 'dashboard'
  | 'create-goal'
  | 'library'
  | 'analytics'
  | 'teams'
  | 'premium'
  | 'profile';

type Provider = 'telegram' | 'qr' | 'apple' | 'google' | 'web3' | 'email';

const queryClient = new QueryClient();
const FORCE_LOGIN = false;

function useReactQueryFocus() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => sub.remove();
  }, []);
}

type BottomTabsProps = { current: Screen; onChange: (s: Screen) => void };

function BottomTabs({ current, onChange }: BottomTabsProps) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { key: 'dashboard' as Screen, label: 'Главная', Icon: Home },
    { key: 'analytics' as Screen, label: 'Статистика', Icon: TrendingUp },
    { key: 'teams' as Screen, label: 'Команды', Icon: Users },
    { key: 'premium' as Screen, label: 'Магазин', Icon: Crown },
    { key: 'profile' as Screen, label: 'Профиль', Icon: User2 },
  ];
  return (
    <View style={{ paddingBottom: (insets?.bottom ?? 0) + 8, paddingTop: 8 }} {...({ className: 'px-2 border-t border-border bg-card/90' } as any)}>
      <View {...({ className: 'flex-row items-center justify-between' } as any)}>
        {tabs.map(({ key, label, Icon }) => {
          const active = current === key;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              {...({ className: 'flex-1 items-center justify-center py-2 mx-1 rounded-xl ' + (active ? 'bg-primary/10' : '') } as any)}
            >
              <Icon size={18} color={active ? '#35D07F' : '#FFFFFF'} />
              <Text {...({ className: 'mt-1 text-xs ' + (active ? 'text-primary font-medium' : 'text-foreground') } as any)}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PostSignupTutorialOverlay({ onClose }: { onClose: () => void }) {
  return (
    <View pointerEvents="auto" {...({ className: 'absolute inset-0 bg-black/60 items-center justify-center px-6' } as any)}>
      <View {...({ className: 'w-full max-w-md rounded-2xl bg-card border border-border p-5' } as any)}>
        <View {...({ className: 'flex-row items-center justify-between mb-2' } as any)}>
          <Text {...({ className: 'text-lg font-semibold text-foreground' } as any)}>Добро пожаловать! 🚀</Text>
          <Pressable onPress={onClose} {...({ className: 'p-1 -mr-1' } as any)}><CloseIcon size={18} color="#9ca3af" /></Pressable>
        </View>
        <Text {...({ className: 'text-sm text-muted-foreground mb-3' } as any)}>Коротко о главном. Вот с чего лучше начать:</Text>
        <View {...({ className: 'gap-3' } as any)}>
          <View {...({ className: 'flex-row items-start gap-3' } as any)}>
            <TargetIcon size={18} color="#35D07F" />
            <View {...({ className: 'flex-1' } as any)}>
              <Text {...({ className: 'text-foreground font-medium' } as any)}>Создайте первую цель</Text>
              <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>Нажмите “Создать” на главном экране и добавьте шаги — вручную или с помощью AI.</Text>
            </View>
          </View>
          <View {...({ className: 'flex-row items-start gap-3' } as any)}>
            <BookOpen size={18} color="#35D07F" />
            <View {...({ className: 'flex-1' } as any)}>
              <Text {...({ className: 'text-foreground font-medium' } as any)}>Загляните в библиотеку</Text>
              <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>Готовые шаблоны целей — добавьте одну в один клик и начните.</Text>
            </View>
          </View>
          <View {...({ className: 'flex-row items-start gap-3' } as any)}>
            <Sparkles size={18} color="#35D07F" />
            <View {...({ className: 'flex-1' } as any)}>
              <Text {...({ className: 'text-foreground font-medium' } as any)}>Включите AI‑инсайты</Text>
              <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>На экране “Статистика” получите персональные советы для ускорения прогресса.</Text>
            </View>
          </View>
        </View>
        <Pressable onPress={onClose} {...({ className: 'mt-5 h-11 rounded-xl bg-primary items-center justify-center active:opacity-90' } as any)}>
          <Text {...({ className: 'text-primary-foreground font-semibold' } as any)}>Погнали!</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AppShell() {
  const qc = useQueryClient();

  const [booted, setBooted] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('onboarding');
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [showSignupTutorial, setShowSignupTutorial] = useState(false);

  const { addGoal } = useGoals?.() || { addGoal: async () => {} };
  const { signIn: signInWallet } = useWalletLoginWC();

  useEffect(() => {
    (async () => {
      try {
        const sess = await supabase.auth.getSession();
        const authed = !!sess.data.session;
        setIsAuthed(authed);

        let initial: Screen;
        if (FORCE_LOGIN) initial = 'login';
        else if (!authed && !onboardingDone) initial = 'onboarding';
        else if (!authed) initial = 'login';
        else initial = 'dashboard';
        setCurrentScreen(initial);

        // ВАЖНО: если пользователь уже залогинен (возврат в приложение),
        // создадим/обновим профиль сразу.
        if (authed) {
          try {
            const res = await ensureUserProfile();
            if (res.created) setShowSignupTutorial(true);
          } catch (e) {
            console.warn('ensureUserProfile on boot failed', e);
          }
        }
      } catch {
        setIsAuthed(false);
        setCurrentScreen('onboarding');
      } finally {
        setBooted(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthed(!!session);

      if (event === 'SIGNED_IN') {
        // Создаём/обновляем профиль сразу после входа
        let created = false;
        try {
          const res = await ensureUserProfile();
          created = !!res.created;
        } catch (e) {
          console.warn('ensureUserProfile on SIGNED_IN failed', e);
        }

        // перезапускаем данные
        qc.invalidateQueries({ queryKey: ['goals'] });
        qc.invalidateQueries({ queryKey: ['goal_templates'] });
        qc.invalidateQueries({ queryKey: ['teams'] });
        qc.invalidateQueries({ queryKey: ['me'] });

        setCurrentScreen('dashboard');
        if (created) setShowSignupTutorial(true);
      }
      if (event === 'SIGNED_OUT') {
        setOnboardingDone(false);
        setCurrentScreen('onboarding');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [onboardingDone, qc]);

  // “надёжный” экран
  const effectiveScreen: Screen = useMemo(() => {
    if (!booted) return 'onboarding';
    if (!isAuthed) return onboardingDone ? 'login' : 'onboarding';
    const allowed: Screen[] = ['dashboard', 'create-goal', 'library', 'analytics', 'teams', 'premium', 'profile'];
    return allowed.includes(currentScreen) ? currentScreen : 'dashboard';
  }, [booted, isAuthed, onboardingDone, currentScreen]);

  const showTabs = !['onboarding', 'login', 'create-goal'].includes(effectiveScreen);
  const extraBottomPadding = showTabs ? 100 : 0;

  const handleOnboardingComplete = () => {
    setOnboardingDone(true);
    setCurrentScreen('login');
  };
  const handleCreateGoal = () => setCurrentScreen('create-goal');
  const handleGoalSaved = (draft: any) => { addGoal?.(draft); setCurrentScreen('dashboard'); };
  const handleBack = () => setCurrentScreen('dashboard');
  const loginOnSkip = () => setCurrentScreen('onboarding');

  const handleLoginWith = async (provider: Provider) => {
    if (provider === 'qr')       { try { await testOpenTelegramPage(); } catch (e) { console.warn(e); } return; }
    if (provider === 'telegram') { try { await loginWithTelegram(); } catch (e) { console.warn(e); } return; }
    if (provider === 'google')   { try { await loginWithGoogle({ debug: true }); } catch (e) { console.warn(e); } return; }
    if (provider === 'web3')     { try { await signInWallet(); } catch (e) { console.warn(e); } return; }
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    setIsAuthed(false);
    setOnboardingDone(false);
    setCurrentScreen('onboarding');
  };

  if (!booted) {
    return (
      <SafeAreaView style={{ flex: 1 }} dataSet={{ theme: 'dark' }} {...({ className: 'bg-background items-center justify-center' } as any)}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <Text {...({ className: 'text-foreground' } as any)}>Загрузка…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} dataSet={{ theme: 'dark' }} {...({ className: 'bg-background' } as any)}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View {...({ className: 'flex-1 bg-background' } as any)}>
        {effectiveScreen === 'onboarding' ? (
          <Onboarding onComplete={handleOnboardingComplete} />
        ) : effectiveScreen === 'login' ? (
          <Login onLoginWith={handleLoginWith} onSkip={loginOnSkip} />
        ) : effectiveScreen === 'dashboard' ? (
          <Dashboard
            isAuthed={isAuthed}
            onCreateGoal={handleCreateGoal}
            onLibrary={() => setCurrentScreen('library')}
            onAnalytics={() => setCurrentScreen('analytics')}
            extraBottomPadding={extraBottomPadding}
          />
        ) : effectiveScreen === 'create-goal' ? (
          <CreateGoal onBack={handleBack} onSave={handleGoalSaved} />
        ) : effectiveScreen === 'library' ? (
          <Library
            isAuthed={isAuthed}
            onBack={handleBack}
            onAdded={() => setCurrentScreen('dashboard')}
            extraBottomPadding={extraBottomPadding !== 0 ? extraBottomPadding + 80 : 0}
          />
        ) : effectiveScreen === 'analytics' ? (
          <Analytics isAuthed={isAuthed} onBack={handleBack} extraBottomPadding={extraBottomPadding} />
        ) : effectiveScreen === 'teams' ? (
          <Teams isAuthed={isAuthed} onBack={handleBack} extraBottomPadding={extraBottomPadding} />
        ) : effectiveScreen === 'premium' ? (
          <Premium onSubscribe={(planId) => { console.log('Подписка на план:', planId); }} extraBottomPadding={extraBottomPadding !== 0 ? extraBottomPadding - 100 : 0} />
        ) : effectiveScreen === 'profile' ? (
          <Profile isAuthed={isAuthed} onLogout={handleLogout} extraBottomPadding={extraBottomPadding} />
        ) : null}

        {showSignupTutorial && <PostSignupTutorialOverlay onClose={() => setShowSignupTutorial(false)} />}
      </View>

      {showTabs && <BottomTabs current={effectiveScreen} onChange={(s) => setCurrentScreen(s)} />}

      <Toaster />
    </SafeAreaView>
  );
}

export default function App() {
  useReactQueryFocus();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <GoalsProvider>
              <AppShell />
            </GoalsProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}