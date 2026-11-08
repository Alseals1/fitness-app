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

/** How many "At a glance" rows and contact rows a loading profile shows. */
const skeletonFactCount = 3;
const skeletonContactCount = 2;

/**
 * Stands in for a place profile, shaped like it: the category, the name and Save, the
 * "At a glance" card, then a section label over the contact card.
 */
export function PlaceProfileSkeleton() {
  return (
    <SkeletonGroup style={styles.profile}>
      <View style={styles.profileHeader}>
        <SkeletonBlock width="25%" height={typography.label.lineHeight} />
        <SkeletonBlock width="70%" height={typography.heading.lineHeight} />
        <View style={styles.save}>
          <SkeletonBlock width={minTouchTarget} height={minTouchTarget} radius={radius.md} />
        </View>
      </View>
      <View style={styles.section}>
        <SkeletonBlock width="25%" height={typography.label.lineHeight} />
        <View style={styles.factCard}>
          {Array.from({ length: skeletonFactCount }, (_, index) => (
            <View key={index} style={styles.fact}>
              <SkeletonBlock width="30%" height={typography.label.lineHeight} />
              <SkeletonBlock width="55%" height={typography.body.lineHeight} />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <SkeletonBlock width="30%" height={typography.label.lineHeight} />
        <View style={styles.contactCard}>
          {Array.from({ length: skeletonContactCount }, (_, index) => (
            <View key={index} style={styles.contact}>
              <SkeletonBlock width="20%" height={typography.label.lineHeight} />
              <SkeletonBlock width="60%" height={typography.bodyStrong.lineHeight} />
            </View>
          ))}
        </View>
      </View>
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
  // The same padding and gaps as the profile screen, its sections and its cards.
  profile: { padding: spacing.lg, gap: spacing.xl },
  profileHeader: { gap: spacing.xs },
  save: { marginTop: spacing.sm },
  section: { gap: spacing.sm },
  factCard: { ...cardStyle, paddingVertical: spacing.xs },
  fact: { paddingVertical: spacing.md, gap: spacing.xs },
  contactCard: { ...cardStyle, padding: spacing.xs },
  contact: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.xs },
});
