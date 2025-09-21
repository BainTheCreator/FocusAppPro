import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { AppState, View, Pressable, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Onboarding } from '@/components/Onboarding';
import { Dashboard } from '@/components/Dashboard';
import { CreateGoal } from '@/components/CreateGoal';
import { Library } from '@/components/Library';
import { Analytics } from '@/components/Analytics';
import { Premium } from '@/components/Premium';
import { Teams } from '@/components/Teams';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';

import { Home, BookOpen, TrendingUp, Crown, Users } from 'lucide-react-native';
import { GoalsProvider, useGoals } from '@/state/goals';
import './global.css';

type Screen =
  | 'onboarding'
  | 'dashboard'
  | 'create-goal'
  | 'library'
  | 'analytics'
  | 'teams'
  | 'premium';

const queryClient = new QueryClient();
const ONBOARDING_KEY = '@seen_onboarding_v1';

function useReactQueryFocus() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => sub.remove();
  }, []);
}

type BottomTabsProps = {
  current: Screen;
  onChange: (s: Screen) => void;
};

function BottomTabs({ current, onChange }: BottomTabsProps) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { key: 'dashboard' as Screen, label: 'Главная', Icon: Home },
    { key: 'analytics' as Screen, label: 'Статистика', Icon: TrendingUp },
    { key: 'teams' as Screen, label: 'Команды', Icon: Users },
    { key: 'library' as Screen, label: 'Библиотека', Icon: BookOpen },
    { key: 'premium' as Screen, label: 'Магазин', Icon: Crown },
  ];
  return (
    <View
      style={{ paddingBottom: (insets?.bottom ?? 0) + 8, paddingTop: 8 }}
      {...({ className: 'px-2 border-t border-border bg-card/90' } as any)}
    >
      <View {...({ className: 'flex-row items-center justify-between' } as any)}>
        {tabs.map(({ key, label, Icon }) => {
          const active = current === key;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              {...({
                className:
                  'flex-1 items-center justify-center py-2 mx-1 rounded-xl ' +
                  (active ? 'bg-primary/10' : ''),
              } as any)}
            >
              <Icon size={18} color={active ? '#35D07F' : '#FFFFFF'} />
              <Text
                {...({
                  className:
                    'mt-1 text-xs ' +
                    (active ? 'text-primary font-medium' : 'text-foreground'),
                } as any)}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AppShell() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('onboarding');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [booted, setBooted] = useState(false);
  const { addGoal, addFromTemplate } = useGoals();

  // Загружаем флаг онбординга из AsyncStorage один раз при старте
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(ONBOARDING_KEY);
        const seen = v === '1';
        setHasSeenOnboarding(seen);
        setCurrentScreen(seen ? 'dashboard' : 'onboarding');
      } catch {
        setHasSeenOnboarding(false);
        setCurrentScreen('onboarding');
      } finally {
        setBooted(true);
      }
    })();
  }, []);

  const showTabs =
    !(currentScreen === 'onboarding' && !hasSeenOnboarding) &&
    currentScreen !== 'create-goal';

  const extraBottomPadding = showTabs ? 100 : 0;

  const handleOnboardingComplete = async () => {
    setHasSeenOnboarding(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    } catch {}
    setCurrentScreen('dashboard');
  };

  const handleCreateGoal = () => setCurrentScreen('create-goal');

  const handleGoalSaved = (draft: any) => {
    addGoal(draft);
    setCurrentScreen('dashboard');
  };

  const handleBack = () => setCurrentScreen('dashboard');

  // Простой сплэш, пока читаем флаг из хранилища
  if (!booted) {
    return (
      <SafeAreaView style={{ flex: 1 }} dataSet={{ theme: 'dark' }} {...({ className: 'bg-background items-center justify-center' } as any)}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <Text {...({ className: 'text-foreground' } as any)}>Загрузка...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      dataSet={{ theme: 'dark' }}
      {...({ className: 'bg-background' } as any)}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View {...({ className: 'flex-1 bg-background' } as any)}>
        {currentScreen === 'onboarding' && !hasSeenOnboarding ? (
          <Onboarding onComplete={handleOnboardingComplete} />
        ) : currentScreen === 'dashboard' ? (
          <Dashboard
            onCreateGoal={handleCreateGoal}
            onLibrary={() => setCurrentScreen('library')}
            onAnalytics={() => setCurrentScreen('analytics')}
            extraBottomPadding={extraBottomPadding}
          />
        ) : currentScreen === 'create-goal' ? (
          <CreateGoal onBack={handleBack} onSave={handleGoalSaved} />
        ) : currentScreen === 'library' ? (
          <Library
            onBack={handleBack}
            onAddGoal={(t) => {
              addFromTemplate(t);
              setCurrentScreen('dashboard');
            }}
            extraBottomPadding={extraBottomPadding !== 0 ? extraBottomPadding + 80 : 0}
          />
        ) : currentScreen === 'analytics' ? (
          <Analytics onBack={handleBack} extraBottomPadding={extraBottomPadding} />
        ) : currentScreen === 'teams' ? (
          <Teams onBack={handleBack} extraBottomPadding={extraBottomPadding} />
        ) : currentScreen === 'premium' ? (
          <Premium
            onSubscribe={(planId) => {
              console.log('Подписка на план:', planId);
            }}
            extraBottomPadding={extraBottomPadding !== 0 ? extraBottomPadding - 100 : 0}
          />
        ) : null}
      </View>

      {showTabs && (
        <BottomTabs
          current={currentScreen}
          onChange={(s) => setCurrentScreen(s)}
        />
      )}

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