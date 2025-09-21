import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  forwardRef,
} from 'react';
import {
  View,
  ScrollView,
  Pressable,
} from 'react-native';
import type {
  ViewProps,
  PressableProps,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { cn } from '@/lib/utils';

// Публичный API
export type CarouselApi = {
  scrollPrev: () => void;
  scrollNext: () => void;
  scrollTo: (index: number, animated?: boolean) => void;
  selectedIndex: number;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};

type Orientation = 'horizontal' | 'vertical';
type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export type CarouselProps = {
  orientation?: Orientation;
  className?: string;
  setApi?: (api: CarouselApi) => void;
  children?: React.ReactNode;
};

type Ctx = {
  orientation: Orientation;
  scrollRef: React.RefObject<ScrollView>;
  size: number;
  setSize: SetState<number>;
  index: number;
  setIndex: SetState<number>;
  count: number;
  setCount: SetState<number>;
  scrollPrev: () => void;
  scrollNext: () => void;
  scrollTo: (idx: number, animated?: boolean) => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};
const CarouselContext = createContext<Ctx | null>(null);

export function useCarousel() {
  const ctx = useContext(CarouselContext);
  if (!ctx) throw new Error('useCarousel must be used within a <Carousel />');
  return ctx;
}

export const Carousel = forwardRef<View, ViewProps & CarouselProps>(
  ({ orientation = 'horizontal', className, setApi, children, ...props }, ref) => {
    const scrollRef = useRef<ScrollView>(null);
    const [size, setSize] = useState(0);
    const [index, setIndex] = useState(0);
    const [count, setCount] = useState(0);

    const canScrollPrev = index > 0;
    const canScrollNext = index < Math.max(0, count - 1);

    const scrollTo = useCallback(
      (idx: number, animated: boolean = true) => {
        if (!scrollRef.current || size <= 0) return;
        const x = orientation === 'horizontal' ? size * idx : 0;
        const y = orientation === 'vertical' ? size * idx : 0;
        scrollRef.current.scrollTo({ x, y, animated });
      },
      [orientation, size]
    );

    const scrollPrev = useCallback(() => {
      if (canScrollPrev) scrollTo(index - 1);
    }, [canScrollPrev, index, scrollTo]);

    const scrollNext = useCallback(() => {
      if (canScrollNext) scrollTo(index + 1);
    }, [canScrollNext, index, scrollTo]);

    useEffect(() => {
      if (!setApi) return;
      setApi({
        scrollPrev,
        scrollNext,
        scrollTo,
        selectedIndex: index,
        canScrollPrev,
        canScrollNext,
      });
    }, [setApi, scrollPrev, scrollNext, scrollTo, index, canScrollPrev, canScrollNext]);

    const value = useMemo<Ctx>(
      () => ({
        orientation,
        scrollRef,
        size,
        setSize,
        index,
        setIndex,
        count,
        setCount,
        scrollPrev,
        scrollNext,
        scrollTo,
        canScrollPrev,
        canScrollNext,
      }),
      [
        orientation,
        scrollRef,
        size,
        index,
        count,
        scrollPrev,
        scrollNext,
        scrollTo,
        canScrollPrev,
        canScrollNext,
      ]
    );

    return (
      <CarouselContext.Provider value={value}>
        <View ref={ref} className={cn('relative', className)} {...props}>
          {children}
        </View>
      </CarouselContext.Provider>
    );
  }
);
Carousel.displayName = 'Carousel';

export const CarouselContent = forwardRef<View, ViewProps>(
  ({ className, children, ...props }, ref) => {
    const { orientation, scrollRef, setSize, setIndex, setCount, size } = useCarousel();

    const slides = useMemo(() => React.Children.toArray(children), [children]);

    useEffect(() => {
      setCount(slides.length);
    }, [slides.length, setCount]);

    const onLayout = useCallback(
      (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        const newSize = orientation === 'horizontal' ? width : height;
        if (newSize && newSize !== size) {
          setSize(newSize);
          setIndex((prev) => Math.min(prev, Math.max(0, slides.length - 1)));
        }
      },
      [orientation, setSize, size, setIndex, slides.length]
    );

    const onMomentumEnd = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = orientation === 'horizontal' ? e.nativeEvent.contentOffset.x : e.nativeEvent.contentOffset.y;
        if (size > 0) {
          const nextIndex = Math.round(offset / size);
          setIndex(nextIndex);
        }
      },
      [orientation, size, setIndex]
    );

    return (
      <View ref={ref} onLayout={onLayout} className={cn('', className)} {...props}>
        <ScrollView
          ref={scrollRef}
          horizontal={orientation === 'horizontal'}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
        >
          {slides.map((child, i) => (
            <View
              key={i}
              style={
                orientation === 'horizontal'
                  ? { width: size || undefined }
                  : { height: size || undefined }
              }
              className={cn(
                'shrink-0 grow-0',
                orientation === 'horizontal' ? (i > 0 ? 'pl-4' : '') : (i > 0 ? 'pt-4' : '')
              )}
            >
              {child}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }
);
CarouselContent.displayName = 'CarouselContent';

export const CarouselItem = forwardRef<View, ViewProps>(({ className, ...props }, ref) => {
  return (
    <View
      ref={ref}
      className={cn('min-w-0 shrink-0 grow-0 basis-full', className)}
      {...props}
    />
  );
});
CarouselItem.displayName = 'CarouselItem';

type NavButtonProps = PressableProps & { className?: string };
type OnPress = NonNullable<PressableProps['onPress']>;
type OnPressArgs = Parameters<OnPress>; // [GestureResponderEvent]

export const CarouselPrevious = forwardRef<React.ElementRef<typeof Pressable>, NavButtonProps>(
  ({ className, onPress, ...props }, ref) => {
    const { orientation, scrollPrev, canScrollPrev } = useCarousel();

    const handlePress = (...args: OnPressArgs) => {
      onPress?.(...args);
      scrollPrev();
    };

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel="Previous slide"
        disabled={!canScrollPrev}
        onPress={handlePress}
        className={cn(
          'absolute h-8 w-8 items-center justify-center rounded-full bg-background/80 border',
          orientation === 'horizontal'
            ? '-left-12 top-1/2 -translate-y-1/2'
            : '-top-12 left-1/2 -translate-x-1/2 rotate-90',
          !canScrollPrev ? 'opacity-50' : 'opacity-100',
          className
        )}
        {...props}
      >
        <ArrowLeft size={16} />
      </Pressable>
    );
  }
);
CarouselPrevious.displayName = 'CarouselPrevious';

export const CarouselNext = forwardRef<React.ElementRef<typeof Pressable>, NavButtonProps>(
  ({ className, onPress, ...props }, ref) => {
    const { orientation, scrollNext, canScrollNext } = useCarousel();

    const handlePress = (...args: OnPressArgs) => {
      onPress?.(...args);
      scrollNext();
    };

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel="Next slide"
        disabled={!canScrollNext}
        onPress={handlePress}
        className={cn(
          'absolute h-8 w-8 items-center justify-center rounded-full bg-background/80 border',
          orientation === 'horizontal'
            ? '-right-12 top-1/2 -translate-y-1/2'
            : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90',
          !canScrollNext ? 'opacity-50' : 'opacity-100',
          className
        )}
        {...props}
      >
        <ArrowRight size={16} />
      </Pressable>
    );
  }
);
CarouselNext.displayName = 'CarouselNext';