import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusState } from '../hooks/useFocusState';
import { copy } from '../lib/copy';
import { focusRing } from '../lib/controlStyles';
import type { RankedPlace } from '../lib/matching';
import { resultCardAccessibilityLabel, resultCardMeta } from '../lib/results';
import { borderWidth, colors, radius, shadow, spacing, typography } from '../lib/theme';
import { SaveButton } from './SaveButton';

type Props = { result: RankedPlace; saved: boolean; onToggleSave: (id: string) => void };

/**
 * One place in the results, with its "why this fits you" tags. The card holds one link to the
 * place profile, which a screen reader reads as one element, then one save button beside it.
 * The button is a sibling of the link, never inside it.
 */
export function ResultCard({ result, saved, onToggleSave }: Props) {
  const { place, reasons } = result;
  const { focused, onFocus, onBlur } = useFocusState();
  return (
    <View style={styles.card}>
      <Link href={{ pathname: '/place/[id]', params: { id: place.id } }} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={resultCardAccessibilityLabel(result)}
          accessibilityHint={copy.results.openHint}
          onFocus={onFocus}
          onBlur={onBlur}
          style={({ pressed }) => [styles.link, pressed && styles.linkPressed, focusRing(focused)]}
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
      <SaveButton name={place.name} saved={saved} onPress={() => onToggleSave(place.id)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    boxShadow: shadow.card,
    padding: spacing.lg,
  },
  link: { flex: 1, gap: spacing.xs, borderRadius: radius.md, borderCurve: 'continuous' },
  linkPressed: { backgroundColor: colors.surfaceMuted },
  name: { ...typography.title, color: colors.text },
  meta: { ...typography.body, color: colors.mutedText },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.reasonBackground,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipText: { ...typography.label, color: colors.reasonText },
});
