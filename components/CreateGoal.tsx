// CreateGoal.tsx — создание (личной/командной) цели + ИИ-декомпозиция DeepSeek + ручное редактирование подцелей
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Modal, BackHandler, Platform } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Brain,
  Target,
  Users,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Pencil,
} from 'lucide-react-native';
import { Calendar as RNCalendar, LocaleConfig } from 'react-native-calendars';
import { createUserGoal, type CreateGoalPayload } from '@/lib/api';
import { aiDecomposeGoal } from '@/lib/api/ai';

// Локаль календаря (web)
LocaleConfig.locales['ru'] = {
  monthNames: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
  monthNamesShort: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'],
  dayNames: ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'],
  dayNamesShort: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
  today: 'Сегодня',
};
LocaleConfig.defaultLocale = 'ru';

const PRIMARY = '#35D07F';
const MUTED = '#9ca3af';

const categories = [
  { id: 'health', label: 'Состояние', emoji: '💪' },
  { id: 'mind', label: 'Мышление', emoji: '🧠' },
  { id: 'skills', label: 'Навыки', emoji: '🎯' },
  { id: 'actions', label: 'Действия', emoji: '⚡' },
  { id: 'capital', label: 'Капитал', emoji: '💰' },
  { id: 'meaning', label: 'Смыслы', emoji: '✨' },
  { id: 'family', label: 'Семья', emoji: '👨‍👩‍👧‍👦' },
  { id: 'environment', label: 'Окружение', emoji: '🌍' },
];

const durations = [
  { id: 'short', label: 'Краткосрочная', desc: 'До 3 месяцев' },
  { id: 'medium', label: 'Среднесрочная', desc: '3-12 месяцев' },
  { id: 'long', label: 'Долгосрочная', desc: 'Более года' },
];

const iconOptions = ['🎯','💼','🧠','💡','📚','🏃‍♂️','💰','🌱','⚡','🚀','🗣️','👨‍👩‍👧‍👦','🏆','🎵','🧘','🍎','🪙','🛠️','🧩','📈'];

type Subtask = { id: number; title: string; completed: boolean; deadline: string };

interface CreateGoalProps {
  onBack: () => void;
  onSave: (goal: any) => void;
  teamId?: number;
}

export const CreateGoal = ({ onBack, onSave, teamId }: CreateGoalProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  const [goal, setGoal] = useState({
    title: '',
    description: '',
    icon: '🎯',
    category: '',
    duration: '',
    deadline: '',
    isTeam: !!teamId,
    subtasks: [] as Subtask[],
  });

  const [showAIDecomposition, setShowAIDecomposition] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  // Ручное редактирование подцелей
  const [editSubtasks, setEditSubtasks] = useState(false);
  const [draftSubtasks, setDraftSubtasks] = useState<Subtask[]>([]);
  const nextIdRef = useRef<number>(1);

  // Нативный дата-пикер (без dynamic import — безопасный require)
  const NativeDatePicker = useMemo<any>(() => {
    if (Platform.OS === 'web') return null;
    try {
      const mod = require('react-native-modal-datetime-picker');
      return mod?.default ?? mod;
    } catch {
      return null;
    }
  }, []);

  const toISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fromISODate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const addMonthsClamp = (date: Date, months: number) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const target = new Date(year, month + months, 1);
    const dim = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(day, dim));
    target.setHours(0, 0, 0, 0);
    return target;
  };

  const formatDisplayDate = (iso?: string) => {
    if (!iso) return '';
    const d = fromISODate(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Разрешение на переход по шагам
  const canProceed = useCallback(() => {
    if (step === 1) return goal.title.trim().length > 0 && !!goal.category;
    if (step === 2) return !!goal.duration && !!goal.deadline;
    return true;
  }, [step, goal.title, goal.category, goal.duration, goal.deadline]);

  // Back (стрелка + аппаратная)
  const handleBackPress = useCallback(() => {
    if (iconPickerOpen) {
      setIconPickerOpen(false);
      return true;
    }
    if (isDatePickerVisible) {
      setDatePickerVisible(false);
      return true;
    }
    if (editSubtasks) {
      setEditSubtasks(false);
      return true;
    }
    if (step === 3) {
      setStep(2);
      return true;
    }
    if (step === 2) {
      setStep(1);
      return true;
    }
    onBack();
    return true;
  }, [iconPickerOpen, isDatePickerVisible, editSubtasks, step, onBack]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => sub.remove();
  }, [handleBackPress]);

  // Открыть редактор подцелей
  const openEditSubtasks = () => {
    const current = goal.subtasks ?? [];
    nextIdRef.current = (current.length ? Math.max(...current.map((s) => s.id)) : 0) + 1;
    setDraftSubtasks(
      current.length ? current.map((s) => ({ ...s })) : [{ id: nextIdRef.current++, title: '', completed: false, deadline: '' }],
    );
    setEditSubtasks(true);
  };

  const addDraftSubtask = () => setDraftSubtasks((prev) => [...prev, { id: nextIdRef.current++, title: '', completed: false, deadline: '' }]);
  const removeDraftSubtask = (id: number) => setDraftSubtasks((prev) => prev.filter((s) => s.id !== id));
  const updateDraftTitle = (id: number, title: string) => setDraftSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  const toggleDraftCompleted = (id: number) => setDraftSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)));

  const applyDraftSubtasks = () => {
    const normalized = draftSubtasks.map((s) => ({ ...s, title: s.title.trim() })).filter((s) => s.title.length > 0);
    setGoal((prev) => ({ ...prev, subtasks: normalized }));
    setEditSubtasks(false);
  };

  // ИИ-декомпозиция DeepSeek
  const handleAIDecomposition = async () => {
    try {
      setShowAIDecomposition(true);
      const steps = await aiDecomposeGoal({
        title: goal.title.trim(),
        description: goal.description?.trim() || null,
        deadline: goal.deadline || null,
      });
      let nextId = (goal.subtasks?.length ? Math.max(...goal.subtasks.map((s) => s.id)) : 0) + 1;
      const subtasks = steps.map((s) => ({
        id: nextId++,
        title: s.name,
        completed: !!s.is_complete,
        deadline: '',
      }));
      setGoal((prev) => ({ ...prev, subtasks }));
    } catch (e) {
      console.warn('AI decomposition error', e);
    } finally {
      setShowAIDecomposition(false);
    }
  };

  // Сохранение в БД
  const saveToDb = async () => {
    if (!goal.title.trim()) return;
    setSaving(true);
    try {
      const payload: CreateGoalPayload & { team_id?: number } = {
        title: goal.title.trim(),
        description: goal.description?.trim() || null,
        icon: goal.icon || null,
        date_end: goal.deadline || null,
        status: 'active',
        subtasks: (goal.subtasks ?? []).map((s) => ({ name: s.title.trim(), is_complete: !!s.completed })),
        team_id: typeof teamId === 'number' ? teamId : undefined,
      };
      const created = await createUserGoal(payload);
      onSave({ ...goal, __server: created });
    } catch (e) {
      console.warn('Create goal error', e);
    } finally {
      setSaving(false);
    }
  };

  const IconPicker = () => (
    <Modal visible={iconPickerOpen} transparent animationType="slide" onRequestClose={() => setIconPickerOpen(false)}>
      <Pressable onPress={() => setIconPickerOpen(false)} {...({ className: 'flex-1 bg-black/60' } as any)} />
      <View {...({ className: 'absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl p-4' } as any)}>
        <Text {...({ className: 'text-white text-base font-semibold mb-3' } as any)}>Выберите иконку</Text>
        <ScrollView {...({ className: 'max-h-[60vh]' } as any)}>
          <View {...({ className: 'flex-row flex-wrap -mx-1 -mb-2' } as any)}>
            {iconOptions.map((emj) => (
              <Pressable
                key={emj}
                onPress={() => {
                  setGoal((p) => ({ ...p, icon: emj }));
                  setIconPickerOpen(false);
                }}
                style={{ width: '12.5%' }}
                {...({ className: 'px-1 mb-2' } as any)}
              >
                <View {...({ className: 'aspect-square items-center justify-center rounded-xl bg-muted' } as any)}>
                  <Text {...({ className: 'text-2xl' } as any)}>{emj}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Button variant="outline" {...({ className: 'mt-4 rounded-xl' } as any)} onPress={() => setIconPickerOpen(false)}>
          <Text {...({ className: 'text-primary' } as any)}>Закрыть</Text>
        </Button>
      </View>
    </Modal>
  );

  // STEP 1
  if (step === 1) {
    return (
      <View {...({ className: 'flex-1 w-full bg-background' } as any)}>
        <View {...({ className: 'w-full flex-row items-center justify-between px-4 py-3 border-b border-border' } as any)}>
          <Button variant="ghost" size="sm" onPress={handleBackPress}>
            <ArrowLeft size={16} color="#fff" />
          </Button>
          <Text {...({ className: 'font-semibold text-white' } as any)}>Новая цель</Text>
          <View {...({ className: 'w-8' } as any)} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} {...({ className: 'w-full px-4 py-4' } as any)} showsVerticalScrollIndicator={false}>
          <Card {...({ className: 'w-full p-5 rounded-2xl border-transparent mb-5' } as any)}>
            <View {...({ className: 'mb-4' } as any)}>
              <Label {...({ className: 'text-sm font-medium text-white mb-2' } as any)}>Название цели</Label>
              <Input value={goal.title} onChangeText={(text) => setGoal((prev) => ({ ...prev, title: text }))} placeholder="Например: Изучить React" />
            </View>

            <View {...({ className: 'mb-4' } as any)}>
              <Label {...({ className: 'text-sm font-medium text-white mb-2' } as any)}>Иконка</Label>
              <View {...({ className: 'flex-row items-center' } as any)}>
                <View {...({ className: 'w-12 h-12 rounded-xl bg-muted items-center justify-center mr-2' } as any)}>
                  <Text {...({ className: 'text-2xl' } as any)}>{goal.icon}</Text>
                </View>
                <Button variant="outline" size="sm" onPress={() => setIconPickerOpen(true)}>
                  <Text {...({ className: 'text-primary' } as any)}>Изменить</Text>
                </Button>
              </View>
            </View>

            <View>
              <Label {...({ className: 'text-sm font-medium text-white mb-2' } as any)}>Описание (опционально)</Label>
              <Textarea value={goal.description} onChangeText={(text) => setGoal((prev) => ({ ...prev, description: text }))} placeholder="Подробнее о цели..." rows={3} />
            </View>
          </Card>

          <View {...({ className: 'mb-4' } as any)}>
            <Label {...({ className: 'text-sm font-medium text-white mb-3' } as any)}>Сфера жизни</Label>
            <View {...({ className: 'flex-row flex-wrap -mx-1' } as any)}>
              {categories.map((category) => {
                const active = goal.category === category.id;
                return (
                  <Pressable key={category.id} onPress={() => setGoal((prev) => ({ ...prev, category: category.id }))} {...({ className: 'w-1/2 px-1 mb-2' } as any)}>
                    <View {...({ className: 'p-3 rounded-xl border-2 transition-all ' + (active ? 'border-primary bg-primary/5' : 'border-border') } as any)}>
                      <View {...({ className: 'flex-row items-center' } as any)}>
                        <Text {...({ className: 'text-lg mr-2' } as any)}>{category.emoji}</Text>
                        <Text {...({ className: 'text-sm font-medium text-foreground' } as any)}>{category.label}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Card {...({ className: 'w-full p-5 rounded-2xl mb-4' } as any)}>
            <View {...({ className: 'flex-row items-center justify-between' } as any)}>
              <View {...({ className: 'flex-row items-center' } as any)}>
                <Users size={20} color={goal.isTeam ? PRIMARY : MUTED} />
                <View {...({ className: 'ml-2' } as any)}>
                  <Text {...({ className: 'font-medium text-white mb-1' } as any)}>
                    Командная цель {teamId ? '(выбрана команда)' : ''}
                  </Text>
                  <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>
                    {teamId ? 'Цель будет создана в выбранной команде' : 'Пригласить участников'}
                  </Text>
                </View>
              </View>
              <Button
                variant={goal.isTeam ? 'default' : 'outline'}
                size="sm"
                onPress={() => {
                  if (teamId) return;
                  setGoal((prev) => ({ ...prev, isTeam: !prev.isTeam }));
                }}
              >
                <Text {...({ className: goal.isTeam ? 'text-primary-foreground' : 'text-primary' } as any)}>{goal.isTeam ? 'Да' : 'Нет'}</Text>
              </Button>
            </View>
          </Card>

          <Button onPress={() => setStep(2)} disabled={!canProceed()} {...({ className: 'w-full rounded-2xl h-12 mb-2' } as any)}>
            <Text {...({ className: 'text-primary-foreground font-semibold' } as any)}>Далее</Text>
          </Button>
        </ScrollView>

        <IconPicker />
      </View>
    );
  }

  // STEP 2
  if (step === 2) {
    return (
      <View {...({ className: 'flex-1 w-full bg-background' } as any)}>
        <View {...({ className: 'w-full flex-row items-center justify-between px-4 py-3 border-b border-border' } as any)}>
          <Button variant="ghost" size="sm" onPress={handleBackPress}>
            <ArrowLeft size={16} color="#fff" />
          </Button>
          <Text {...({ className: 'font-semibold text-white' } as any)}>Сроки и планирование</Text>
          <View {...({ className: 'w-8' } as any)} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} {...({ className: 'w-full px-4 py-4' } as any)} showsVerticalScrollIndicator={false}>
          <View {...({ className: 'mb-4' } as any)}>
            <Label {...({ className: 'text-sm font-medium text-white mb-3' } as any)}>Срок выполнения</Label>
            {durations.map((duration) => {
              const active = goal.duration === duration.id;
              const monthsToAdd = duration.id === 'short' ? 3 : duration.id === 'medium' ? 6 : 12;
              return (
                <Pressable
                  key={duration.id}
                  onPress={() => {
                    const newDeadline = addMonthsClamp(new Date(), monthsToAdd);
                    setGoal((prev) => ({ ...prev, duration: duration.id, deadline: toISODate(newDeadline) }));
                  }}
                  {...({ className: 'mb-2' } as any)}
                >
                  <View {...({ className: 'w-full p-3 rounded-xl border-2 transition-all ' + (active ? 'border-primary bg-primary/5' : 'border-border') } as any)}>
                    <View {...({ className: 'flex-row items-center justify-between' } as any)}>
                      <View>
                        <Text {...({ className: 'font-medium text-white mb-1' } as any)}>{duration.label}</Text>
                        <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>{duration.desc}</Text>
                      </View>
                      <Clock size={16} color={active ? PRIMARY : MUTED} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Card {...({ className: 'w-full p-5 rounded-2xl mb-4' } as any)}>
            <Label {...({ className: 'text-sm font-medium text-white mb-2' } as any)}>Конечная дата</Label>
            <Pressable onPress={() => setDatePickerVisible(true)} {...({ className: 'flex-row items-center' } as any)}>
              <Input value={goal.deadline ? formatDisplayDate(goal.deadline) : ''} editable={false} placeholder="Выберите дату" {...({ className: 'flex-1 mr-2' } as any)} />
              <CalendarIcon size={16} color={MUTED} />
            </Pressable>
          </Card>

          <Button onPress={() => setStep(3)} disabled={!canProceed()} {...({ className: 'w-full rounded-2xl h-12' } as any)}>
            <Text {...({ className: 'text-primary-foreground font-semibold' } as any)}>Создать план</Text>
          </Button>
        </ScrollView>

        {Platform.OS === 'web' && (
          <Modal visible={isDatePickerVisible} transparent animationType="fade" onRequestClose={() => setDatePickerVisible(false)}>
            <Pressable onPress={() => setDatePickerVisible(false)} {...({ className: 'flex-1 bg-black/60' } as any)} />
            <View {...({ className: 'absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl p-4' } as any)}>
              <Text {...({ className: 'text-white text-base font-semibold mb-3' } as any)}>Выберите дату</Text>
              <RNCalendar
                initialDate={goal.deadline || toISODate(new Date())}
                markedDates={goal.deadline ? { [goal.deadline]: { selected: true, selectedColor: PRIMARY, selectedTextColor: '#fff' } } : undefined}
                onDayPress={(day) => {
                  setGoal((prev) => ({ ...prev, deadline: day.dateString }));
                  setDatePickerVisible(false);
                }}
                firstDay={1}
                theme={{
                  calendarBackground: 'transparent',
                  textSectionTitleColor: '#9ca3af',
                  dayTextColor: '#fff',
                  todayTextColor: PRIMARY,
                  selectedDayBackgroundColor: PRIMARY,
                  selectedDayTextColor: '#fff',
                  arrowColor: '#fff',
                  monthTextColor: '#fff',
                }}
                style={{ borderRadius: 16, overflow: 'hidden' }}
              />
              <Button variant="outline" {...({ className: 'mt-4 rounded-xl' } as any)} onPress={() => setDatePickerVisible(false)}>
                <Text {...({ className: 'text-primary' } as any)}>Закрыть</Text>
              </Button>
            </View>
          </Modal>
        )}

        {Platform.OS !== 'web' && NativeDatePicker && (
          <NativeDatePicker
            isVisible={isDatePickerVisible}
            mode="date"
            date={goal.deadline ? fromISODate(goal.deadline) : new Date()}
            locale="ru-RU"
            onConfirm={(date: Date) => {
              setGoal((prev) => ({ ...prev, deadline: toISODate(date) }));
              setDatePickerVisible(false);
            }}
            onCancel={() => setDatePickerVisible(false)}
          />
        )}
      </View>
    );
  }

  // STEP 3
  if (step === 3) {
    return (
      <View {...({ className: 'flex-1 w-full bg-background' } as any)}>
        <View {...({ className: 'w-full flex-row items-center justify-between px-4 py-3 border-b border-border' } as any)}>
          <Button variant="ghost" size="sm" onPress={handleBackPress}>
            <ArrowLeft size={16} color="#fff" />
          </Button>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} {...({ className: 'w-full px-4 py-4' } as any)} showsVerticalScrollIndicator={false}>
          <Card {...({ className: 'w-full p-4 rounded-2xl bg-gradient-card mb-4' } as any)}>
            <View {...({ className: 'flex-row items-center mb-2' } as any)}>
              <Text {...({ className: 'text-2xl mr-2' } as any)}>{goal.icon}</Text>
              <View>
                <Text {...({ className: 'font-semibold text-white mb-1' } as any)}>{goal.title}</Text>
                <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>
                  {categories.find((c) => c.id === goal.category)?.label || '—'} • {goal.deadline || 'дата не указана'}
                </Text>
              </View>
            </View>
          </Card>

          {!goal.subtasks.length && !showAIDecomposition && !editSubtasks && (
            <Card {...({ className: 'w-full p-6 rounded-2xl items-center text-center mb-4' } as any)}>
              <View {...({ className: 'w-16 h-16 rounded-full bg-gradient-primary items-center justify-center mb-3' } as any)}>
                <Brain size={32} color="#fff" />
              </View>
              <Text {...({ className: 'font-semibold text-white mb-2' } as any)}>AI декомпозиция</Text>
              <Text {...({ className: 'text-muted-foreground text-sm mb-3' } as any)}>
                Позвольте AI разбить вашу цель на конкретные шаги
              </Text>
              <View {...({ className: 'flex-row gap-3 w-full' } as any)}>
                <Button onPress={handleAIDecomposition} {...({ className: 'flex-1 rounded-2xl h-12' } as any)}>
                  <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                    <Sparkles size={16} color="#fff" />
                    <Text {...({ className: 'ml-2 text-primary-foreground font-semibold' } as any)}>Сделать с AI</Text>
                  </View>
                </Button>
                <Button variant="outline" onPress={openEditSubtasks} {...({ className: 'flex-1 rounded-2xl h-12' } as any)}>
                  <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                    <Pencil size={16} color={PRIMARY} />
                    <Text {...({ className: 'ml-2 text-primary font-semibold' } as any)}>Вручную</Text>
                  </View>
                </Button>
              </View>
            </Card>
          )}

          {showAIDecomposition && (
            <Card {...({ className: 'w-full p-6 rounded-2xl items-center text-center mb-4' } as any)}>
              <View {...({ className: 'w-16 h-16 rounded-full bg-gradient-primary items-center justify-center mb-3' } as any)}>
                <Brain size={32} color="#fff" />
              </View>
              <Text {...({ className: 'font-semibold text-white mb-2' } as any)}>AI думает...</Text>
              <Text {...({ className: 'text-muted-foreground text-sm' } as any)}>Анализирую вашу цель и создаю оптимальный план</Text>
            </Card>
          )}

          {editSubtasks && (
            <Card {...({ className: 'w-full p-4 rounded-2xl mb-4' } as any)}>
              <View {...({ className: 'flex-row items-center justify-between mb-3' } as any)}>
                <Text {...({ className: 'text-white font-semibold' } as any)}>Редактирование подзадач</Text>
                <Pressable onPress={addDraftSubtask} {...({ className: 'px-3 py-2 rounded-xl bg-primary/10 border border-primary/40 active:opacity-90' } as any)}>
                  <View {...({ className: 'flex-row items-center' } as any)}>
                    <Plus size={14} color={PRIMARY} />
                    <Text {...({ className: 'ml-1 text-primary text-sm' } as any)}>Добавить</Text>
                  </View>
                </Pressable>
              </View>

              <View {...({ className: 'gap-2' } as any)}>
                {draftSubtasks.map((s, idx) => (
                  <View key={s.id} {...({ className: 'rounded-xl border border-border p-3 flex-row items-center gap-2' } as any)}>
                    <Pressable onPress={() => toggleDraftCompleted(s.id)} {...({ className: 'p-1' } as any)}>
                      {s.completed ? <CheckSquare size={18} color={PRIMARY} /> : <Square size={18} color={MUTED} />}
                    </Pressable>
                    <View {...({ className: 'flex-1' } as any)}>
                      <Input value={s.title} onChangeText={(txt) => updateDraftTitle(s.id, txt)} placeholder={`Шаг ${idx + 1}`} />
                    </View>
                    <Pressable onPress={() => removeDraftSubtask(s.id)} {...({ className: 'p-2 rounded-lg active:opacity-80' } as any)}>
                      <Trash2 size={16} color="#f87171" />
                    </Pressable>
                  </View>
                ))}
                {draftSubtasks.length === 0 && (
                  <Text {...({ className: 'text-muted-foreground text-xs' } as any)}>Пока подзадач нет. Нажмите “Добавить”, чтобы создать первую.</Text>
                )}
              </View>

              <View {...({ className: 'flex-row gap-3 mt-3' } as any)}>
                <Button variant="outline" onPress={() => setEditSubtasks(false)} {...({ className: 'flex-1 rounded-2xl h-11' } as any)}>
                  <Text {...({ className: 'text-foreground' } as any)}>Отмена</Text>
                </Button>
                <Button onPress={applyDraftSubtasks} {...({ className: 'flex-1 rounded-2xl h-11' } as any)}>
                  <Text {...({ className: 'text-primary-foreground font-semibold' } as any)}>Сохранить подзадачи</Text>
                </Button>
              </View>
            </Card>
          )}

          {!editSubtasks && goal.subtasks.length > 0 && (
            <View>
              <View {...({ className: 'flex-row items-center justify-between mb-3' } as any)}>
                <Label {...({ className: 'text-sm font-medium text-white' } as any)}>План выполнения</Label>
                <Button variant="ghost" size="sm" onPress={openEditSubtasks}>
                  <View {...({ className: 'flex-row items-center' } as any)}>
                    <Pencil size={12} color={PRIMARY} />
                    <Text {...({ className: 'ml-1 text-primary' } as any)}>Редактировать вручную</Text>
                  </View>
                </Button>
              </View>
              <View>
                {goal.subtasks.map((subtask, index) => (
                  <Card key={subtask.id} {...({ className: 'w-full p-3 rounded-2xl mb-2' } as any)}>
                    <View {...({ className: 'flex-row items-center' } as any)}>
                      <View {...({ className: 'w-6 h-6 rounded-full bg-muted items-center justify-center mr-2' } as any)}>
                        <Text {...({ className: 'text-xs font-medium text-foreground' } as any)}>{index + 1}</Text>
                      </View>
                      <View {...({ className: 'flex-1' } as any)}>
                        <Text {...({ className: 'text-sm font-medium text-white mb-1' } as any)}>{subtask.title || `Шаг ${index + 1}`}</Text>
                        {!!subtask.deadline && <Text {...({ className: 'text-xs text-muted-foreground' } as any)}>{subtask.deadline}</Text>}
                      </View>
                      {subtask.completed ? <CheckSquare size={16} color={PRIMARY} /> : <Square size={16} color={MUTED} />}
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          )}

          <View {...({ className: 'mt-4' } as any)}>
            <Button onPress={saveToDb} disabled={saving} {...({ className: 'w-full rounded-2xl h-12' } as any)}>
              <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                <Target size={16} color="#fff" />
                <Text {...({ className: 'ml-2 text-primary-foreground font-semibold' } as any)}>{saving ? 'Сохранение...' : 'Сохранить цель'}</Text>
              </View>
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  return null;
};