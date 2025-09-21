// Resizable.tsx — React Native + NativeWind адаптация react-resizable-panels
// Поддержка: горизонтальная/вертикальная группа, перетаскиваемые разделители, min/default size, withHandle.
// Иконки: npm i lucide-react-native react-native-svg

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  type ViewProps,
  PanResponder,
  type LayoutChangeEvent,
} from 'react-native';
import { GripVertical } from 'lucide-react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

type Direction = 'horizontal' | 'vertical';

type GroupCtx = {
  direction: Direction;
  sizes: number[]; // fractions (sum = 1)
  minSizes: number[];
  setSizes: (next: number[]) => void;
  containerLen: number;
  setContainerLen: (n: number) => void;
  adjustBetween: (prev: number, next: number, deltaPx: number) => void;
  panelCount: number;
};
const Ctx = createContext<GroupCtx | null>(null);
const useGroup = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('Resizable components must be used within <ResizablePanelGroup>');
  return v;
};

const isPanel = (el: any) => el?.type?.displayName === 'ResizablePanel';
const isHandle = (el: any) => el?.type?.displayName === 'ResizableHandle';

const toFrac = (n?: number) => {
  if (n == null) return undefined;
  if (n <= 1) return Math.max(0, Math.min(1, n));
  // трактуем как проценты
  return Math.max(0, Math.min(1, n / 100));
};

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export type ResizablePanelGroupProps = ViewProps &
  WithClassName & {
    direction?: Direction; // default 'horizontal'
    onSizesChange?: (fractions: number[]) => void;
    children: React.ReactNode; // ожидается: Panel, Handle, Panel, [Handle, Panel]...
  };

const ResizablePanelGroup = forwardRef<React.ElementRef<typeof View>, ResizablePanelGroupProps>(
  ({ direction = 'horizontal', className, style, onSizesChange, children, ...rest }, ref) => {
    const nodes = React.Children.toArray(children);

    // Собираем панели и их дефолт/минимальные размеры
    const panels = nodes.filter(isPanel) as React.ReactElement<ResizablePanelProps>[];
    const panelCount = panels.length;

    const defaultFractions = useMemo(() => {
      const specified: number[] = [];
      let specifiedSum = 0;
      for (const p of panels) {
        const f = toFrac(p.props.defaultSize);
        specified.push(f ?? -1);
        if (f != null) specifiedSum += f;
      }
      const unspecifiedCount = specified.filter((x) => x < 0).length;
      const leftover = clamp(1 - specifiedSum, 0, 1);
      const share = unspecifiedCount > 0 ? leftover / unspecifiedCount : 0;

      return specified.map((x) => (x >= 0 ? x : share));
    }, [panels]);

    const minFractions = useMemo(() => {
      return panels.map((p) => toFrac(p.props.minSize) ?? 0.05);
    }, [panels]);

    const [sizes, setSizes] = useState<number[]>(defaultFractions);

    useEffect(() => {
      // если число панелей изменилось — пересчитать
      if (sizes.length !== defaultFractions.length) {
        setSizes(defaultFractions);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultFractions.length]);

    useEffect(() => {
      onSizesChange?.(sizes);
    }, [sizes, onSizesChange]);

    const [containerLen, setContainerLen] = useState(0);

    const adjustBetween = useCallback(
      (prev: number, next: number, deltaPx: number) => {
        if (prev < 0 || next >= sizes.length || containerLen <= 0) return;
        const deltaFrac = deltaPx / containerLen;
        const prevMin = minFractions[prev];
        const nextMin = minFractions[next];

        const canGrowPrev = sizes[next] - nextMin; // сколько можно забрать у next
        const canShrinkPrev = sizes[prev] - prevMin; // сколько можно отдать от prev

        // Ограничиваем делту, чтобы не нарушить min
        let use = deltaFrac;
        if (use > 0) use = Math.min(use, canGrowPrev);
        else use = Math.max(use, -canShrinkPrev);

        const nextSizes = sizes.slice();
        nextSizes[prev] = clamp(nextSizes[prev] + use, prevMin, 1);
        nextSizes[next] = clamp(nextSizes[next] - use, nextMin, 1);

        // нормализация сумм (на всякий случай)
        const sum = nextSizes.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1) > 1e-6) {
          nextSizes[nextSizes.length - 1] += 1 - sum;
        }

        setSizes(nextSizes);
      },
      [sizes, containerLen, minFractions]
    );

    const ctx: GroupCtx = useMemo(
      () => ({
        direction,
        sizes,
        minSizes: minFractions,
        setSizes,
        containerLen,
        setContainerLen,
        adjustBetween,
        panelCount,
      }),
      [adjustBetween, containerLen, direction, minFractions, panelCount, sizes]
    );

    const onLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setContainerLen(direction === 'horizontal' ? width : height);
    };

    // Рендерим, прокидывая индексы панелей и prev/next для хэндлов
    let seenPanels = 0;
    const rendered = nodes.map((child, i) => {
      if (!React.isValidElement(child)) return child;

      if (isPanel(child)) {
        const idx = seenPanels++;
        return React.cloneElement(child, {
          __index: idx,
          key: child.key ?? `panel-${i}`,
        } as any);
      }

      if (isHandle(child)) {
        const prevIndex = seenPanels - 1;
        const nextIndex = prevIndex + 1;
        const disabled = prevIndex < 0 || nextIndex >= panelCount;
        return React.cloneElement(child as React.ReactElement<ResizableHandleProps>, {
          __prevIndex: prevIndex,
          __nextIndex: nextIndex,
          __disabled: disabled,
          key: child.key ?? `handle-${i}`,
        } as any);
      }

      return child;
    });

    return (
      <Ctx.Provider value={ctx}>
        <View
          ref={ref}
          onLayout={onLayout}
          style={[{ flexDirection: direction === 'horizontal' ? 'row' : 'column' }, style]}
          {...({
            className: cn(
              'flex h-full w-full',
              direction === 'vertical' ? '' : '',
              className
            ),
            dataSet: { 'panel-group-direction': direction },
          } as any)}
          {...rest}
        >
          {rendered}
        </View>
      </Ctx.Provider>
    );
  }
);
ResizablePanelGroup.displayName = 'ResizablePanelGroup';

// Panel
export type ResizablePanelProps = ViewProps &
  WithClassName & {
    defaultSize?: number; // 0..1 или 0..100 (проценты)
    minSize?: number;     // 0..1 или 0..100
    __index?: number;     // внутренний пропс — не использовать снаружи
  };

const ResizablePanel = forwardRef<React.ElementRef<typeof View>, ResizablePanelProps>(
  ({ className, style, children, __index, ...rest }, ref) => {
    const { sizes } = useGroup();
    const idx = __index ?? 0;
    const flexGrow = sizes[idx] ?? 0;

    return (
      <View
        ref={ref}
        style={[{ flexGrow, flexShrink: 0, flexBasis: 0 }, style]}
        {...({
          className: cn('min-w-0 min-h-0', className),
          dataSet: { index: String(idx) },
        } as any)}
        {...rest}
      >
        {children}
      </View>
    );
  }
);
ResizablePanel.displayName = 'ResizablePanel';

// Handle
export type ResizableHandleProps = ViewProps &
  WithClassName & {
    withHandle?: boolean;
    __prevIndex?: number;  // внутренний
    __nextIndex?: number;  // внутренний
    __disabled?: boolean;  // внутренний
  };

const ResizableHandle = forwardRef<React.ElementRef<typeof View>, ResizableHandleProps>(
  ({ className, style, withHandle, __prevIndex, __nextIndex, __disabled, ...rest }, ref) => {
    const { direction, adjustBetween } = useGroup();

    const start = useRef({ x: 0, y: 0 });
    const pan = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => !__disabled,
        onPanResponderGrant: (_, g) => {
          start.current = { x: g.moveX, y: g.moveY };
        },
        onPanResponderMove: (_, g) => {
          if (__disabled) return;
          const dx = g.moveX - start.current.x;
          const dy = g.moveY - start.current.y;
          const delta = direction === 'horizontal' ? dx : dy;
          adjustBetween(__prevIndex ?? -1, __nextIndex ?? -1, delta);
          start.current = { x: g.moveX, y: g.moveY };
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: () => {},
        onPanResponderTerminate: () => {},
      })
    ).current;

    const isVerticalGroup = direction === 'vertical';

    return (
      <View
        ref={ref}
        // хит-зона пошире, чем сама линия
        style={[
          isVerticalGroup
            ? { height: 10, width: '100%' }
            : { width: 10, height: '100%' },
          style,
        ]}
        {...({
          className: cn(
            'relative items-center justify-center',
            // линия по центру
            className
          ),
          dataSet: { 'panel-group-direction': isVerticalGroup ? 'vertical' : 'horizontal' },
        } as any)}
        {...pan.panHandlers}
        {...rest}
      >
        {/* Центральная линия */}
        <View
          {...({
            className: cn(
              'bg-border',
              isVerticalGroup ? 'h-px w-full' : 'w-px h-full'
            ),
          } as any)}
          style={{
            position: 'absolute',
            left: isVerticalGroup ? 0 : '50%',
            top: isVerticalGroup ? '50%' : 0,
            transform: isVerticalGroup ? [{ translateY: -0.5 }] : [{ translateX: -0.5 }],
          }}
        />
        {/* Опциональная ручка */}
        {withHandle && (
          <View
            {...({
              className: cn(
                'z-10 items-center justify-center rounded-sm border bg-border',
                isVerticalGroup ? 'h-3 w-8' : 'h-8 w-3'
              ),
            } as any)}
            style={{ transform: [{ rotate: isVerticalGroup ? '90deg' : '0deg' }] }}
          >
            <GripVertical size={14} />
          </View>
        )}
      </View>
    );
  }
);
ResizableHandle.displayName = 'ResizableHandle';

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };