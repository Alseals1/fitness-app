import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { celebrationStyle, entranceStyle } from '../lib/animations';
import { copy } from '../lib/copy';
import { entranceFor, type Celebration } from '../lib/motion';
import { colors, radius, size, spacing, typography } from '../lib/theme';
import { Button } from './Button';

type Props = {
  celebration: Celebration;
  onContinue: () => void;
};

/**
 * The short "You're all set" moment after the last onboarding question. The badge pops (or only
 * fades under Reduced Motion), then the words fade up. The screen decides when it closes.
 */
export function FinishCelebration({ celebration, onContinue }: Props) {
  const reduced = celebration.entrance === 'fade';
  return (
    <View style={styles.container} aria-live="polite">
      <Animated.View aria-hidden style={[styles.badge, celebrationStyle(celebration.entrance)]}>
        {/* Decorative and sized to the badge, so it does not scale with the text size. */}
        <Text allowFontScaling={false} style={styles.glyph}>
          {copy.onboarding.checkGlyph}
        </Text>
      </Animated.View>
      <Animated.View style={[styles.words, entranceStyle(entranceFor({ index: 1, reduced, animate: true }))]}>
        <Text style={styles.title} accessibilityRole="header">
          {copy.onboarding.finishedTitle}
        </Text>
        <Text style={styles.body}>{copy.onboarding.finishedBody}</Text>
      </Animated.View>
      <View style={styles.action}>
        <Button label={copy.onboarding.continue} onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  badge: {
    width: size.celebrationBadge,
    height: size.celebrationBadge,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { ...typography.display, color: colors.primary },
  words: { gap: spacing.sm, alignSelf: 'stretch' },
  title: { ...typography.heading, color: colors.text, textAlign: 'center' },
  body: { ...typography.body, color: colors.mutedText, textAlign: 'center' },
  action: { alignSelf: 'stretch' },
});
