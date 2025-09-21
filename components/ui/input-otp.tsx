// InputOTP.tsx — React Native + NativeWind версия OTP ввода
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
  Animated,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
} from 'react-native';
import { Dot as DotIcon } from 'lucide-react-native';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

type SlotState = {
  char: string | null;
  isActive: boolean;
  hasFakeCaret: boolean;
};

type OTPContextValue = {
  slots: SlotState[];
  length: number;
  value: string;
  focused: boolean;
  focus: () => void;
  disabled: boolean;
};

const OTPInputContext = createContext<OTPContextValue>({
  slots: [],
  length: 0,
  value: '',
  focused: false,
  focus: () => {},
  disabled: false,
});

export type InputOTPProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'defaultValue'> &
  WithClassName & {
    containerClassName?: string;
    length?: number;                    // число слотов, по умолчанию 6
    value?: string;                     // controlled
    defaultValue?: string;              // uncontrolled
    onChange?: (v: string) => void;
    onComplete?: (v: string) => void;   // вызывается, когда длина === length
    onlyDigits?: boolean;               // по умолчанию true
  };

export const InputOTP = forwardRef<React.ElementRef<typeof TextInput>, InputOTPProps>(
  (
    {
      containerClassName,
      className,
      length = 6,
      value,
      defaultValue = '',
      onChange,
      onComplete,
      editable = true,
      onlyDigits = true,
      keyboardType = 'number-pad',
      autoFocus,
      ...rest
    },
    ref
  ) => {
    const isControlled = value !== undefined;
    const [internal, setInternal] = useState(defaultValue);
    const val = (isControlled ? value! : internal) ?? '';
    const [focused, setFocused] = useState(false);

    const inputRef = useRef<TextInput>(null);
    // прокидываем наружу ref
    useEffect(() => {
      if (!ref) return;
      if (typeof ref === 'function') ref(inputRef.current as any);
      else (ref as any).current = inputRef.current;
    }, [ref]);

    const sanitize = useCallback(
      (s: string) => {
        const t = onlyDigits ? s.replace(/\D+/g, '') : s;
        return t.slice(0, length);
      },
      [onlyDigits, length]
    );

    const handleChangeText = (text: string) => {
      const next = sanitize(text);
      if (!isControlled) setInternal(next);
      onChange?.(next);
      if (next.length === length) onComplete?.(next);
    };

    const focus = useCallback(() => {
      if (!editable) return;
      inputRef.current?.focus();
    }, [editable]);

    const activeIndex = focused ? Math.min(val.length, length - 1) : -1;

    const slots: SlotState[] = useMemo(() => {
      const arr: SlotState[] = [];
      for (let i = 0; i < length; i++) {
        const ch = val[i] ?? null;
        const isActive = i === activeIndex;
        const hasFakeCaret = isActive && !ch;
        arr.push({ char: ch, isActive, hasFakeCaret });
      }
      return arr;
    }, [val, length, activeIndex]);

    const ctxValue = useMemo<OTPContextValue>(
      () => ({ slots, length, value: val, focused, focus, disabled: !editable }),
      [slots, length, val, focused, focus, editable]
    );

    return (
      <OTPInputContext.Provider value={ctxValue}>
        <View
          // контейнер вокруг всего ввода
          {...({
            className: cn('flex flex-row items-center gap-2', containerClassName),
            // если нужно: dataSet: { disabled: editable ? 'false' : 'true' }
          } as any)}
          // на весь контейнер повесим фокус
          onStartShouldSetResponder={() => true}
          onResponderGrant={focus}
        >
          {/* Скрытый TextInput, принимающий ввод */}
          <TextInput
            ref={inputRef}
            value={val}
            onChangeText={handleChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            editable={editable}
            keyboardType={keyboardType}
            textContentType="oneTimeCode"
            contextMenuHidden
            // Скрываем визуально
            style={{ position: 'absolute', opacity: 0, height: 1, width: 1, padding: 0 }}
            // Классы «на всякий» (но инпут скрыт)
            {...({ className: cn('disabled:opacity-50', className) } as any)}
            autoFocus={autoFocus}
            {...rest}
          />
          {/* Пользовательские children — группы/слоты/разделители */}
          {/* Примечание: передавайте InputOTPGroup/Slot как children */}
          <View {...({ className: 'flex-row items-center gap-2' } as any)}>
            {/* Вы можете не рендерить children, а сделать свой layout */}
          </View>
        </View>
      </OTPInputContext.Provider>
    );
  }
);
InputOTP.displayName = 'InputOTP';

export type InputOTPGroupProps = ViewProps & WithClassName;
export const InputOTPGroup = forwardRef<React.ElementRef<typeof View>, InputOTPGroupProps>(
  ({ className, style, children, ...rest }, ref) => {
    const { disabled } = useContext(OTPInputContext);
    return (
      <View
        ref={ref}
        style={style}
        {...({
          className: cn('flex-row items-center', className),
          dataSet: { disabled: disabled ? 'true' : 'false' },
        } as any)}
        {...rest}
      >
        {children}
      </View>
    );
  }
);
InputOTPGroup.displayName = 'InputOTPGroup';

export type InputOTPSlotProps = ViewProps & WithClassName & { index: number };
export const InputOTPSlot = forwardRef<React.ElementRef<typeof View>, InputOTPSlotProps>(
  ({ index, className, style, ...rest }, ref) => {
    const { slots, focus, disabled } = useContext(OTPInputContext);
    const slot = slots[index] ?? { char: null, isActive: false, hasFakeCaret: false };

    // мигающая каретка
    const blink = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      if (slot.hasFakeCaret) {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(blink, { toValue: 0, duration: 600, useNativeDriver: true }),
            Animated.timing(blink, { toValue: 1, duration: 600, useNativeDriver: true }),
          ])
        );
        loop.start();
        return () => loop.stop();
      } else {
        blink.setValue(1);
      }
    }, [slot.hasFakeCaret, blink]);

    return (
      <Pressable
        ref={ref as any}
        onPress={focus}
        disabled={disabled}
        style={style}
        {...({
          className: cn(
            'relative h-10 w-10 items-center justify-center border-y border-r border-input',
            'first:rounded-l-md first:border-l last:rounded-r-md',
            slot.isActive ? 'z-10 ring-2 ring-ring' : '',
            className
          ),
        } as any)}
        {...rest}
      >
        {slot.char ? (
          <Text {...({ className: 'text-sm text-foreground' } as any)}>{slot.char}</Text>
        ) : null}
        {slot.hasFakeCaret && (
          <View
            pointerEvents="none"
            {...({ className: 'absolute inset-0 items-center justify-center' } as any)}
          >
            <Animated.View
              style={{ width: 1, height: 16, opacity: blink }}
              {...({ className: 'bg-foreground' } as any)}
            />
          </View>
        )}
      </Pressable>
    );
  }
);
InputOTPSlot.displayName = 'InputOTPSlot';

export type InputOTPSeparatorProps = ViewProps & WithClassName;
export const InputOTPSeparator = forwardRef<React.ElementRef<typeof View>, InputOTPSeparatorProps>(
  ({ className, style, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        style={style}
        {...({ className: cn('px-1', className) } as any)}
        {...rest}
      >
        <DotIcon size={16} />
      </View>
    );
  }
);
InputOTPSeparator.displayName = 'InputOTPSeparator';

// Для совместимости с исходным API — экспортируем контекст
export { OTPInputContext };