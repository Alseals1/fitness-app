import { Pressable, StyleSheet, Text } from 'react-native';

import { useFocusState } from '../hooks/useFocusState';
import { copy } from '../lib/copy';
import { colorStyle, focusRing, saveButtonColors } from '../lib/controlStyles';
import { saveButtonLabel } from '../lib/shortlist';
import { borderWidth, minTouchTarget, radius, spacing, typography } from '../lib/theme';

type Props = { name: string; saved: boolean; onPress: () => void };

/** Saves a place to the shortlist, or removes it. Filled when saved, outlined when not. */
export function SaveButton({ name, saved, onPress }: Props) {
  const { focused, onFocus, onBlur } = useFocusState();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saveButtonLabel(name, saved)}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={({ pressed }) => [
        styles.base,
        colorStyle(saveButtonColors({ pressed, focused, selected: saved })),
        focusRing(focused),
      ]}
    >
      {({ pressed }) => (
        <Text style={[styles.label, { color: saveButtonColors({ pressed, focused, selected: saved }).text }]}>
          {saved ? copy.shortlist.saved : copy.shortlist.save}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.bodyStrong, textAlign: 'center' },
});
