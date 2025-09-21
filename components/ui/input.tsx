// Input.tsx — React Native + NativeWind версия инпута
import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  type TextInputProps,
  Platform,
} from 'react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };
type InputType = 'text' | 'password' | 'email' | 'number' | 'decimal' | 'tel' | 'url' | 'search';

export type InputProps = TextInputProps &
  WithClassName & {
    type?: InputType;          // маппится в keyboardType/secureTextEntry
    disabled?: boolean;        // alias к editable={false}
    isInvalid?: boolean;       // для accessibility
  };

export const Input = forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  (
    {
      className,
      type = 'text',
      disabled,
      isInvalid = false,
      editable = true,
      placeholderTextColor = '#9ca3af', // muted-foreground
      onFocus,
      onBlur,
      ...rest
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);

    const effectiveEditable = disabled ? false : editable;
    const mapped = mapTypeToRN(type);

    const handleFocus: TextInputProps['onFocus'] = (e) => {
      onFocus?.(e);
      setFocused(true);
    };
    const handleBlur: TextInputProps['onBlur'] = (e) => {
      onBlur?.(e);
      setFocused(false);
    };

    const base = cn(
      'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground',
      // имитация focus ring через смену классов по состоянию
      focused ? 'ring-2 ring-ring ring-offset-2' : '',
      !effectiveEditable ? 'opacity-50' : ''
    );

    return (
      <TextInput
        ref={ref}
        editable={effectiveEditable}
        placeholderTextColor={placeholderTextColor}
        onFocus={handleFocus}
        onBlur={handleBlur}
        accessibilityState={{ disabled: !effectiveEditable, invalid: isInvalid }}
        {...mapped}
        // Прокидываем className и dataSet для NativeWind (быстрый каст типов)
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
Input.displayName = 'Input';

function mapTypeToRN(type: InputType): Partial<TextInputProps> {
  switch (type) {
    case 'password':
      return {
        secureTextEntry: true,
        autoCapitalize: 'none',
        textContentType: 'password',
      };
    case 'email':
      return {
        keyboardType: 'email-address',
        autoCapitalize: 'none',
        textContentType: 'emailAddress',
      };
    case 'number':
      return {
        keyboardType: 'number-pad',
      };
    case 'decimal':
      return {
        keyboardType: Platform.OS === 'ios' ? 'decimal-pad' : 'numeric',
      };
    case 'tel':
      return {
        keyboardType: 'phone-pad',
        textContentType: 'telephoneNumber',
      };
    case 'url':
      return {
        keyboardType: 'url',
        autoCapitalize: 'none',
        textContentType: 'URL',
      };
    case 'search':
      return {
        returnKeyType: 'search',
        autoCapitalize: 'none',
      };
    case 'text':
    default:
      return {};
  }
}

export default Input;