import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { copy } from '../lib/copy';
import type { RankedPlace } from '../lib/matching';
import { resultCardAccessibilityLabel, resultCardMeta } from '../lib/results';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = { result: RankedPlace };

/**
 * One place in the results, with its "why this fits you" tags. The whole card is one link to
 * the place profile, and a screen reader reads it as one element.
 */
export function ResultCard({ result }: Props) {
  const { place, reasons } = result;
  return (
    <Link href={{ pathname: '/place/[id]', params: { id: place.id } }} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={resultCardAccessibilityLabel(result)}
        accessibilityHint={copy.results.openHint}
        style={({ pressed }) => [styles.card, pressed && styles.dimmed]}
      >
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.meta}>{resultCardMeta(result)}</Text>
        {reasons.length > 0 ? (
          <View style={styles.reasons}>
            {reasons.map((reason) => (
              <View key={reason.key} style={styles.chip}>
                <Text style={styles.chipText}>{reason.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  dimmed: { opacity: 0.6 },
  name: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  meta: { fontSize: fontSize.body, color: colors.mutedText },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.reasonBackground,
    borderRadius: radius * 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipText: { fontSize: fontSize.small, fontWeight: '600', color: colors.reasonText },
});
