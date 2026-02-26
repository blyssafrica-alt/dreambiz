import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface WizardStepProps {
  children: React.ReactNode;
  active: boolean;
  /** Trigger a subtle shake when validation fails */
  shake?: boolean;
}

export function WizardStep({ children, active, shake }: WizardStepProps) {
  const opacity = useRef(new Animated.Value(active ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(active ? 0 : 12)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: active ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: active ? 0 : 12,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, opacity, translateY]);

  useEffect(() => {
    if (shake) {
      shakeAnim.setValue(0);
      Animated.sequence(
        [1, -1, 1, -1, 0].map((v) =>
          Animated.timing(shakeAnim, {
            toValue: v * 4,
            duration: 50,
            useNativeDriver: true,
          })
        )
      ).start();
    }
  }, [shake, shakeAnim]);

  const shakeX = shakeAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [-4, 0, 4] });

  if (!active) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity,
          transform: [{ translateY }, { translateX: shakeX }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
