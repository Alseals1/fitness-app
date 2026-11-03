import { StyleSheet, Text, View } from 'react-native';

import { copy } from '../lib/copy';
import type { RankedPlace } from '../lib/matching';
import { AREA_LABELS, CATEGORY_LABELS, PRICE_LABELS } from '../lib/placeOptions';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = { result: RankedPlace };

/** One place in the results, with its "why this fits you" tags. Not pressable yet: the place profile is a separate issue. */
export function ResultCard({ result }: Props) {
  const { place, reasons } = result;
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{place.name}</Text>
      <Text style={styles.meta}>
        {[CATEGORY_LABELS[place.category], AREA_LABELS[place.area], PRICE_LABELS[place.price_range]].join(' · ')}
      </Text>
      {reasons.length > 0 ? (
        <View
          style={styles.reasons}
          accessible
          accessibilityLabel={`${copy.results.reasonsLabel}: ${reasons.map((reason) => reason.label).join(', ')}`}
        >
          {reasons.map((reason) => (
            <View key={reason.key} style={styles.chip}>
              <Text style={styles.chipText}>{reason.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
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
