import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { CART_SPACING, CART_RADIUS } from '@/constants/cart-design';

export function CartSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.wrap}>
      {[1, 2].map((i) => (
        <Animated.View key={i} style={[styles.card, { opacity }]}>
          <View style={styles.thumb} />
          <View style={styles.body}>
            <View style={[styles.line, styles.title]} />
            <View style={[styles.line, styles.sub]} />
            <View style={[styles.line, styles.short]} />
          </View>
        </Animated.View>
      ))}
      <Animated.View style={[styles.summary, { opacity }]}>
        <View style={[styles.line, styles.summaryLine]} />
        <View style={[styles.line, styles.summaryLine]} />
        <View style={[styles.line, styles.summaryLineShort]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: CART_SPACING.lg },
  card: {
    flexDirection: 'row',
    borderRadius: CART_RADIUS.lg,
    padding: CART_SPACING.md,
    marginBottom: CART_SPACING.sm,
    backgroundColor: '#E2E8F0',
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: CART_RADIUS.sm,
    backgroundColor: '#CBD5E1',
  },
  body: { flex: 1, marginLeft: CART_SPACING.md, justifyContent: 'center' },
  line: { height: 12, borderRadius: 6, backgroundColor: '#CBD5E1', marginBottom: 8 },
  title: { width: '80%', height: 16 },
  sub: { width: '50%', height: 10 },
  short: { width: '30%', height: 10 },
  summary: {
    borderRadius: CART_RADIUS.lg,
    padding: CART_SPACING.lg,
    marginTop: CART_SPACING.sm,
    backgroundColor: '#E2E8F0',
  },
  summaryLine: { width: '100%', height: 14, marginBottom: 12 },
  summaryLineShort: { width: '60%', height: 18 },
});
