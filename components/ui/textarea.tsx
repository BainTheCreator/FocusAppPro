// Textarea.tsx — React Native + NativeWind адаптация
import React, { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

export type TextareaProps = TextInputProps &
  WithClassName & {
    rows?: number;          // стартовая высота (примерно rows * 20)
    autoGrow?: boolean;     // авто-рост по контенту
    disabled?: boolean;     // alias для editable={false}
    isInvalid?: boolean;    // accessibilityState.invalid
  };

export const Textarea = forwardRef<React.ElementRef<typeof TextInput>, TextareaProps>(
  (
    {
      className,
      rows,
      autoGrow = false,
      disabled,
      isInvalid = false,
      editable = true,
      placeholderTextColor = '#9ca3af', // muted-foreground
      onFocus,
      onBlur,
      onContentSizeChange,
      style,
      ...rest
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const [height, setHeight] = useState<number | undefined>(
      rows ? Math.max(80, rows * 20) : 80
    );

    const effectiveEditable = disabled ? false : editable;

    const handleFocus: TextInputProps['onFocus'] = (e) => {
      setFocused(true);
      onFocus?.(e);
    };
    const handleBlur: TextInputProps['onBlur'] = (e) => {
      setFocused(false);
      onBlur?.(e);
    };

    const handleContentSize: TextInputProps['onContentSizeChange'] = (e) => {
      if (autoGrow) {
        const h = Math.max(rows ? rows * 20 : 80, e.nativeEvent.contentSize.height);
        setHeight(h);
      }
      onContentSizeChange?.(e);
    };

    const base = cn(
      // базовые стили под shadcn/web
      'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
      'placeholder:text-muted-foreground',
      focused ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : '',
      !effectiveEditable ? 'opacity-50' : ''
    );

    return (
      <TextInput
        ref={ref}
        multiline
        textAlignVertical="top"
        editable={effectiveEditable}
        placeholderTextColor={placeholderTextColor}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onContentSizeChange={handleContentSize}
        accessibilityState={{ disabled: !effectiveEditable, invalid: isInvalid }}
        style={[{ minHeight: 80, height }, style]}
        {...({
          className: cn(base, className),
          dataSet: {
            state: focused ? 'focused' : 'blurred',
            disabled: effectiveEditable ? 'false' : 'true',
            invalid: isInvalid ? 'true' : 'false',
          },
        } as any)}
        {...rest}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export default Textarea;