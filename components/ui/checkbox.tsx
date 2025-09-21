// Checkbox.tsx
import React, { useCallback, useState, forwardRef } from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  Platform,
  ColorValue,
  ViewStyle,
  StyleProp,
  PressableProps,
} from 'react-native';
import { Check, Minus } from 'lucide-react-native';

type CheckboxProps = Omit<PressableProps, 'onPress'> & {
  checked?: boolean;                // controlled
  defaultChecked?: boolean;         // uncontrolled
  onCheckedChange?: (checked: boolean) => void;
  indeterminate?: boolean;          // "mixed" state
  disabled?: boolean;
  size?: number;                    // px, default 16
  color?: ColorValue;               // primary color when checked
  iconColor?: ColorValue;           // check icon color
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_PRIMARY = '#3b82f6';  // tailwind blue-500
const DEFAULT_BORDER = '#94a3b8';   // slate-400

export const Checkbox = forwardRef<React.ElementRef<typeof Pressable>, CheckboxProps>(
  (
    {
      checked,
      defaultChecked,
      onCheckedChange,
      indeterminate = false,
      disabled = false,
      size = 16,
      color = DEFAULT_PRIMARY,
      iconColor = '#ffffff',
      style,
      hitSlop = 8,
      accessibilityLabel,
      ...rest
    },
    ref
  ) => {
    const isControlled = checked !== undefined;
    const [internal, setInternal] = useState(defaultChecked ?? false);
    const value = isControlled ? !!checked : internal;

    const handlePress = useCallback(() => {
      if (disabled) return;
      // Если были в indeterminate — сделаем checked
      const next = indeterminate ? true : !value;
      if (!isControlled) setInternal(next);
      onCheckedChange?.(next);
    }, [disabled, indeterminate, isControlled, onCheckedChange, value]);

    const iconSize = Math.max(10, Math.round(size * 0.8));
    const borderRadius = Math.round(size * 0.2);

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        hitSlop={hitSlop}
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, checked: indeterminate ? 'mixed' : value }}
        android_ripple={
          Platform.OS === 'android'
            ? { color: 'rgba(0,0,0,0.08)', radius: size + 8, borderless: false }
            : undefined
        }
        style={({ pressed }) => [
          styles.base,
          {
            width: size,
            height: size,
            borderRadius,
            borderColor: value || indeterminate ? (color as string) : (DEFAULT_BORDER as string),
            backgroundColor: value || indeterminate ? (color as string) : 'transparent',
            opacity: disabled ? 0.5 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          style,
        ]}
        {...rest}
      >
        {(value || indeterminate) && (
          <View pointerEvents="none" style={styles.iconWrapper}>
            {indeterminate ? (
              <Minus size={iconSize} color={iconColor as string} />
            ) : (
              <Check size={iconSize} color={iconColor as string} />
            )}
          </View>
        )}
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Checkbox;