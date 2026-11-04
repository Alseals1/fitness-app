import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFocusState } from '../hooks/useFocusState';
import { useMotion } from '../hooks/useMotion';
import { pressTransition } from '../lib/animations';
import { chipColors, colorStyle, focusRing } from '../lib/controlStyles';
import { pressScale } from '../lib/motion';
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

/** One chip. Its own component so each chip tracks its own focus. Press feedback works as in `Button`. */
function Chip({ label, selected, disabled, multiple, onPress }: ChipProps) {
  const { focused, onFocus, onBlur } = useFocusState();
  const { reduced } = useMotion();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={multiple ? { checked: selected, disabled } : { selected, disabled }}
      style={[styles.pressable, focusRing(focused)]}
    >
      {({ pressed }) => {
        const controlColors = chipColors({ pressed, focused, disabled, selected });
        return (
          <Animated.View
            style={[
              styles.chip,
              colorStyle(controlColors),
              pressTransition,
              { transform: [{ scale: pressScale('control', pressed, reduced) }] },
            ]}
          >
            <Text style={[selected ? styles.labelSelected : styles.label, { color: controlColors.text }]}>{label}</Text>
          </Animated.View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pressable: { minHeight: minTouchTarget, borderRadius: radius.full },
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
