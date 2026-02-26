import React, { useRef, useEffect, useCallback } from 'react';
import { ScrollView, ViewStyle } from 'react-native';

const CARD_WIDTH = 280 + 16;
const INTERVAL_MS = 4500;

interface AutoPlayCarouselProps {
  itemCount: number;
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  enabled?: boolean;
}

export function AutoPlayCarousel({
  itemCount,
  children,
  style,
  contentContainerStyle,
  enabled = true,
}: AutoPlayCarouselProps) {
  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!enabled || itemCount <= 1) return;
    const timer = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % itemCount;
      const x = indexRef.current * CARD_WIDTH;
      scrollRef.current?.scrollTo({ x, animated: true });
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, itemCount]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </ScrollView>
  );
}
