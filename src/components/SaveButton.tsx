import { Pressable, StyleSheet, Text } from 'react-native';

import { copy } from '../lib/copy';
import { saveButtonLabel } from '../lib/shortlist';
import { colors, fontSize, minTouchTarget, radius, spacing } from '../lib/theme';

type Props = { name: string; saved: boolean; onPress: () => void };

/** Saves a place to the shortlist, or removes it. Filled when saved, outlined when not. */
export function SaveButton({ name, saved, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saveButtonLabel(name, saved)}
      onPress={onPress}
      style={({ pressed }) => [styles.base, saved ? styles.saved : styles.unsaved, pressed && styles.dimmed]}
    >
      <Text style={[styles.label, saved ? styles.savedLabel : styles.unsavedLabel]}>
        {saved ? copy.shortlist.saved : copy.shortlist.save}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saved: { backgroundColor: colors.primary, borderColor: colors.primary },
  unsaved: { backgroundColor: colors.background, borderColor: colors.border },
  dimmed: { opacity: 0.6 },
  label: { fontSize: fontSize.body, fontWeight: '600' },
  savedLabel: { color: colors.primaryText },
  unsavedLabel: { color: colors.text },
});
