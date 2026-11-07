import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { progressFillTransition } from '../lib/animations';
import { ONBOARDING_STEPS, progressLabel, progressSegments } from '../lib/onboarding';
import { colors, radius, size, spacing, typography } from '../lib/theme';

/**
 * Onboarding progress: "Question n of 5" over a segmented bar. Screen readers get one progressbar
 * element with the same label and a value. Filled segments ease their colour, under Reduced Motion
 * too, because a colour change moves nothing. The empty colour is decorative: the text carries it.
 */
export function StepProgress({ stepIndex }: { stepIndex: number }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={progressLabel(stepIndex)}
      aria-valuemin={1}
      aria-valuemax={ONBOARDING_STEPS.length}
      aria-valuenow={stepIndex + 1}
      // react-native-web cannot announce, so on web the step change is read from this live region.
      // Native screens announce it with `AccessibilityInfo` instead, so it is never read twice.
      aria-live={Platform.OS === 'web' ? 'polite' : undefined}
      style={styles.container}
    >
      <Text style={styles.label}>{progressLabel(stepIndex)}</Text>
      <View style={styles.track}>
        {progressSegments(stepIndex).map((filled, i) => (
          <Animated.View
            // The segments never reorder, so the index is a stable key.
            key={i}
            style={[styles.segment, { backgroundColor: filled ? colors.primary : colors.border }, progressFillTransition]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { ...typography.label, color: colors.mutedText },
  track: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: size.progressTrack, borderRadius: radius.full },
});
