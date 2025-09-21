// Library.tsx — тянется по ширине (без колонок) + зелёные акценты + фикс иконки поиска
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Search as SearchIcon,
  Plus,
  Users,
  Clock,
  Filter,
  Star,
} from 'lucide-react-native';

const goalTemplates = [
  { id: 1, title: 'Изучить программирование', category: 'Навыки', icon: '💻', duration: '6 месяцев', difficulty: 'Средняя', rating: 4.8, users: 1240, isTeam: false, subtasks: 8, description: 'Полный курс изучения веб-разработки от основ до продвинутого уровня' },
  { id: 2, title: 'Марафон за 6 месяцев', category: 'Состояние', icon: '🏃‍♂️', duration: '6 месяцев', difficulty: 'Высокая', rating: 4.9, users: 856, isTeam: false, subtasks: 12, description: 'Подготовка к марафону с нуля: тренировки, питание, восстановление' },
  { id: 3, title: 'Командный проект', category: 'Действия', icon: '🚀', duration: '3 месяца', difficulty: 'Средняя', rating: 4.6, users: 432, isTeam: true, subtasks: 15, description: 'Запуск стартапа в команде: от идеи до MVP' },
  { id: 4, title: 'Финансовая грамотность', category: 'Капитал', icon: '💰', duration: '2 месяца', difficulty: 'Легкая', rating: 4.7, users: 2103, isTeam: false, subtasks: 6, description: 'Основы инвестирования и планирования личного бюджета' },
  { id: 5, title: 'Изучение языка', category: 'Навыки', icon: '🗣️', duration: '12 месяцев', difficulty: 'Средняя', rating: 4.5, users: 1876, isTeam: false, subtasks: 20, description: 'Английский с нуля до разговорного уровня' },
  { id: 6, title: 'Семейные традиции', category: 'Семья', icon: '👨‍👩‍👧‍👦', duration: '1 год', difficulty: 'Легкая', rating: 4.9, users: 543, isTeam: true, subtasks: 10, description: 'Создание новых семейных традиций и укрепление отношений' },
];

const categories = [
  { id: 'all', label: 'Все' },
  { id: 'health', label: 'Состояние' },
  { id: 'skills', label: 'Навыки' },
  { id: 'capital', label: 'Капитал' },
  { id: 'family', label: 'Семья' },
  { id: 'actions', label: 'Действия' },
];

function getCategoryLabelById(id: string) {
  return categories.find((c) => c.id === id)?.label;
}

const GoalTemplate = ({ template, onAdd }: { template: any; onAdd: () => void }) => (
  <Card {...({ className: 'w-full self-stretch p-4 bg-gradient-card shadow-medium border-0 transition-all duration-300' } as any)}>
    <View {...({ className: 'flex-row items-start justify-between mb-3' } as any)}>
      <View {...({ className: 'flex-row items-center space-x-3' } as any)}>
        <Text {...({ className: 'w-10 h-10 text-2xl' } as any)}>{template.icon}</Text>
        <View>
          <Text {...({ className: 'font-semibold text-foreground' } as any)}>{template.title}</Text>
          <Text {...({ className: 'text-sm text-muted-foreground' } as any)}>{template.category}</Text>
        </View>
      </View>
      {template.isTeam ? (
        <Badge variant="secondary" {...({ className: 'px-2 py-0.5' } as any)}>
          <View {...({ className: 'flex-row items-center' } as any)}>
            <Users size={12} color="#35D07F" {...({ className: 'mr-1' } as any)} />
            <Text {...({ className: 'text-xs text-secondary-foreground' } as any)}>Команда</Text>
          </View>
        </Badge>
      ) : null}
    </View>

    <Text numberOfLines={2} {...({ className: 'text-sm text-muted-foreground mb-4' } as any)}>
      {template.description}
    </Text>

    <View {...({ className: 'flex-row items-center justify-between mb-4' } as any)}>
      <View {...({ className: 'flex-row items-center space-x-4' } as any)}>
        <View {...({ className: 'flex-row items-center space-x-1' } as any)}>
          <Clock size={12} color="#9ca3af" />
          <Text {...({ className: 'text-xs text-muted-foreground ml-1' } as any)}>{template.duration}</Text>
        </View>
        <View {...({ className: 'flex-row items-center space-x-1 ml-2' } as any)}>
          <Star size={12} color="#FACC15" fill="#FACC15" />
          <Text {...({ className: 'text-xs text-muted-foreground ml-1' } as any)}>{template.rating}</Text>
        </View>
        <Text {...({ className: 'text-xs text-muted-foreground' } as any)}>{template.users} чел.</Text>
      </View>

      <Badge variant="outline" {...({ className: 'px-2 py-0.5' } as any)}>
        <Text {...({ className: 'text-xs text-foreground' } as any)}>{template.subtasks} шагов</Text>
      </Badge>
    </View>

    <Button onPress={onAdd} size="sm" {...({ className: 'w-full rounded-xl' } as any)}>
      <View {...({ className: 'flex-row items-center justify-center' } as any)}>
        <Plus size={12} color="#fff" {...({ className: 'mr-2' } as any)} />
        <Text {...({ className: 'text-primary-foreground' } as any)}>Добавить цель</Text>
      </View>
    </Button>
  </Card>
);

interface LibraryProps {
  onBack: () => void;
  onAddGoal: (template: any) => void;
  extraBottomPadding?: number;
}

export const Library = ({ onBack, onAddGoal, extraBottomPadding = 0 }: LibraryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'personal' | 'team'>('all');

  const filteredTemplates = useMemo(() => {
    const label = getCategoryLabelById(selectedCategory);
    return goalTemplates.filter((template) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        template.title.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === 'all' || template.category === label;

      const matchesType =
        filterType === 'all' ||
        (filterType === 'team' && template.isTeam) ||
        (filterType === 'personal' && !template.isTeam);

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [searchQuery, selectedCategory, filterType]);

  return (
    <View {...({ className: 'min-h-screen w-full flex-1 bg-background' } as any)}>
      {/* Header */}
      <View {...({ className: 'w-full bg-gradient-primary p-4' } as any)}>
        <View {...({ className: 'w-full flex-row items-center justify-between mb-4' } as any)}>
          <Button variant="ghost" size="sm" onPress={onBack} {...({ className: 'text-white' } as any)}>
            <ArrowLeft size={16} color="#fff" />
          </Button>
          <Text {...({ className: 'font-semibold text-white' } as any)}>Библиотека целей</Text>
          <Button variant="ghost" size="sm" {...({ className: 'text-white' } as any)}>
            <Filter size={16} color="#fff" />
          </Button>
        </View>

        {/* Search */}
        <View {...({ className: 'relative h-11 w-full' } as any)}>
          <View pointerEvents="none" {...({ className: 'absolute left-3 inset-y-0 justify-center' } as any)}>
            <SearchIcon size={18} color="rgba(255,255,255,0.7)" />
          </View>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Поиск целей..."
            {...({
              className:
                'h-11 w-full pl-12 pr-3 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-primary',
              style: { paddingLeft: 48 },
            } as any)}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 + extraBottomPadding }}
        {...({ className: 'w-full px-4 -mt-2' } as any)}
      >
        {/* Filters */}
        <Card {...({ className: 'w-full self-stretch rounded-2xl p-4 shadow-medium mb-4' } as any)}>
          {/* Type Filter */}
          <View {...({ className: 'flex-row bg-muted rounded-xl p-1 mb-3' } as any)}>
            {[
              { key: 'all', label: 'Все' },
              { key: 'personal', label: 'Личные' },
              { key: 'team', label: 'Команда' },
            ].map((type) => {
              const active = filterType === (type.key as any);
              return (
                <Pressable
                  key={type.key}
                  onPress={() => setFilterType(type.key as any)}
                  {...({
                    className:
                      'flex-1 rounded-lg items-center justify-center py-2 px-3 transition-all ' +
                      (active ? 'bg-primary/15 border border-primary/30' : 'bg-transparent'),
                  } as any)}
                >
                  <Text
                    {...({
                      className:
                        'text-sm font-medium ' +
                        (active ? 'text-primary' : 'text-muted-foreground'),
                    } as any)}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Category Filter */}
          <View {...({ className: 'flex-row flex-wrap gap-2' } as any)}>
            {categories.map((category) => {
              const active = selectedCategory === category.id;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  {...({
                    className:
                      'px-3 py-1 rounded-full transition-all ' +
                      (active ? 'bg-primary' : 'bg-muted'),
                  } as any)}
                >
                  <Text
                    {...({
                      className:
                        'text-xs font-medium ' +
                        (active ? 'text-primary-foreground' : 'text-muted-foreground'),
                    } as any)}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Results — одна колонка, растягивается по ширине */}
        <View {...({ className: 'w-full self-stretch space-y-4' } as any)}>
          {filteredTemplates.map((template) => (
            <GoalTemplate key={template.id} template={template} onAdd={() => onAddGoal(template)} />
          ))}

          {filteredTemplates.length === 0 && (
            <View {...({ className: 'w-full items-center py-8' } as any)}>
              <View {...({ className: 'w-16 h-16 rounded-full bg-muted items-center justify-center mb-4' } as any)}>
                <SearchIcon size={32} color="#9ca3af" />
              </View>
              <Text {...({ className: 'font-semibold text-foreground mb-2' } as any)}>Ничего не найдено</Text>
              <Text {...({ className: 'text-sm text-muted-foreground text-center' } as any)}>
                Попробуйте изменить фильтры или поисковый запрос
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};