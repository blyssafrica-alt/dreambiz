import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface WizardProgressProps {
  step: number;
  total: number;
  stepTitles?: string[];
}

export function WizardProgress({ step, total, stepTitles }: WizardProgressProps) {
  const { theme } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step - 1) / Math.max(1, total - 1),
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [step, total, progressAnim]);

  const widthInterpolate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.wrap}>
      <View style={[styles.track, { backgroundColor: theme.background.tertiary }]}>
        <Animated.View style={[styles.fill, { backgroundColor: theme.accent.primary, width: widthInterpolate }]} />
      </View>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.text.secondary }]}>
          Step {step} of {total}
        </Text>
        {stepTitles?.[step - 1] ? (
          <Text style={[styles.stepTitle, { color: theme.text.tertiary }]} numberOfLines={1}>
            {stepTitles[step - 1]}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  stepTitle: { fontSize: 12, flex: 1, textAlign: 'right', marginLeft: 8 },
});
