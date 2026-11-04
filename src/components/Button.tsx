import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** primary: filled. secondary: outlined. danger: outlined in red. */
  variant?: 'primary' | 'secondary' | 'danger';
  accessibilityHint?: string;
};

/** The app's one button style. */
export function Button({ label, onPress, disabled = false, variant = 'primary', accessibilityHint }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.outlined,
        variant === 'danger' && styles.dangerBorder,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' ? styles.primaryLabel : styles.outlinedLabel,
          variant === 'danger' && styles.dangerLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary },
  outlined: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  dangerBorder: { borderColor: colors.danger },
  dimmed: { opacity: 0.6 },
  label: { fontSize: fontSize.body, fontWeight: '600' },
  primaryLabel: { color: colors.primaryText },
  outlinedLabel: { color: colors.text },
  dangerLabel: { color: colors.danger },
});
