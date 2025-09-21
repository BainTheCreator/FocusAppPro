// form.tsx — React Native адаптация под react-hook-form + NativeWind
import React, { forwardRef } from 'react';
import {
  Text,
  View,
  type TextProps,
  type ViewProps,
} from 'react-native';
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';
import { cn } from '@/lib/utils';

type WithClassName = { className?: string };

export const Form = FormProvider;

// ---------- Contexts ----------
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

type FormItemContextValue = { id: string };
const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

// ---------- FormField ----------
export const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

// ---------- Hook ----------
export const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext?.name) {
    throw new Error('useFormField should be used within <FormField>');
  }

  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

// ---------- FormItem ----------
export type FormItemProps = ViewProps & WithClassName;
export const FormItem = forwardRef<React.ElementRef<typeof View>, FormItemProps>(
  ({ className, style, ...props }, ref) => {
    const id = React.useId();

    return (
      <FormItemContext.Provider value={{ id }}>
        <View
          ref={ref}
          style={style}
          {...({ className: cn('space-y-2', className) } as any)}
          {...props}
        />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = 'FormItem';

// ---------- FormLabel ----------
export type FormLabelProps = TextProps & WithClassName;
export const FormLabel = forwardRef<React.ElementRef<typeof Text>, FormLabelProps>(
  ({ className, children, ...props }, ref) => {
    const { error } = useFormField();

    return (
      <Text
        ref={ref}
        {...({ className: cn(error ? 'text-destructive' : '', className) } as any)}
        {...props}
      >
        {children}
      </Text>
    );
  }
);
FormLabel.displayName = 'FormLabel';

// ---------- FormControl ----------
// Клонирует дочерний элемент (например, TextInput) и прокидывает accessibility props и nativeID.
export type FormControlProps = WithClassName & {
  children: React.ReactElement;
};
export const FormControl = forwardRef<any, FormControlProps>(({ children, className }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  if (!React.isValidElement(children)) return null;

  // Сливаем className внутрь child (для NativeWind)
  const childProps: any = children.props || {};
  const mergedClassName = cn(childProps.className, className);

  return React.cloneElement(children as any, {
    ref,
    nativeID: formItemId,
    accessibilityState: { ...(childProps.accessibilityState || {}), invalid: !!error },
    // Если хотите строгую связку с описанием/ошибкой (Android/iOS поддержка может отличаться)
    // accessibilityDescribedBy: error ? [formDescriptionId, formMessageId] : [formDescriptionId],
    ...(mergedClassName ? ({ className: mergedClassName } as any) : null),
  });
});
FormControl.displayName = 'FormControl';

// ---------- FormDescription ----------
export type FormDescriptionProps = TextProps & WithClassName;
export const FormDescription = forwardRef<React.ElementRef<typeof Text>, FormDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    const { formDescriptionId } = useFormField();

    return (
      <Text
        ref={ref}
        nativeID={formDescriptionId}
        {...({ className: cn('text-sm text-muted-foreground', className) } as any)}
        {...props}
      >
        {children}
      </Text>
    );
  }
);
FormDescription.displayName = 'FormDescription';

// ---------- FormMessage ----------
export type FormMessageProps = TextProps & WithClassName;
export const FormMessage = forwardRef<React.ElementRef<typeof Text>, FormMessageProps>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField();
    const body = error ? String((error as any)?.message ?? '') : children;

    if (!body) return null;

    return (
      <Text
        ref={ref}
        nativeID={formMessageId}
        {...({ className: cn('text-sm font-medium text-destructive', className) } as any)}
        {...props}
      >
        {body}
      </Text>
    );
  }
);
FormMessage.displayName = 'FormMessage';