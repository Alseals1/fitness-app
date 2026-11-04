import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusState } from '../hooks/useFocusState';
import { chipColors, colorStyle, focusRing } from '../lib/controlStyles';
import type { Option } from '../lib/placeOptions';
import { borderWidth, minTouchTarget, radius, spacing, typography } from '../lib/theme';

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
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={selected.includes(option.value)}
          disabled={disabled}
          multiple={multiple}
          onPress={() => onToggle(option.value)}
        />
      ))}
    </View>
  );
}

type ChipProps = { label: string; selected: boolean; disabled: boolean; multiple: boolean; onPress: () => void };

/** One chip. Its own component so each chip tracks its own focus. */
function Chip({ label, selected, disabled, multiple, onPress }: ChipProps) {
  const { focused, onFocus, onBlur } = useFocusState();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={multiple ? { checked: selected, disabled } : { selected, disabled }}
      style={({ pressed }) => [
        styles.chip,
        colorStyle(chipColors({ pressed, focused, disabled, selected })),
        focusRing(focused),
      ]}
    >
      {({ pressed }) => (
        <Text
          style={[
            selected ? styles.labelSelected : styles.label,
            { color: chipColors({ pressed, focused, disabled, selected }).text },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
  },
  label: typography.body,
  labelSelected: typography.bodyStrong,
});
