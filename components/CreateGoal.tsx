// CreateGoal.tsx — RN + NativeWind (иконки через color, зазоры mb-*, 2 колонки, рабочая "назад")
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Modal, BackHandler } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Calendar,
  Brain,
  Target,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react-native';

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

interface CreateGoalProps {
  onBack: () => void;
  onSave: (goal: any) => void;
}

export const CreateGoal = ({ onBack, onSave }: CreateGoalProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [goal, setGoal] = useState({
    title: '',
    description: '',
    icon: '🎯',
    category: '',
    duration: '',
    deadline: '',
    isTeam: false,
    subtasks: [] as Array<{ id: number; title: string; completed: boolean; deadline: string }>,
  });

  const [showAIDecomposition, setShowAIDecomposition] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const mockSubtasks = [
    { id: 1, title: 'Изучить основы React', completed: false, deadline: '15 дек' },
    { id: 2, title: 'Создать первый проект', completed: false, deadline: '22 дек' },
    { id: 3, title: 'Изучить React Hooks', completed: false, deadline: '1 янв' },
    { id: 4, title: 'Создать портфолио', completed: false, deadline: '15 янв' },
  ];

  const handleAIDecomposition = () => {
    setShowAIDecomposition(true);
    setTimeout(() => {
      setGoal((prev) => ({ ...prev, subtasks: mockSubtasks }));
      setShowAIDecomposition(false);
    }, 1500);
  };

  const canProceed = () => {
    if (step === 1) return goal.title.trim().length > 0 && !!goal.category;
    if (step === 2) return !!goal.duration && !!goal.deadline;
    return true;
  };

  // Единый обработчик "назад" (стрелка + аппаратная кнопка)
  const handleBackPress = useCallback(() => {
    if (iconPickerOpen) {
      setIconPickerOpen(false);
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
  }, [iconPickerOpen, step, onBack]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => sub.remove();
  }, [handleBackPress]);

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

  if (step === 1) {
    return (
      <View {...({ className: 'flex-1 w-full bg-background' } as any)}>
        {/* Header */}
        <View {...({ className: 'w-full flex-row items-center justify-between px-4 py-3 border-b border-border' } as any)}>
          <Button variant="ghost" size="sm" onPress={handleBackPress}>
            <ArrowLeft size={16} color="#fff" />
          </Button>
          <Text {...({ className: 'font-semibold text-white' } as any)}>Новая цель</Text>
          <View {...({ className: 'w-8' } as any)} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} {...({ className: 'w-full px-4 py-4' } as any)} showsVerticalScrollIndicator={false}>
          {/* Goal Info */}
          <Card {...({ className: 'w-full p-5 rounded-2xl border-transparent mb-5' } as any)}>
            <View {...({ className: 'mb-4' } as any)}>
              <Label {...({ className: 'text-sm font-medium text-white mb-2' } as any)}>Название цели</Label>
              <Input
                value={goal.title}
                onChangeText={(text) => setGoal((prev) => ({ ...prev, title: text }))}
                placeholder="Например: Изучить React"
              />
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
              <Textarea
                value={goal.description}
                onChangeText={(text) => setGoal((prev) => ({ ...prev, description: text }))}
                placeholder="Подробнее о цели..."
                rows={3}
              />
            </View>
          </Card>

          {/* Category Selection */}
          <View {...({ className: 'mb-4' } as any)}>
            <Label {...({ className: 'text-sm font-medium text-white mb-3' } as any)}>Сфера жизни</Label>
            <View {...({ className: 'flex-row flex-wrap -mx-1' } as any)}>
              {categories.map((category) => {
                const active = goal.category === category.id;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setGoal((prev) => ({ ...prev, category: category.id }))}
                    {...({ className: 'w-1/2 px-1 mb-2' } as any)}
                  >
                    <View
                      {...({
                        className:
                          'p-3 rounded-xl border-2 transition-all ' +
                          (active ? 'border-primary bg-primary/5' : 'border-border'),
                      } as any)}
                    >
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

          {/* Team Goal Toggle */}
          <Card {...({ className: 'w-full p-5 rounded-2xl mb-4' } as any)}>
            <View {...({ className: 'flex-row items-center justify-between' } as any)}>
              <View {...({ className: 'flex-row items-center' } as any)}>
                <Users size={20} color={goal.isTeam ? PRIMARY : MUTED} />
                <View {...({ className: 'ml-2' } as any)}>
                  <Text {...({ className: 'font-medium text-white mb-1' } as any)}>Командная цель</Text>
                  <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>Пригласить участников</Text>
                </View>
              </View>
              <Button
                variant={goal.isTeam ? 'default' : 'outline'}
                size="sm"
                onPress={() => setGoal((prev) => ({ ...prev, isTeam: !prev.isTeam }))}
              >
                <Text {...({ className: goal.isTeam ? 'text-primary-foreground' : 'text-primary' } as any)}>
                  {goal.isTeam ? 'Да' : 'Нет'}
                </Text>
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

  if (step === 2) {
    return (
      <View {...({ className: 'flex-1 w-full bg-background' } as any)}>
        {/* Header */}
        <View {...({ className: 'w-full flex-row items-center justify-between px-4 py-3 border-b border-border' } as any)}>
          <Button variant="ghost" size="sm" onPress={handleBackPress}>
            <ArrowLeft size={16} color="#fff" />
          </Button>
          <Text {...({ className: 'font-semibold text-white' } as any)}>Сроки и планирование</Text>
          <View {...({ className: 'w-8' } as any)} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} {...({ className: 'w-full px-4 py-4' } as any)} showsVerticalScrollIndicator={false}>
          {/* Duration */}
          <View {...({ className: 'mb-4' } as any)}>
            <Label {...({ className: 'text-sm font-medium text-white mb-3' } as any)}>Срок выполнения</Label>
            {durations.map((duration) => {
              const active = goal.duration === duration.id;
              return (
                <Pressable key={duration.id} onPress={() => setGoal((prev) => ({ ...prev, duration: duration.id }))} {...({ className: 'mb-2' } as any)}>
                  <View
                    {...({
                      className:
                        'w-full p-3 rounded-xl border-2 transition-all ' +
                        (active ? 'border-primary bg-primary/5' : 'border-border'),
                    } as any)}
                  >
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

          {/* Deadline */}
          <Card {...({ className: 'w-full p-5 rounded-2xl mb-4' } as any)}>
            <Label {...({ className: 'text-sm font-medium text-white mb-2' } as any)}>Конечная дата</Label>
            <View {...({ className: 'flex-row items-center' } as any)}>
              <Input
                value={goal.deadline}
                onChangeText={(text) => setGoal((prev) => ({ ...prev, deadline: text }))}
                placeholder="YYYY-MM-DD"
                {...({ className: 'flex-1 mr-2' } as any)}
              />
              <Calendar size={16} color={MUTED} />
            </View>
          </Card>

          <Button onPress={() => setStep(3)} disabled={!canProceed()} {...({ className: 'w-full rounded-2xl h-12' } as any)}>
            <Text {...({ className: 'text-primary-foreground font-semibold' } as any)}>Создать план</Text>
          </Button>
        </ScrollView>
      </View>
    );
  }

  if (step === 3) {
    return (
      <View {...({ className: 'flex-1 w-full bg-background' } as any)}>
        {/* Header */}
        <View {...({ className: 'w-full flex-row items-center justify-between px-4 py-3 border-b border-border' } as any)}>
          <Button variant="ghost" size="sm" onPress={handleBackPress}>
            <ArrowLeft size={16} color="#fff" />
          </Button>
          <Text {...({ className: 'font-semibold text-white' } as any)}>AI декомпозиция</Text>
          <View {...({ className: 'w-8' } as any)} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} {...({ className: 'w-full px-4 py-4' } as any)} showsVerticalScrollIndicator={false}>
          {/* Goal Summary */}
          <Card {...({ className: 'w-full p-4 rounded-2xl bg-gradient-card mb-4' } as any)}>
            <View {...({ className: 'flex-row items-center mb-2' } as any)}>
              <Text {...({ className: 'text-2xl mr-2' } as any)}>{goal.icon}</Text>
              <View>
                <Text {...({ className: 'font-semibold text-white mb-1' } as any)}>{goal.title}</Text>
                <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>
                  {categories.find((c) => c.id === goal.category)?.label} • {goal.deadline || 'дата не указана'}
                </Text>
              </View>
            </View>
          </Card>

          {/* AI Decomposition CTA */}
          {!goal.subtasks.length && !showAIDecomposition && (
            <Card {...({ className: 'w-full p-6 rounded-2xl items-center text-center mb-4' } as any)}>
              <View {...({ className: 'w-16 h-16 rounded-full bg-gradient-primary items-center justify-center mb-3' } as any)}>
                <Brain size={32} color="#fff" />
              </View>
              <Text {...({ className: 'font-semibold text-white mb-2' } as any)}>AI декомпозиция</Text>
              <Text {...({ className: 'text-muted-foreground text-sm mb-3' } as any)}>
                Позвольте AI разбить вашу цель на конкретные шаги
              </Text>
              <Button onPress={handleAIDecomposition} {...({ className: 'w-full rounded-2xl h-12' } as any)}>
                <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                  <Sparkles size={16} color="#fff" />
                  <Text {...({ className: 'ml-2 text-primary-foreground font-semibold' } as any)}>Создать план с AI</Text>
                </View>
              </Button>
            </Card>
          )}

          {showAIDecomposition && (
            <Card {...({ className: 'w-full p-6 rounded-2xl items-center text-center mb-4' } as any)}>
              <View {...({ className: 'w-16 h-16 rounded-full bg-gradient-primary items-center justify-center mb-3' } as any)}>
                <Brain size={32} color="#fff" />
              </View>
              <Text {...({ className: 'font-semibold text-white mb-2' } as any)}>AI думает...</Text>
              <Text {...({ className: 'text-muted-foreground text-sm' } as any)}>
                Анализирую вашу цель и создаю оптимальный план
              </Text>
            </Card>
          )}

          {/* Subtasks */}
          {goal.subtasks.length > 0 && (
            <View>
              <View {...({ className: 'flex-row items-center justify-between mb-3' } as any)}>
                <Label {...({ className: 'text-sm font-medium text-white' } as any)}>План выполнения</Label>
                <Button variant="ghost" size="sm">
                  <View {...({ className: 'flex-row items-center' } as any)}>
                    <Brain size={12} color={PRIMARY} />
                    <Text {...({ className: 'ml-1 text-primary' } as any)}>Переделать</Text>
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
                        <Text {...({ className: 'text-sm font-medium text-white mb-1' } as any)}>{subtask.title}</Text>
                        <Text {...({ className: 'text-xs text-muted-foreground' } as any)}>{subtask.deadline}</Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          )}

          {goal.subtasks.length > 0 && (
            <View>
              <Button
                variant="outline"
                onPress={() => setGoal((prev) => ({ ...prev, subtasks: [] }))}
                {...({ className: 'w-full rounded-2xl h-12 mb-2' } as any)}
              >
                <Text {...({ className: 'text-primary font-semibold' } as any)}>Редактировать вручную</Text>
              </Button>
              <Button onPress={() => onSave(goal)} {...({ className: 'w-full rounded-2xl h-12' } as any)}>
                <View {...({ className: 'flex-row items-center justify-center' } as any)}>
                  <Target size={16} color="#fff" />
                  <Text {...({ className: 'ml-2 text-primary-foreground font-semibold' } as any)}>Сохранить цель</Text>
                </View>
              </Button>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return null;
};