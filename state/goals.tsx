// state/goals.tsx — локальный стор целей с AsyncStorage
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Subtask = { id: string | number; title: string; completed: boolean; deadline?: string };
export type GoalStatus = 'active' | 'paused' | 'completed';

export type Goal = {
  id: string;
  title: string;
  description?: string;
  icon: string;                 // эмодзи
  category: string;             // человекочитаемый лейбл ("Навыки", "Состояние"...)
  duration?: string;
  deadline?: string;
  isTeam?: boolean;
  subtasks: Subtask[];
  status: GoalStatus;
  progress: number;             // 0..100
  createdAt: number;
  completedAt?: number | null;
};

type State = { goals: Goal[]; loaded: boolean };

type Action =
  | { type: 'LOAD'; payload: Goal[] }
  | { type: 'ADD'; payload: Goal }
  | { type: 'UPDATE'; id: string; patch: Partial<Goal> }
  | { type: 'REMOVE'; id: string }
  | { type: 'INCREMENT_PROGRESS'; id: string; delta: number }
  | { type: 'SET_STATUS'; id: string; status: GoalStatus };

const KEY = '@goals_v1';

const categoryIdToLabel: Record<string, string> = {
  health: 'Состояние',
  mind: 'Мышление',
  skills: 'Навыки',
  actions: 'Действия',
  capital: 'Капитал',
  meaning: 'Смыслы',
  family: 'Семья',
  environment: 'Окружение',
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { goals: action.payload ?? [], loaded: true };
    case 'ADD':
      return { ...state, goals: [action.payload, ...state.goals] };
    case 'UPDATE':
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)),
      };
    case 'REMOVE':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case 'SET_STATUS':
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.id ? { ...g, status: action.status, completedAt: action.status === 'completed' ? Date.now() : g.completedAt ?? null } : g
        ),
      };
    case 'INCREMENT_PROGRESS':
      return {
        ...state,
        goals: state.goals.map((g) => {
          if (g.id !== action.id) return g;
          const next = Math.max(0, Math.min(100, g.progress + action.delta));
          const completed = next >= 100;
          return {
            ...g,
            progress: next,
            status: completed ? 'completed' : g.status,
            completedAt: completed ? (g.completedAt ?? Date.now()) : g.completedAt,
          };
        }),
      };
    default:
      return state;
  }
}

type Ctx = {
  goals: Goal[];
  loaded: boolean;
  addGoal: (draft: any) => Goal;
  addFromTemplate: (t: any) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  incrementProgress: (id: string, delta?: number) => void;
  setStatus: (id: string, status: GoalStatus) => void;
};

const GoalsContext = createContext<Ctx | undefined>(undefined);

function normalizeDraft(draft: any): Goal {
  const id = 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const label =
    draft.categoryLabel ||
    categoryIdToLabel[draft.category as string] ||
    draft.category ||
    'Прочее';
  return {
    id,
    title: draft.title ?? 'Без названия',
    description: draft.description ?? '',
    icon: draft.icon ?? '🎯',
    category: label,
    duration: draft.duration ?? '',
    deadline: draft.deadline ?? '',
    isTeam: !!draft.isTeam,
    subtasks: Array.isArray(draft.subtasks) ? draft.subtasks : [],
    status: (draft.status as GoalStatus) ?? 'active',
    progress: Math.max(0, Math.min(100, Number(draft.progress ?? 0))),
    createdAt: Date.now(),
    completedAt: null,
  };
}

function fromTemplate(t: any): Goal {
  return normalizeDraft({
    title: t.title,
    description: t.description,
    icon: t.icon,
    category: t.category, // уже лейбл из шаблона
    duration: t.duration,
    deadline: '',
    isTeam: !!t.isTeam,
    subtasks: Array.from({ length: t.subtasks ?? 0 }).map((_, i) => ({
      id: `${i + 1}`,
      title: `Шаг ${i + 1}`,
      completed: false,
    })),
    status: 'active',
    progress: 0,
  });
}

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { goals: [], loaded: false });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed: Goal[] = raw ? JSON.parse(raw) : [];
        dispatch({ type: 'LOAD', payload: parsed });
      } catch (e) {
        dispatch({ type: 'LOAD', payload: [] });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state.goals)).catch(() => {});
  }, [state.goals, state.loaded]);

  const addGoal = useCallback((draft: any) => {
    const g = normalizeDraft(draft);
    dispatch({ type: 'ADD', payload: g });
    return g;
  }, []);

  const addFromTemplate = useCallback((t: any) => {
    const g = fromTemplate(t);
    dispatch({ type: 'ADD', payload: g });
    return g;
  }, []);

  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    dispatch({ type: 'UPDATE', id, patch });
  }, []);

  const removeGoal = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const incrementProgress = useCallback((id: string, delta = 10) => {
    dispatch({ type: 'INCREMENT_PROGRESS', id, delta });
  }, []);

  const setStatus = useCallback((id: string, status: GoalStatus) => {
    dispatch({ type: 'SET_STATUS', id, status });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      goals: state.goals,
      loaded: state.loaded,
      addGoal,
      addFromTemplate,
      updateGoal,
      removeGoal,
      incrementProgress,
      setStatus,
    }),
    [state.goals, state.loaded, addGoal, addFromTemplate, updateGoal, removeGoal, incrementProgress, setStatus]
  );

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals(): Ctx {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used within GoalsProvider');
  return ctx;
}