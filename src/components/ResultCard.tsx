import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFocusState } from '../hooks/useFocusState';
import { useMotion } from '../hooks/useMotion';
import { entranceStyle, pressScaleTransition } from '../lib/animations';
import { copy } from '../lib/copy';
import { focusRing } from '../lib/controlStyles';
import type { RankedPlace } from '../lib/matching';
import { pressScale, type Entrance } from '../lib/motion';
import { resultCardAccessibilityLabel, resultCardLayout, resultCardText } from '../lib/results';
import { cardStyle, colors, radius, spacing, typography } from '../lib/theme';
import { SaveButton } from './SaveButton';

type Props = {
  result: RankedPlace;
  saved: boolean;
  /** Returns false when the tap was ignored (the shortlist is still loading). */
  onToggleSave: (id: string) => boolean;
  /** How the card first appears: see `entranceFor`. */
  entrance: Entrance;
};

/**
 * One place in the results. The card holds one link to the place profile (the one primary
 * action): the category, the name, "<part of town> · <price>", the "why this fits you" tags and a
 * "See details ›" cue. A screen reader reads the link as one element, then the save button.
 * The button is a sibling of the link, never inside it, and sits beside the text; at a large
 * system font scale or in a narrow window (see `resultCardLayout`) it moves under the text so
 * the text can wrap.
 * Pressing the link scales the whole card.
 */
export function ResultCard({ result, saved, onToggleSave, entrance }: Props) {
  const { place, reasons } = result;
  const { category, facts } = resultCardText(result);
  const { fontScale, width } = useWindowDimensions();
  const stacked = resultCardLayout(fontScale, width) === 'stacked';
  const { focused, onFocus, onBlur } = useFocusState();
  const { reduced } = useMotion();
  // The entrance is fixed at mount: a row that mounts later never replays it.
  const [entranceAnimation] = useState(() => entranceStyle(entrance));
  // Link asChild merges the child's style as an object, so a style function would be dropped
  // (losing the flex and the pressed and focus styles). Track pressed here and pass a flat style.
  const [pressed, setPressed] = useState(false);
  const linkStyle = StyleSheet.flatten([
    styles.link,
    !stacked && styles.linkRow,
    pressed && styles.linkPressed,
    focusRing(focused),
  ]);
  // All motion sits on views around the link, never on the linked Pressable (see above).
  return (
    <Animated.View style={entranceAnimation}>
      <Animated.View
        style={[
          styles.card,
          stacked ? styles.cardStacked : styles.cardRow,
          pressScaleTransition,
          { transform: [{ scale: pressScale('card', pressed, reduced) }] },
        ]}
      >
        <Link href={{ pathname: '/place/[id]', params: { id: place.id } }} asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={resultCardAccessibilityLabel(result)}
            accessibilityHint={copy.results.openHint}
            onFocus={onFocus}
            onBlur={onBlur}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={linkStyle}
          >
            <Text style={styles.category}>{category}</Text>
            <Text style={styles.name}>{place.name}</Text>
            <Text style={styles.facts}>{facts}</Text>
            {reasons.length > 0 ? (
              <View style={styles.reasons}>
                {reasons.map((reason) => (
                  <View key={reason.key} style={styles.chip}>
                    <Text style={styles.chipText}>{reason.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {/* Decorative: the link's label and hint already say where it goes. */}
            <View style={styles.cue} aria-hidden importantForAccessibility="no-hide-descendants">
              <Text style={styles.cueText}>{copy.results.seeDetails}</Text>
              <Text style={styles.cueText}>{copy.results.seeDetailsGlyph}</Text>
            </View>
          </Pressable>
        </Link>
        <View style={stacked ? styles.saveStacked : undefined}>
          <SaveButton name={place.name} saved={saved} onPress={() => onToggleSave(place.id)} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardStyle, gap: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardStacked: { flexDirection: 'column', alignItems: 'stretch' },
  saveStacked: { alignSelf: 'flex-start' },
  // The padding keeps the pressed fill and focus ring off the text; the negative margin keeps the text aligned.
  link: { gap: spacing.xs, padding: spacing.xs, margin: -spacing.xs, borderRadius: radius.md, borderCurve: 'continuous' },
  // Only beside Save: in a column, `flex` would collapse the link to a zero height on web.
  linkRow: { flex: 1 },
  linkPressed: { backgroundColor: colors.surfaceMuted },
  category: { ...typography.label, color: colors.mutedText },
  name: { ...typography.title, color: colors.text },
  facts: { ...typography.body, color: colors.mutedText },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.reasonBackground,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipText: { ...typography.label, color: colors.reasonText },
  cue: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  cueText: { ...typography.bodyStrong, color: colors.primary },
});
