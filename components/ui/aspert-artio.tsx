import React, { forwardRef } from 'react';
import { View as RNView, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

type RatioInput =
  | number
  | `${number}/${number}`
  | `${number}:${number}`;

function toNumberRatio(ratio: RatioInput | undefined): number {
  if (ratio === undefined) return 16 / 9;
  if (typeof ratio === 'number') return ratio;
  const sep = ratio.includes('/') ? '/' : ':';
  const [w, h] = ratio.split(sep).map((n) => parseFloat(n));
  if (!isFinite(w) || !isFinite(h) || h === 0) return 1;
  return w / h;
}

export type AspectRatioProps = ViewProps & {
  ratio?: RatioInput;   // 16/9 | "16/9" | "4:3" | 1
  className?: string;
};

/**
 * Контейнер, сохраняющий пропорции. По умолчанию 16:9.
 * Ширину обычно задаём извне (например, className="w-full"),
 * высота вычисляется автоматически.
 */
export const AspectRatio = forwardRef<
  React.ElementRef<typeof RNView>,
  AspectRatioProps
>(({ ratio = 16 / 9, className, style, children, ...props }, ref) => {
  const r = toNumberRatio(ratio);
  return (
    <RNView
      ref={ref}
      className={cn('w-full', className)}
      style={[{ aspectRatio: r }, style]}
      {...props}
    >
      {children}
    </RNView>
  );
});

AspectRatio.displayName = 'AspectRatio';