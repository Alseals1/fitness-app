import type { ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useMotion } from '../hooks/useMotion';
import { skeletonPulseStyle } from '../lib/animations';
import { copy } from '../lib/copy';
import { skeletonPulses } from '../lib/motion';
import { cardStyle, colors, minTouchTarget, radius, spacing, typography } from '../lib/theme';

/** How many result cards a loading list shows. */
const skeletonCardCount = 3;

/** The height of a reason pill: its label line plus its vertical padding. */
const pillHeight = typography.label.lineHeight + spacing.xs * 2;

type BlockProps = { width: DimensionValue; height: number; radius?: number };

/** One grey block standing in for a line of text or a control. */
export function SkeletonBlock({ width, height, radius: cornerRadius = radius.sm }: BlockProps) {
  return <View style={[styles.block, { width, height, borderRadius: cornerRadius }]} />;
}

/**
 * Holds a screen's skeleton blocks and pulses them together: one animation per screen, and none
 * under Reduced Motion. A screen reader hears one "Loading…" progress bar, never the blocks.
 */
export function SkeletonGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { reduced } = useMotion();
  return (
    <Animated.View
      style={skeletonPulses(reduced) ? skeletonPulseStyle : undefined}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={copy.loading}
      // aria-busy and aria-hidden, unlike accessibilityState and the per-platform hiding props, reach web too.
      aria-busy
    >
      <View style={style} aria-hidden>
        {children}
      </View>
    </Animated.View>
  );
}

/** Stands in for the results and shortlist lists: cards shaped like `ResultCard`. */
export function ResultListSkeleton() {
  return (
    <SkeletonGroup style={styles.list}>
      {Array.from({ length: skeletonCardCount }, (_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardText}>
            <SkeletonBlock width="25%" height={typography.label.lineHeight} />
            <SkeletonBlock width="80%" height={typography.title.lineHeight} />
            <SkeletonBlock width="45%" height={typography.body.lineHeight} />
            <View style={styles.pills}>
              <SkeletonBlock width="30%" height={pillHeight} radius={radius.full} />
              <SkeletonBlock width="25%" height={pillHeight} radius={radius.full} />
            </View>
            <View style={styles.cue}>
              <SkeletonBlock width="30%" height={typography.bodyStrong.lineHeight} />
            </View>
          </View>
          <SkeletonBlock width={minTouchTarget} height={minTouchTarget} radius={radius.md} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Stands in for a place profile: heading, meta, the save button and three sections. */
export function PlaceProfileSkeleton() {
  return (
    <SkeletonGroup style={styles.profile}>
      <SkeletonBlock width="70%" height={typography.heading.lineHeight} />
      <SkeletonBlock width="45%" height={typography.body.lineHeight} />
      <SkeletonBlock width={minTouchTarget} height={minTouchTarget} radius={radius.md} />
      {Array.from({ length: 3 }, (_, index) => (
        <View key={index} style={styles.section}>
          <SkeletonBlock width="25%" height={typography.label.lineHeight} />
          <SkeletonBlock width="90%" height={typography.body.lineHeight} />
          <SkeletonBlock width="60%" height={typography.body.lineHeight} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.skeleton },
  // The same padding and gap as the results list and the place profile.
  list: { padding: spacing.lg, gap: spacing.md },
  card: { ...cardStyle, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardText: { flex: 1, gap: spacing.xs },
  pills: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  cue: { marginTop: spacing.sm },
  profile: { padding: spacing.lg, gap: spacing.lg },
  section: { gap: spacing.xs },
});
