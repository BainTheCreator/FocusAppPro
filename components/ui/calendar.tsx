import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Calendar as RNCalendar, DateData } from 'react-native-calendars';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { cn } from '@/lib/utils';

// Типы выбора
type Mode = 'single' | 'range' | 'multiple';

type Range = { from?: Date; to?: Date };

type BaseProps = {
  mode?: Mode;
  showOutsideDays?: boolean;
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  fromMonth?: Date;
  toMonth?: Date;
  className?: string;

  selectionColor?: string;
  selectionTextColor?: string;
  rangeColor?: string;
  arrowColor?: string;
  theme?: Record<string, any>;
};

type SingleProps = BaseProps & {
  mode?: 'single';
  selected?: Date | null;
  onSelect?: (date: Date | undefined) => void;
};

type RangeProps = BaseProps & {
  mode: 'range';
  selected?: Range;
  onSelect?: (range: Range | undefined) => void;
};

type MultipleProps = BaseProps & {
  mode: 'multiple';
  selected?: Date[];
  onSelect?: (dates: Date[] | undefined) => void;
};

export type CalendarProps = SingleProps | RangeProps | MultipleProps;

// Вспомогательные функции
const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isBeforeDay = (a: Date, b: Date) => {
  const ad = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bd = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return ad < bd;
};

const addMonths = (d: Date, delta: number) => new Date(d.getFullYear(), d.getMonth() + delta, 1);

const eachDay = (from: Date, to: Date) => {
  const days: Date[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cur.getTime() <= end.getTime()) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

// Формирование markedDates + markingType
function buildMarkedDates(
  mode: Mode,
  selected: Date | Date[] | Range | null | undefined,
  selectionColor: string,
  selectionTextColor: string,
  rangeColor: string
): { marked: Record<string, any>; markingType: 'period' | undefined } {
  const marked: Record<string, any> = {};
  let markingType: 'period' | undefined = undefined;

  if (mode === 'single') {
    const d = selected as Date | null | undefined;
    if (d) {
      marked[fmt(d)] = {
        selected: true,
        selectedColor: selectionColor,
        selectedTextColor: selectionTextColor,
      };
    }
  } else if (mode === 'multiple') {
    const arr = (selected as Date[] | undefined) ?? [];
    for (const d of arr) {
      marked[fmt(d)] = {
        selected: true,
        selectedColor: selectionColor,
        selectedTextColor: selectionTextColor,
      };
    }
  } else if (mode === 'range') {
    markingType = 'period';
    const { from, to } = (selected as Range) ?? {};
    if (from && to) {
      const days = eachDay(from, to);
      days.forEach((d, idx) => {
        const key = fmt(d);
        const isStart = idx === 0;
        const isEnd = idx === days.length - 1;
        marked[key] = {
          startingDay: isStart,
          endingDay: isEnd,
          color: rangeColor,
          textColor: selectionTextColor,
        };
      });
    } else if (from && !to) {
      const key = fmt(from);
      marked[key] = {
        startingDay: true,
        endingDay: true,
        color: rangeColor,
        textColor: selectionTextColor,
      };
    }
  }

  return { marked, markingType };
}

export function Calendar({
  mode = 'single',
  selected,
  onSelect,
  month,
  defaultMonth,
  onMonthChange,
  fromMonth,
  toMonth,
  showOutsideDays = true,
  className,
  selectionColor = '#0ea5e9',       // sky-500
  selectionTextColor = '#ffffff',
  rangeColor = '#93c5fd',            // blue-300
  arrowColor = '#334155',            // slate-700
  theme,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = useState<Date>(month ?? defaultMonth ?? new Date());
  const currentMonth = month ?? internalMonth;

  const { marked, markingType } = useMemo(
    () => buildMarkedDates(mode, selected as any, selectionColor, selectionTextColor, rangeColor),
    [mode, selected, selectionColor, selectionTextColor, rangeColor]
  );

  const minDate = fromMonth ? fmt(fromMonth) : undefined;
  const maxDate = toMonth ? fmt(toMonth) : undefined;

  const handleDayPress = (day: DateData) => {
    const date = new Date(day.year, day.month - 1, day.day);

    if (mode === 'single') {
      (onSelect as SingleProps['onSelect'])?.(date);
      return;
    }

    if (mode === 'multiple') {
      const arr = ((selected as Date[] | undefined) ?? []).slice();
      const idx = arr.findIndex((d) => isSameDay(d, date));
      if (idx >= 0) {
        arr.splice(idx, 1);
      } else {
        arr.push(date);
      }
      (onSelect as MultipleProps['onSelect'])?.(arr.length ? arr : undefined);
      return;
    }

    // range
    const range = ((selected as Range | undefined) ?? {}) as Range;
    if (!range.from || (range.from && range.to)) {
      (onSelect as RangeProps['onSelect'])?.({ from: date, to: undefined });
    } else {
      if (isBeforeDay(date, range.from)) {
        (onSelect as RangeProps['onSelect'])?.({ from: date, to: range.from });
      } else if (isSameDay(date, range.from)) {
        (onSelect as RangeProps['onSelect'])?.(undefined);
      } else {
        (onSelect as RangeProps['onSelect'])?.({ from: range.from, to: date });
      }
    }
  };

  const goLeft = () => {
    const next = addMonths(currentMonth, -1);
    if (!month) setInternalMonth(next);
    onMonthChange?.(next);
  };

  const goRight = () => {
    const next = addMonths(currentMonth, 1);
    if (!month) setInternalMonth(next);
    onMonthChange?.(next);
  };

  return (
    <View className={cn('p-3', className)}>
      <RNCalendar
        current={fmt(currentMonth)}
        minDate={minDate}
        maxDate={maxDate}
        hideExtraDays={!showOutsideDays}
        enableSwipeMonths
        onDayPress={handleDayPress}
        markedDates={marked}
        markingType={markingType}
        onMonthChange={(m) => {
          const d = new Date(m.year, m.month - 1, 1);
          if (!month) setInternalMonth(d);
          onMonthChange?.(d);
        }}
        renderArrow={(direction) =>
          direction === 'left' ? (
            <ChevronLeft size={16} color={arrowColor} />
          ) : (
            <ChevronRight size={16} color={arrowColor} />
          )
        }
        onPressArrowLeft={(subtractMonth) => {
          goLeft();
          subtractMonth();
        }}
        onPressArrowRight={(addMonth) => {
          goRight();
          addMonth();
        }}
        theme={{
          arrowColor,
          selectedDayBackgroundColor: selectionColor,
          selectedDayTextColor: selectionTextColor,
          todayTextColor: '#0284c7',
          textMonthFontWeight: '600',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
          ...theme,
        }}
      />
    </View>
  );
}

Calendar.displayName = 'Calendar';