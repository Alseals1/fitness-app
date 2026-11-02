import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Option } from '../lib/placeOptions';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props<T extends string> = {
  options: readonly Option<T>[];
  /** The chosen values: one at most for single select. */
  selected: readonly T[];
  onToggle: (value: T) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  multiple?: boolean;
};

/** A row of chips for picking one value (category, area, price) or several (tags). */
export function OptionChips<T extends string>({
  options,
  selected,
  onToggle,
  disabled = false,
  accessibilityLabel,
  multiple = false,
}: Props<T>) {
  return (
    <View style={styles.row} accessibilityLabel={accessibilityLabel} accessibilityRole={multiple ? undefined : 'radiogroup'}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => onToggle(option.value)}
            disabled={disabled}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityState={multiple ? { checked: isSelected, disabled } : { selected: isSelected, disabled }}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius * 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: fontSize.small, color: colors.text },
  labelSelected: { color: colors.primaryText, fontWeight: '600' },
});
