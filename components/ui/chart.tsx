import React, { createContext, useContext, useMemo, forwardRef } from 'react';
import { View, Text, useColorScheme } from 'react-native';
import type { ViewProps } from 'react-native';
import { cn } from '@/lib/utils';
import { G, Rect, Text as SvgText, TSpan } from 'react-native-svg';

const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
  theme: keyof typeof THEMES;
  getColor: (key: string) => string | undefined;
};

const ChartContext = createContext<ChartContextProps | null>(null);

export function useChart() {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error('useChart must be used within a <ChartContainer />');
  return ctx;
}

type ChartContainerProps = ViewProps & {
  className?: string;
  config: ChartConfig;
  children?: React.ReactNode;
};

export const ChartContainer = forwardRef<View, ChartContainerProps>(
  ({ className, config, children, ...props }, ref) => {
    const scheme = useColorScheme();
    const theme: keyof typeof THEMES = scheme === 'dark' ? 'dark' : 'light';

    const getColor = useMemo(
      () => (key: string) => {
        const item = config[key];
        if (!item) return undefined;
        if ('theme' in item && item.theme) return item.theme[theme];
        return 'color' in item ? item.color : undefined;
      },
      [config, theme]
    );

    const value = useMemo<ChartContextProps>(
      () => ({ config, theme, getColor }),
      [config, theme, getColor]
    );

    return (
      <ChartContext.Provider value={value}>
        <View ref={ref} className={cn('flex aspect-video justify-center', className)} {...props}>
          {children}
        </View>
      </ChartContext.Provider>
    );
  }
);
ChartContainer.displayName = 'Chart';

// В RN нет style-тегов — заглушка, чтобы сохранить API
export const ChartStyle = (_: { id: string; config: ChartConfig }) => null;

// SVG tooltip (используй как labelComponent в Victory*)
type ChartTooltipContentProps = {
  // Victory пробрасывает эти props в labelComponent
  x?: number;
  y?: number;
  text?: string | number | (string | number)[];
  active?: boolean;
  // Кастомные
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  paddingX?: number;
  paddingY?: number;
  pointerOffset?: number; // отступ от точки
  fontSize?: number;
};

export const ChartTooltipContent: React.FC<ChartTooltipContentProps> = ({
  x = 0,
  y = 0,
  text,
  active = false,
  backgroundColor = 'rgba(17,24,39,0.95)', // bg-gray-900/95
  borderColor = 'rgba(148,163,184,0.5)',   // slate-400/50
  textColor = '#fff',
  paddingX = 8,
  paddingY = 6,
  pointerOffset = 8,
  fontSize = 12,
}) => {
  if (!active) return null;

  const lines = Array.isArray(text) ? text.map(String) : [String(text ?? '')];
  const charW = fontSize * 0.6;
  const contentW = Math.max(40, Math.max(...lines.map(l => l.length || 0)) * charW);
  const contentH = paddingY * 2 + lines.length * (fontSize + 2);

  // Рисуем подсказку над точкой: смещаем вправо и вверх
  const tx = x + pointerOffset;
  const ty = y - (contentH + pointerOffset);

  return (
    <G x={tx} y={ty}>
      <Rect
        width={contentW}
        height={contentH}
        rx={6}
        ry={6}
        fill={backgroundColor}
        stroke={borderColor}
        strokeWidth={1}
      />
      <SvgText
        x={paddingX}
        y={paddingY + fontSize}
        fill={textColor}
        fontSize={fontSize}
      >
        {lines.map((line, i) => (
          <TSpan
            key={i}
            x={paddingX}
            dy={i === 0 ? 0 : fontSize + 2}
          >
            {line}
          </TSpan>
        ))}
      </SvgText>
    </G>
  );
};
ChartTooltipContent.displayName = 'ChartTooltip';

// Совместимость с исходным API: ChartTooltip = ChartTooltipContent
export const ChartTooltip = ChartTooltipContent;

// Кастомная легенда (RN-вёрстка)
export type ChartLegendContentProps = ViewProps & {
  className?: string;
  data?: Array<{ name?: string; symbol?: { fill?: string } }>;
  verticalAlign?: 'top' | 'bottom';
  hideIcon?: boolean;
  nameKey?: string; // для совместимости, сейчас не используется
};

export const ChartLegendContent = forwardRef<View, ChartLegendContentProps>(
  ({ className, data, verticalAlign = 'bottom', hideIcon = false, ...props }, ref) => {
    const { config } = useChart();
    if (!data || data.length === 0) return null;

    return (
      <View
        ref={ref}
        className={cn(
          'flex flex-row items-center justify-center gap-4',
          verticalAlign === 'top' ? 'pb-3' : 'pt-3',
          className
        )}
        {...props}
      >
        {data.map((item, idx) => {
          const key = (item?.name ?? `s${idx}`) as string;
          const itemCfg = config[key];
          const color = item?.symbol?.fill || '#94a3b8';

          return (
            <View key={`${key}-${idx}`} className="flex flex-row items-center gap-1.5">
              {itemCfg?.icon && !hideIcon ? (
                <itemCfg.icon />
              ) : !hideIcon ? (
                <View className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: color }} />
              ) : null}
              <Text className="text-xs text-muted-foreground">
                {itemCfg?.label ?? key}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }
);
ChartLegendContent.displayName = 'ChartLegend';

// Чтобы API оставался похожим на веб-версию
export const ChartLegend = (props: ChartLegendContentProps) => <ChartLegendContent {...props} />;